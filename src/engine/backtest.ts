import { Bar } from '../mock/price';
import { Signal } from './rules';
import { ExitParams } from './primitives';

export interface BacktestConfigInternal {
  capital: number;     // 默认 1,000,000
  lots?: number;       // 默认 6 (约合 30% 仓位杠杆利用率)
  feeBp: number;       // 默认 1 (万1, 即 0.0001)
  slipTicks: number;   // 默认 1 跳
  execAt: 'close' | 'next_open';
}

export interface PositionInterval {
  startDate: string;
  endDate: string;
  startIdx: number;
  endIdx: number;
  side: 'long' | 'short';
  symbol: string;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  openDate: string;
  closeDate: string;
  openIdx: number;
  closeIdx: number;
  side: 'long' | 'short';
  openPrice: number;
  closePrice: number;
  lots: number;
  pnl: number;
  pnlPct: number;
  holdDays: number;
  navAfter: number;
  // Backward-compatibility aliases
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  exitPrice?: number;
  cumulativeNav?: number;
}

export interface SymbolBacktestResult {
  symbol: string;
  trades: BacktestTrade[];
  positions: PositionInterval[];
  nav: number[];
  drawdown: number[];
  dailyPnl: number[];
}

export interface MultiSymbolBacktestResult {
  trades: BacktestTrade[];
  positions: PositionInterval[];
  nav: number[];
  drawdown: number[];
  benchmark: number[];
  symbolResults: Record<string, SymbolBacktestResult>;
}

export const SYMBOL_MULTIPLIERS: Record<string, { multiplier: number; tick: number }> = {
  RB: { multiplier: 10, tick: 1 },
  I:  { multiplier: 100, tick: 0.5 },
  M:  { multiplier: 10, tick: 1 },
};

