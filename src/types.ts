import { Bar } from './mock/price';
import { AuxData } from './mock/aux';
import { IndicatorParams, Signal } from './engine/rules';
import { BacktestTrade, PositionInterval } from './engine/backtest';
import { KPI, YearlyMetrics, SymbolMetrics } from './engine/metrics';

export type DimensionType = 'fundamental' | 'technical' | 'capital';

export type IndicatorStatus = 'draft' | 'generated' | 'backtested' | 'exported';

export interface Indicator {
  id: string;
  name: string;
  dimension: DimensionType;
  symbols: string[];
  contractType: 'main' | 'index' | 'specific';
  contractMonth?: string;
  logicText: string;
  params: Record<string, number | string>;
  pythonCode: string;
  pineCode: string;
  dependencies: string[];
  status: IndicatorStatus;
  createdAt: string;
  score?: number;
}

export interface BacktestConfig {
  indicatorIds: string[];
  symbols: string[];
  startDate: string;
  endDate: string;
  execTiming: 'close' | 'nextOpen' | 'nightOpen' | 'custom';
  customTime?: string;
  direction: 'both' | 'longOnly' | 'shortOnly';
  marginRatio: number;
  leverage: number;
  feeRate: number;
  slippageTicks: number;
  rollMethod: 'autoShift' | 'expireClose';
  initCapital: number;
  sizing: 'fixedLots' | 'fixedRatio' | 'fixedRisk';
}

export interface TradeItem {
  id: string;
  time: string;
  symbol: string;
  direction: '多' | '空';
  action: '开仓' | '平仓';
  price: number;
  lots: number;
  commission: number;
  pnl?: number;
  pnlRate?: number;
}

export interface YearlyStat {
  year: string;
  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  tradeCount: number;
  profitRatio: number;
}

export interface NavPoint {
  date: string;
  nav: number;
  benchmark: number;
  drawdown: number;
}

export interface BacktestResult {
  id: string;
  indicatorId: string;
  indicatorName: string;
  symbol: string;
  execTiming: 'close' | 'nextOpen' | 'nightOpen' | 'custom';
  annualReturn: number;
  maxDrawdown: number;
  calmar: number;
  sharpe: number;
  winRate: number;
  score: number;
  navSeries: NavPoint[];
  trades: TradeItem[];
  yearlyStats: YearlyStat[];
}

export interface TargetUniverse {
  exchanges: string[]; // e.g. ['SHFE', 'DCE', 'CZCE', 'INE', 'CFFEX', 'GFEX']
  selectedSymbols: string[]; // e.g. ['RB', 'I', 'M']
  contractType: 'main' | 'index' | 'specific';
  specificMonth: string; // e.g. '2506'
  rollAdjustment: 'post' | 'pre' | 'none'; // 后复权 / 前复权 / 不复权
  frequency: '1d' | '60m' | '30m' | '15m';
  dataSources: {
    reports: boolean; // 研报库
    opinions: boolean; // 观点库
    industry: boolean; // 产业数据库
    market: boolean; // 市场公开数据
  };
}

export interface IndicatorVersionResult {
  kpi: KPI;
  kpiRecent1Y: KPI;
  kpiAfterSave?: { count: number; pnlPct: number };
  trades: BacktestTrade[];
  positions: PositionInterval[];
  nav: number[];
  benchmark: number[];
  drawdown: number[];
  yearly: YearlyMetrics[];
  perSymbol: SymbolMetrics[];
  symbolSignals: Record<string, Signal[]>;
}

export interface IndicatorVersion {
  id: string; // e.g. 'v1', 'v2'
  label: string; // 'v1'
  changeSummary: string;
  params: IndicatorParams;
  pythonCode: string;
  pineCode: string;
  savedAt?: string; // '2025-05-15'
  result: IndicatorVersionResult;
}

export interface ProposalKpiDiff {
  annualReturn: number;
  maxDrawdown: number;
  calmar: number;
  recent1YCalmar: number;
  trades: number;
}

export interface Proposal {
  id: string;
  baseVersionId: string;
  title: string;
  changeType: 'filter' | 'param' | 'exit' | 'direction' | 'symbol';
  changeSummary: string;
  diff: IndicatorParams;
  warnings?: string[];
  status: 'pending' | 'previewing' | 'applied';
  result: IndicatorVersionResult;
  kpiDiff: ProposalKpiDiff;
}

export interface WorkbenchIndicator {
  id: string;
  name: string;
  ruleKey: string;
  dimension: DimensionType;
  symbols: string[];
  dependencies: string[];
  versions: IndicatorVersion[];
  currentVersionId: string;
  isDirty?: boolean;
  inCandidatePool?: boolean;
}

export interface IndicatorOverviewCard {
  id: string;
  name: string;
  dimension: string; // e.g. '技术面' | '基本面' | '资金面'
  symbols: string[];
  kpi: {
    annualReturn: number;
    maxDrawdown: number;
    calmar: number;
    winRate: number;
  };
  navSeries?: number[];
}

export interface ChatMessage {
  id: string;
  role?: 'user' | 'ai';
  sender?: 'user' | 'ai';
  text: string;
  timestamp: string;
  folded?: boolean;
  proposals?: Proposal[];
  indicatorCards?: IndicatorOverviewCard[];
  badge?: string;
  isStreaming?: boolean;
  candidateIndicators?: Indicator[];
  references?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface ExportRecord {
  id: string;
  indicatorId: string;
  indicatorName: string;
  symbol: string;
  tvSymbol: string;
  timeframe: string;
  externalDataMode: 'seed' | 'technicalOnly';
  includeParams: boolean;
  exportedAt: string;
  status: 'success' | 'pending';
}

export interface FuturesSymbolMeta {
  code: string;
  name: string;
  exchange: string;
  multiplier: number;
  priceTick: number;
  category: '黑色' | '有色' | '农产品' | '能化' | '金融' | '新能源';
}
