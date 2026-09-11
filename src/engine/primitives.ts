import { Bar } from '../mock/price';

export interface ExitParams {
  stopPct?: number;     // 止损比例 0.02 = 2%
  takePct?: number;     // 止盈比例 0.05 = 5%
  maxHold?: number;     // 最大持仓天数
  minHold?: number;     // 最短持仓天数 (期间忽略反向信号)
}

export function calcSMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
      result[i] = sum / period;
    } else {
      result[i] = sum / (i + 1);
    }
  }
  return result;
}

export function calcTR(bars: Bar[]): number[] {
  const tr: number[] = new Array(bars.length);
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr[i] = bars[i].high - bars[i].low;
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  return tr;
}

export function calcATR(bars: Bar[], period = 14): number[] {
  const tr = calcTR(bars);
  return calcSMA(tr, period);
}

export const primitives = {
  // 均线交叉意图: +1 (快线上穿慢线), -1 (快线下穿慢线), 0
  maCross: (bars: Bar[], fast = 5, slow = 20): number[] => {
    const closes = bars.map(b => b.close);
    const maFast = calcSMA(closes, fast);
    const maSlow = calcSMA(closes, slow);
    const intent: number[] = new Array(bars.length).fill(0);

    let state = 0;
    for (let i = 1; i < bars.length; i++) {
      if (maFast[i] > maSlow[i] && maFast[i - 1] <= maSlow[i - 1]) {
        state = 1;
        intent[i] = 1;
      } else if (maFast[i] < maSlow[i] && maFast[i - 1] >= maSlow[i - 1]) {
        state = -1;
        intent[i] = -1;
      } else {
        intent[i] = state;
      }
    }
    return intent;
  },

  // 基差信号: 基差移动平均在阈值之上为多，之下为空
  basisSign: (basis: number[], window = 20, thr = 0): number[] => {
    const maBasis = calcSMA(basis, window);
    return maBasis.map(b => (b > thr ? 1 : b < -thr ? -1 : 0));
  },

  // ATR 分位数 (0~1)
  atrPercentile: (bars: Bar[], n = 20, lookback = 250): number[] => {
    const atr = calcATR(bars, n);
    const pcts: number[] = new Array(bars.length).fill(0.5);

    for (let i = 0; i < bars.length; i++) {
      const start = Math.max(0, i - lookback + 1);
      const window = atr.slice(start, i + 1);
      const val = atr[i];
      let count = 0;
      for (const x of window) {
        if (x <= val) count++;
      }
      pcts[i] = count / window.length;
    }
    return pcts;
  },

  // 序列拐点识别 (例如库存连续下降拐点，+1底部拐点/-1顶部拐点)
  turningPoint: (series: number[], window = 10): number[] => {
    const ma = calcSMA(series, window);
    const intent: number[] = new Array(series.length).fill(0);
    let state = 0;
    for (let i = 2; i < series.length; i++) {
      const slopePrev = ma[i - 1] - ma[i - 2];
      const slopeCurr = ma[i] - ma[i - 1];
      if (slopePrev <= 0 && slopeCurr > 0) {
        state = 1; // 拐头向上
        intent[i] = 1;
      } else if (slopePrev >= 0 && slopeCurr < 0) {
        state = -1; // 拐头向下
        intent[i] = -1;
      } else {
        intent[i] = state;
      }
    }
    return intent;
  },

  // 状态过滤：mask 为 false 时，不能开新仓 (维持已有仓位或平仓)
  applyFilter: (intent: number[], mask: boolean[]): number[] => {
    const filtered: number[] = new Array(intent.length).fill(0);
    let currentHolding = 0;

    for (let i = 0; i < intent.length; i++) {
      const target = intent[i];
      if (target !== currentHolding) {
        // 尝试开新仓或翻仓
        if (mask[i]) {
          currentHolding = target;
        } else {
          // 被过滤，若只是同向则保持，若新开仓则忽略变为平仓/观望
          currentHolding = 0;
        }
      }
      filtered[i] = currentHolding;
    }
    return filtered;
  },

  // 方向过滤
  applyDirection: (intent: number[], direction: 'both' | 'long' | 'short'): number[] => {
    if (direction === 'long') {
      return intent.map(v => (v > 0 ? 1 : 0));
    }
    if (direction === 'short') {
      return intent.map(v => (v < 0 ? -1 : 0));
    }
    return intent;
  },
};
