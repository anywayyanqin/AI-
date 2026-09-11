import {
  Indicator,
  BacktestResult,
  FuturesSymbolMeta,
  ExportRecord,
  ChatMessage,
  TargetUniverse,
} from './types';

export const FUTURES_SYMBOLS: FuturesSymbolMeta[] = [
  { code: 'RB', name: '螺纹钢', exchange: 'SHFE', multiplier: 10, priceTick: 1, category: '黑色' },
  { code: 'I', name: '铁矿石', exchange: 'DCE', multiplier: 100, priceTick: 0.5, category: '黑色' },
  { code: 'CU', name: '沪铜', exchange: 'SHFE', multiplier: 5, priceTick: 10, category: '有色' },
  { code: 'AL', name: '沪铝', exchange: 'SHFE', multiplier: 5, priceTick: 5, category: '有色' },
  { code: 'M', name: '豆粕', exchange: 'DCE', multiplier: 10, priceTick: 1, category: '农产品' },
  { code: 'TA', name: 'PTA', exchange: 'CZCE', multiplier: 5, priceTick: 2, category: '能化' },
  { code: 'MA', name: '甲醇', exchange: 'CZCE', multiplier: 10, priceTick: 1, category: '能化' },
  { code: 'IF', name: '沪深300', exchange: 'CFFEX', multiplier: 300, priceTick: 0.2, category: '金融' },
  { code: 'SC', name: '原油', exchange: 'INE', multiplier: 1000, priceTick: 0.1, category: '能化' },
  { code: 'LC', name: '碳酸锂', exchange: 'GFEX', multiplier: 1, priceTick: 50, category: '新能源' },
];

export const EXCHANGES = [
  { code: 'SHFE', name: '上海期货交易所' },
  { code: 'DCE', name: '大连商品交易所' },
  { code: 'CZCE', name: '郑州商品交易所' },
  { code: 'INE', name: '上海国际能源交易中心' },
  { code: 'CFFEX', name: '中国金融期货交易所' },
  { code: 'GFEX', name: '广州期货交易所' },
];

export const INITIAL_TARGET_UNIVERSE: TargetUniverse = {
  exchanges: ['SHFE', 'DCE', 'CZCE', 'INE', 'CFFEX', 'GFEX'],
  selectedSymbols: ['RB', 'I', 'M'],
  contractType: 'main',
  specificMonth: '2506',
  rollAdjustment: 'post',
  frequency: '1d',
  dataSources: {
    reports: true,
    opinions: true,
    industry: true,
    market: true,
  },
};

export const SAMPLE_PYTHON_CODE = `"""
# Python 期货策略简易回测引擎 (backtest.py)
# 标的: RB主力连续 / I主力连续
# 数据源: 行情K线(后复权) + 产业数据库基差表 + 研报因子库
"""
import numpy as np
import pandas as pd

def run_backtest(df, ma_len=20, basis_win=20, threshold=0.0, fee_rate=0.0001, slippage=1.0):
    df = df.copy()
    # 1. 计算技术指标
    df['ma'] = df['close'].rolling(window=ma_len).mean()
    
    # 2. 计算基差率及其移动平均
    # 基差率 = (现货价 - 期货价) / 现货价
    df['basis_ma'] = df['basis_rate'].rolling(window=basis_win).mean()
    
    # 3. 信号生成
    # 多头信号: 基差率 > 均线 且 收盘价上穿 MA20
    df['long_cond'] = (df['basis_rate'] > df['basis_ma'] + threshold) & (df['close'] > df['ma']) & (df['close'].shift(1) <= df['ma'].shift(1))
    # 空头信号: 基差率 < 均线 且 收盘价下穿 MA20
    df['short_cond'] = (df['basis_rate'] < df['basis_ma'] - threshold) & (df['close'] < df['ma']) & (df['close'].shift(1) >= df['ma'].shift(1))
    
    # 4. 模拟持仓状态 (1: 多, -1: 空, 0: 空仓)
    df['pos'] = 0
    pos = 0
    positions = []
    for i in range(len(df)):
        if df['long_cond'].iloc[i]:
            pos = 1
        elif df['short_cond'].iloc[i]:
            pos = -1
        positions.append(pos)
    df['pos'] = positions
    
    # 执行时点平移: T日15:00收盘生成信号，次日或收盘价成交
    df['trade_ret'] = df['pos'].shift(1) * df['close'].pct_change()
    
    # 扣除手续费及滑点跳数成本
    turnover = (df['pos'].diff() != 0).astype(int)
    cost = turnover * (fee_rate + slippage / df['close'])
    df['net_ret'] = df['trade_ret'] - cost
    
    # 净值计算
    df['nav'] = (1 + df['net_ret'].fillna(0)).cumprod()
    df['cum_max'] = df['nav'].cummax()
    df['drawdown'] = (df['nav'] - df['cum_max']) / df['cum_max']
    
    return df
`;

