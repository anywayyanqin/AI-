import { IndicatorParams } from './rules';

export function genPineScript(name: string, ruleKey: string, params: IndicatorParams): string {
  const pList = Object.entries(params)
    .map(([k, v]) => `// ${k} = ${v}`)
    .join('\n');

  if (ruleKey === 'basisMaResonance') {
    const ma = params.ma ?? 20;
    const basisWin = params.basisWindow ?? 20;
    const thr = params.threshold ?? 0;
    const atrPct = params.atrFilterPct ? Number(params.atrFilterPct) : 0;
    const minHold = params.minHold ? Number(params.minHold) : 0;
    const isLongOnly = params.direction === 'long';

    return `//@version=5
strategy("${name} - TradingView v5", overlay=true, initial_capital=1000000, default_qty_type=strategy.fixed, default_qty_value=1)

// =======================
// 参数配置 (由 AI 指标工坊生成)
// =======================
${pList}
maFastLen   = input.int(5, "快线周期 (MA Fast)")
maSlowLen   = input.int(${ma}, "慢线周期 (MA Slow)")
basisWin    = input.int(${basisWin}, "基差平滑窗口")
basisThr    = input.float(${thr}, "基差阈值")
atrFilter   = input.bool(${atrPct > 0}, "启用 ATR 波动率过滤")
atrPctThr   = input.float(${atrPct}, "ATR 过滤分位阈值")
minHoldDays = input.int(${minHold}, "最短持仓天数")

// 均线计算
maFast = ta.sma(close, maFastLen)
maSlow = ta.sma(close, maSlowLen)
trendBull = ta.crossover(maFast, maSlow)
trendBear = ta.crossunder(maFast, maSlow)

// 现货基差数据 (TradingView 扩展播种或模拟)
// 注：实盘中可接入外部种子数据或同标的跨期/基差合成
basisInput = close - ta.sma(close, 60)
maBasis = ta.sma(basisInput, basisWin)
basisBull = maBasis > basisThr
basisBear = maBasis < -basisThr

// 共振条件判定
longCondition  = trendBull and basisBull
shortCondition = trendBear and basisBear

${
  atrPct > 0
    ? `// ATR 波动率过滤器
atr20 = ta.atr(20)
atrPercentile = ta.percentrank(atr20, 250) / 100.0
volOk = atrPercentile >= atrPctThr
longCondition  := longCondition and volOk
shortCondition := shortCondition and volOk`
    : ''
}

// 交易执行逻辑
if (longCondition)
    strategy.entry("Long", strategy.long)

${
  isLongOnly
    ? `if (trendBear or basisBear)
    strategy.close("Long", comment="多头离场")`
    : `if (shortCondition)
    strategy.entry("Short", strategy.short)`
}

// 可视化绘制
plot(maFast, "MA 快线", color=color.blue, linewidth=1)
plot(maSlow, "MA 慢线", color=color.orange, linewidth=2)
`;
  }

  // 缺省通用模板
  return `//@version=5
strategy("${name} - TradingView v5", overlay=true, initial_capital=1000000)
// ${pList}
fastMA = ta.sma(close, 10)
slowMA = ta.sma(close, 30)
if (ta.crossover(fastMA, slowMA))
    strategy.entry("L", strategy.long)
if (ta.crossunder(fastMA, slowMA))
    strategy.close("L")
plot(fastMA, color=color.teal)
plot(slowMA, color=color.maroon)
`;
}

export function genPythonScript(name: string, ruleKey: string, params: IndicatorParams): string {
  const pJson = JSON.stringify(params, null, 4);

  return `# -*- coding: utf-8 -*-
"""
${name} - Python 投研回测策略脚本
由 AI 智能指标生成与回测平台导出
"""

import numpy as np
import pandas as pd

PARAMS = ${pJson}

class ${ruleKey.charAt(0).toUpperCase() + ruleKey.slice(1)}Strategy:
    def __init__(self, params=PARAMS):
        self.params = params
        self.capital = 1000000
        self.fee_rate = 0.0001
        self.slippage_ticks = 1

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """
        df 包含: ['date', 'open', 'high', 'low', 'close', 'volume', 'basis']
        返回: signals (1 多, -1 空, 0 平)
        """
        ma_fast = df['close'].rolling(5).mean()
        ma_slow = df['close'].rolling(int(self.params.get('ma', 20))).mean()
        
        # 均线交叉意图
        trend = np.where(ma_fast > ma_slow, 1, -1)
        
        # 基差平滑
        basis_ma = df['basis'].rolling(int(self.params.get('basisWindow', 20))).mean()
        basis_sig = np.where(basis_ma > float(self.params.get('threshold', 0)), 1, -1)
        
        # 基本面共振
        raw_signals = np.where(trend == basis_sig, trend, 0)
        
        # ATR 状态过滤
        if 'atrFilterPct' in self.params and self.params['atrFilterPct'] > 0:
            tr = np.maximum(df['high'] - df['low'], 
                            np.maximum(abs(df['high'] - df['close'].shift(1)), 
                                       abs(df['low'] - df['close'].shift(1))))
            atr = tr.rolling(20).mean()
            atr_pct = atr.rolling(250).apply(lambda s: (s <= s.iloc[-1]).mean(), raw=False)
            raw_signals = np.where(atr_pct >= self.params['atrFilterPct'], raw_signals, 0)
            
        return pd.Series(raw_signals, index=df.index)

if __name__ == '__main__':
    print("Strategy instantiated successfully with params:", PARAMS)
`;
}
