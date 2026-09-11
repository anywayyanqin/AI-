import { Bar } from '../mock/price';
import { AuxData } from '../mock/aux';
import { primitives, ExitParams } from './primitives';

export type SignalSide = 'long' | 'short' | 'flat';

export interface Signal {
  date: string;
  barIdx: number;
  side: SignalSide;
  price: number;
  action: 'open_long' | 'open_short' | 'close_long' | 'close_short';
}

export interface RuleContext {
  symbol: string;
  bars: Bar[];
  aux: AuxData;
}

export type IndicatorParams = Record<string, number | string | boolean>;

export type IndicatorRule = (ctx: RuleContext, params: IndicatorParams) => {
  signals: Signal[];
  intent: number[];
  exitParams?: ExitParams;
};

export function intentToSignals(intent: number[], bars: Bar[]): Signal[] {
  const signals: Signal[] = [];
  let current = 0;

  for (let i = 0; i < intent.length; i++) {
    const next = intent[i];
    if (next !== current) {
      if (next === 1) {
        // 开多 (若是之前持有空，则先平空后开多)
        if (current === -1) {
          signals.push({
            date: bars[i].date,
            barIdx: i,
            side: 'flat',
            price: bars[i].close,
            action: 'close_short',
          });
        }
        signals.push({
          date: bars[i].date,
          barIdx: i,
          side: 'long',
          price: bars[i].close,
          action: 'open_long',
        });
      } else if (next === -1) {
        // 开空
        if (current === 1) {
          signals.push({
            date: bars[i].date,
            barIdx: i,
            side: 'flat',
            price: bars[i].close,
            action: 'close_long',
          });
        }
        signals.push({
          date: bars[i].date,
          barIdx: i,
          side: 'short',
          price: bars[i].close,
          action: 'open_short',
        });
      } else {
        // 平仓观望
        if (current === 1) {
          signals.push({
            date: bars[i].date,
            barIdx: i,
            side: 'flat',
            price: bars[i].close,
            action: 'close_long',
          });
        } else if (current === -1) {
          signals.push({
            date: bars[i].date,
            barIdx: i,
            side: 'flat',
            price: bars[i].close,
            action: 'close_short',
          });
        }
      }
      current = next;
    }
  }

  return signals;
}

/**
 * 指标 1：基差-均线共振 (basisMaResonance)
 * 参数：ma (default 20), basisWindow (default 20), threshold (default 0),
 * 可选提案参数：atrFilterPct (e.g. 0.3), minHold, direction ('both'|'long'|'short')
 */
export const basisMaResonanceRule: IndicatorRule = (ctx, p) => {
  const maFast = 5;
  const maSlow = Number(p.ma ?? 20);
  const basisWin = Number(p.basisWindow ?? 20);
  const thr = Number(p.threshold ?? 0);

  let intent = primitives.maCross(ctx.bars, maFast, maSlow);
  const bSign = primitives.basisSign(ctx.aux.basis, basisWin, thr);

  // 共振逻辑: 均线方向与基差方向一致时采纳，否则归0
  intent = intent.map((v, i) => (v === bSign[i] ? v : 0));

  // 方案 A 波动率过滤：ATR20 低于分位数时不开仓
  if (p.atrFilterPct) {
    const atrp = primitives.atrPercentile(ctx.bars, 20, 250);
    const filterPct = Number(p.atrFilterPct);
    const mask = atrp.map(x => x >= filterPct);
    intent = primitives.applyFilter(intent, mask);
  }

  // 方向过滤：只做多 / 只做空 / 双向
  if (p.direction) {
    intent = primitives.applyDirection(intent, p.direction as 'both' | 'long' | 'short');
  }

  const exitParams: ExitParams = {};
  if (p.minHold) exitParams.minHold = Number(p.minHold);
  if (p.stopPct) exitParams.stopPct = Number(p.stopPct);
  if (p.takePct) exitParams.takePct = Number(p.takePct);
  if (p.maxHold) exitParams.maxHold = Number(p.maxHold);

  const signals = intentToSignals(intent, ctx.bars);
  return { signals, intent, exitParams };
};

/**
 * 指标 2：螺纹库存拐点与趋势共振 (inventoryTurningPoint)
 */
export const inventoryTurningPointRule: IndicatorRule = (ctx, p) => {
  const invWindow = Number(p.invWindow ?? 15);
  const maPeriod = Number(p.maPeriod ?? 20);

  // 库存去化 (拐点向上=现货需求走弱，拐点向下=库存去化强劲为多)
  const invTurn = primitives.turningPoint(ctx.aux.inventory, invWindow);
  // 库存去化(拐点向下)视作多头动力
  const invSignal = invTurn.map(v => (v === -1 ? 1 : v === 1 ? -1 : 0));

  const maTrend = primitives.maCross(ctx.bars, 10, maPeriod);
  let intent: number[] = maTrend.map((t, i) => (t === invSignal[i] ? t : 0));

  if (p.direction) {
    intent = primitives.applyDirection(intent, p.direction as 'both' | 'long' | 'short');
  }

  const signals = intentToSignals(intent, ctx.bars);
  return { signals, intent };
};

/**
 * 指标 3：主力持仓异动动量 (oiMomentum)
 */
export const oiMomentumRule: IndicatorRule = (ctx, p) => {
  const oiWin = Number(p.oiWindow ?? 10);
  const oiThreshold = Number(p.oiThreshold ?? 500);

  // 主力持仓异动突破
  const intent: number[] = new Array(ctx.bars.length).fill(0);
  let state = 0;
  for (let i = oiWin; i < ctx.bars.length; i++) {
    const sumOi = ctx.aux.oiChange.slice(i - oiWin, i).reduce((a, b) => a + b, 0);
    const pRet = (ctx.bars[i].close - ctx.bars[i - oiWin].close) / ctx.bars[i - oiWin].close;
    if (sumOi > oiThreshold && pRet > 0.01) {
      state = 1;
    } else if (sumOi < -oiThreshold && pRet < -0.01) {
      state = -1;
    }
    intent[i] = state;
  }

  const signals = intentToSignals(intent, ctx.bars);
  return { signals, intent };
};

export const RULE_REGISTRY: Record<string, IndicatorRule> = {
  basisMaResonance: basisMaResonanceRule,
  inventoryTurningPoint: inventoryTurningPointRule,
  oiMomentum: oiMomentumRule,
};
