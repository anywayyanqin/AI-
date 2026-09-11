import { BacktestTrade, MultiSymbolBacktestResult } from './backtest';
import { Signal } from './rules';
import { Bar } from '../mock/price';

export interface KPI {
  annualReturn: number;  // 0.182 -> 18.2%
  maxDrawdown: number;   // -0.125 -> -12.5%
  calmar: number;        // 1.46
  winRate: number;       // 0.54 -> 54%
  trades: number;        // 87
  profitRatio: number;   // 1.85
  sharpe: number;        // 1.35
}

export interface YearlyMetrics {
  year: string;
  returnPct: number;
  annualReturn: number; // alias for returnPct
  ret: number;          // alias for returnPct
  maxDrawdown: number;
  mdd: number;          // alias for maxDrawdown
  calmar: number;
  sharpe: number;
  winRate: number;
  tradeCount: number;
  trades: number;       // alias for tradeCount
  profitRatio: number;
  plRatio: number;      // alias for profitRatio
}

export interface SymbolMetrics {
  symbol: string;
  annualReturn: number;
  ret: number;          // alias for annualReturn
  maxDrawdown: number;
  mdd: number;          // alias for maxDrawdown
  calmar: number;
  sharpe: number;
  tradeCount: number;
  trades: number;       // alias for tradeCount
  winRate: number;
  profitRatio: number;
  plRatio: number;      // alias for profitRatio
  contribution: number; // 收益贡献率
}

export interface DiffSignalsResult {
  retained: Signal[]; // 保留的信号
  filtered: Signal[]; // 被过滤的旧信号 (空心灰)
  added: Signal[];    // 新增的信号 (蓝带深蓝边)
}

export function calcKpi(nav: number[], trades: BacktestTrade[], daysCount: number): KPI {
  if (nav.length === 0 || daysCount <= 0) {
    return {
      annualReturn: 0,
      maxDrawdown: 0,
      calmar: 0,
      winRate: 0,
      trades: 0,
      profitRatio: 0,
      sharpe: 0,
    };
  }

  const startNav = nav[0] || 1.0;
  const endNav = nav[nav.length - 1] || 1.0;
  const totalReturn = endNav / startNav - 1;
  const years = Math.max(0.2, daysCount / 244);
  const annualReturn = Math.pow(Math.max(0.001, 1 + totalReturn), 1 / years) - 1;

  // 最大回撤
  let peak = nav[0];
  let maxDD = 0;
  for (const x of nav) {
    if (x > peak) peak = x;
    const dd = (x - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  // 卡玛比率
  const calmar = maxDD < 0 ? Math.abs(annualReturn / maxDD) : 0;

  // 胜率与盈亏比
  let wins = 0;
  let winSum = 0;
  let lossSum = 0;
  for (const t of trades) {
    if (t.pnl > 0) {
      wins++;
      winSum += t.pnl;
    } else {
      lossSum += Math.abs(t.pnl);
    }
  }
  const winRate = trades.length > 0 ? wins / trades.length : 0;
  const profitRatio = lossSum > 0 ? winSum / lossSum : winSum > 0 ? 3.0 : 1.0;

  // 日收益夏普比率
  const dailyReturns: number[] = [];
  for (let i = 1; i < nav.length; i++) {
    dailyReturns.push(nav[i] / nav[i - 1] - 1);
  }
  const mean = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 0
    ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / dailyReturns.length
    : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(244) : 0;

  return {
    annualReturn: Number(annualReturn.toFixed(4)),
    maxDrawdown: Number(maxDD.toFixed(4)),
    calmar: Number(calmar.toFixed(2)),
    winRate: Number(winRate.toFixed(4)),
    trades: trades.length,
    profitRatio: Number(profitRatio.toFixed(2)),
    sharpe: Number(sharpe.toFixed(2)),
  };
}

export function calcRecent1YKpi(nav: number[], trades: BacktestTrade[], totalBars: number): KPI {
  const cut = Math.max(0, totalBars - 244);
  const sliceNav = nav.slice(cut);
  if (sliceNav.length === 0) {
    return calcKpi([], [], 0);
  }

  // 重新归一化
  const base = sliceNav[0] || 1.0;
  const renormalizedNav = sliceNav.map(v => v / base);
  const sliceTrades = trades.filter(t => t.closeIdx >= cut);

  return calcKpi(renormalizedNav, sliceTrades, sliceNav.length);
}

export function calcYearlyMetrics(bars: Bar[], trades: BacktestTrade[], nav: number[]): YearlyMetrics[] {
  const years = Array.from(new Set(bars.map(b => b.date.slice(0, 4)))).sort();
  const result: YearlyMetrics[] = [];

  for (const yr of years) {
    const yrIndices = bars
      .map((b, idx) => ({ date: b.date, idx }))
      .filter(x => x.date.startsWith(yr));

    if (yrIndices.length === 0) continue;
    const startIdx = yrIndices[0].idx;
    const endIdx = yrIndices[yrIndices.length - 1].idx;

    const startNav = nav[startIdx] || 1.0;
    const endNav = nav[endIdx] || startNav;
    const ret = startNav > 0 ? endNav / startNav - 1 : 0;

    // 年内最大回撤
    let yrPeak = startNav;
    let yrMaxDD = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      if (nav[i] > yrPeak) yrPeak = nav[i];
      const dd = yrPeak > 0 ? (nav[i] - yrPeak) / yrPeak : 0;
      if (dd < yrMaxDD) yrMaxDD = dd;
    }

    const yrTrades = trades.filter(t => t.closeDate && t.closeDate.startsWith(yr));
    const winTrades = yrTrades.filter(t => t.pnl > 0).length;
    const winRate = yrTrades.length > 0 ? winTrades / yrTrades.length : 0;

    let winSum = 0;
    let lossSum = 0;
    for (const t of yrTrades) {
      if (t.pnl > 0) winSum += t.pnl;
      else lossSum += Math.abs(t.pnl);
    }
    const profitRatio = lossSum > 0 ? winSum / lossSum : winSum > 0 ? 2.5 : 1.0;

    // 年内卡玛比率
    const absDD = Math.abs(yrMaxDD);
    const calmar = absDD > 0.001 ? Math.max(0, ret / absDD) : ret > 0 ? 3.0 : 0;

    // 年内夏普比率 (日收益率年化)
    const dailyRets: number[] = [];
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const prev = nav[i - 1] || 1;
      if (prev > 0) dailyRets.push(nav[i] / prev - 1);
    }
    let sharpe = 0;
    if (dailyRets.length > 5) {
      const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
      const variance = dailyRets.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / dailyRets.length;
      const std = Math.sqrt(variance);
      sharpe = std > 0 ? (mean / std) * Math.sqrt(244) : 0;
    }

    result.push({
      year: yr,
      returnPct: Number(ret.toFixed(4)),
      annualReturn: Number(ret.toFixed(4)),
      ret: Number(ret.toFixed(4)),
      maxDrawdown: Number(yrMaxDD.toFixed(4)),
      mdd: Number(yrMaxDD.toFixed(4)),
      calmar: Number(calmar.toFixed(2)),
      sharpe: Number(sharpe.toFixed(2)),
      winRate: Number(winRate.toFixed(4)),
      tradeCount: yrTrades.length,
      trades: yrTrades.length,
      profitRatio: Number(profitRatio.toFixed(2)),
      plRatio: Number(profitRatio.toFixed(2)),
    });
  }

  return result;
}