export const SAMPLE_PINE_CODE = `//@version=5
strategy("Basis-MA Cross Futures Strategy", overlay=true, initial_capital=1000000, default_qty_type=strategy.fixed, default_qty_value=1)

// ==========================================
// 1. 参数定义 (可随导出配置调节)
// ==========================================
maLen       = input.int(20, "MA Length", minval=1)
basisWindow = input.int(20, "Basis Smoothing Window", minval=1)
threshold   = input.float(0.0, "Basis Rate Threshold %", step=0.1)

// ==========================================
// 2. 外部数据源依赖 (研报库 / 产业数据库)
// 注意: TradingView 官方不自带国内期货产业现货基差数据
// 方案: 使用 request.seed 自定义源导入或外部指标桥接
// ==========================================
// [外部依赖]: quote:SHFE:RB1!
// [外部依赖]: basis:industryDB_steel_spot
// [外部依赖]: report:#088_huatai_quant
var float basisRate = na
basisRate := request.seed("industry_basis", "RB_BASIS_RATE", close * 0.015)

// 计算技术均线与基差均线
maVal = ta.sma(close, maLen)
basisMa = ta.sma(nz(basisRate, 0), basisWindow)

// 交易逻辑判断
longCond  = (basisRate > basisMa + threshold) and ta.crossover(close, maVal)
shortCond = (basisRate < basisMa - threshold) and ta.crossunder(close, maVal)

// 执行订单
if (longCond)
    strategy.entry("Long", strategy.long, comment="Basis-MA Bullish")

if (shortCond)
    strategy.entry("Short", strategy.short, comment="Basis-MA Bearish")

plot(maVal, "Trend MA", color=color.orange, linewidth=2)
`;