export function runSymbolBacktest(
  symbol: string,
  bars: Bar[],
  signals: Signal[],
  cfg: BacktestConfigInternal = { capital: 1000000, lots: 6, feeBp: 1, slipTicks: 1, execAt: 'close' },
  exitParams?: ExitParams
): SymbolBacktestResult {
  const meta = SYMBOL_MULTIPLIERS[symbol] || { multiplier: 10, tick: 1 };
  const mult = meta.multiplier;
  const tick = meta.tick;
  const feeRate = cfg.feeBp * 0.0001;
  const tradeLots = cfg.lots ?? 6;

  const n = bars.length;
  const nav: number[] = new Array(n).fill(1.0);
  const drawdown: number[] = new Array(n).fill(0);
  const dailyPnl: number[] = new Array(n).fill(0);
  const trades: BacktestTrade[] = [];
  const positions: PositionInterval[] = [];

  // 映射信号到天
  const signalMap = new Map<number, Signal[]>();
  for (const sig of signals) {
    if (!signalMap.has(sig.barIdx)) {
      signalMap.set(sig.barIdx, []);
    }
    signalMap.get(sig.barIdx)!.push(sig);
  }

  let curSide: 'long' | 'short' | 'flat' = 'flat';
  let curOpenPrice = 0;
  let curOpenIdx = -1;
  let equity = cfg.capital;
  let peakEquity = cfg.capital;

  for (let i = 0; i < n; i++) {
    const bar = bars[i];

    // 检查出场参数 (止损 / 止盈 / 最长持仓)
    if (curSide !== 'flat' && exitParams) {
      const holdDays = i - curOpenIdx;
      const priceChangePct = (bar.close - curOpenPrice) / curOpenPrice * (curSide === 'long' ? 1 : -1);

      let needExit = false;
      if (exitParams.stopPct && priceChangePct <= -exitParams.stopPct) needExit = true;
      if (exitParams.takePct && priceChangePct >= exitParams.takePct) needExit = true;
      if (exitParams.maxHold && holdDays >= exitParams.maxHold) needExit = true;

      if (needExit) {
        // 平仓
        const slip = (curSide === 'long' ? -1 : 1) * tick * cfg.slipTicks;
        const baseFill = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].open : bar.close;
        const fillPrice = baseFill + slip;
        const exitDate = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].date : bar.date;
        const fee = (curOpenPrice + fillPrice) * mult * tradeLots * feeRate;
        const grossPnl = (curSide === 'long' ? fillPrice - curOpenPrice : curOpenPrice - fillPrice) * mult * tradeLots;
        const netPnl = grossPnl - fee;
        equity += netPnl;

        trades.push({
          id: `${symbol}-${i}-${trades.length + 1}`,
          symbol,
          openDate: bars[curOpenIdx].date,
          closeDate: exitDate,
          openIdx: curOpenIdx,
          closeIdx: i,
          side: curSide,
          openPrice: curOpenPrice,
          closePrice: fillPrice,
          lots: tradeLots,
          pnl: Math.round(netPnl),
          pnlPct: Number((netPnl / (curOpenPrice * mult * tradeLots)).toFixed(4)),
          holdDays,
          navAfter: Number((equity / cfg.capital).toFixed(4)),
          entryDate: bars[curOpenIdx].date,
          exitDate: exitDate,
          entryPrice: curOpenPrice,
          exitPrice: fillPrice,
          cumulativeNav: Number((equity / cfg.capital).toFixed(4)),
        });

        positions.push({
          startDate: bars[curOpenIdx].date,
          endDate: exitDate,
          startIdx: curOpenIdx,
          endIdx: i,
          side: curSide,
          symbol,
        });

        curSide = 'flat';
        curOpenIdx = -1;
      }
    }

    // 处理信号
    const sigs = signalMap.get(i);
    if (sigs && sigs.length > 0) {
      for (const sig of sigs) {
        if (curSide !== 'flat' && exitParams?.minHold && curOpenIdx >= 0) {
          const hold = i - curOpenIdx;
          if (hold < exitParams.minHold) {
            continue;
          }
        }

        if (sig.action === 'close_long' && curSide === 'long') {
          const slip = -tick * cfg.slipTicks;
          const baseFill = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].open : bar.close;
          const fillPrice = baseFill + slip;
          const exitDate = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].date : bar.date;
          const fee = (curOpenPrice + fillPrice) * mult * tradeLots * feeRate;
          const netPnl = (fillPrice - curOpenPrice) * mult * tradeLots - fee;
          equity += netPnl;

          trades.push({
            id: `${symbol}-${i}-${trades.length + 1}`,
            symbol,
            openDate: bars[curOpenIdx].date,
            closeDate: exitDate,
            openIdx: curOpenIdx,
            closeIdx: i,
            side: 'long',
            openPrice: curOpenPrice,
            closePrice: fillPrice,
            lots: tradeLots,
            pnl: Math.round(netPnl),
            pnlPct: Number((netPnl / (curOpenPrice * mult * tradeLots)).toFixed(4)),
            holdDays: i - curOpenIdx,
            navAfter: Number((equity / cfg.capital).toFixed(4)),
            entryDate: bars[curOpenIdx].date,
            exitDate: exitDate,
            entryPrice: curOpenPrice,
            exitPrice: fillPrice,
            cumulativeNav: Number((equity / cfg.capital).toFixed(4)),
          });

          positions.push({
            startDate: bars[curOpenIdx].date,
            endDate: exitDate,
            startIdx: curOpenIdx,
            endIdx: i,
            side: 'long',
            symbol,
          });

          curSide = 'flat';
          curOpenIdx = -1;
        } else if (sig.action === 'close_short' && curSide === 'short') {
          const slip = tick * cfg.slipTicks;
          const baseFill = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].open : bar.close;
          const fillPrice = baseFill + slip;
          const exitDate = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].date : bar.date;
          const fee = (curOpenPrice + fillPrice) * mult * tradeLots * feeRate;
          const netPnl = (curOpenPrice - fillPrice) * mult * tradeLots - fee;
          equity += netPnl;

          trades.push({
            id: `${symbol}-${i}-${trades.length + 1}`,
            symbol,
            openDate: bars[curOpenIdx].date,
            closeDate: exitDate,
            openIdx: curOpenIdx,
            closeIdx: i,
            side: 'short',
            openPrice: curOpenPrice,
            closePrice: fillPrice,
            lots: tradeLots,
            pnl: Math.round(netPnl),
            pnlPct: Number((netPnl / (curOpenPrice * mult * tradeLots)).toFixed(4)),
            holdDays: i - curOpenIdx,
            navAfter: Number((equity / cfg.capital).toFixed(4)),
            entryDate: bars[curOpenIdx].date,
            exitDate: exitDate,
            entryPrice: curOpenPrice,
            exitPrice: fillPrice,
            cumulativeNav: Number((equity / cfg.capital).toFixed(4)),
          });

          positions.push({
            startDate: bars[curOpenIdx].date,
            endDate: exitDate,
            startIdx: curOpenIdx,
            endIdx: i,
            side: 'short',
            symbol,
          });

          curSide = 'flat';
          curOpenIdx = -1;
        }

        if (sig.action === 'open_long' && curSide === 'flat') {
          const slip = tick * cfg.slipTicks;
          const baseOpen = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].open : bar.close;
          curOpenPrice = baseOpen + slip;
          curOpenIdx = i;
          curSide = 'long';
        } else if (sig.action === 'open_short' && curSide === 'flat') {
          const slip = -tick * cfg.slipTicks;
          const baseOpen = cfg.execAt === 'next_open' && i + 1 < n ? bars[i + 1].open : bar.close;
          curOpenPrice = baseOpen + slip;
          curOpenIdx = i;
          curSide = 'short';
        }
      }
    }

    // 浮动市值统计
    let floatingPnl = 0;
    if (curSide === 'long') {
      floatingPnl = (bar.close - curOpenPrice) * mult * tradeLots;
    } else if (curSide === 'short') {
      floatingPnl = (curOpenPrice - bar.close) * mult * tradeLots;
    }

    const currentTotalEquity = equity + floatingPnl;
    nav[i] = Number((currentTotalEquity / cfg.capital).toFixed(4));
    dailyPnl[i] = i === 0 ? 0 : nav[i] - nav[i - 1];

    if (currentTotalEquity > peakEquity) {
      peakEquity = currentTotalEquity;
    }
    const dd = peakEquity > 0 ? (currentTotalEquity - peakEquity) / peakEquity : 0;
    drawdown[i] = Number(dd.toFixed(4));
  }

  // 若最后还处于持仓状态，记录为持续至今
  if (curSide !== 'flat' && curOpenIdx >= 0) {
    positions.push({
      startDate: bars[curOpenIdx].date,
      endDate: bars[n - 1].date,
      startIdx: curOpenIdx,
      endIdx: n - 1,
      side: curSide,
      symbol,
    });
  }

  return { symbol, trades, positions, nav, drawdown, dailyPnl };
}

