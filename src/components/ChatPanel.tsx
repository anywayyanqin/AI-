import React, { useState, useRef, useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { Proposal, IndicatorOverviewCard } from '../types';
import { formatContractList, getContractName } from '../engine/contractHelper';
import { cleanSessionTitle } from './CodexSidebar';
import {
  Send,
  ChevronDown,
  ChevronRight,
  Eye,
  Check,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  SquarePen,
  MessageSquare,
} from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { state, store, activeIndicator } = useWorkbenchStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Horizontal resizable width state
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chat_panel_width');
      return saved ? Math.max(260, Math.min(700, Number(saved))) : 360;
    } catch {
      return 360;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const startWidthRef = useRef(360);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    startWidthRef.current = width;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartXRef.current;
      const minW = 260;
      const maxW = Math.max(400, Math.min(800, window.innerWidth * 0.55));
      const newW = Math.max(minW, Math.min(maxW, startWidthRef.current + deltaX));
      setWidth(newW);
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const finalDeltaX = upEvent.clientX - dragStartXRef.current;
      const minW = 260;
      const maxW = Math.max(400, Math.min(800, window.innerWidth * 0.55));
      const newW = Math.max(minW, Math.min(maxW, startWidthRef.current + finalDeltaX));
      try {
        localStorage.setItem('chat_panel_width', String(newW));
      } catch {}
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClickSplitter = () => {
    const nextW = width >= 480 ? 360 : 520;
    setWidth(nextW);
    try {
      localStorage.setItem('chat_panel_width', String(nextW));
    } catch {}
    window.dispatchEvent(new Event('resize'));
  };

  const sessions = activeIndicator ? store.getSessions(activeIndicator.id) : [];
  const activeSessionId = activeIndicator ? store.getActiveSessionId(activeIndicator.id) : '';
  const activeSession = activeIndicator ? store.getActiveSession(activeIndicator.id) : undefined;
  const currentSessionIndex = sessions.findIndex(s => s.id === activeSessionId);

  const messages = (activeIndicator && state.chatMap[activeIndicator.id]) || [];
  const curVer = activeIndicator?.versions.find(v => v.id === activeIndicator.currentVersionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeSessionId]);

  const handleSend = () => {
    if (!input.trim()) return;
    store.sendMessage(input.trim());
    setInput('');
  };

  const handleQuickChip = (text: string) => {
    store.sendMessage(text);
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className={`relative h-full bg-white border-r border-[#E5E8EE] flex flex-col justify-between shrink-0 select-none transition-[width] ${
        isDragging ? 'transition-none' : 'duration-75'
      }`}
    >
      {/* Resizable Splitter Handle on Right Edge */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClickSplitter}
        className={`group absolute top-0 -right-1 bottom-0 w-2.5 cursor-col-resize z-30 flex items-center justify-center transition-colors ${
          isDragging ? 'bg-[#2F6FED]/20' : 'hover:bg-blue-50/80 bg-transparent'
        }`}
        title="按住左右拖动调整对话窗宽度，双击快速切换"
      >
        <div
          className={`w-1 rounded-full transition-all duration-150 ${
            isDragging
              ? 'h-16 bg-[#2F6FED]'
              : 'h-8 bg-slate-300 group-hover:bg-[#2F6FED] group-hover:h-12'
          }`}
        />
      </div>

      {/* Header: Clean discussion context aligned with left Codex sidebar */}
      <div className="h-11 px-3.5 border-b border-[#EEF1F5] flex items-center justify-between bg-slate-50/70 text-xs shrink-0 relative z-10">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-[#2F6FED] shrink-0" />
          <div className="flex items-center space-x-1.5 min-w-0 truncate">
            <span className="font-bold text-slate-900 truncate">
              {activeIndicator?.name}
            </span>
            <span className="text-[11px] text-[#2F6FED] bg-blue-50 font-mono px-1.5 py-0.5 rounded font-medium border border-blue-100 shrink-0">
              {curVer?.label || 'v1'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs bg-slate-50/30">
        {/* Current Session Indicator Banner */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg shadow-2xs text-[11px] text-slate-600">
            <div className="flex items-center space-x-2 truncate">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-[#2F6FED] font-semibold text-[10px] border border-blue-200/60 shrink-0">
                探讨主题
              </span>
              <span className="font-medium text-slate-800 truncate">
                {cleanSessionTitle(activeSession?.title || '')}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 shrink-0 font-medium">
              侧边栏移入可新建或切换会话
            </div>
          </div>
          {messages.map((msg) => {
            const isAi = msg.role === 'ai';

            // 1. Overview 3-indicator message matching screenshot
            if (msg.indicatorCards && msg.indicatorCards.length > 0) {
              return (
                <div key={msg.id} className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80 shadow-2xs">
                  {/* Header text with AI label */}
                  <div className="flex items-start space-x-1.5 text-slate-800 text-[13px] leading-relaxed mb-3">
                    <span className="text-slate-400 font-sans font-medium text-[13px] shrink-0">AI</span>
                    <span>{msg.text}</span>
                  </div>

                  {/* 3 Indicator Cards */}
                  <div className="space-y-3">
                    {msg.indicatorCards.map((card) => (
                      <IndicatorOverviewCardItem
                        key={card.id}
                        card={card}
                        isCurrent={activeIndicator?.id === card.id}
                        onSelect={() => store.setActiveIndicator(card.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            // 2. Folded generation card for initial message
            if (msg.folded && isAi) {
              return (
                <FoldedIndicatorCard
                  key={msg.id}
                  badge={msg.badge}
                  text={msg.text}
                  timestamp={msg.timestamp}
                />
              );
            }

            // 3. Standard Chat Bubbles
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
              >
                {/* Sender & Timestamp */}
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{isAi ? 'AI 策略助手' : '您'}</span>
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-xl p-3 max-w-[95%] leading-relaxed ${
                    isAi
                      ? 'bg-slate-50 text-slate-800 border border-[#EEF1F5]'
                      : 'bg-[#EFF6FF] text-slate-900 border border-[#DBEAFE]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Proposals if present */}
                  {msg.proposals && msg.proposals.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {msg.proposals.map((prop, pIdx) => (
                        <ProposalCard
                          key={prop.id || pIdx}
                          proposal={prop}
                          baseVersion={curVer}
                          nextVersionLabel={`v${(activeIndicator?.versions.length || 1) + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

      {/* Quick Chips bar matching screenshot: [降低回撤] [减少交易] [过滤震荡] [加止损] [只做多] */}
      <div className="px-3 py-2 border-t border-[#EEF1F5] bg-white flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
        {['降低回撤', '减少交易', '过滤震荡', '加止损', '只做多'].map(chip => (
          <button
            key={chip}
            onClick={() => handleQuickChip(chip)}
            className="text-[12px] px-3 py-1.5 rounded-lg bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input box matching screenshot */}
      <div className="p-3 border-t border-[#E5E8EE] bg-white shrink-0">
        <div className="relative border border-[#D5D9E2] focus-within:border-[#2F6FED] focus-within:ring-1 focus-within:ring-[#2F6FED]/20 rounded-lg p-2.5 bg-white transition-all shadow-2xs">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="继续描述或提要求..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent resize-none outline-none h-12 leading-relaxed"
          />
          <div className="flex items-center justify-end pt-1 border-t border-slate-100 mt-1">
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="text-[#2F6FED] hover:text-[#2557CA] disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition-colors px-1"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

// 单个指标概览卡片 (与上图完全对齐)
interface IndicatorOverviewCardItemProps {
  card: IndicatorOverviewCard;
  isCurrent: boolean;
  onSelect: () => void;
}

const IndicatorOverviewCardItem: React.FC<IndicatorOverviewCardItemProps> = ({
  card,
  isCurrent,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-3.5 bg-white transition-all cursor-pointer shadow-xs ${
        isCurrent
          ? 'border-slate-300 ring-1 ring-slate-200/80'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* 头部：名称 + 标签 (技术面/基本面/资金面) + 具体合约列表 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-bold text-[14px] text-slate-900">{card.name}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
            {card.dimension}
          </span>
          <span className="text-[12px] text-slate-500 font-sans">
            {formatContractList(card.symbols)}
          </span>
        </div>
      </div>

      {/* 指标数值 + Sparkline 迷你走势 + 当前指标/查看操作 */}
      <div className="flex items-end justify-between">
        {/* 四列核心数据：年化、回撤、卡玛、胜率 */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 flex-1">
          <div>
            <div className="text-[11px] text-slate-400 mb-0.5">年化</div>
            <div className="font-bold text-slate-900 text-[13px] sm:text-[14px] font-mono">
              {(card.kpi.annualReturn * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 mb-0.5">回撤</div>
            <div className="font-bold text-slate-900 text-[13px] sm:text-[14px] font-mono">
              {(card.kpi.maxDrawdown * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 mb-0.5">卡玛</div>
            <div className="font-bold text-slate-900 text-[13px] sm:text-[14px] font-mono">
              {card.kpi.calmar.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 mb-0.5">胜率</div>
            <div className="font-bold text-slate-900 text-[13px] sm:text-[14px] font-mono">
              {(card.kpi.winRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 右侧：折线走势与动作 */}
        <div className="flex flex-col items-end shrink-0 pl-3">
          <MiniSparkline indicatorId={card.id} data={card.navSeries} />
          <div className="mt-1 h-4 flex items-center">
            {isCurrent ? (
              <span className="text-[11px] text-slate-400 font-normal">当前指标</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="text-[12px] text-[#2F6FED] hover:underline font-medium flex items-center space-x-0.5 cursor-pointer"
              >
                <span>查看 →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 迷你 Sparkline 走势图 (精准对齐原图走势特征)
const MiniSparkline: React.FC<{ indicatorId: string; data?: number[] }> = ({ indicatorId, data }) => {
  if (indicatorId === 'ind-1') {
    // 基差-均线共振：平滑稳健向上倾斜
    return (
      <svg width="86" height="24" viewBox="0 0 86 24" className="overflow-visible">
        <path
          d="M 2 19 Q 12 18, 20 17 T 38 13 T 54 8 T 70 7 L 84 5"
          fill="none"
          stroke="#2F6FED"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (indicatorId === 'ind-2') {
    // 螺纹库存拐点：前期平缓/小幅震荡，中段爆发拉升后高位企稳
    return (
      <svg width="86" height="24" viewBox="0 0 86 24" className="overflow-visible">
        <path
          d="M 2 20 Q 14 20, 26 20 T 42 18 L 48 9 Q 56 5, 68 6 T 84 5"
          fill="none"
          stroke="#2F6FED"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (indicatorId === 'ind-3') {
    // 主力持仓变化：先小落后起伏拉升至高点，末端微幅回落
    return (
      <svg width="86" height="24" viewBox="0 0 86 24" className="overflow-visible">
        <path
          d="M 2 18 Q 12 20, 24 17 T 46 11 T 62 7 Q 72 10, 84 12"
          fill="none"
          stroke="#2F6FED"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (data && data.length > 1) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = 2 + (i / (data.length - 1)) * 82;
      const y = 22 - ((v - min) / range) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return (
      <svg width="86" height="24" viewBox="0 0 86 24" className="overflow-visible">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#2F6FED"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
};

// 折叠的初始构建指标卡片
const FoldedIndicatorCard: React.FC<{ badge?: string; text: string; timestamp: string }> = ({
  badge,
  text,
  timestamp,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#E5E8EE] rounded-lg bg-slate-50/80 overflow-hidden text-xs">
      <div
        onClick={() => setOpen(!open)}
        className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
      >
        <div className="flex items-center space-x-1.5">
          <span className="px-1.5 py-0.5 bg-[#EFF6FF] text-[#2F6FED] text-[10px] font-semibold rounded">
            {badge || '策略构建'}
          </span>
          <span className="text-slate-700 font-medium">初始信号规则已生成</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
          <span>{timestamp}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </div>
      {open && (
        <div className="px-3 py-2.5 border-t border-[#EEF1F5] bg-white text-slate-600 text-[11px] leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
};

// 提案净值对比迷你图 (实线新方案 vs 虚线原版本)
const ProposalNavComparison: React.FC<{
  baseNav?: number[];
  newNav?: number[];
}> = ({ baseNav, newNav }) => {
  if (!newNav || newNav.length < 2) return null;

  const sample = (arr: number[], count = 50) => {
    if (!arr || arr.length === 0) return [];
    if (arr.length <= count) return arr;
    const step = (arr.length - 1) / (count - 1);
    const sampled: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(arr.length - 1, Math.round(i * step));
      sampled.push(arr[idx]);
    }
    return sampled;
  };

  const sampledNew = sample(newNav);
  const sampledBase = baseNav && baseNav.length > 1 ? sample(baseNav) : [];

  const allVals = [...sampledNew, ...sampledBase];
  if (allVals.length === 0) return null;

  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 0.01;

  const w = 260;
  const h = 40;
  const padX = 2;
  const padY = 4;

  const getPoints = (data: number[]) => {
    return data
      .map((v, i) => {
        const x = padX + (i / (data.length - 1)) * (w - padX * 2);
        const y = h - padY - ((v - minVal) / range) * (h - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const newPoints = getPoints(sampledNew);
  const basePoints = sampledBase.length > 1 ? getPoints(sampledBase) : '';

  return (
    <div className="bg-slate-50/90 rounded-lg px-2.5 py-1.5 border border-slate-100 mb-2">
      <div className="flex items-center justify-between text-[10px] mb-1 font-sans">
        <span className="font-medium text-slate-700">净值走势对比</span>
        <div className="flex items-center space-x-2.5 text-[10px]">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-[2px] bg-[#2F6FED] inline-block rounded-full" />
            <span className="text-[#2F6FED] font-semibold">新方案 (实线)</span>
          </div>
          {basePoints && (
            <div className="flex items-center space-x-1">
              <span className="w-3 h-[1.5px] border-b border-dashed border-slate-400 inline-block" />
              <span className="text-slate-500">原版本 (虚线)</span>
            </div>
          )}
        </div>
      </div>
      <div className="w-full relative h-10 flex items-center justify-center">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Base line (虚线) */}
          {basePoints && (
            <polyline
              points={basePoints}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.6"
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* New proposal line (实线) */}
          <polyline
            points={newPoints}
            fill="none"
            stroke="#2F6FED"
            strokeWidth="2.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

// 方案卡片 ProposalCard
interface ProposalCardProps {
  proposal: Proposal;
  baseVersion?: { label: string; result: any };
  nextVersionLabel: string;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, baseVersion, nextVersionLabel }) => {
  const { state, store } = useWorkbenchStore();
  const isPreviewing = state.previewProposal?.id === proposal.id;

  const baseKpi = baseVersion?.result?.kpi || { annualReturn: 0.182, maxDrawdown: -0.125, calmar: 1.46, trades: 87 };
  const newKpi = proposal.result?.kpi || { annualReturn: 0.18, maxDrawdown: -0.12, calmar: 1.5, trades: 80 };

  const newAnnual = newKpi.annualReturn ?? 0;
  const newMaxDD = newKpi.maxDrawdown ?? 0;
  const newCalmar = newKpi.calmar ?? 0;
  const newTrades = newKpi.trades ?? 0;

  const baseNav = baseVersion?.result?.nav;
  const newNav = proposal.result?.nav;

  return (
    <div
      className={`border rounded-lg p-2.5 bg-white transition-all shadow-2xs ${
        isPreviewing ? 'border-[#2F6FED] ring-1 ring-[#2F6FED]/30' : 'border-[#E5E8EE] hover:border-slate-300'
      }`}
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-slate-900 text-xs">{proposal.title}</span>
          <span className="px-1 py-0.2 bg-slate-100 text-slate-600 text-[9px] rounded">
            {proposal.changeType === 'filter' ? '状态过滤' : proposal.changeType === 'exit' ? '出场优化' : '参数调优'}
          </span>
        </div>
        {isPreviewing && (
          <span className="text-[10px] text-[#2F6FED] font-medium bg-[#EFF6FF] px-1.5 py-0.5 rounded flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED] mr-1 animate-pulse" />
            预览中
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="text-[11px] text-slate-600 mb-2 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
        {proposal.changeSummary}
      </div>

      {/* 4 Core Metrics: 新的年化、最大回撤、卡玛、交易笔数 */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50/80 rounded-lg border border-slate-100 mb-2 font-mono">
        <div>
          <div className="text-[10px] text-slate-500 font-sans">年化收益</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">
            {(newAnnual * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 font-sans">最大回撤</div>
          <div className="text-xs font-bold text-emerald-600 mt-0.5">
            -{(Math.abs(newMaxDD) * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 font-sans">卡玛比率</div>
          <div className="text-xs font-bold text-[#2F6FED] mt-0.5">
            {newCalmar.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 font-sans">交易笔数</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">
            {newTrades} 笔
          </div>
        </div>
      </div>

      {/* 净值走势对比 (实线 vs 虚线) */}
      <ProposalNavComparison baseNav={baseNav} newNav={newNav} />

      {/* Buttons: [预览] [应用为 vN] */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          onClick={() => store.setPreviewProposal(isPreviewing ? null : proposal)}
          className={`flex-1 py-1 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer border ${
            isPreviewing
              ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              : 'bg-white text-[#2F6FED] border-[#2F6FED] hover:bg-[#EFF6FF]'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>{isPreviewing ? '退出预览' : '图表预览'}</span>
        </button>

        <button
          onClick={() => store.applyProposal(proposal)}
          className="flex-1 py-1 bg-[#2F6FED] hover:bg-[#2557CA] text-white rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-2xs"
        >
          <Check className="w-3 h-3" />
          <span>应用为 {nextVersionLabel}</span>
        </button>
      </div>
    </div>
  );
};
