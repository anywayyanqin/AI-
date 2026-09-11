import React, { useState } from 'react';
import {
  Indicator,
  DimensionType,
  IndicatorStatus,
  ChatMessage,
  TargetUniverse,
} from '../types';
import { SAMPLE_PYTHON_CODE, SAMPLE_PINE_CODE } from '../mockData';
import { CodeViewerModal } from './CodeViewerModal';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Plus,
  Play,
  Trash2,
  Copy,
  ExternalLink,
  Code,
  FileCode,
  CheckCircle2,
  Layers,
  ChevronRight,
  Search,
  BookOpen,
  Database,
  ArrowRight,
  TrendingUp,
  Cpu,
  Coins,
  Check,
  Edit3,
} from 'lucide-react';

interface PageIndicatorWorkbenchProps {
  universe: TargetUniverse;
  indicators: Indicator[];
  onAddIndicators: (newIndicators: Indicator[]) => void;
  onUpdateIndicator: (updated: Indicator) => void;
  onDeleteIndicator: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onGoToBacktest: (indicatorIds: string[]) => void;
  onGoToExport: (indicatorIds: string[]) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const PageIndicatorWorkbench: React.FC<PageIndicatorWorkbenchProps> = ({
  universe,
  indicators,
  onAddIndicators,
  onUpdateIndicator,
  onDeleteIndicator,
  onBatchDelete,
  onGoToBacktest,
  onGoToExport,
  chatMessages,
  setChatMessages,
}) => {
  // Input state
  const [inputText, setInputText] = useState('');
  const [alsoGeneratePine, setAlsoGeneratePine] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter state for indicator list
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');
  const [symbolFilter, setSymbolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected indicator for detail inspection
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>(
    indicators[1]?.id || indicators[0]?.id || ''
  );
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Code preview mode in detail: 'python' | 'pine'
  const [codeTab, setCodeTab] = useState<'python' | 'pine'>('python');
  const [modalCode, setModalCode] = useState<{
    isOpen: boolean;
    title: string;
    code: string;
    language: 'python' | 'pinescript';
    filename: string;
  }>({
    isOpen: false,
    title: '',
    code: '',
    language: 'python',
    filename: '',
  });

  // Parameter editing buffer for the selected indicator
  const selectedIndicator =
    indicators.find((ind) => ind.id === selectedIndicatorId) || indicators[0];
  const [editingParams, setEditingParams] = useState<Record<string, any>>(
    selectedIndicator?.params || {}
  );
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync edit buffer when selected indicator changes
  React.useEffect(() => {
    if (selectedIndicator) {
      setEditingParams({ ...selectedIndicator.params });
    }
  }, [selectedIndicatorId]);

  // Handle template quick clicks
  const handleQuickTemplate = (category: string, title: string) => {
    const symbolStr = universe.selectedSymbols.join('/') || 'RB';
    let query = '';
    if (category === 'fundamental') {
      if (title.includes('库存')) {
        query = `结合${symbolStr}钢厂和社库去化率，以及现货贴水率>5%时生成逢低做多策略`;
      } else if (title.includes('利润')) {
        query = `基于${symbolStr}盘面盘面加工费/即时炼钢毛利极端低位，捕捉利润均值回归做多信号`;
      } else {
        query = `根据${symbolStr}现货升水持续扩大与基差率突破20日均值生成做多信号`;
      }
    } else if (category === 'technical') {
      if (title.includes('均线')) {
        query = `收盘价突破MA20并且伴随成交量放大，结合基差方向进行共振确认`;
      } else if (title.includes('突破')) {
        query = `${symbolStr}价格突破近20日唐奇安通道上轨，同时持仓量稳步增加`;
      } else {
        query = `根据${symbolStr}真实波动幅度ATR极度压缩后放量反弹生成波动率突变信号`;
      }
    } else {
      if (title.includes('持仓')) {
        query = `跟踪${symbolStr}前20大会员主力净多增仓排名前3且持仓集中度走高时顺势做多`;
      } else if (title.includes('仓单')) {
        query = `交易所注册仓单处于近3年同季低位，配合主力多头连续增仓发起上攻`;
      } else {
        query = `监控${symbolStr}日内沉淀资金净流入与换手率异常放大时多头进场`;
      }
    }
    triggerAiGeneration(query);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isGenerating) return;
    const q = inputText;
    setInputText('');
    triggerAiGeneration(q);
  };

  const triggerAiGeneration = (queryText: string) => {
    setIsGenerating(true);
    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toTimeString().slice(0, 5),
    };

    setChatMessages((prev) => [...prev, newUserMsg]);

    // Simulated AI streaming delay
    setTimeout(() => {
      const primarySymbol = universe.selectedSymbols[0] || 'RB';
      const secondarySymbol = universe.selectedSymbols[1] || 'I';

      const candidateA: Indicator = {
        id: `gen-${Date.now()}-1`,
        name: `${primarySymbol}基本面·供需库存平衡`,
        dimension: 'fundamental',
        symbols: [primarySymbol],
        contractType: universe.contractType,
        logicText: `当${primarySymbol}产业链社会库存环比去化超2.5%，且现货基差处于历史贴水区间时触发做多；累库超2周且基差走弱翻空。`,
        params: { invDecRate: 2.5, basisDiscount: 4.5, holdDays: 15 },
        pythonCode: SAMPLE_PYTHON_CODE,
        pineCode: SAMPLE_PINE_CODE,
        dependencies: [
          `quote:${primarySymbol}主力`,
          'inventory:industryDB',
          'report:#192:头部券商产业供需动态评估',
        ],
        status: 'generated',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        score: 4,
      };

      const candidateB: Indicator = {
        id: `gen-${Date.now()}-2`,
        name: `${primarySymbol}/${secondarySymbol}技术共振通道`,
        dimension: 'technical',
        symbols: [primarySymbol, secondarySymbol],
        contractType: universe.contractType,
        logicText: `当${primarySymbol}突破20日均线且${secondarySymbol}未破位支撑，且基差率>20日中枢时触发多头信号；破位离场。`,
        params: { maLen: 20, breakThreshold: 0.01, atrStop: 2.0 },
        pythonCode: SAMPLE_PYTHON_CODE,
        pineCode: SAMPLE_PINE_CODE,
        dependencies: [
          `quote:${primarySymbol}主力`,
          `quote:${secondarySymbol}主力`,
          'report:#105:CTA多周期通道策略模型',
        ],
        status: 'generated',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        score: 4,
      };

      const candidateC: Indicator = {
        id: `gen-${Date.now()}-3`,
        name: `${primarySymbol}资金席位异动增仓`,
        dimension: 'capital',
        symbols: [primarySymbol],
        contractType: universe.contractType,
        logicText: `跟踪交易所主力席位多空持仓。前5名多头会员净增仓比率>12%且多空持仓比突破近20日高点时开多。`,
        params: { topRank: 5, posRateThresh: 12.0, days: 20 },
        pythonCode: SAMPLE_PYTHON_CODE,
        pineCode: SAMPLE_PINE_CODE,
        dependencies: [
          `quote:${primarySymbol}主力`,
          'exchange_pos:marketPublic',
          'opinion:#311:期现龙虎榜动量追踪',
        ],
        status: 'generated',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        score: 3,
      };

      const newAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `已根据您的逻辑【${queryText}】以及当前标的池(${universe.selectedSymbols.join(
          '/'
        )})，联合研报因子库与产业数据库生成 3 个候选量化指标：${
          alsoGeneratePine ? '（已同步生成 TradingView Pine Script v5 代码）' : ''
        }`,
        timestamp: new Date().toTimeString().slice(0, 5),
        references: [
          `研报库: #${Math.floor(Math.random() * 200 + 100)} 期货深度专题`,
          '产业数据库: 现货升贴水与库存高频表',
          '市场公开数据: 交易所主力持仓会员龙虎榜',
        ],
        candidateIndicators: [candidateA, candidateB, candidateC],
      };

      setChatMessages((prev) => [...prev, newAiMsg]);
      setIsGenerating(false);
    }, 1200);
  };

  // Filter indicators
  const filteredIndicators = indicators.filter((ind) => {
    if (dimensionFilter !== 'all' && ind.dimension !== dimensionFilter)
      return false;
    if (symbolFilter !== 'all' && !ind.symbols.includes(symbolFilter))
      return false;
    if (statusFilter !== 'all' && ind.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ind.name.toLowerCase().includes(q);
      const matchLogic = ind.logicText.toLowerCase().includes(q);
      const matchSym = ind.symbols.some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchLogic && !matchSym) return false;
    }
    return true;
  });

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllInTable = () => {
    if (checkedIds.length === filteredIndicators.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(filteredIndicators.map((i) => i.id));
    }
  };

  const handleSaveParams = () => {
    if (!selectedIndicator) return;
    const updated: Indicator = {
      ...selectedIndicator,
      params: { ...editingParams },
    };
    onUpdateIndicator(updated);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2000);
  };

  const handleDuplicate = () => {
    if (!selectedIndicator) return;
    const copy: Indicator = {
      ...selectedIndicator,
      id: `ind-${Date.now()}`,
      name: `${selectedIndicator.name} (副本)`,
      status: 'draft',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onAddIndicators([copy]);
    setSelectedIndicatorId(copy.id);
  };

  const getDimensionBadge = (dim: DimensionType) => {
    switch (dim) {
      case 'fundamental':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <BookOpen className="w-3 h-3 mr-1 text-emerald-600" />
            基本面
          </span>
        );
      case 'technical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <TrendingUp className="w-3 h-3 mr-1 text-blue-600" />
            技术面
          </span>
        );
      case 'capital':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Coins className="w-3 h-3 mr-1 text-purple-600" />
            资金面
          </span>
        );
    }
  };

  const getStatusBadge = (status: IndicatorStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
            草稿
          </span>
        );
      case 'generated':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-medium">
            已生成
          </span>
        );
      case 'backtested':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            已回测
          </span>
        );
      case 'exported':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
            已导出 TV
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8.5rem)] min-h-[700px] bg-slate-50 text-slate-900 overflow-hidden">
      {/* ======================================================== */}
      {/* AREA A: Left Conversational AI Generation Area (~40%)   */}
      {/* ======================================================== */}
      <section className="w-full lg:w-[40%] flex flex-col border-r border-slate-200 bg-white">
        {/* Chat Area Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                A. 对话生成区
              </h2>
              <span className="text-[11px] text-slate-500">
                三维信号生成：基本面 · 技术面 · 资金面
              </span>
            </div>
          </div>
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono font-medium">
            {universe.selectedSymbols.join(', ') || '未选品种'}
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[92%] ${
                  msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-blue-600 shadow-2xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`rounded-xl p-3 text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Reference Sources */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center space-x-1">
                        <Database className="w-3 h-3 text-blue-600" />
                        <span>引用知识库 & 数据库来源:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.references.map((ref, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Candidate Indicators Cards */}
                  {msg.candidateIndicators &&
                    msg.candidateIndicators.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[11px] font-semibold text-slate-700">
                            候选指标 ({msg.candidateIndicators.length})
                          </span>
                          <button
                            onClick={() =>
                              onAddIndicators(msg.candidateIndicators || [])
                            }
                            className="text-[11px] text-blue-700 hover:text-blue-800 flex items-center space-x-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100/70 font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>全部加入列表</span>
                          </button>
                        </div>

                        {msg.candidateIndicators.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:border-blue-300 hover:bg-white hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getDimensionBadge(candidate.dimension)}
                                <span className="font-semibold text-slate-900">
                                  {candidate.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                {candidate.symbols.join('/')}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                              {candidate.logicText}
                            </p>

                            <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
                                <span>参数:</span>
                                {Object.entries(candidate.params).map(
                                  ([k, v]) => (
                                    <span key={k} className="text-slate-700 font-semibold">
                                      {k}={v}
                                    </span>
                                  )
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  onAddIndicators([candidate]);
                                  setSelectedIndicatorId(candidate.id);
                                }}
                                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center space-x-0.5"
                              >
                                <span>加入列表</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-8">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-start space-x-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 shadow-xs">
                <div className="flex items-center space-x-2 text-blue-600 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>正在深度检索研报库、产业数据库和交易所持仓数据...</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  结合标的池【{universe.selectedSymbols.join('/')}
                  】，基于基本面、技术面、资金面三维度生成信号指标中...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Template Buttons */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="text-[11px] text-slate-500 mb-1.5 flex items-center justify-between">
            <span className="font-medium">快捷生成模板:</span>
            <span className="text-[10px] text-slate-400">点击自动填充并生成</span>
          </div>
          <div className="space-y-1.5">
            {/* Fundamental */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-emerald-700 font-semibold w-12 shrink-0">
                基本面:
              </span>
              <div className="flex flex-wrap gap-1">
                {['库存拐点', '盘面利润', '基差极值'].map((title) => (
                  <button
                    key={title}
                    id={`tmpl-fund-${title}`}
                    onClick={() => handleQuickTemplate('fundamental', title)}
                    className="px-2 py-0.5 rounded text-[11px] bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Technical */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-blue-700 font-semibold w-12 shrink-0">
                技术面:
              </span>
              <div className="flex flex-wrap gap-1">
                {['均线共振', '突破通道', '波动率ATR'].map((title) => (
                  <button
                    key={title}
                    id={`tmpl-tech-${title}`}
                    onClick={() => handleQuickTemplate('technical', title)}
                    className="px-2 py-0.5 rounded text-[11px] bg-white hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Capital */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-purple-700 font-semibold w-12 shrink-0">
                资金面:
              </span>
              <div className="flex flex-wrap gap-1">
                {['持仓变化', '仓单共振', '资金流异动'].map((title) => (
                  <button
                    key={title}
                    id={`tmpl-cap-${title}`}
                    onClick={() => handleQuickTemplate('capital', title)}
                    className="px-2 py-0.5 rounded text-[11px] bg-white hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <input
              id="input-chat-query"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="请输入您想要的交易信号逻辑（如：结合基差与螺纹持仓异动生成做多信号）..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
            <button
              id="btn-send-chat"
              onClick={handleSendMessage}
              disabled={isGenerating || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors shrink-0"
            >
              <span>发送</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-800">
              <input
                type="checkbox"
                checked={alsoGeneratePine}
                onChange={(e) => setAlsoGeneratePine(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span>同时生成 TradingView Pine Script 代码</span>
            </label>
            <span className="text-[10px] text-slate-400">按 Enter 发送</span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* AREA B & C: Right Area (~60%): List (B) + Detail (C)     */}
      {/* ======================================================== */}
      <section className="w-full lg:w-[60%] flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* ====================================================== */}
        {/* AREA B: Indicator List & Management                   */}
        {/* ====================================================== */}
        <div className="flex-1 flex flex-col min-h-[300px] border-b border-slate-200">
          {/* Filter Toolbar */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>B. 指标列表 / 管理区</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                (共 {filteredIndicators.length} 条)
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Dimension Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 text-[11px]">维度:</span>
                <select
                  id="filter-dimension"
                  value={dimensionFilter}
                  onChange={(e) => setDimensionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="all">全部维度</option>
                  <option value="fundamental">基本面</option>
                  <option value="technical">技术面</option>
                  <option value="capital">资金面</option>
                </select>
              </div>

              {/* Symbol Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 text-[11px]">品种:</span>
                <select
                  id="filter-symbol"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                >
                  <option value="all">全部品种</option>
                  {universe.selectedSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 text-[11px]">状态:</span>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="all">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="generated">已生成</option>
                  <option value="backtested">已回测</option>
                  <option value="exported">已导出</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  id="filter-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索指标或逻辑..."
                  className="bg-slate-50 border border-slate-300 rounded pl-6 pr-2 py-0.5 text-xs text-slate-900 placeholder-slate-400 w-32 focus:w-44 transition-all focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={
                        checkedIds.length > 0 &&
                        checkedIds.length === filteredIndicators.length
                      }
                      onChange={handleSelectAllInTable}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                    />
                  </th>
                  <th className="p-2.5 w-8">#</th>
                  <th className="p-2.5 font-semibold">指标名称</th>
                  <th className="p-2.5 font-semibold w-24">维度</th>
                  <th className="p-2.5 font-semibold w-20">品种</th>
                  <th className="p-2.5 font-semibold w-24">状态</th>
                  <th className="p-2.5 font-semibold w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIndicators.map((ind, idx) => {
                  const isSelected = ind.id === selectedIndicatorId;
                  const isChecked = checkedIds.includes(ind.id);
                  return (
                    <tr
                      key={ind.id}
                      onClick={() => setSelectedIndicatorId(ind.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-2 border-l-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className="p-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCheck(ind.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                        />
                      </td>
                      <td className="p-2.5 text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{ind.name}</span>
                          {ind.id.startsWith('gen-') && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-medium">
                              AI新生成
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5">{getDimensionBadge(ind.dimension)}</td>
                      <td className="p-2.5 font-mono text-slate-600 font-medium">
                        {ind.symbols.join('/')}
                      </td>
                      <td className="p-2.5">{getStatusBadge(ind.status)}</td>
                      <td
                        className="p-2.5 text-right space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedIndicatorId(ind.id)}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => onGoToBacktest([ind.id])}
                          className="px-2 py-0.5 rounded text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center space-x-1 shadow-2xs"
                        >
                          <Play className="w-3 h-3" />
                          <span>回测</span>
                        </button>
                        <button
                          onClick={() => onDeleteIndicator(ind.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Batch Action Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 text-[11px] font-medium">
                已选 {checkedIds.length} 项:
              </span>
              <button
                id="btn-batch-backtest"
                disabled={checkedIds.length === 0}
                onClick={() => onGoToBacktest(checkedIds)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium text-xs flex items-center space-x-1 shadow-2xs"
              >
                <Play className="w-3 h-3" />
                <span>批量回测</span>
              </button>

              <button
                id="btn-batch-delete"
                disabled={checkedIds.length === 0}
                onClick={() => onBatchDelete(checkedIds)}
                className="px-2 py-1 rounded bg-white hover:bg-red-50 hover:text-red-600 disabled:opacity-40 text-slate-700 text-xs border border-slate-300 shadow-2xs"
              >
                删除
              </button>

              <button
                id="btn-batch-export"
                disabled={checkedIds.length === 0}
                onClick={() => onGoToExport(checkedIds)}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-xs flex items-center space-x-1 shadow-2xs"
              >
                <FileCode className="w-3 h-3" />
                <span>导出选中到 TV</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
              <span>
                共 {filteredIndicators.length} 条 · 第 1/1 页
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* AREA C: Selected Indicator Details                    */}
        {/* ====================================================== */}
        {selectedIndicator ? (
          <div className="h-64 sm:h-72 flex flex-col bg-white p-3.5 overflow-y-auto space-y-3 border-t border-slate-200">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center space-x-2">
                  <span>C. 指标详情:</span>
                  <span className="text-blue-600">{selectedIndicator.name}</span>
                </h3>
                {getDimensionBadge(selectedIndicator.dimension)}
                <span className="text-[11px] font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                  标的: {selectedIndicator.symbols.join('/')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {saveSuccessNotice && (
                  <span className="text-emerald-600 text-xs flex items-center space-x-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>已保存</span>
                  </span>
                )}
                <button
                  id="btn-save-params"
                  onClick={handleSaveParams}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs"
                >
                  保存参数
                </button>
                <button
                  id="btn-duplicate-indicator"
                  onClick={handleDuplicate}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs border border-slate-300 flex items-center space-x-1 shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  <span>复制为新指标</span>
                </button>
                <button
                  id="btn-goto-backtest-single"
                  onClick={() => onGoToBacktest([selectedIndicator.id])}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center space-x-1 shadow-2xs"
                >
                  <span>去回测</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Signal Logic */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                自然语言信号逻辑:
              </label>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono">
                {selectedIndicator.logicText}
              </div>
            </div>

            {/* Parameters & Code Preview Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Left: Editable Parameters */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 text-[11px] flex items-center space-x-1">
                    <Edit3 className="w-3 h-3 text-blue-600" />
                    <span>策略参数微调:</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(editingParams).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between space-x-2"
                    >
                      <label className="text-slate-600 font-mono text-[11px]">
                        {key}:
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setEditingParams({
                            ...editingParams,
                            [key]: isNaN(Number(e.target.value))
                              ? e.target.value
                              : Number(e.target.value),
                          })
                        }
                        className="w-28 bg-white border border-slate-300 text-slate-900 rounded px-2 py-0.5 text-xs text-right font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Code Preview Toggle */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded border border-slate-300">
                      <button
                        onClick={() => setCodeTab('python')}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                          codeTab === 'python'
                            ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Python (backtest.py)
                      </button>
                      <button
                        onClick={() => setCodeTab('pine')}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                          codeTab === 'pine'
                            ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pine Script (v5)
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setModalCode({
                          isOpen: true,
                          title: `${selectedIndicator.name} - ${
                            codeTab === 'python' ? 'Python 回测脚本' : 'TradingView Pine 脚本'
                          }`,
                          code:
                            codeTab === 'python'
                              ? selectedIndicator.pythonCode
                              : selectedIndicator.pineCode,
                          language: codeTab === 'python' ? 'python' : 'pinescript',
                          filename:
                            codeTab === 'python'
                              ? `${selectedIndicator.name}.py`
                              : `${selectedIndicator.name}.pine`,
                        })
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center space-x-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>展开完整代码</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-2 rounded text-[10px] font-mono text-slate-200 max-h-20 overflow-hidden line-clamp-3 border border-slate-800">
                    {codeTab === 'python'
                      ? selectedIndicator.pythonCode
                      : selectedIndicator.pineCode}
                  </div>
                </div>

                {/* Dependencies */}
                <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto text-[10px]">
                  <span className="text-slate-500 shrink-0 font-medium">数据源:</span>
                  {selectedIndicator.dependencies.map((dep, i) => (
                    <span
                      key={i}
                      className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono whitespace-nowrap shadow-2xs"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            暂无选中指标
          </div>
        )}
      </section>

      {/* Code Viewer Modal */}
      <CodeViewerModal
        isOpen={modalCode.isOpen}
        onClose={() => setModalCode({ ...modalCode, isOpen: false })}
        title={modalCode.title}
        code={modalCode.code}
        language={modalCode.language}
        filename={modalCode.filename}
      />
    </div>
  );
};