export function runMultiSymbolBacktest(
  symbolBars: Record<string, Bar[]>,
  symbolSignals: Record<string, Signal[]>,
  cfg: BacktestConfigInternal = { capital: 1000000, lots: 6, feeBp: 1, slipTicks: 1, execAt: 'close' },
  exitParams?: ExitParams
): MultiSymbolBacktestResult {
  const symbols = Object.keys(symbolBars);
  const symbolResults: Record<string, SymbolBacktestResult> = {};
  const allTrades: BacktestTrade[] = [];
  const allPositions: PositionInterval[] = [];

  const firstSymbol = symbols[0];
  const n = symbolBars[firstSymbol].length;
  const compositeNav: number[] = new Array(n).fill(1.0);
  const compositeDrawdown: number[] = new Array(n).fill(0);
  const benchmark: number[] = new Array(n).fill(1.0);

  // 1. 各品种独立运行
  for (const sym of symbols) {
    const res = runSymbolBacktest(sym, symbolBars[sym], symbolSignals[sym] || [], cfg, exitParams);
    symbolResults[sym] = res;
    allTrades.push(...res.trades);
    allPositions.push(...res.positions);
  }

  // 2. 按平仓日期排序交易
  allTrades.sort((a, b) => (a.closeDate > b.closeDate ? 1 : a.closeDate < b.closeDate ? -1 : 0));

  // 3. 等权合成净值 (Equal-weight portfolio)
  let peak = 1.0;
  for (let i = 0; i < n; i++) {
    let sumNav = 0;
    let sumBench = 0;
    for (const sym of symbols) {
      sumNav += symbolResults[sym].nav[i];
      const bars = symbolBars[sym];
      sumBench += bars[i].close / bars[0].close;
    }
    compositeNav[i] = Number((sumNav / symbols.length).toFixed(4));
    benchmark[i] = Number((sumBench / symbols.length).toFixed(4));

    if (compositeNav[i] > peak) {
      peak = compositeNav[i];
    }
    compositeDrawdown[i] = Number(((compositeNav[i] - peak) / peak).toFixed(4));
  }

  return {
    trades: allTrades,
    positions: allPositions,
    nav: compositeNav,
    drawdown: compositeDrawdown,
    benchmark,
    symbolResults,
  };
}
