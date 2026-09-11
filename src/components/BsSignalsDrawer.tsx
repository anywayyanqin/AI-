import React, { useState, useEffect, useMemo } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { getContractName } from '../engine/contractHelper';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Crosshair,
  Filter,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Check,
} from 'lucide-react';

export const BsSignalsDrawer: React.FC = () => {
  const { state, store, activeIndicator } = useWorkbenchStore();
  const isOpen = state.isBsDrawerOpen;

  const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
  const [pnlFilter, setPnlFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [keyword, setKeyword] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        store.setBsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, store]);

  if (!isOpen || !activeIndicator) return null;

  const curVer = activeIndicator.versions.find(v => v.id === activeIndicator.currentVersionId);
  const previewProposal = state.previewProposal;
  const trades = previewProposal ? previewProposal.result.trades : curVer?.result.trades || [];

  // Filter trades
  const filteredTrades = trades.filter(t => {
    if (directionFilter !== 'all' && t.side !== directionFilter) return false;
    if (pnlFilter === 'profit' && (t.pnl ?? 0) <= 0) return false;
    if (pnlFilter === 'loss' && (t.pnl ?? 0) >= 0) return false;
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      const sym = t.symbol.toLowerCase();
      const openD = (t.openDate || t.entryDate || '').toLowerCase();
      const closeD = (t.closeDate || t.exitDate || '').toLowerCase();
      const id = t.id.toLowerCase();
      if (!sym.includes(q) && !openD.includes(q) && !closeD.includes(q) && !id.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate stats
  const longTrades = trades.filter(t => t.side === 'long');
  const shortTrades = trades.filter(t => t.side === 'short');
  const longWins = longTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const shortWins = shortTrades.filter(t => (t.pnl ?? 0) > 0).length;

  const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
  const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const totalProfit = trades.filter(t => (t.pnl ?? 0) > 0).reduce((acc, t) => acc + t.pnl, 0);
  const totalLoss = Math.abs(trades.filter(t => (t.pnl ?? 0) < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitLossRatio = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : '∞';

  const avgHoldDays = trades.length > 0
    ? (trades.reduce((acc, t) => acc + (t.holdDays ?? 0), 0) / trades.length).toFixed(1)
    : '0';

  const handleFocusChart = (tradeId: string, date: string) => {
    setFocusedId(tradeId);
    store.setFocusedTradeDate(date);
    store.toggleLayer('signals'); // ensure signals visible
    setToastMsg(`已在主图表定位买卖点：${date}`);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleExportCsv = () => {
    const headers = ['TradeId', 'Symbol', 'Side', 'EntryDate', 'EntryPrice', 'ExitDate', 'ExitPrice', 'HoldDays', 'Pnl', 'PnlPct', 'CumulativeNav'];
    const rows = trades.map(t => {
      const openPrice = t.openPrice ?? t.entryPrice ?? 0;
      const closePrice = t.closePrice ?? t.exitPrice ?? 0;
      const openDate = t.openDate ?? t.entryDate ?? '';
      const closeDate = t.closeDate ?? t.exitDate ?? '';
      const navVal = t.navAfter ?? t.cumulativeNav ?? 1.0;
      const pnl = t.pnl ?? 0;
      const pnlPct = t.pnlPct ?? 0;
      return [
        t.id,
        t.symbol,
        t.side === 'long' ? '多(B)' : '空(S)',
        openDate,
        openPrice.toFixed(1),
        closeDate,
        closePrice.toFixed(1),
        t.holdDays ?? 0,
        pnl.toFixed(0),
        `${(pnlPct * 100).toFixed(2)}%`,
        navVal.toFixed(4),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeIndicator.name}_${curVer?.label || 'v1'}_BS买卖点明细.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg('B/S 买卖点明细已成功导出为 CSV 文件');
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity animate-in fade-in"
        onClick={() => store.setBsDrawerOpen(false)}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EEF1F5] flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#2F6FED] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">B/S 买卖点界面</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-[#2F6FED] border border-blue-200 font-mono font-medium">
                  {curVer?.label || 'v1'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {activeIndicator.name} · {trades.length} 笔信号执行与盈亏透视
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleExportCsv}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              title="导出 CSV 明细"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => store.setBsDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top KPI Statistics Grid */}
        <div className="px-5 py-3 border-b border-[#EEF1F5] bg-white grid grid-cols-4 gap-2.5 text-xs shrink-0">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">多头买入(B)</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="font-bold text-slate-900 font-mono">{longTrades.length}笔</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{longWinRate.toFixed(0)}%胜</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">空头卖出(S)</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="font-bold text-slate-900 font-mono">{shortTrades.length}笔</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{shortWinRate.toFixed(0)}%胜</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">盈亏比 / 均持仓</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="font-bold text-[#2F6FED] font-mono">{profitLossRatio}</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {avgHoldDays}天</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">累计实现盈亏</span>
            <div className="mt-0.5">
              <span className={`font-bold font-mono ${totalPnl >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-2.5 border-b border-[#EEF1F5] bg-slate-50/50 flex items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap">
            {/* Direction Filter */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-md">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  directionFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setDirectionFilter('long')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  directionFilter === 'long' ? 'bg-white text-red-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                仅多头 B
              </button>
              <button
                onClick={() => setDirectionFilter('short')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  directionFilter === 'short' ? 'bg-white text-emerald-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                仅空头 S
              </button>
            </div>

            {/* PnL Filter */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-md">
              <button
                onClick={() => setPnlFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  pnlFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部盈亏
              </button>
              <button
                onClick={() => setPnlFilter('profit')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  pnlFilter === 'profit' ? 'bg-white text-red-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                盈利笔
              </button>
              <button
                onClick={() => setPnlFilter('loss')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  pnlFilter === 'loss' ? 'bg-white text-emerald-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                亏损笔
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium shrink-0">
            显示 {filteredTrades.length} / {trades.length} 笔
          </div>
        </div>

        {/* Interactive B/S Signals & Execution List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/40">
          {filteredTrades.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Filter className="w-8 h-8 text-slate-300 mb-2" />
              <span>当前筛选条件下暂无买卖点记录</span>
            </div>
          ) : (
            filteredTrades.map((t, index) => {
              const isLong = t.side === 'long';
              const isProfit = (t.pnl ?? 0) >= 0;
              const openPrice = t.openPrice ?? t.entryPrice ?? 0;
              const closePrice = t.closePrice ?? t.exitPrice ?? 0;
              const openDate = t.openDate ?? t.entryDate ?? '';
              const closeDate = t.closeDate ?? t.exitDate ?? '';
              const pnl = t.pnl ?? 0;
              const pnlPct = t.pnlPct ?? 0;
              const isFocused = focusedId === t.id;

              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border bg-white transition-all text-xs hover:shadow-xs ${
                    isFocused
                      ? 'border-[#2F6FED] ring-2 ring-blue-100 shadow-xs'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Top line: Symbol, Direction Tag, PnL */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-400 text-[10px]">
                        #{t.id}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {t.symbol} · {getContractName(t.symbol)}
                      </span>
                      <span
                        className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        {isLong ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>做多 (B)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3" />
                            <span>做空 (S)</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isProfit ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {isProfit ? '+' : ''}{pnl.toLocaleString('zh-CN')}
                        </span>
                        <span
                          className={`ml-1 text-[11px] font-mono ${
                            isProfit ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          ({isProfit ? '+' : ''}{(pnlPct * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Execution detail grid */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-[11px] text-slate-600 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">开仓入场 (Open)</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {openDate}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px] ml-1">
                        @{openPrice.toFixed(1)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">平仓离场 (Close)</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {closeDate}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px] ml-1">
                        @{closePrice.toFixed(1)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">持仓周期 / 手数</span>
                      <span className="font-mono font-medium text-slate-800">
                        {t.holdDays ?? 0} 天
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1">
                        ({t.lots || 6}手)
                      </span>
                    </div>
                  </div>

                  {/* Actions & Reason Footer */}
                  <div className="pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 truncate flex-1 pr-2">
                      触发依据：
                      <span className="text-slate-700 font-medium">
                        {isLong
                          ? '基差突破且MA20金叉共振买入'
                          : '指标反向偏离或均线死叉触发'}
                      </span>
                    </span>

                    <button
                      onClick={() => handleFocusChart(t.id, openDate)}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#2F6FED] font-medium transition-colors cursor-pointer shrink-0 border border-blue-100 shadow-2xs text-[11px]"
                      title="在主图表定位并居中该买卖点"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>定位主图</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-[#EEF1F5] bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            点击「定位主图」可联动主K线图表聚焦至具体 B/S 信号日期
          </span>
          <button
            onClick={() => store.setBsDrawerOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
          >
            完成查看
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full text-xs shadow-lg flex items-center space-x-1.5 animate-in fade-in z-30">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
