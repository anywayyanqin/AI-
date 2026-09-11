import { IndicatorParams } from '../engine/rules';

export interface ProposalDefinition {
  id: string;
  title: string;
  changeType: 'filter' | 'param' | 'exit' | 'direction' | 'symbol';
  changeSummary: string;
  diff: IndicatorParams;
  warnings?: string[];
}

export interface ChatScriptRule {
  match: RegExp;
  reply: string;
  proposals: ProposalDefinition[];
}

export const CHAT_SCRIPTS: ChatScriptRule[] = [
  {
    match: /回撤|稳|风险/,
    reply: '回撤主要出现在均线反复穿越的震荡行情中，给出 2 个方案：',
    proposals: [
      {
        id: 'prop-vol-filter',
        title: '方案 A  加波动率过滤',
        changeType: 'filter',
        changeSummary: 'ATR20 低于 30% 分位时不开仓',
        diff: { atrFilterPct: 0.3 },
      },
      {
        id: 'prop-ma-slow',
        title: '方案 B  放慢均线周期',
        changeType: 'param',
        changeSummary: '放慢均线周期，减少假信号',
        diff: { ma: 40 },
        warnings: ['近1年变差、交易减半'],
      },
    ],
  },
  {
    match: /频繁|太多|减少交易|交易少/,
    reply: '信号密集出现在趋势初期的来回试探阶段，给出 2 个方案：',
    proposals: [
      {
        id: 'prop-min-hold',
        title: '方案 A  加最短持仓',
        changeType: 'exit',
        changeSummary: '开仓后 5 日内忽略反向信号',
        diff: { minHold: 5 },
      },
      {
        id: 'prop-thr-up',
        title: '方案 B  提高共振阈值',
        changeType: 'param',
        changeSummary: '基差窗口 20 · 阈值 0 → 15',
        diff: { threshold: 15 },
        warnings: ['假信号减少但可能错过部分突破'],
      },
    ],
  },
  {
    match: /震荡|过滤震荡|洗盘/,
    reply: '在震荡与无序波动时段暂停开仓，给出优化方案：',
    proposals: [
      {
        id: 'prop-osc-filter',
        title: '方案 A  ATR 波动率分位过滤',
        changeType: 'filter',
        changeSummary: 'ATR20 低于 35% 分位不开新仓',
        diff: { atrFilterPct: 0.35 },
      },
    ],
  },
  {
    match: /止损|风控|防爆仓/,
    reply: '引入价格硬止损保护，防范黑天鹅事件：',
    proposals: [
      {
        id: 'prop-stop-loss',
        title: '方案 A  加2%价格移动止损',
        changeType: 'exit',
        changeSummary: '开仓后逆向浮亏达 2% 强制平仓',
        diff: { stopPct: 0.02 },
      },
    ],
  },
  {
    match: /只做多|不做空|多头/,
    reply: '限制为只做多后，空头段自动平仓观望：',
    proposals: [
      {
        id: 'prop-long-only',
        title: '方案 A  限制只做多',
        changeType: 'direction',
        changeSummary: '剔除所有做空意图，仅保留做多信号',
        diff: { direction: 'long' },
      },
    ],
  },
  {
    match: /20\d\d|去年|那段|某年/,
    reply: '该区间回撤对应的是低波动横盘震荡行情，量化模型不针对特定日期拟合，建议加入市场状态过滤：',
    proposals: [
      {
        id: 'prop-vol-filter-time',
        title: '方案 A  加波动率过滤',
        changeType: 'filter',
        changeSummary: 'ATR20 低于 30% 分位时不开仓',
        diff: { atrFilterPct: 0.3 },
      },
    ],
  },
];

export const FALLBACK_SCRIPT: ChatScriptRule = {
  match: /.*/,
  reply: '可以尝试从“降低回撤”、“减少交易”、“过滤震荡”、“加止损”或“只做多”等策略属性进一步优化。',
  proposals: [],
};
