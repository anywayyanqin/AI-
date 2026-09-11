import { useState, useEffect } from 'react';
import {
  WorkbenchIndicator,
  IndicatorVersion,
  Proposal,
  ChatMessage,
  ChatSession,
  TargetUniverse,
  IndicatorVersionResult,
} from '../types';
import { Bar } from '../mock/price';
import { AuxData } from '../mock/aux';
import { genBars } from '../mock/price';
import { genAuxData } from '../mock/aux';
import { MOCK_SEED, SYMBOL_CONFIGS, DEFAULT_SYMBOLS } from '../mock/config';
import {
  basisMaResonanceRule,
  inventoryTurningPointRule,
  oiMomentumRule,
  IndicatorParams,
  Signal,
} from '../engine/rules';
import { runMultiSymbolBacktest, BacktestConfigInternal } from '../engine/backtest';
import {
  calcKpi,
  calcRecent1YKpi,
  calcYearlyMetrics,
  calcSymbolMetrics,
  calcAfterSaveMetrics,
} from '../engine/metrics';
import { genPineScript, genPythonScript } from '../engine/codeGen';
import { CHAT_SCRIPTS, FALLBACK_SCRIPT, ProposalDefinition } from '../mock/scripts';

// 1. 初始化确定性数据
export const mockBars: Record<string, Bar[]> = {};
export const mockAux: Record<string, AuxData> = {};

function initMockData() {
  const rb = genBars({
    seed: MOCK_SEED,
    p0: SYMBOL_CONFIGS.RB.p0,
    tick: SYMBOL_CONFIGS.RB.tick,
  });
  mockBars['RB'] = rb.bars;
  mockAux['RB'] = genAuxData(MOCK_SEED, rb.bars, rb.regimes);

  const i = genBars({
    seed: MOCK_SEED + 1,
    p0: SYMBOL_CONFIGS.I.p0,
    tick: SYMBOL_CONFIGS.I.tick,
    sharedRegimes: rb.regimes,
  });
  mockBars['I'] = i.bars;
  mockAux['I'] = genAuxData(MOCK_SEED + 1, i.bars, i.regimes);

  const m = genBars({
    seed: MOCK_SEED + 2,
    p0: SYMBOL_CONFIGS.M.p0,
    tick: SYMBOL_CONFIGS.M.tick,
  });
  mockBars['M'] = m.bars;
  mockAux['M'] = genAuxData(MOCK_SEED + 2, m.bars, m.regimes);
}

initMockData();

// 2. 策略执行与回测计算通用封装
export function executeBacktest(
  ruleKey: string,
  params: IndicatorParams,
  symbols: string[] = DEFAULT_SYMBOLS,
  cfg: BacktestConfigInternal = { capital: 1000000, lots: 6, feeBp: 1, slipTicks: 1, execAt: 'close' },
  savedAt?: string
): IndicatorVersionResult {
  const symbolBarsMap: Record<string, Bar[]> = {};
  const symbolSignalsMap: Record<string, Signal[]> = {};

  let ruleFunc = basisMaResonanceRule;
  if (ruleKey === 'inventoryTurningPoint') ruleFunc = inventoryTurningPointRule;
  if (ruleKey === 'oiMomentum') ruleFunc = oiMomentumRule;

  let activeExitParams = undefined;
  for (const sym of symbols) {
    const bars = mockBars[sym] || mockBars['RB'];
    const aux = mockAux[sym] || mockAux['RB'];
    const res = ruleFunc({ symbol: sym, bars, aux }, params);
    symbolBarsMap[sym] = bars;
    symbolSignalsMap[sym] = res.signals;
    if (res.exitParams) activeExitParams = res.exitParams;
  }

  const btRes = runMultiSymbolBacktest(symbolBarsMap, symbolSignalsMap, cfg, activeExitParams);
  const totalDays = mockBars['RB'].length;
  const kpi = calcKpi(btRes.nav, btRes.trades, totalDays);
  const kpiRecent1Y = calcRecent1YKpi(btRes.nav, btRes.trades, totalDays);
  const yearly = calcYearlyMetrics(mockBars['RB'], btRes.trades, btRes.nav);
  const perSymbol = calcSymbolMetrics(btRes, symbolBarsMap);

  let kpiAfterSave = undefined;
  if (savedAt) {
    kpiAfterSave = calcAfterSaveMetrics(savedAt, mockBars['RB'], btRes.trades);
  }

  return {
    kpi,
    kpiRecent1Y,
    kpiAfterSave,
    trades: btRes.trades,
    positions: btRes.positions,
    nav: btRes.nav,
    benchmark: btRes.benchmark,
    drawdown: btRes.drawdown,
    yearly,
    perSymbol,
    symbolSignals: symbolSignalsMap,
  };
}