export const INITIAL_INDICATORS: Indicator[] = [
  {
    id: 'ind-1',
    name: '螺纹库存拐点',
    dimension: 'fundamental',
    symbols: ['RB'],
    contractType: 'main',
    logicText: '结合全国高炉开工率与钢厂库存走势。当五大品种社会库存连续2周环比降幅超3%，且现货基差处于贴水>5%分位时触发多头开仓；当库存累库且基差走弱时触发平多翻空。',
    params: { invDecRate: 3.0, basisDiscount: 5.0, holdDays: 20 },
    pythonCode: SAMPLE_PYTHON_CODE,
    pineCode: SAMPLE_PINE_CODE,
    dependencies: ['quote:RB主力', 'steel_inventory:industryDB', 'report:#123:中信建投钢铁周度供需平衡表'],
    status: 'generated',
    createdAt: '2026-03-01 10:30',
    score: 3,
  },
  {
    id: 'ind-2',
    name: '基差-均线共振',
    dimension: 'technical',
    symbols: ['RB', 'I'],
    contractType: 'main',
    logicText: '基差率 > 20日均值 且 收盘价上穿 MA20 → 多；基差率 < 20日均值 且 收盘价下穿 MA20 → 空。利用产业强现实与盘面趋势双重确认过滤震荡杂波。',
    params: { maLen: 20, basisWindow: 20, threshold: 0.0 },
    pythonCode: SAMPLE_PYTHON_CODE,
    pineCode: SAMPLE_PINE_CODE,
    dependencies: ['quote:RB/I主力', 'basis:industryDB', 'report:#088:华泰期货量化CTA策略库'],
    status: 'backtested',
    createdAt: '2026-03-02 14:15',
    score: 4,
  },
  {
    id: 'ind-3',
    name: '主力持仓变化',
    dimension: 'capital',
    symbols: ['RB'],
    contractType: 'main',
    logicText: '跟踪交易所前20大主力席位净多空持仓变动。当龙头席位净多单连续3日增仓超15%且持仓集中度突破前高时做多；主力净空异动平仓或翻空则离场。',
    params: { topRank: 20, posChangeThreshold: 15, lookbackDays: 30 },
    pythonCode: SAMPLE_PYTHON_CODE,
    pineCode: SAMPLE_PINE_CODE,
    dependencies: ['quote:RB主力', 'exchange_pos:marketPublic', 'opinion:#204:机构龙虎榜多空情绪指数'],
    status: 'draft',
    createdAt: '2026-03-03 09:20',
    score: 2,
  },
  {
    id: 'ind-4',
    name: '仓单+持仓共振',
    dimension: 'capital',
    symbols: ['M'],
    contractType: 'main',
    logicText: '大豆到港淡季背景下，大商所豆粕注册仓单处于近3年同季低位(<10%历史分位)且主力多头持仓异动增加，价格突破60日布林上轨时做多。',
    params: { receiptQuantile: 0.1, bollPeriod: 60, stdDev: 2.0 },
    pythonCode: SAMPLE_PYTHON_CODE,
    pineCode: SAMPLE_PINE_CODE,
    dependencies: ['quote:M主力', 'warehouse_receipt:marketPublic', 'report:#305:国投安信农产品研报'],
    status: 'exported',
    createdAt: '2026-03-04 16:40',
    score: 4,
  },
  {
    id: 'ind-5',
    name: '沪铜现货升水动量',
    dimension: 'fundamental',
    symbols: ['CU'],
    contractType: 'main',
    logicText: '上海保税区及电解铜现货升水持续3日大于200元/吨，且进口比价打开盈利窗口，结合上期所总仓单低位，发出做多信号。',
    params: { premiumThresh: 200, momentumDays: 3 },
    pythonCode: SAMPLE_PYTHON_CODE,
    pineCode: SAMPLE_PINE_CODE,
    dependencies: ['quote:CU主力', 'copper_premium:industryDB', 'report:#142:金瑞期货有色周报'],
    status: 'backtested',
    createdAt: '2026-03-05 11:10',
    score: 5,
  },
];

export function generateNavSeries(annualReturn: number, maxDd: number, volatility: number = 0.15) {
  const points = [];
  let nav = 1.0;
  let benchmark = 1.0;
  let peak = 1.0;
  const startDate = new Date('2021-01-04');
  const totalDays = 90; // mock 90 business intervals

  for (let i = 0; i <= totalDays; i++) {
    const curDate = new Date(startDate.getTime() + i * 15 * 86400000);
    const dateStr = curDate.toISOString().slice(0, 10);

    if (i > 0) {
      // simulate drift + random shock
      const progress = i / totalDays;
      const alphaTrend = (annualReturn / totalDays) * 1.5;
      const noise = (Math.sin(i * 0.4) * 0.015) + (Math.cos(i * 0.25) * 0.01) + ((Math.random() - 0.46) * 0.018);
      
      nav = Math.max(0.7, nav * (1 + alphaTrend + noise));
      if (nav > peak) peak = nav;

      const benchNoise = (Math.sin(i * 0.35) * 0.018) + ((Math.random() - 0.49) * 0.022);
      benchmark = Math.max(0.65, benchmark * (1 + 0.0002 + benchNoise));
    }

    const drawdown = ((nav - peak) / peak);
    points.push({
      date: dateStr,
      nav: Number(nav.toFixed(3)),
      benchmark: Number(benchmark.toFixed(3)),
      drawdown: Number((drawdown * 100).toFixed(2)),
    });
  }
  return points;
}

