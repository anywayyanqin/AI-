import React, { useState, useRef, useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { getContractName } from '../engine/contractHelper';
import { Download, Copy, Check, Code2, Table, Calendar, Crosshair, ChevronRight, ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';

export const DetailsBottomTabs: React.FC = () => {
  const { state, store, activeIndicator } = useWorkbenchStore();
  const [activeTab, setActiveTab] = useState<'trades' | 'yearly' | 'code'>('trades');
  const [codeType, setCodeType] = useState<'pine' | 'python'>('pine');
  const [copied, setCopied] = useState(false);
  const [yearlySortOrder, setYearlySortOrder] = useState<'desc' | 'asc'>('desc');

  // Resizable height state
  const [height, setHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bottom_tabs_height');
      return saved ? Math.max(38, Math.min(600, Number(saved))) : 260;
    } catch {
      return 260;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(260);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = height;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const minH = 38; // header height
      const maxH = Math.max(300, window.innerHeight - 160);
      const newH = Math.max(minH, Math.min(maxH, startHeightRef.current + deltaY));
      setHeight(newH);
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const finalDeltaY = dragStartYRef.current - upEvent.clientY;
      const minH = 38;
      const maxH = Math.max(300, window.innerHeight - 160);
      const newH = Math.max(minH, Math.min(maxH, startHeightRef.current + finalDeltaY));
      try {
        localStorage.setItem('bottom_tabs_height', String(newH));
      } catch {}
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    const nextH = height <= 45 ? 260 : height > 340 ? 260 : 440;
    setHeight(nextH);
    try {
      localStorage.setItem('bottom_tabs_height', String(nextH));
    } catch {}
    window.dispatchEvent(new Event('resize'));
  };

  const toggleExpand = () => {
    const nextH = height <= 45 ? 260 : 38;
    setHeight(nextH);
    try {
      localStorage.setItem('bottom_tabs_height', String(nextH));
    } catch {}
    window.dispatchEvent(new Event('resize'));
  };

  if (!activeIndicator) return null;

  const curVer = activeIndicator.versions.find(v => v.id === activeIndicator.currentVersionId);
  const previewProposal = state.previewProposal;

  // Render preview version data if previewing
  const trades = previewProposal ? previewProposal.result.trades : curVer?.result.trades || [];
  const yearly = previewProposal ? previewProposal.result.yearly : curVer?.result.yearly || [];
  const overallKpi = previewProposal ? previewProposal.result.kpi : curVer?.result.kpi;

  const sortedYearly = [...yearly].sort((a, b) => {
    return yearlySortOrder === 'desc' ? b.year.localeCompare(a.year) : a.year.localeCompare(b.year);
  });

  // 交易明细：笔序按下单时间（开仓日）升序编号，展示时倒序（最新一笔在顶部）
  // 同时按时间顺序累加出每笔的「累计盈亏」
  const tradesChrono = [...trades].sort((a, b) => {
    const da = a.openDate ?? a.entryDate ?? '';
    const db = b.openDate ?? b.entryDate ?? '';
    return da.localeCompare(db);
  });
  let cumPnlAcc = 0;
  const tradesDisplay = tradesChrono
    .map((t, i) => {
      cumPnlAcc += t.pnl ?? 0;
      return { t, seq: i + 1, cumPnl: cumPnlAcc };
    })
    .reverse();

  // 图表定位：锚定到该行 B/S 信号点对应的 K 线，并确保信号图层可见
  const handleLocateSignal = (date: string) => {
    if (!state.layerVisibility.signals) store.toggleLayer('signals');
    store.setFocusedTradeDate(date);
  };

  const handleCopyCode = () => {
    const code = codeType === 'pine' ? curVer?.pineCode || '' : curVer?.pythonCode || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        t.side === 'long' ? '多' : '空',
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
    link.setAttribute('download', `${activeIndicator.name}_${curVer?.label || 'v1'}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCollapsed = height <= 45;

  return (
    <div
      style={{ height: `${height}px` }}
      className={`w-full bg-white flex flex-col shrink-0 select-none border-t border-[#E5E8EE] transition-[height] ${
        isDragging ? 'transition-none' : 'duration-75'
      }`}
    >
      {/* 1. Resizable Drag Bar Header Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className={`group relative h-2.5 w-full cursor-row-resize flex items-center justify-center select-none shrink-0 z-20 border-b border-[#EEF1F5] transition-colors ${
          isDragging ? 'bg-[#2F6FED]/15' : 'hover:bg-blue-50/90 bg-slate-100/60'
        }`}
        title="上下拖动调整高度，双击快速切换"
      >
        <div
          className={`h-1 rounded-full transition-all duration-150 ${
            isDragging
              ? 'w-20 bg-[#2F6FED]'
              : 'w-12 bg-slate-300 group-hover:bg-[#2F6FED] group-hover:w-16'
          }`}
        />
      </div>

      {/* 2. Tab Navigation Header */}
      <div
        onMouseDown={e => {
          // Allow dragging header empty area
          if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
            handleMouseDown(e);
          }
        }}
        onDoubleClick={e => {
          if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
            handleDoubleClick();
          }
        }}
        className="h-9 px-4 border-b border-[#EEF1F5] flex items-center justify-between text-xs bg-slate-50/70 shrink-0 cursor-row-resize"
      >
        <div className="flex items-center space-x-1 cursor-default">
          <button
            onClick={() => {
              setActiveTab('trades');
              if (isCollapsed) setHeight(260);
            }}
            className={`px-3 py-1.5 font-medium rounded-t-md transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'trades'
                ? 'bg-white text-[#2F6FED] font-semibold border-t-2 border-[#2F6FED] -mb-[1px]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>交易明细</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-mono">
              {trades.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('yearly');
              if (isCollapsed) setHeight(260);
            }}
            className={`px-3 py-1.5 font-medium rounded-t-md transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'yearly'
                ? 'bg-white text-[#2F6FED] font-semibold border-t-2 border-[#2F6FED] -mb-[1px]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>分年度</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('code');
              if (isCollapsed) setHeight(260);
            }}
            className={`px-3 py-1.5 font-medium rounded-t-md transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white text-[#2F6FED] font-semibold border-t-2 border-[#2F6FED] -mb-[1px]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>代码生成</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 cursor-default">
          {activeTab === 'trades' && !isCollapsed && (
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-[#E5E8EE] rounded text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>导出 CSV</span>
            </button>
          )}

          {activeTab === 'code' && !isCollapsed && (
            <div className="flex items-center space-x-1 bg-slate-200/70 p-0.5 rounded">
              <button
                onClick={() => setCodeType('pine')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                  codeType === 'pine' ? 'bg-white text-[#2F6FED] shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                TradingView Pine v5
              </button>
              <button
                onClick={() => setCodeType('python')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                  codeType === 'python' ? 'bg-white text-[#2F6FED] shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Python 回测策略
              </button>
            </div>
          )}

          {/* Quick Collapse / Expand Toggle Button */}
          <button
            onClick={toggleExpand}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded transition-colors cursor-pointer"
            title={isCollapsed ? '展开明细面板' : '折叠明细面板'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. Tab Content Body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto bg-white">
          {/* 1. 交易明细 Trades Table —— 按笔回显所属合约的 B/S 买卖点 */}
          {activeTab === 'trades' && (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-50 sticky top-0 text-[11px] text-slate-500 font-sans border-b border-slate-200 z-10">
                <tr>
                  <th className="py-1.5 px-3" title="按下单时间倒序展示，最新一笔在顶部">
                    <div className="flex items-center space-x-1">
                      <span>笔序</span>
                      <span className="text-[10px] text-[#2F6FED] font-medium">↓ 最新</span>
                    </div>
                  </th>
                  <th className="py-1.5 px-3">合约</th>
                  <th className="py-1.5 px-3">方向</th>
                  <th className="py-1.5 px-3">信号点</th>
                  <th className="py-1.5 px-3">日期</th>
                  <th className="py-1.5 px-3 text-right">价格</th>
                  <th className="py-1.5 px-3 text-right">盈亏(元)</th>
                  <th className="py-1.5 px-3 text-right">盈亏率</th>
                  <th className="py-1.5 px-3 text-right">持仓天数</th>
                  <th className="py-1.5 px-3 text-right">手数</th>
                  <th className="py-1.5 px-3 text-right">累计盈亏(元)</th>
                </tr>
              </thead>
              {tradesDisplay.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                      暂无交易明细
                    </td>
                  </tr>
                </tbody>
              ) : (
                tradesDisplay.map(({ t, seq, cumPnl }) => {
                  const openPrice = t.openPrice ?? t.entryPrice ?? 0;
                  const closePrice = t.closePrice ?? t.exitPrice ?? 0;
                  const openDate = t.openDate ?? t.entryDate ?? '';
                  const closeDate = t.closeDate ?? t.exitDate ?? '';
                  const pnl = t.pnl ?? 0;
                  const pnlPct = t.pnlPct ?? 0;
                  const isWin = pnl >= 0;
                  const isCumWin = cumPnl >= 0;
                  const isLong = t.side === 'long';

                  // B/S 信号点：多头 B 开仓 / S 平仓；空头 S 开仓 / B 平仓
                  const entrySignal = isLong
                    ? { label: 'B 买入开仓', point: 'B', cls: 'bg-red-50 text-red-600 border-red-200' }
                    : { label: 'S 卖出开仓', point: 'S', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
                  const exitSignal = isLong
                    ? { label: 'S 卖出平仓', point: 'S', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
                    : { label: 'B 买入平仓', point: 'B', cls: 'bg-red-50 text-red-600 border-red-200' };

                  return (
                    <tbody key={t.id} className="group">
                      {/* 平仓行 (Exit / S点) */}
                      <tr className="group/row group-hover:bg-slate-50/80 transition-colors">
                        <td rowSpan={2} className="py-2 px-3 align-middle border-b border-slate-200">
                          <span className="font-bold text-slate-900">#{seq}</span>
                        </td>
                        <td rowSpan={2} className="py-2 px-3 align-middle border-b border-slate-200 font-semibold text-slate-900">
                          {getContractName(t.symbol)}
                        </td>
                        <td rowSpan={2} className="py-2 px-3 align-middle border-b border-slate-200">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                              isLong ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isLong ? '做多' : '做空'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleLocateSignal(closeDate)}
                              className="text-[#2F6FED] hover:text-[#2557CA] opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title={`锚定主图 ${closeDate} 的 ${exitSignal.point} 信号点`}
                            >
                              <Crosshair className="w-3 h-3" />
                            </button>
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-sans font-medium ${exitSignal.cls}`}>
                              {exitSignal.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">{closeDate}</td>
                        <td className="py-1.5 px-3 text-right">{closePrice.toFixed(1)}</td>
                        <td rowSpan={2} className={`py-2 px-3 text-right align-middle border-b border-slate-200 font-medium ${isWin ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isWin ? `+${pnl.toLocaleString()}` : pnl.toLocaleString()}
                        </td>
                        <td rowSpan={2} className={`py-2 px-3 text-right align-middle border-b border-slate-200 font-medium ${isWin ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isWin ? `+${(pnlPct * 100).toFixed(2)}%` : `${(pnlPct * 100).toFixed(2)}%`}
                        </td>
                        <td rowSpan={2} className="py-2 px-3 text-right align-middle border-b border-slate-200 text-slate-500">
                          {t.holdDays ?? 0}
                        </td>
                        <td rowSpan={2} className="py-2 px-3 text-right align-middle border-b border-slate-200 text-slate-700">
                          {t.lots ?? 0}
                        </td>
                        <td rowSpan={2} className={`py-2 px-3 text-right align-middle border-b border-slate-200 font-semibold ${isCumWin ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isCumWin ? `+${cumPnl.toLocaleString()}` : cumPnl.toLocaleString()}
                        </td>
                      </tr>
                      {/* 开仓行 (Entry / B点) */}
                      <tr className="group/row group-hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-3 border-b border-slate-200">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleLocateSignal(openDate)}
                              className="text-[#2F6FED] hover:text-[#2557CA] opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title={`锚定主图 ${openDate} 的 ${entrySignal.point} 信号点`}
                            >
                              <Crosshair className="w-3 h-3" />
                            </button>
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-sans font-medium ${entrySignal.cls}`}>
                              {entrySignal.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-200 text-slate-600">{openDate}</td>
                        <td className="py-1.5 px-3 border-b border-slate-200 text-right">{openPrice.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  );
                })
              )}
            </table>
          )}

          {/* 2. 分年度统计 Yearly Table */}
          {activeTab === 'yearly' && (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-50 sticky top-0 text-[11px] text-slate-500 font-sans border-b border-slate-200 z-10">
                <tr>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-slate-800 select-none"
                    onClick={() => setYearlySortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                    title="点击切换年份排序"
                  >
                    <div className="flex items-center space-x-1">
                      <span>年度</span>
                      <span className="text-[10px] text-[#2F6FED] font-medium">
                        {yearlySortOrder === 'desc' ? '↓ 最新' : '↑ 最早'}
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-right">年度收益率</th>
                  <th className="py-2.5 px-4 text-right">年内最大回撤</th>
                  <th className="py-2.5 px-4 text-right">卡玛比率</th>
                  <th className="py-2.5 px-4 text-right">夏普比率</th>
                  <th className="py-2.5 px-4 text-right">交易次数</th>
                  <th className="py-2.5 px-4 text-right">胜率</th>
                  <th className="py-2.5 px-4 text-right">盈亏比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedYearly.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      暂无分年度统计
                    </td>
                  </tr>
                ) : (
                  sortedYearly.map(y => {
                    const retVal = y.ret ?? y.returnPct ?? y.annualReturn ?? 0;
                    const mddVal = y.mdd ?? y.maxDrawdown ?? 0;
                    const absMdd = Math.abs(mddVal);
                    const calmarVal = y.calmar ?? (absMdd > 0.001 ? Math.max(0, retVal / absMdd) : 0);
                    const sharpeVal = y.sharpe ?? 0;
                    const tradesCount = y.trades ?? y.tradeCount ?? 0;
                    const winRateVal = y.winRate ?? 0;
                    const plRatioVal = y.plRatio ?? y.profitRatio ?? 0;
                    const isPos = retVal >= 0;

                    return (
                      <tr key={y.year} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{y.year}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${isPos ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isPos ? `+${(retVal * 100).toFixed(2)}%` : `${(retVal * 100).toFixed(2)}%`}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-600">
                          -{(absMdd * 100).toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-900">{calmarVal.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-900">{sharpeVal.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600">{tradesCount} 次</td>
                        <td className="py-2.5 px-4 text-right text-slate-700">{(winRateVal * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right text-slate-700">{plRatioVal.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {overallKpi && sortedYearly.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-slate-900 font-sans">
                  <tr className="font-semibold">
                    <td className="py-2.5 px-4 text-slate-900 font-bold">全周期统计</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${overallKpi.annualReturn >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {overallKpi.annualReturn >= 0 ? `+${(overallKpi.annualReturn * 100).toFixed(2)}%` : `${(overallKpi.annualReturn * 100).toFixed(2)}%`}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 font-bold">
                      -{(Math.abs(overallKpi.maxDrawdown) * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{overallKpi.calmar.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{overallKpi.sharpe.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 font-bold">{overallKpi.trades} 次</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 font-bold">{(overallKpi.winRate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 font-bold">{overallKpi.profitRatio.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* 3. 代码生成 Code Generation Tab */}
          {activeTab === 'code' && (
            <div className="p-4 bg-slate-900 min-h-full font-mono text-xs text-slate-200 relative">
              <div className="absolute top-3 right-4 flex items-center space-x-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans flex items-center space-x-1 border border-slate-700 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto leading-relaxed whitespace-pre font-mono text-slate-200 pt-2">
                {codeType === 'pine' ? curVer?.pineCode || '// 暂无 Pine 代码' : curVer?.pythonCode || '# 暂无 Python 代码'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