// 3. 构建提案
export function buildProposal(
  def: ProposalDefinition,
  baseVersion: IndicatorVersion,
  ruleKey: string,
  symbols: string[]
): Proposal {
  const mergedParams = { ...baseVersion.params, ...def.diff };
  const res = executeBacktest(ruleKey, mergedParams, symbols);

  const kpiDiff = {
    annualReturn: Number((res.kpi.annualReturn - baseVersion.result.kpi.annualReturn).toFixed(4)),
    maxDrawdown: Number((res.kpi.maxDrawdown - baseVersion.result.kpi.maxDrawdown).toFixed(4)),
    calmar: Number((res.kpi.calmar - baseVersion.result.kpi.calmar).toFixed(2)),
    recent1YCalmar: Number((res.kpiRecent1Y.calmar - baseVersion.result.kpiRecent1Y.calmar).toFixed(2)),
    trades: res.kpi.trades - baseVersion.result.kpi.trades,
  };

  return {
    id: def.id,
    baseVersionId: baseVersion.id,
    title: def.title,
    changeType: def.changeType,
    changeSummary: def.changeSummary,
    diff: def.diff,
    warnings: def.warnings,
    status: 'pending',
    result: res,
    kpiDiff,
  };
}

// 4. 初始状态构建
function buildInitialState() {
  const ind1Params = { ma: 20, basisWindow: 20, threshold: 0 };
  const ind1V1Result = executeBacktest('basisMaResonance', ind1Params, ['RB', 'I', 'M'], undefined, '2025-05-15');
  // 对齐原图精准指标
  ind1V1Result.kpi.annualReturn = 0.195;
  ind1V1Result.kpi.maxDrawdown = -0.104;
  ind1V1Result.kpi.calmar = 1.87;
  ind1V1Result.kpi.winRate = 0.44;

  const ind1V1: IndicatorVersion = {
    id: 'v1',
    label: 'v1',
    changeSummary: '初始构建：基差与均线金叉共振',
    params: ind1Params,
    pythonCode: genPythonScript('基差-均线共振', 'basisMaResonance', ind1Params),
    pineCode: genPineScript('基差-均线共振', 'basisMaResonance', ind1Params),
    savedAt: '2025-05-15',
    result: ind1V1Result,
  };

  const ind1: WorkbenchIndicator = {
    id: 'ind-1',
    name: '基差-均线共振',
    ruleKey: 'basisMaResonance',
    dimension: 'technical',
    symbols: ['RB', 'I', 'M'],
    dependencies: ['基差 (日频)', '螺纹主力连续 (日K)'],
    versions: [ind1V1],
    currentVersionId: 'v1',
    isDirty: false,
    inCandidatePool: true,
  };

  // 初始对话历史
  const propA = buildProposal(CHAT_SCRIPTS[0].proposals[0], ind1V1, 'basisMaResonance', ind1.symbols);
  const propB = buildProposal(CHAT_SCRIPTS[0].proposals[1], ind1V1, 'basisMaResonance', ind1.symbols);

  // 指标 2: 螺纹库存拐点
  const ind2Params = { invWindow: 15, maPeriod: 20 };
  const ind2V1Result = executeBacktest('inventoryTurningPoint', ind2Params, ['RB']);
  ind2V1Result.kpi.annualReturn = 0.157;
  ind2V1Result.kpi.maxDrawdown = -0.162;
  ind2V1Result.kpi.calmar = 0.97;
  ind2V1Result.kpi.winRate = 0.32;

  const ind2: WorkbenchIndicator = {
    id: 'ind-2',
    name: '螺纹库存拐点',
    ruleKey: 'inventoryTurningPoint',
    dimension: 'fundamental',
    symbols: ['RB'],
    dependencies: ['螺纹钢总库存 (周频)', '螺纹主力连续 (日K)'],
    versions: [
      {
        id: 'v1',
        label: 'v1',
        changeSummary: '周频库存去化拐点与价格20日均线共振',
        params: ind2Params,
        pythonCode: genPythonScript('螺纹库存拐点', 'inventoryTurningPoint', ind2Params),
        pineCode: genPineScript('螺纹库存拐点', 'inventoryTurningPoint', ind2Params),
        savedAt: '2025-05-10',
        result: ind2V1Result,
      },
    ],
    currentVersionId: 'v1',
    isDirty: false,
    inCandidatePool: true,
  };

  // 指标 3: 主力持仓异动
  const ind3Params = { oiWindow: 10, oiThreshold: 500 };
  const ind3V1Result = executeBacktest('oiMomentum', ind3Params, ['RB', 'I', 'M']);
  ind3V1Result.kpi.annualReturn = 0.040;
  ind3V1Result.kpi.maxDrawdown = -0.224;
  ind3V1Result.kpi.calmar = 0.18;
  ind3V1Result.kpi.winRate = 0.36;

  const ind3: WorkbenchIndicator = {
    id: 'ind-3',
    name: '主力持仓变化',
    ruleKey: 'oiMomentum',
    dimension: 'capital',
    symbols: ['RB', 'I', 'M'],
    dependencies: ['前20名主力净多持仓变化', '螺纹/铁矿/豆粕主力连续'],
    versions: [
      {
        id: 'v1',
        label: 'v1',
        changeSummary: '持仓异动持续放量动量',
        params: ind3Params,
        pythonCode: genPythonScript('主力持仓变化', 'oiMomentum', ind3Params),
        pineCode: genPineScript('主力持仓变化', 'oiMomentum', ind3Params),
        savedAt: '2025-05-12',
        result: ind3V1Result,
      },
    ],
    currentVersionId: 'v1',
    isDirty: false,
    inCandidatePool: true,
  };

  const overviewCards = [
    {
      id: 'ind-1',
      name: '基差-均线共振',
      dimension: '技术面',
      symbols: ['RB', 'I', 'M'],
      kpi: {
        annualReturn: 0.195,
        maxDrawdown: -0.104,
        calmar: 1.87,
        winRate: 0.44,
      },
      navSeries: ind1V1Result.nav,
    },
    {
      id: 'ind-2',
      name: '螺纹库存拐点',
      dimension: '基本面',
      symbols: ['RB'],
      kpi: {
        annualReturn: 0.157,
        maxDrawdown: -0.162,
        calmar: 0.97,
        winRate: 0.32,
      },
      navSeries: ind2V1Result.nav,
    },
    {
      id: 'ind-3',
      name: '主力持仓变化',
      dimension: '资金面',
      symbols: ['RB', 'I', 'M'],
      kpi: {
        annualReturn: 0.040,
        maxDrawdown: -0.224,
        calmar: 0.18,
        winRate: 0.36,
      },
      navSeries: ind3V1Result.nav,
    },
  ];

  const overviewMessage: ChatMessage = {
    id: 'msg-overview-3ind',
    role: 'ai',
    text: '已生成 3 个指标，均已完成回测。点击卡片查看，或直接告诉我你的调整要求。',
    timestamp: '10:24',
    indicatorCards: overviewCards,
  };

  const initialChat: ChatMessage[] = [
    overviewMessage,
    {
      id: 'msg-user-1',
      role: 'user',
      text: '回撤太大了，想稳一点',
      timestamp: '10:26',
    },
    {
      id: 'msg-ai-1',
      role: 'ai',
      text: '回撤主要出现在均线反复穿越的低波动震荡行情中，给出 2 个调优方案：',
      timestamp: '10:26',
      proposals: [propA, propB],
    },
  ];

  const ind1Sessions: ChatSession[] = [
    {
      id: 'sess-1',
      title: '策略初始构建与回撤调优',
      createdAt: '10:24',
      messages: initialChat,
    },
    {
      id: 'sess-2',
      title: '均线周期敏感度探索',
      createdAt: '10:40',
      messages: [
        overviewMessage,
        {
          id: 'msg-s2-ai-1',
          role: 'ai',
          text: '已开启新探讨【均线周期敏感度探索】。您可以继续提出不同的优化要求，比如测试 30/60 周期慢线、尝试加入波动率滤波或切换主力合约回测。',
          timestamp: '10:40',
        },
      ],
    },
  ];

  const ind2Sessions: ChatSession[] = [
    {
      id: 'sess-ind2-1',
      title: '螺纹库存拐点初测',
      createdAt: '09:15',
      messages: [
        overviewMessage,
        {
          id: 'ind2-msg1',
          role: 'ai',
          text: '已生成「螺纹库存拐点」指标：利用周度库存二阶差分平滑识别拐点，在库存进入去化周期且价格站上趋势线时建立多头。',
          timestamp: '09:15',
          badge: '初始构建',
        },
      ],
    },
  ];

  const ind3Sessions: ChatSession[] = [
    {
      id: 'sess-ind3-1',
      title: '主力持仓异动动量',
      createdAt: '09:30',
      messages: [
        overviewMessage,
        {
          id: 'ind3-msg1',
          role: 'ai',
          text: '已生成「主力持仓变化」指标：监控会员持仓前20名机构的多空异动，在净多头持仓发生显著正向偏离时触发跟随动量。',
          timestamp: '09:30',
          badge: '初始构建',
        },
      ],
    },
  ];

  const sessionsMap: Record<string, ChatSession[]> = {
    'ind-1': ind1Sessions,
    'ind-2': ind2Sessions,
    'ind-3': ind3Sessions,
  };

  const activeSessionIdMap: Record<string, string> = {
    'ind-1': 'sess-1',
    'ind-2': 'sess-ind2-1',
    'ind-3': 'sess-ind3-1',
  };

  return {
    indicators: [ind1, ind2, ind3],
    activeIndicatorId: 'ind-1',
    sessionsMap,
    activeSessionIdMap,
    chatMap: {
      'ind-1': ind1Sessions[0].messages,
      'ind-2': ind2Sessions[0].messages,
      'ind-3': ind3Sessions[0].messages,
    } as Record<string, ChatMessage[]>,
  };
}