export const INITIAL_BACKTEST_RESULTS: BacktestResult[] = [
  {
    id: 'res-1',
    indicatorId: 'ind-2',
    indicatorName: '基差-均线共振',
    symbol: 'RB',
    execTiming: 'close',
    annualReturn: 0.182,
    maxDrawdown: -0.125,
    calmar: 1.46,
    sharpe: 1.21,
    winRate: 0.54,
    score: 4,
    navSeries: generateNavSeries(0.182, -0.125),
    trades: [
      { id: 't-1', time: '2025-06-12 15:00', symbol: 'RB2510', direction: '多', action: '开仓', price: 3480, lots: 10, commission: 34.8 },
      { id: 't-2', time: '2025-06-25 15:00', symbol: 'RB2510', direction: '多', action: '平仓', price: 3620, lots: 10, commission: 36.2, pnl: 14000, pnlRate: 4.02 },
      { id: 't-3', time: '2025-07-02 15:00', symbol: 'RB2510', direction: '空', action: '开仓', price: 3590, lots: 10, commission: 35.9 },
      { id: 't-4', time: '2025-07-18 15:00', symbol: 'RB2510', direction: '空', action: '平仓', price: 3495, lots: 10, commission: 34.95, pnl: 9500, pnlRate: 2.65 },
      { id: 't-5', time: '2025-08-05 15:00', symbol: 'RB2510', direction: '多', action: '开仓', price: 3510, lots: 10, commission: 35.1 },
      { id: 't-6', time: '2025-08-19 15:00', symbol: 'RB2510', direction: '多', action: '平仓', price: 3460, lots: 10, commission: 34.6, pnl: -5000, pnlRate: -1.42 },
      { id: 't-7', time: '2025-09-02 15:00', symbol: 'RB2601', direction: '多', action: '开仓', price: 3540, lots: 10, commission: 35.4 },
      { id: 't-8', time: '2025-09-22 15:00', symbol: 'RB2601', direction: '多', action: '平仓', price: 3710, lots: 10, commission: 37.1, pnl: 17000, pnlRate: 4.80 },
    ],
    yearlyStats: [
      { year: '2021', annualReturn: 0.198, maxDrawdown: -0.112, winRate: 0.56, tradeCount: 38, profitRatio: 1.85 },
      { year: '2022', annualReturn: 0.224, maxDrawdown: -0.134, winRate: 0.58, tradeCount: 42, profitRatio: 2.05 },
      { year: '2023', annualReturn: 0.145, maxDrawdown: -0.118, winRate: 0.52, tradeCount: 36, profitRatio: 1.62 },
      { year: '2024', annualReturn: 0.176, maxDrawdown: -0.125, winRate: 0.55, tradeCount: 40, profitRatio: 1.78 },
      { year: '2025 (H1)', annualReturn: 0.168, maxDrawdown: -0.098, winRate: 0.53, tradeCount: 22, profitRatio: 1.71 },
    ],
  },
  {
    id: 'res-2',
    indicatorId: 'ind-2',
    indicatorName: '基差-均线共振',
    symbol: 'I',
    execTiming: 'close',
    annualReturn: 0.117,
    maxDrawdown: -0.183,
    calmar: 0.64,
    sharpe: 0.78,
    winRate: 0.51,
    score: 3,
    navSeries: generateNavSeries(0.117, -0.183),
    trades: [
      { id: 'ti-1', time: '2025-05-10 15:00', symbol: 'I2509', direction: '多', action: '开仓', price: 780, lots: 5, commission: 39 },
      { id: 'ti-2', time: '2025-05-28 15:00', symbol: 'I2509', direction: '多', action: '平仓', price: 825, lots: 5, commission: 41, pnl: 22500, pnlRate: 5.77 },
      { id: 'ti-3', time: '2025-06-15 15:00', symbol: 'I2509', direction: '空', action: '开仓', price: 810, lots: 5, commission: 40.5 },
      { id: 'ti-4', time: '2025-06-30 15:00', symbol: 'I2509', direction: '空', action: '平仓', price: 830, lots: 5, commission: 41.5, pnl: -10000, pnlRate: -2.47 },
    ],
    yearlyStats: [
      { year: '2021', annualReturn: 0.142, maxDrawdown: -0.192, winRate: 0.49, tradeCount: 32, profitRatio: 1.45 },
      { year: '2022', annualReturn: 0.095, maxDrawdown: -0.215, winRate: 0.48, tradeCount: 35, profitRatio: 1.32 },
      { year: '2023', annualReturn: 0.138, maxDrawdown: -0.165, winRate: 0.53, tradeCount: 29, profitRatio: 1.58 },
      { year: '2024', annualReturn: 0.112, maxDrawdown: -0.183, winRate: 0.51, tradeCount: 34, profitRatio: 1.41 },
      { year: '2025 (H1)', annualReturn: 0.101, maxDrawdown: -0.142, winRate: 0.52, tradeCount: 16, profitRatio: 1.39 },
    ],
  },
  {
    id: 'res-3',
    indicatorId: 'ind-1',
    indicatorName: '螺纹库存拐点',
    symbol: 'RB',
    execTiming: 'nextOpen',
    annualReturn: 0.094,
    maxDrawdown: -0.098,
    calmar: 0.96,
    sharpe: 0.92,
    winRate: 0.58,
    score: 3,
    navSeries: generateNavSeries(0.094, -0.098),
    trades: [
      { id: 'trb-1', time: '2025-04-10 09:00', symbol: 'RB2510', direction: '多', action: '开仓', price: 3520, lots: 10, commission: 35.2 },
      { id: 'trb-2', time: '2025-05-15 09:00', symbol: 'RB2510', direction: '多', action: '平仓', price: 3660, lots: 10, commission: 36.6, pnl: 14000, pnlRate: 3.98 },
    ],
    yearlyStats: [
      { year: '2022', annualReturn: 0.112, maxDrawdown: -0.089, winRate: 0.60, tradeCount: 18, profitRatio: 1.88 },
      { year: '2023', annualReturn: 0.088, maxDrawdown: -0.105, winRate: 0.57, tradeCount: 20, profitRatio: 1.72 },
      { year: '2024', annualReturn: 0.096, maxDrawdown: -0.098, winRate: 0.59, tradeCount: 19, profitRatio: 1.81 },
    ],
  },
  {
    id: 'res-4',
    indicatorId: 'ind-4',
    indicatorName: '仓单+持仓共振',
    symbol: 'M',
    execTiming: 'close',
    annualReturn: 0.140,
    maxDrawdown: -0.101,
    calmar: 1.39,
    sharpe: 1.10,
    winRate: 0.54,
    score: 4,
    navSeries: generateNavSeries(0.140, -0.101),
    trades: [
      { id: 'tm-1', time: '2025-03-12 15:00', symbol: 'M2509', direction: '多', action: '开仓', price: 3050, lots: 15, commission: 45.75 },
      { id: 'tm-2', time: '2025-04-18 15:00', symbol: 'M2509', direction: '多', action: '平仓', price: 3220, lots: 15, commission: 48.3, pnl: 25500, pnlRate: 5.57 },
    ],
    yearlyStats: [
      { year: '2022', annualReturn: 0.155, maxDrawdown: -0.115, winRate: 0.55, tradeCount: 24, profitRatio: 1.75 },
      { year: '2023', annualReturn: 0.128, maxDrawdown: -0.095, winRate: 0.53, tradeCount: 26, profitRatio: 1.68 },
      { year: '2024', annualReturn: 0.142, maxDrawdown: -0.101, winRate: 0.56, tradeCount: 25, profitRatio: 1.79 },
    ],
  },
  {
    id: 'res-5',
    indicatorId: 'ind-3',
    indicatorName: '主力持仓变化',
    symbol: 'RB',
    execTiming: 'close',
    annualReturn: 0.041,
    maxDrawdown: -0.220,
    calmar: 0.19,
    sharpe: 0.35,
    winRate: 0.49,
    score: 2,
    navSeries: generateNavSeries(0.041, -0.220),
    trades: [
      { id: 'tc-1', time: '2025-02-14 15:00', symbol: 'RB2505', direction: '多', action: '开仓', price: 3600, lots: 10, commission: 36 },
      { id: 'tc-2', time: '2025-03-01 15:00', symbol: 'RB2505', direction: '多', action: '平仓', price: 3510, lots: 10, commission: 35.1, pnl: -9000, pnlRate: -2.5 },
    ],
    yearlyStats: [
      { year: '2022', annualReturn: 0.052, maxDrawdown: -0.210, winRate: 0.48, tradeCount: 45, profitRatio: 1.15 },
      { year: '2023', annualReturn: 0.035, maxDrawdown: -0.235, winRate: 0.50, tradeCount: 48, profitRatio: 1.08 },
      { year: '2024', annualReturn: 0.044, maxDrawdown: -0.220, winRate: 0.49, tradeCount: 42, profitRatio: 1.12 },
    ],
  },
];

