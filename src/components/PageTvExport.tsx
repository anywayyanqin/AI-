import React, { useState } from 'react';
import {
  Indicator,
  BacktestResult,
  ExportRecord,
  TargetUniverse,
} from '../types';
import { SAMPLE_PINE_CODE } from '../mockData';
import { ExportHistoryModal } from './ExportHistoryModal';
import {
  Filter,
  FileCode2,
  Check,
  Copy,
  Download,
  Star,
  RefreshCw,
  Layers,
  Settings2,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface PageTvExportProps {
  universe: TargetUniverse;
  indicators: Indicator[];
  backtestResults: BacktestResult[];
  exportRecords: ExportRecord[];
  onAddExportRecord: (record: ExportRecord) => void;
  preselectedIndicatorId?: string;
}

export const PageTvExport: React.FC<PageTvExportProps> = ({
  universe,
  indicators,
  backtestResults,
  exportRecords,
  onAddExportRecord,
  preselectedIndicatorId,
}) => {
  // Top filter criteria state
  const [minCalmar, setMinCalmar] = useState<string>('1.0');
  const [minSharpe, setMinSharpe] = useState<string>('1.0');
  const [maxDrawdown, setMaxDrawdown] = useState<string>('15'); // 15%
  const [minWinRate, setMinWinRate] = useState<string>('50'); // 50%
  const [symbolFilter, setSymbolFilter] = useState<string>('all');

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({
    minCalmar: 1.0,
    minSharpe: 1.0,
    maxDrawdown: 0.15,
    minWinRate: 0.5,
    symbol: 'all',
  });

  // Selected candidate row in table for preview & export
  const [selectedResultId, setSelectedResultId] = useState<string>(
    () => {
      if (preselectedIndicatorId) {
        const found = backtestResults.find(
          (r) => r.indicatorId === preselectedIndicatorId
        );
        if (found) return found.id;
      }
      return backtestResults[0]?.id || '';
    }
  );

  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Export options state
  const [tvSymbol, setTvSymbol] = useState<string>('SHFE:RB1!');
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [includeParams, setIncludeParams] = useState<boolean>(true);
  const [externalDataMode, setExternalDataMode] = useState<'seed' | 'technicalOnly'>('seed');

  // Copy & feedback states
  const [copied, setCopied] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const activeResult =
    backtestResults.find((r) => r.id === selectedResultId) ||
    backtestResults[0];

  const activeIndicator = indicators.find(
    (i) => i.id === activeResult?.indicatorId
  );

  // Auto-map symbol when active result changes
  React.useEffect(() => {
    if (activeResult) {
      const sym = activeResult.symbol;
      if (sym === 'RB') setTvSymbol('SHFE:RB1!');
      else if (sym === 'I') setTvSymbol('DCE:I1!');
      else if (sym === 'M') setTvSymbol('DCE:M1!');
      else if (sym === 'CU') setTvSymbol('SHFE:CU1!');
      else if (sym === 'TA') setTvSymbol('CZCE:TA1!');
      else if (sym === 'IF') setTvSymbol('CFFEX:IF1!');
      else setTvSymbol(`CZCE:${sym}1!`);
    }
  }, [selectedResultId]);

  const handleApplyFilter = () => {
    setAppliedFilters({
      minCalmar: minCalmar ? parseFloat(minCalmar) : 0,
      minSharpe: minSharpe ? parseFloat(minSharpe) : 0,
      maxDrawdown: maxDrawdown ? parseFloat(maxDrawdown) / 100 : 1,
      minWinRate: minWinRate ? parseFloat(minWinRate) / 100 : 0,
      symbol: symbolFilter,
    });
  };

  const handleResetFilter = () => {
    setMinCalmar('');
    setMinSharpe('');
    setMaxDrawdown('');
    setMinWinRate('');
    setSymbolFilter('all');
    setAppliedFilters({
      minCalmar: 0,
      minSharpe: 0,
      maxDrawdown: 1.0,
      minWinRate: 0,
      symbol: 'all',
    });
  };

  // Filtered candidate list
  const filteredCandidates = backtestResults.filter((res) => {
    if (res.calmar < appliedFilters.minCalmar) return false;
    if (res.sharpe < appliedFilters.minSharpe) return false;
    if (Math.abs(res.maxDrawdown) > appliedFilters.maxDrawdown) return false;
    if (res.winRate < appliedFilters.minWinRate) return false;
    if (
      appliedFilters.symbol !== 'all' &&
      res.symbol !== appliedFilters.symbol
    )
      return false;
    return true;
  });

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (checkedIds.length === filteredCandidates.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(filteredCandidates.map((c) => c.id));
    }
  };

  // Generate dynamic Pine Script code based on settings
  const generatePineScript = () => {
    if (!activeResult || !activeIndicator) return SAMPLE_PINE_CODE;

    const baseName = activeResult.indicatorName;
    const isPureTech = externalDataMode === 'technicalOnly';

    let code = `//@version=5\nstrategy("${baseName} - ${tvSymbol}", overlay=true, initial_capital=1000000, default_qty_type=strategy.fixed, default_qty_value=1)\n\n`;

    code += `// ==========================================\n// 1. 策略参数设置\n// ==========================================\n`;
    if (includeParams && activeIndicator.params) {
      Object.entries(activeIndicator.params).forEach(([k, v]) => {
        if (typeof v === 'number') {
          code += `${k} = input.int(${v}, "${k}")\n`;
        } else {
          code += `${k} = input.string("${v}", "${k}")\n`;
        }
      });
    } else {
      code += `maLen = input.int(20, "MA Length")\n`;
    }

    code += `\n// ==========================================\n// 2. 外部数据源依赖 (研报库 / 产业数据库 / 持仓)\n// ==========================================\n`;
    activeIndicator.dependencies.forEach((dep) => {
      code += `// [外部数据依赖]: ${dep}\n`;
    });

    if (isPureTech) {
      code += `// [注意]: 已选择仅导出纯技术面部分，过滤掉无法直接从 TradingView 内置获取的现货基差与研报指标\n`;
      code += `maVal = ta.sma(close, 20)\nlongCond = ta.crossover(close, maVal)\nshortCond = ta.crossunder(close, maVal)\n\nif (longCond)\n    strategy.entry("Long", strategy.long)\nif (shortCond)\n    strategy.entry("Short", strategy.short)\nplot(maVal, "SMA 20", color=color.blue)\n`;
    } else {
      code += `// [注意]: TradingView 内置不含国内现货高频基差，此处使用 request.seed 进行虚拟注入或外部桥接\n`;
      code += `var float externalBasisRate = na\nexternalBasisRate := request.seed("industry_basis", "${activeResult.symbol}_BASIS_RATE", close * 0.015)\n\nmaVal = ta.sma(close, 20)\nbasisMa = ta.sma(nz(externalBasisRate, 0), 20)\nlongCond = (externalBasisRate > basisMa) and ta.crossover(close, maVal)\nshortCond = (externalBasisRate < basisMa) and ta.crossunder(close, maVal)\n\nif (longCond)\n    strategy.entry("Long", strategy.long, comment="Basis+Trend Bull")\nif (shortCond)\n    strategy.entry("Short", strategy.short, comment="Basis+Trend Bear")\nplot(maVal, "Trend MA", color=color.orange, linewidth=2)\n`;
    }

    return code;
  };

  const currentPineCode = generatePineScript();

  const handleCopyPine = () => {
    navigator.clipboard.writeText(currentPineCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPine = (customCode?: string, customName?: string) => {
    const codeToDownload = customCode || currentPineCode;
    const name = customName || `${activeResult?.indicatorName || 'strategy'}_${tvSymbol.replace(':', '_')}.pine`;
    const blob = new Blob([codeToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);

    // Add to export history
    if (activeResult) {
      const record: ExportRecord = {
        id: `exp-${Date.now()}`,
        indicatorId: activeResult.indicatorId,
        indicatorName: activeResult.indicatorName,
        symbol: activeResult.symbol,
        tvSymbol,
        timeframe,
        externalDataMode,
        includeParams,
        exportedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'success',
      };
      onAddExportRecord(record);
      setExportNotice(`已成功导出并保存记录: ${record.tvSymbol}`);
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const handleBatchExport = () => {
    const itemsToExport = backtestResults.filter((r) =>
      checkedIds.includes(r.id)
    );
    if (itemsToExport.length === 0) return;

    itemsToExport.forEach((item, idx) => {
      setTimeout(() => {
        const record: ExportRecord = {
          id: `exp-${Date.now()}-${idx}`,
          indicatorId: item.indicatorId,
          indicatorName: item.indicatorName,
          symbol: item.symbol,
          tvSymbol: `${item.symbol === 'RB' ? 'SHFE' : 'DCE'}:${item.symbol}1!`,
          timeframe,
          externalDataMode,
          includeParams,
          exportedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          status: 'success',
        };
        onAddExportRecord(record);
      }, idx * 100);
    });

    handleDownloadPine();
    setExportNotice(`已完成批量导出 ${itemsToExport.length} 个候选指标为 Pine Script`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3 h-3 ${
            i <= score ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
          }`}
        />
      );
    }
    return <div className="flex items-center space-x-0.5">{stars}</div>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[720px] bg-slate-50 text-slate-800 overflow-y-auto p-4 space-y-3">
      {/* ======================================================== */}
      {/* TOP: Filter Conditions Bar                               */}
      {/* ======================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Label + Filter Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 font-semibold text-blue-700">
              <Filter className="w-4 h-4" />
              <span>指标筛选条件:</span>
            </div>

            {/* Calmar */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600 text-[11px]">卡玛 ≥</span>
              <input
                id="filter-calmar"
                type="number"
                step="0.1"
                placeholder="1.0"
                value={minCalmar}
                onChange={(e) => setMinCalmar(e.target.value)}
                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Sharpe */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600 text-[11px]">夏普 ≥</span>
              <input
                id="filter-sharpe"
                type="number"
                step="0.1"
                placeholder="1.0"
                value={minSharpe}
                onChange={(e) => setMinSharpe(e.target.value)}
                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Max Drawdown */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600 text-[11px]">最大回撤 ≤</span>
              <input
                id="filter-maxdd"
                type="number"
                step="1"
                placeholder="15"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-slate-500 text-[11px]">%</span>
            </div>

            {/* Win Rate */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600 text-[11px]">胜率 ≥</span>
              <input
                id="filter-winrate"
                type="number"
                step="1"
                placeholder="50"
                value={minWinRate}
                onChange={(e) => setMinWinRate(e.target.value)}
                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-slate-500 text-[11px]">%</span>
            </div>

            {/* Symbol */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600 text-[11px]">品种:</span>
              <select
                id="filter-export-symbol"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="all">全部品种</option>
                {universe.selectedSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                id="btn-apply-tv-filter"
                onClick={handleApplyFilter}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs shadow-2xs transition-colors"
              >
                筛选
              </button>
              <button
                id="btn-reset-tv-filter"
                onClick={handleResetFilter}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs border border-slate-300 shadow-2xs transition-colors"
              >
                重置
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span>
              已筛选出 <strong className="text-slate-900 font-semibold">{filteredCandidates.length}</strong> 个优质候选指标
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* MIDDLE: Candidate Indicators Table                       */}
      {/* ======================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-900">候选指标列表</span>
            <span className="text-[11px] text-slate-500">
              (点击行选中可在下方实时预览并导出 Pine Script)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-batch-export-checked"
              disabled={checkedIds.length === 0}
              onClick={handleBatchExport}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium text-xs flex items-center space-x-1 shadow-2xs transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>批量导出选中 ({checkedIds.length})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-56">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={
                      checkedIds.length > 0 &&
                      checkedIds.length === filteredCandidates.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                </th>
                <th className="p-2.5">指标名称</th>
                <th className="p-2.5">品种</th>
                <th className="p-2.5">执行时点</th>
                <th className="p-2.5 text-right">年化收益</th>
                <th className="p-2.5 text-right">最大回撤</th>
                <th className="p-2.5 text-right">卡玛比率</th>
                <th className="p-2.5 text-right">夏普比率</th>
                <th className="p-2.5 text-center">综合评分</th>
                <th className="p-2.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredCandidates.map((cand) => {
                const isSelected = cand.id === selectedResultId;
                const isChecked = checkedIds.includes(cand.id);
                return (
                  <tr
                    key={cand.id}
                    onClick={() => setSelectedResultId(cand.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-2 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(cand.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                    </td>
                    <td className="p-2.5 font-sans font-medium text-slate-900 flex items-center space-x-1.5">
                      <span>{cand.indicatorName}</span>
                    </td>
                    <td className="p-2.5 font-mono text-blue-600 font-semibold">{cand.symbol}</td>
                    <td className="p-2.5 text-slate-500 font-sans text-[11px]">
                      {cand.execTiming === 'close'
                        ? '日终收盘'
                        : cand.execTiming === 'nextOpen'
                        ? '次日开盘'
                        : '夜盘开盘'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-red-600">
                      +{(cand.annualReturn * 100).toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-right text-emerald-600 font-medium">
                      {(cand.maxDrawdown * 100).toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-right text-slate-900 font-semibold">
                      {cand.calmar.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-slate-700">
                      {cand.sharpe.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex justify-center">
                        {renderStars(cand.score)}
                      </div>
                    </td>
                    <td
                      className="p-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedResultId(cand.id)}
                        className="px-2 py-0.5 rounded text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium border border-blue-200 transition-colors shadow-2xs"
                      >
                        Pine预览
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Export Notification Toast */}
      {exportNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM SPLIT: Left Pine Script Preview / Right Settings  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[300px]">
        {/* Bottom Left: Pine Script Code Preview (7 cols) */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-900">Pine Script 预览</span>
              <span className="text-[10px] text-slate-500 font-mono">
                //@version=5 (TradingView)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-copy-pine-script"
                onClick={handleCopyPine}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs flex items-center space-x-1 border border-slate-300 shadow-2xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>复制代码</span>
                  </>
                )}
              </button>

              <button
                id="btn-download-pine-script"
                onClick={() => handleDownloadPine()}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center space-x-1 shadow-2xs transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>下载 .pine</span>
              </button>
            </div>
          </div>

          {/* Pine code display with syntax highlighting cues */}
          <div className="p-3 bg-slate-900 font-mono text-xs text-slate-100 flex-1 overflow-auto select-text leading-relaxed">
            <pre className="whitespace-pre-wrap">
              {currentPineCode.split('\n').map((line, idx) => {
                const isExternalComment = line.includes('// [外部数据依赖]:');
                const isWarning = line.includes('// [注意]:');
                const isStrategyEntry = line.includes('strategy.entry');

                if (isExternalComment) {
                  return (
                    <div
                      key={idx}
                      className="bg-blue-900/60 text-blue-200 font-semibold px-1 rounded my-0.5 border-l-2 border-blue-400"
                    >
                      {line}
                    </div>
                  );
                }
                if (isWarning) {
                  return (
                    <div
                      key={idx}
                      className="bg-amber-900/50 text-amber-200 px-1 rounded my-0.5 border-l-2 border-amber-400"
                    >
                      {line}
                    </div>
                  );
                }
                if (isStrategyEntry) {
                  return (
                    <div key={idx} className="text-emerald-400 font-semibold">
                      {line}
                    </div>
                  );
                }
                return <div key={idx}>{line}</div>;
              })}
            </pre>
          </div>
        </section>

        {/* Bottom Right: Export Settings (5 cols) */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-4 text-xs">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">TradingView 导出设置</h3>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                导出记录: {exportRecords.length} 条 [查看]
              </button>
            </div>

            {/* TV Symbol Mapping */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  TV 标的映射 (TradingView Symbol):
                </label>
                <button
                  onClick={() => {
                    const sym = activeResult?.symbol || 'RB';
                    setTvSymbol(`SHFE:${sym}1!`);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  [自动映射]
                </button>
              </div>
              <input
                id="input-tv-symbol"
                type="text"
                value={tvSymbol}
                onChange={(e) => setTvSymbol(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <p className="text-[10px] text-slate-500">
                支持 TV 国内期货连续主力格式（如 SHFE:RB1!、DCE:I1!、DCE:M1!、CFFEX:IF1!）
              </p>
            </div>

            {/* Timeframe Dropdown */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-800">周期 (Timeframe):</label>
              <select
                id="select-tv-timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="1D">日线 (1D)</option>
                <option value="60">60分钟 (60)</option>
                <option value="30">30分钟 (30)</option>
                <option value="15">15分钟 (15)</option>
                <option value="5">5分钟 (5)</option>
              </select>
            </div>

            {/* Parameters inclusion checkbox */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-800 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={includeParams}
                  onChange={(e) => setIncludeParams(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="font-medium">参数随导出 (input.int / input.float)</span>
              </label>
              <p className="text-[10px] text-slate-500 pl-5.5">
                勾选后，策略参数可在 TradingView 图表中实时调整而无需重新改写代码。
              </p>
            </div>

            {/* External Data Handling */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="font-semibold text-slate-800 block">
                外部数据处理 (基本面/资金面数据 TV 不自带):
              </label>
              <div className="space-y-1.5">
                <label className="flex items-start space-x-2 cursor-pointer text-slate-800 hover:text-slate-900 p-2 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors">
                  <input
                    type="radio"
                    name="externalDataMode"
                    checked={externalDataMode === 'seed'}
                    onChange={() => setExternalDataMode('seed')}
                    className="mt-0.5 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <div>
                    <span className="font-medium text-slate-900 block">
                      (o) request.seed 导入
                    </span>
                    <span className="text-[10px] text-slate-500">
                      通过外部桥接脚本或 Pine v5 自定义种子数据接入基差与研报指标
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-2 cursor-pointer text-slate-800 hover:text-slate-900 p-2 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors">
                  <input
                    type="radio"
                    name="externalDataMode"
                    checked={externalDataMode === 'technicalOnly'}
                    onChange={() => setExternalDataMode('technicalOnly')}
                    className="mt-0.5 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <div>
                    <span className="font-medium text-slate-900 block">
                      ( ) 仅导出技术面部分
                    </span>
                    <span className="text-[10px] text-slate-500">
                      自动剔除外部产业库与研报依赖，直接使用标准技术指标回测
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center space-x-2">
              <button
                id="btn-copy-pine-code-bottom"
                onClick={handleCopyPine}
                className="flex-1 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center space-x-1.5 border border-slate-300 shadow-2xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? '已复制' : '复制代码'}</span>
              </button>

              <button
                id="btn-download-pine-bottom"
                onClick={() => handleDownloadPine()}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 .pine 脚本</span>
              </button>
            </div>

            <button
              id="btn-batch-export-bottom"
              onClick={handleBatchExport}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center space-x-1 shadow-2xs transition-colors"
            >
              <span>批量导出选中指标到 TradingView</span>
            </button>
          </div>
        </section>
      </div>

      {/* Export History Modal */}
      <ExportHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        records={exportRecords}
        onDownloadRecord={(rec) =>
          handleDownloadPine(
            undefined,
            `${rec.indicatorName}_${rec.tvSymbol.replace(':', '_')}.pine`
          )
        }
      />
    </div>
  );
};