// 5. 状态单例与订阅机制 (原生轻量 Store)
class WorkbenchStore {
  private state = {
    ...buildInitialState(),
    previewProposal: null as Proposal | null,
    selectedSymbol: 'RB' as string,
    timeRange: 'all' as '1Y' | '3Y' | '5Y' | 'all',
    layerVisibility: {
      signals: true,
      positions: true,
      benchmark: true,
    },
    targetUniverse: {
      exchanges: ['SHFE', 'DCE', 'CZCE'],
      selectedSymbols: ['RB', 'I', 'M'],
      contractType: 'main' as const,
      specificMonth: '2506',
      rollAdjustment: 'post' as const,
      frequency: '1d' as const,
      dataSources: {
        reports: true,
        opinions: true,
        industry: true,
        market: true,
      },
    } as TargetUniverse,
    focusedTradeDate: null as string | null,
    activeTab: 'workbench' as 'workbench' | 'candidatePool',
    backtestConfig: {
      execTiming: 'close' as 'close' | 'next_open',
      feeBp: 1,
      slipTicks: 1,
      initialCapital: 1000000,
    },
    isBacktestDrawerOpen: false,
    isBsDrawerOpen: false,
  };

  private listeners = new Set<() => void>();

  public getState() {
    return this.state;
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 动作
  public setActiveTab(tab: 'workbench' | 'candidatePool') {
    this.state.activeTab = tab;
    this.notify();
  }

  public setActiveIndicator(id: string) {
    this.state.activeIndicatorId = id;
    this.state.previewProposal = null;
    const activeSession = this.getActiveSession(id);
    if (activeSession) {
      this.state.chatMap[id] = activeSession.messages;
    }
    this.notify();
  }

  // 会话管理方法
  public getSessions(indicatorId?: string): ChatSession[] {
    const id = indicatorId || this.state.activeIndicatorId;
    return this.state.sessionsMap[id] || [];
  }

  public getActiveSessionId(indicatorId?: string): string {
    const id = indicatorId || this.state.activeIndicatorId;
    const sessions = this.getSessions(id);
    return this.state.activeSessionIdMap[id] || (sessions[0]?.id ?? '');
  }

  public getActiveSession(indicatorId?: string): ChatSession | undefined {
    const id = indicatorId || this.state.activeIndicatorId;
    const sessions = this.getSessions(id);
    const activeId = this.getActiveSessionId(id);
    return sessions.find(s => s.id === activeId) || sessions[0];
  }

  public switchSession(sessionId: string, indicatorId?: string) {
    const id = indicatorId || this.state.activeIndicatorId;
    if (indicatorId && indicatorId !== this.state.activeIndicatorId) {
      this.state.activeIndicatorId = indicatorId;
    }
    const sessions = this.getSessions(id);
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;

    this.state.activeSessionIdMap[id] = sessionId;
    this.state.chatMap[id] = target.messages;
    this.notify();
  }

  public createSession(title?: string, indicatorId?: string): string {
    const id = indicatorId || this.state.activeIndicatorId;
    if (indicatorId && indicatorId !== this.state.activeIndicatorId) {
      this.state.activeIndicatorId = indicatorId;
    }
    const sessions = this.state.sessionsMap[id] || [];
    const ind = this.state.indicators.find(x => x.id === id);
    const nextNum = sessions.length + 1;
    const newSessionId = `sess-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: title || (nextNum === 1 ? '初始构建与回测调优' : `调优探讨 ${nextNum}`),
      createdAt: new Date().toTimeString().slice(0, 5),
      messages: [
        {
          id: `ai-init-${Date.now()}`,
          role: 'ai',
          text: `已开启新探讨【${title || `调优探讨 ${nextNum}`}】。您可以针对「${ind?.name || '当前指标'}」提出新的优化目标、调整假设或验证不同市场状态。`,
          timestamp: new Date().toTimeString().slice(0, 5),
        },
      ],
    };

    sessions.push(newSession);
    this.state.sessionsMap[id] = sessions;
    this.state.activeSessionIdMap[id] = newSessionId;
    this.state.chatMap[id] = newSession.messages;
    this.notify();
    return newSessionId;
  }

  public renameSession(sessionId: string, newTitle: string, indicatorId?: string) {
    const id = indicatorId || this.state.activeIndicatorId;
    const sessions = this.getSessions(id);
    const target = sessions.find(s => s.id === sessionId);
    if (target && newTitle.trim()) {
      target.title = newTitle.trim();
      this.notify();
    }
  }

  public deleteSession(sessionId: string, indicatorId?: string) {
    const id = indicatorId || this.state.activeIndicatorId;
    const sessions = this.getSessions(id);
    if (sessions.length <= 1) return; // 至少保留一个会话

    const filtered = sessions.filter(s => s.id !== sessionId);
    this.state.sessionsMap[id] = filtered;

    if (this.state.activeSessionIdMap[id] === sessionId) {
      const nextActive = filtered[0];
      this.state.activeSessionIdMap[id] = nextActive.id;
      this.state.chatMap[id] = nextActive.messages;
    }
    this.notify();
  }

  public setSelectedSymbol(sym: string) {
    this.state.selectedSymbol = sym;
    this.notify();
  }

  public setTimeRange(range: '1Y' | '3Y' | '5Y' | 'all') {
    this.state.timeRange = range;
    this.notify();
  }

  public toggleLayer(key: 'signals' | 'positions' | 'benchmark') {
    this.state.layerVisibility[key] = !this.state.layerVisibility[key];
    this.notify();
  }

  public setFocusedTradeDate(date: string | null) {
    this.state.focusedTradeDate = date;
    this.notify();
  }

  public setPreviewProposal(proposal: Proposal | null) {
    this.state.previewProposal = proposal;
    this.notify();
  }

  public switchVersion(versionId: string) {
    const ind = this.getActiveIndicator();
    if (!ind) return;
    const v = ind.versions.find(x => x.id === versionId);
    if (!v) return;
    ind.currentVersionId = versionId;
    ind.isDirty = false;
    this.state.previewProposal = null;
    this.notify();
  }

  public saveCurrentVersion() {
    const ind = this.getActiveIndicator();
    if (!ind) return;
    const curV = ind.versions.find(x => x.id === ind.currentVersionId);
    if (!curV) return;

    curV.savedAt = new Date().toISOString().slice(0, 10);
    ind.isDirty = false;
    // 重新计算带 savedAt 的后续统计
    curV.result.kpiAfterSave = calcAfterSaveMetrics(curV.savedAt, mockBars['RB'], curV.result.trades);
    this.notify();
  }

  public applyProposal(proposal: Proposal) {
    const ind = this.getActiveIndicator();
    if (!ind) return;

    const newVerNum = ind.versions.length + 1;
    const newVerId = `v${newVerNum}`;
    const newParams = { ...proposal.diff };

    const newVersion: IndicatorVersion = {
      id: newVerId,
      label: newVerId,
      changeSummary: `${proposal.title} (${proposal.changeSummary})`,
      params: { ...ind.versions[0].params, ...newParams },
      pythonCode: genPythonScript(ind.name, ind.ruleKey, { ...ind.versions[0].params, ...newParams }),
      pineCode: genPineScript(ind.name, ind.ruleKey, { ...ind.versions[0].params, ...newParams }),
      savedAt: new Date().toISOString().slice(0, 10),
      result: proposal.result,
    };

    ind.versions.push(newVersion);
    ind.currentVersionId = newVerId;
    ind.isDirty = false;
    this.state.previewProposal = null;

    // 添加 AI 确认反馈消息
    const curSession = this.getActiveSession(ind.id);
    if (curSession) {
      curSession.messages.push({
        id: `msg-applied-${Date.now()}`,
        role: 'ai',
        text: `已将「${proposal.title}」应用为 ${newVerId} 版本，回测引擎已即时更新指标曲线与全量交易明细。`,
        timestamp: new Date().toTimeString().slice(0, 5),
        badge: `已生成 ${newVerId}`,
      });
      this.state.chatMap[ind.id] = curSession.messages;
    }

    this.notify();
  }

  public updateParams(newParams: IndicatorParams) {
    const ind = this.getActiveIndicator();
    if (!ind) return;
    const curV = ind.versions.find(x => x.id === ind.currentVersionId);
    if (!curV) return;

    curV.params = { ...curV.params, ...newParams };
    curV.pythonCode = genPythonScript(ind.name, ind.ruleKey, curV.params);
    curV.pineCode = genPineScript(ind.name, ind.ruleKey, curV.params);
    curV.result = executeBacktest(ind.ruleKey, curV.params, ind.symbols, this.getBacktestConfigInternal(), curV.savedAt);
    ind.isDirty = true;
    this.notify();
  }

  public setBacktestDrawerOpen(open: boolean) {
    this.state.isBacktestDrawerOpen = open;
    this.notify();
  }

  public setBsDrawerOpen(open: boolean) {
    this.state.isBsDrawerOpen = open;
    if (open) {
      this.state.layerVisibility.signals = true;
    }
    this.notify();
  }

  public toggleBsDrawer() {
    this.setBsDrawerOpen(!this.state.isBsDrawerOpen);
  }

  public getBacktestConfigInternal(): BacktestConfigInternal {
    return {
      capital: this.state.backtestConfig.initialCapital,
      feeBp: this.state.backtestConfig.feeBp,
      slipTicks: this.state.backtestConfig.slipTicks,
      execAt: this.state.backtestConfig.execTiming,
    };
  }

  public applyBacktestConfig(newConfig: {
    execTiming: 'close' | 'next_open';
    feeBp: number;
    slipTicks: number;
    initialCapital: number;
  }) {
    this.state.backtestConfig = { ...newConfig };
    const cfgInternal: BacktestConfigInternal = {
      capital: newConfig.initialCapital,
      feeBp: newConfig.feeBp,
      slipTicks: newConfig.slipTicks,
      execAt: newConfig.execTiming,
    };

    // 应用后将按新配置对全部指标的各版本重新回测，KPI 与图表同步更新；已入池的候选条目保持入池时的快照不变
    for (const ind of this.state.indicators) {
      for (const ver of ind.versions) {
        ver.result = executeBacktest(ind.ruleKey, ver.params, ind.symbols, cfgInternal, ver.savedAt);
      }
    }

    this.state.isBacktestDrawerOpen = false;
    this.notify();
  }

  public toggleCandidatePool(indicatorId?: string) {
    const id = indicatorId || this.state.activeIndicatorId;
    const ind = this.state.indicators.find(x => x.id === id);
    if (ind) {
      ind.inCandidatePool = !ind.inCandidatePool;
      this.notify();
    }
  }

  public updateTargetUniverse(univ: Partial<TargetUniverse>) {
    this.state.targetUniverse = { ...this.state.targetUniverse, ...univ };
    this.notify();
  }

  public addNewIndicator(name: string, ruleKey: string, dimension: 'fundamental' | 'technical' | 'capital') {
    const id = `ind-${Date.now()}`;
    const params = ruleKey === 'oiMomentum' ? { oiWindow: 10, oiThreshold: 500 } : { ma: 20, basisWindow: 20, threshold: 0 };
    const res = executeBacktest(ruleKey, params, ['RB', 'I', 'M']);

    const newInd: WorkbenchIndicator = {
      id,
      name,
      ruleKey,
      dimension,
      symbols: ['RB', 'I', 'M'],
      dependencies: ['现货基差', '主力连续日K'],
      versions: [
        {
          id: 'v1',
          label: 'v1',
          changeSummary: '新建指标初版',
          params,
          pythonCode: genPythonScript(name, ruleKey, params),
          pineCode: genPineScript(name, ruleKey, params),
          savedAt: new Date().toISOString().slice(0, 10),
          result: res,
        },
      ],
      currentVersionId: 'v1',
      isDirty: false,
      inCandidatePool: false,
    };

    this.state.indicators.push(newInd);
    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      title: '策略初始构建',
      createdAt: new Date().toTimeString().slice(0, 5),
      messages: [
        {
          id: `chat-${Date.now()}`,
          role: 'ai',
          text: `已为您新建指标「${name}」并完成初始回测，可以通过对话提出调整需求。`,
          timestamp: new Date().toTimeString().slice(0, 5),
          badge: '初始构建',
        },
      ],
    };
    this.state.sessionsMap[id] = [newSession];
    this.state.activeSessionIdMap[id] = newSession.id;
    this.state.chatMap[id] = newSession.messages;
    this.state.activeIndicatorId = id;
    this.notify();
  }

  public sendMessage(text: string) {
    const ind = this.getActiveIndicator();
    if (!ind) return;
    const curV = ind.versions.find(x => x.id === ind.currentVersionId);
    if (!curV) return;

    const curSession = this.getActiveSession(ind.id);
    if (!curSession) return;

    const userMsgId = `user-${Date.now()}`;
    curSession.messages.push({
      id: userMsgId,
      role: 'user',
      text,
      timestamp: new Date().toTimeString().slice(0, 5),
    });
    this.state.chatMap[ind.id] = curSession.messages;
    this.notify();

    // 匹配剧本或根据意图生成提案
    let matchedScript = CHAT_SCRIPTS.find(s => s.match.test(text));
    if (!matchedScript) {
      matchedScript = FALLBACK_SCRIPT;
    }

    const proposals: Proposal[] = [];
    if (matchedScript.proposals.length > 0) {
      for (const pDef of matchedScript.proposals) {
        proposals.push(buildProposal(pDef, curV, ind.ruleKey, ind.symbols));
      }
    }

    // 模拟流式或即刻返回 AI 回复
    setTimeout(() => {
      curSession.messages.push({
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: matchedScript!.reply,
        timestamp: new Date().toTimeString().slice(0, 5),
        proposals: proposals.length > 0 ? proposals : undefined,
      });
      this.state.chatMap[ind.id] = curSession.messages;
      this.notify();
    }, 450);
  }

  public getActiveIndicator(): WorkbenchIndicator | undefined {
    return this.state.indicators.find(x => x.id === this.state.activeIndicatorId);
  }
}

export const workbenchStore = new WorkbenchStore();

export function useWorkbenchStore() {
  const [state, setState] = useState(() => workbenchStore.getState());

  useEffect(() => {
    return workbenchStore.subscribe(() => {
      setState({ ...workbenchStore.getState() });
    });
  }, []);

  return {
    state,
    store: workbenchStore,
    activeIndicator: workbenchStore.getActiveIndicator(),
  };
}
