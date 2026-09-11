import React, { useState } from 'react';
import {
  Indicator,
  BacktestConfig,
  BacktestResult,
  TargetUniverse,
} from '../types';
import { SAMPLE_PYTHON_CODE } from '../mockData';
import { CodeViewerModal } from './CodeViewerModal';
import { TradeDetailModal } from './TradeDetailModal';
import { YearlyStatsModal } from './YearlyStatsModal';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Sliders,
  Play,
  Save,
  FileCode2,
  TrendingUp,
  Percent,
  CheckSquare,
  Square,
  Shield,
  Clock,
  Calendar,
  Layers,
  BarChart3,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface PageBacktestProps {
  universe: TargetUniverse;
  indicators: Indicator[];
  selectedIndicatorIds: string[];
  setSelectedIndicatorIds: (ids: string[]) => void;
  backtestResults: BacktestResult[];
  onRunBacktest: (config: BacktestConfig) => void;
  onAddToCandidates: (result: BacktestResult) => void;
  onGoToExportWithSelected: (indicatorId: string) => void;
}

export const PageBacktest: React.FC<PageBacktestProps> = ({
  universe,
  indicators,
  selectedIndicatorIds,
  setSelectedIndicatorIds,
  backtestResults,
  onRunBacktest,
  onAddToCandidates,
  onGoToExportWithSelected,
}) => {
  // Config form state
  const [startDate, setStartDate] = useState('2019-01-01');
  const [endDate, setEndDate] = useState('2025-06-30');
  const [execTiming, setExecTiming] = useState<'close' | 'nextOpen' | 'nightOpen' | 'custom'>('close');
  const [customTime, setCustomTime] = useState('14:55');
  const [direction, setDirection] = useState<'both' | 'longOnly' | 'shortOnly'>('both');
  const [marginRatio, setMarginRatio] = useState<number>(10);
  const [leverage, setLeverage] = useState<number>(1.0);
  const [feeRate, setFeeRate] = useState<number>(1); // 万1
  const [slippageTicks, setSlippageTicks] = useState<number>(1);
  const [rollMethod, setRollMethod] = useState<'autoShift' | 'expireClose'>('autoShift');
  const [initCapital, setInitCapital] = useState<number>(1000000);
  const [sizing, setSizing] = useState<'fixedLots' | 'fixedRatio' | 'fixedRisk'>('fixedLots');

  const [isRunning, setIsRunning] = useState(false);
  const [saveConfigSuccess, setSaveConfigSuccess] = useState(false);

  // Active result tab for charts & modals
  const [activeResultId, setActiveResultId] = useState<string>(
    backtestResults[0]?.id || ''
  );
  const [chartViewMode, setChartViewMode] = useState<'nav' | 'drawdown'>('nav');

  // Modals state
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [tradeModalItem, setTradeModalItem] = useState<BacktestResult | null>(null);
  const [yearlyModalItem, setYearlyModalItem] = useState<BacktestResult | null>(null);

  const activeResult =
    backtestResults.find((r) => r.id === activeResultId) || backtestResults[0];

  const handleToggleIndicatorSelection = (id: string) => {
    setSelectedIndicatorIds(
      selectedIndicatorIds.includes(id)
        ? selectedIndicatorIds.filter((i) => i !== id)
        : [...selectedIndicatorIds, id]
    );
  };

  const handleStartBacktest = () => {
    setIsRunning(true);
    const config: BacktestConfig = {
      indicatorIds: selectedIndicatorIds.length > 0 ? selectedIndicatorIds : [indicators[0]?.id || 'ind-1'],
      symbols: universe.selectedSymbols,
      startDate,
      endDate,
      execTiming,
      customTime,
      direction,
      marginRatio,
      leverage,
      feeRate,
      slippageTicks,
      rollMethod,
      initCapital,
      sizing,
    };

    setTimeout(() => {
      onRunBacktest(config);
      setIsRunning(false);
    }, 900);
  };

  const handleSaveConfig = () => {
    setSaveConfigSuccess(true);
    setTimeout(() => setSaveConfigSuccess(false), 2000);
  };

  const handleExportCSV = () => {
    if (!activeResult) return;
    const header = '日期,策略净值,基准净值(连续合约),回撤(%)\n';
    const rows = activeResult.navSeries
      .map((p) => `${p.date},${p.nav},${p.benchmark},${p.drawdown}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_nav_${activeResult.symbol}_${activeResult.indicatorName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8.5rem)] min-h-[720px] bg-slate-50 text-slate-900 overflow-hidden">
      {/* ======================================================== */}
      {/* LEFT PANEL: Backtest Configuration (Fixed width ~380px)  */}
      {/* ======================================================== */}
      <section className="w-full lg:w-[380px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto p-4 space-y-4">
        {/* Panel Title */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">回测配置</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Futures Engine v2.4</span>
        </div>

        {/* Indicator Multi-Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>选择指标 (多选):</span>
            <span className="text-[10px] text-blue-600 font-medium">已选 {selectedIndicatorIds.length} 个</span>
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1.5">
            {indicators.map((ind) => {
              const checked = selectedIndicatorIds.includes(ind.id);
              return (
                <div
                  key={ind.id}
                  onClick={() => handleToggleIndicatorSelection(ind.id)}
                  className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs transition-colors ${
                    checked
                      ? 'bg-blue-50 border border-blue-200 text-blue-800 font-medium'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {checked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate text-slate-800">{ind.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1 py-0.2 rounded shrink-0">
                    {ind.symbols.join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inherited Target Universe Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1 font-semibold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>标的池 (继承页面1上下文 · 只读):</span>
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
              已同步
            </span>
          </div>

          <div className="flex flex-wrap gap-1 font-mono text-[11px]">
            {universe.selectedSymbols.map((sym) => (
              <span
                key={sym}
                className="bg-white text-blue-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold shadow-2xs"
              >
                {sym}主力连续 ({universe.rollAdjustment === 'post' ? '后复权' : '前复权'})
              </span>
            ))}
          </div>

          <div className="text-[10px] text-slate-500 flex items-center space-x-3 pt-1 border-t border-slate-200">
            <span>周期: {universe.frequency.toUpperCase()}</span>
            <span>交易所: {universe.exchanges.length}个活跃</span>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>回测历史区间:</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">开始日期</span>
              <input
                id="input-backtest-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">截止日期</span>
              <input
                id="input-backtest-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Execution Timing */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>执行时点 (成交基准):</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded cursor-pointer hover:border-slate-300 hover:bg-slate-100">
              <input
                type="radio"
                name="execTiming"
                checked={execTiming === 'close'}
                onChange={() => setExecTiming('close')}
                className="text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className="text-[11px] text-slate-700 font-medium">日终收盘 (15:00)</span>
            </label>

            <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded cursor-pointer hover:border-slate-300 hover:bg-slate-100">
              <input
                type="radio"
                name="execTiming"
                checked={execTiming === 'nextOpen'}
                onChange={() => setExecTiming('nextOpen')}
                className="text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className="text-[11px] text-slate-700 font-medium">次日开盘 (T+1 09:00)</span>
            </label>

            <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded cursor-pointer hover:border-slate-300 hover:bg-slate-100">
              <input
                type="radio"
                name="execTiming"
                checked={execTiming === 'nightOpen'}
                onChange={() => setExecTiming('nightOpen')}
                className="text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className="text-[11px] text-slate-700 font-medium">夜盘开盘 (21:00)</span>
            </label>

            <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded cursor-pointer hover:border-slate-300 hover:bg-slate-100">
              <input
                type="radio"
                name="execTiming"
                checked={execTiming === 'custom'}
                onChange={() => setExecTiming('custom')}
                className="text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className="text-[11px] text-slate-700 font-medium">自定义时点</span>
            </label>
          </div>
          {execTiming === 'custom' && (
            <div className="pt-1 flex items-center space-x-2">
              <span className="text-slate-500 text-xs">执行时间:</span>
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="14:55"
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 w-24 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Futures Parameters */}
        <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
          <span className="font-semibold text-slate-700 block">期货交易参数:</span>

          {/* Direction */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">交易方向:</span>
            <div className="flex items-center space-x-1.5">
              {[
                { label: '多空双向', val: 'both' },
                { label: '仅多', val: 'longOnly' },
                { label: '仅空', val: 'shortOnly' },
              ].map((d) => (
                <button
                  key={d.val}
                  id={`btn-direction-${d.val}`}
                  onClick={() => setDirection(d.val as any)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    direction === d.val
                      ? 'bg-blue-600 text-white font-medium shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Margin & Leverage */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 text-[11px] block mb-0.5">保证金比例 %</span>
              <input
                type="number"
                value={marginRatio}
                onChange={(e) => setMarginRatio(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block mb-0.5">杠杆倍数 (x)</span>
              <input
                type="number"
                step="0.1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
          </div>

          {/* Commission & Slippage */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 text-[11px] block mb-0.5">手续费 (万分比)</span>
              <input
                type="number"
                step="0.5"
                value={feeRate}
                onChange={(e) => setFeeRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block mb-0.5">滑点 (跳数)</span>
              <input
                type="number"
                value={slippageTicks}
                onChange={(e) => setSlippageTicks(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              />
            </div>
          </div>

          {/* Roll & Capital */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">主力换月:</span>
              <select
                value={rollMethod}
                onChange={(e) => setRollMethod(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 shadow-2xs"
              >
                <option value="autoShift">主力换月自动移仓</option>
                <option value="expireClose">交割月到期平仓</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">初始资金 (元):</span>
              <input
                type="number"
                step="100000"
                value={initCapital}
                onChange={(e) => setInitCapital(Number(e.target.value))}
                className="w-32 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-mono text-right focus:bg-white focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">仓位方式:</span>
              <select
                value={sizing}
                onChange={(e) => setSizing(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 shadow-2xs"
              >
                <option value="fixedLots">固定手数 (10手)</option>
                <option value="fixedRatio">固定比例 (总资金20%)</option>
                <option value="fixedRisk">固定风险价值</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons & Script Link */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex items-center space-x-2">
            <button
              id="btn-start-backtest"
              onClick={handleStartBacktest}
              disabled={isRunning}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition-all"
            >
              {isRunning ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>仿真计算中...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>开始回测</span>
                </>
              )}
            </button>

            <button
              id="btn-save-backtest-config"
              onClick={handleSaveConfig}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 flex items-center space-x-1 shadow-2xs"
            >
              {saveConfigSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveConfigSuccess ? '已保存' : '保存配置'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-slate-500">底层运行环境:</span>
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 hover:underline"
            >
              <FileCode2 className="w-3 h-3" />
              <span>backtest.py [查看/下载脚本]</span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Backtest Results (Adaptive width)           */}
      {/* ======================================================== */}
      <section className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-4">
        {/* Top Result Header & KPI summary card */}
        {activeResult ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <span>{activeResult.indicatorName}</span>
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
                    {activeResult.symbol}主力合约
                  </span>
                </h3>
                <span className="text-xs text-slate-500">
                  执行时点:{' '}
                  {activeResult.execTiming === 'close'
                    ? '日终收盘 (15:00)'
                    : activeResult.execTiming === 'nextOpen'
                    ? '次日开盘 (09:00)'
                    : '夜盘开盘'}
                </span>
              </div>

              {/* Action buttons on current result */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  id="btn-view-trade-details"
                  onClick={() => setTradeModalItem(activeResult)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                  <span>交易明细</span>
                </button>

                <button
                  id="btn-view-yearly-stats"
                  onClick={() => setYearlyModalItem(activeResult)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1 shadow-2xs"
                >
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>分年度统计</span>
                </button>

                <button
                  id="btn-export-nav-csv"
                  onClick={handleExportCSV}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1 shadow-2xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>导出CSV</span>
                </button>

                <button
                  id="btn-add-to-candidate-pool"
                  onClick={() => {
                    onAddToCandidates(activeResult);
                    onGoToExportWithSelected(activeResult.indicatorId);
                  }}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center space-x-1 shadow-2xs transition-colors"
                >
                  <span>加入候选池 →</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">年化收益率</span>
                <span className="text-lg font-bold font-mono text-red-600">
                  +{(activeResult.annualReturn * 100).toFixed(1)}%
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">最大回撤 (MDD)</span>
                <span className="text-lg font-bold font-mono text-emerald-600">
                  {(activeResult.maxDrawdown * 100).toFixed(1)}%
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">卡玛比率 (Calmar)</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {activeResult.calmar.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">夏普比率 (Sharpe)</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {activeResult.sharpe.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">胜率 (Win Rate)</span>
                <span className="text-lg font-bold font-mono text-amber-600">
                  {(activeResult.winRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Chart View with Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                id="btn-tab-nav-chart"
                onClick={() => setChartViewMode('nav')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartViewMode === 'nav'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                净值曲线图 (策略 vs 基准: 品种连续合约)
              </button>
              <button
                id="btn-tab-dd-chart"
                onClick={() => setChartViewMode('drawdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartViewMode === 'drawdown'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                回撤曲线图 (Drawdown %)
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                <span className="text-slate-700 font-medium">策略净值</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                <span className="text-slate-500">基准 (连续合约)</span>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-64 sm:h-72 w-full pt-2">
            {activeResult && activeResult.navSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartViewMode === 'nav' ? (
                  <LineChart
                    data={activeResult.navSeries}
                    margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelStyle={{ color: '#475569', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="nav"
                      name="策略净值"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      name="基准标的"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <AreaChart
                    data={activeResult.navSeries}
                    margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelStyle={{ color: '#475569', fontWeight: 600 }}
                      formatter={(v: any) => [`${v}%`, '回撤深度']}
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      name="回撤幅度"
                      stroke="#059669"
                      fill="#d1fae5"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                暂无回测数据，请点击左侧「开始回测」
              </div>
            )}
          </div>
        </div>

        {/* Results Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>多品种多指标回测结果对比表</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              点击行切换图表视图
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-3">指标名称 (品种)</th>
                  <th className="p-3">执行时点</th>
                  <th className="p-3 text-right">年化收益</th>
                  <th className="p-3 text-right">最大回撤</th>
                  <th className="p-3 text-right">卡玛比率</th>
                  <th className="p-3 text-right">夏普比率</th>
                  <th className="p-3 text-right">交易胜率</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {backtestResults.map((res) => {
                  const isCurActive = res.id === activeResultId;
                  return (
                    <tr
                      key={res.id}
                      onClick={() => setActiveResultId(res.id)}
                      className={`cursor-pointer transition-colors ${
                        isCurActive
                          ? 'bg-blue-50/80 border-l-2 border-l-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 font-medium text-slate-900 flex items-center space-x-2">
                        <span className="text-slate-900 font-sans font-medium">{res.indicatorName}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-mono border border-blue-200">
                          {res.symbol}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] font-sans">
                        {res.execTiming === 'close'
                          ? '日终收盘'
                          : res.execTiming === 'nextOpen'
                          ? '次日开盘'
                          : '夜盘开盘'}
                      </td>
                      <td className="p-3 text-right font-bold text-red-600">
                        +{(res.annualReturn * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        {(res.maxDrawdown * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">
                        {res.calmar.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-slate-800">
                        {res.sharpe.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-amber-600 font-semibold">
                        {(res.winRate * 100).toFixed(0)}%
                      </td>
                      <td
                        className="p-3 text-center space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setTradeModalItem(res)}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs"
                        >
                          明细
                        </button>
                        <button
                          onClick={() => {
                            onAddToCandidates(res);
                            onGoToExportWithSelected(res.indicatorId);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs"
                        >
                          导出TV
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Script Modal */}
      <CodeViewerModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        title="backtest.py — 期货指标回测核心脚本"
        code={SAMPLE_PYTHON_CODE}
        language="python"
        filename="backtest.py"
      />

      {/* Trade Detail Modal */}
      {tradeModalItem && (
        <TradeDetailModal
          isOpen={!!tradeModalItem}
          onClose={() => setTradeModalItem(null)}
          indicatorName={tradeModalItem.indicatorName}
          symbol={tradeModalItem.symbol}
          trades={tradeModalItem.trades}
        />
      )}

      {/* Yearly Stats Modal */}
      {yearlyModalItem && (
        <YearlyStatsModal
          isOpen={!!yearlyModalItem}
          onClose={() => setYearlyModalItem(null)}
          indicatorName={yearlyModalItem.indicatorName}
          symbol={yearlyModalItem.symbol}
          yearlyStats={yearlyModalItem.yearlyStats}
        />
      )}
    </div>
  );
};