export function calcSymbolMetrics(res: MultiSymbolBacktestResult, barsMap: Record<string, Bar[]>): SymbolMetrics[] {
  const result: SymbolMetrics[] = [];
  const symbols = Object.keys(res.symbolResults);
  const totalPnl = res.trades.reduce((a, b) => a + b.pnl, 0);

  for (const sym of symbols) {
    const sRes = res.symbolResults[sym];
    const bars = barsMap[sym];
    const kpi = calcKpi(sRes.nav, sRes.trades, bars ? bars.length : 1500);
    const symPnl = sRes.trades.reduce((a, b) => a + b.pnl, 0);
    const contrib = totalPnl > 0 ? (symPnl / totalPnl) : 1 / symbols.length;

    result.push({
      symbol: sym,
      annualReturn: kpi.annualReturn,
      ret: kpi.annualReturn,
      maxDrawdown: kpi.maxDrawdown,
      mdd: kpi.maxDrawdown,
      calmar: kpi.calmar,
      sharpe: kpi.sharpe,
      tradeCount: kpi.trades,
      trades: kpi.trades,
      winRate: kpi.winRate,
      profitRatio: kpi.profitRatio,
      plRatio: kpi.profitRatio,
      contribution: Number(contrib.toFixed(4)),
    });
  }

  return result;
}

export function diffSignals(oldSignals: Signal[], newSignals: Signal[]): DiffSignalsResult {
  const retained: Signal[] = [];
  const filtered: Signal[] = [];
  const added: Signal[] = [];

  const newSigKeySet = new Set(newSignals.map(s => `${s.date}_${s.action}`));

  for (const oldSig of oldSignals) {
    const key = `${oldSig.date}_${oldSig.action}`;
    if (newSigKeySet.has(key)) {
      retained.push(oldSig);
    } else {
      filtered.push(oldSig);
    }
  }

  const oldSigKeySet = new Set(oldSignals.map(s => `${s.date}_${s.action}`));
  for (const newSig of newSignals) {
    const key = `${newSig.date}_${newSig.action}`;
    if (!oldSigKeySet.has(key)) {
      added.push(newSig);
    }
  }

  return { retained, filtered, added };
}

export function calcAfterSaveMetrics(
  savedAtDate: string,
  bars: Bar[],
  trades: BacktestTrade[]
): { count: number; pnlPct: number } {
  const afterTrades = trades.filter(t => t.closeDate > savedAtDate);
  if (afterTrades.length === 0) {
    return { count: 0, pnlPct: 0 };
  }
  const sumPnlPct = afterTrades.reduce((acc, t) => acc + t.pnlPct, 0);
  return {
    count: afterTrades.length,
    pnlPct: Number(sumPnlPct.toFixed(4)),
  };
}