export const INITIAL_EXPORT_RECORDS: ExportRecord[] = [
  {
    id: 'exp-1',
    indicatorId: 'ind-4',
    indicatorName: '仓单+持仓共振',
    symbol: 'M',
    tvSymbol: 'DCE:M1!',
    timeframe: '1D',
    externalDataMode: 'seed',
    includeParams: true,
    exportedAt: '2026-03-04 17:05',
    status: 'success',
  },
  {
    id: 'exp-2',
    indicatorId: 'ind-2',
    indicatorName: '基差-均线共振',
    symbol: 'RB',
    tvSymbol: 'SHFE:RB1!',
    timeframe: '1D',
    externalDataMode: 'seed',
    includeParams: true,
    exportedAt: '2026-03-05 09:12',
    status: 'success',
  },
  {
    id: 'exp-3',
    indicatorId: 'ind-5',
    indicatorName: '沪铜现货升水动量',
    symbol: 'CU',
    tvSymbol: 'SHFE:CU1!',
    timeframe: '60',
    externalDataMode: 'technicalOnly',
    includeParams: true,
    exportedAt: '2026-03-05 14:30',
    status: 'success',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'ai',
    text: '您好！我是期货量化 AI 助手。已为您加载全局标的池【RB / I / M 主力连续】及关联数据库（研报库、观点库、产业数据库、市场行情与持仓仓单）。请以自然语言描述您想要探索的交易信号逻辑，或点击下方快捷模板快速构建。',
    timestamp: '10:00',
    references: ['研报库 (12,480篇)', '产业数据库 (钢联/卓创/SMM)', '市场公开持仓仓单 (交易所实时同步)'],
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: '结合钢厂库存、基差和期货持仓，生成螺纹钢多空信号',
    timestamp: '10:02',
  },
  {
    id: 'msg-3',
    sender: 'ai',
    text: '基于您提出的需求，已深度检索《中信建投钢铁周度供需平衡表》研报及产业库基差表，为您基于「基本面、技术面、资金面」3个维度生成了 3 个候选交易指标：',
    timestamp: '10:03',
    references: ['研报#123: 中信建投黑色产业专题', '产业库-钢联五大品种社会与厂库表', '市场公开数据: 上期所持仓龙虎榜'],
    candidateIndicators: [
      INITIAL_INDICATORS[0], // 螺纹库存拐点
      INITIAL_INDICATORS[1], // 基差-均线共振
      INITIAL_INDICATORS[2], // 主力持仓变化
    ],
  },
];
