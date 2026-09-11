import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWorkbenchStore, mockBars } from '../store/workbenchStore';
import { getContractName } from '../engine/contractHelper';
import { Download, Star, StarHalf, Eye, FileCode, Trash2, RotateCcw, X, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';
import * as echarts from 'echarts';

interface CandidatePoolViewProps {
  onExportIndicator: (indId: string) => void;
}

export interface CandidateRowItem {
  id: string; // unique row id: e.g. "ind-1-v1-RB"
  indicatorId: string;
  name: string;
  version: string;
  symbol: string;
  executionTiming: string;
  calmar: number;
  sharpe: number;
  maxDrawdown: number; // e.g. -0.212 for -21.2%
  winRate: number; // e.g. 0.41 for 41%
  rating: number; // 0 to 5
  annualReturn: number;
  trades: number;
  pineCode: string;
}

interface ExportLogItem {
  id: string;
  time: string;
  fileCount: number;
  fileNames: string[];
  period: string;
  withParams: boolean;
}

export const CandidatePoolView: React.FC<CandidatePoolViewProps> = ({ onExportIndicator }) => {
  const { state, store } = useWorkbenchStore();

  // 1. Filter States
  const [calmarMin, setCalmarMin] = useState<string>('');
  const [sharpeMin, setSharpeMin] = useState<string>('');
  const [drawdownMax, setDrawdownMax] = useState<string>('');
  const [winRateMin, setWinRateMin] = useState<string>('');
  const [symbolFilter, setSymbolFilter] = useState<string>('全部');
  const [timingFilter, setTimingFilter] = useState<string>('全部');
  const [sortField, setSortField] = useState<string>('score');

  // 2. Export Settings State
  const [tickerMappings, setTickerMappings] = useState<Record<string, string>>({
    RB: 'SHFE:RB1!',
    I: 'DCE:I1!',
    M: 'DCE:M1!',
  });
  const [exportPeriod, setExportPeriod] = useState<string>('日线');
  const [withParams, setWithParams] = useState<boolean>(true);

  // 3. Export History Logs
  const [exportLogs, setExportLogs] = useState<ExportLogItem[]>([
    {
      id: 'log-1',
      time: '23:16',
      fileCount: 2,
      fileNames: ['基差-均线共振 v1·RB', '基差-均线共振 v1·I'],
      period: '日线',
      withParams: true,
    },
  ]);

  // 4. Modal states
  const [previewItem, setPreviewItem] = useState<CandidateRowItem | null>(null);
  const [pineModalItem, setPineModalItem] = useState<CandidateRowItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedPine, setCopiedPine] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 5. Build candidate rows from state.indicators with inCandidatePool
  const allRows: CandidateRowItem[] = useMemo(() => {
    const candidateIndicators = state.indicators.filter(i => i.inCandidatePool);
    const rows: CandidateRowItem[] = [];

    for (const ind of candidateIndicators) {
      const curV = ind.versions.find(v => v.id === ind.currentVersionId) || ind.versions[0];
      const pineCode = curV?.pineCode || '';

      // 对齐原图：基差-均线共振的三品种细分数据
      if (ind.id === 'ind-1') {
        rows.push(
          {
            id: `${ind.id}-${curV?.id || 'v1'}-RB`,
            indicatorId: ind.id,
            name: ind.name,
            version: curV?.label || 'v1',
            symbol: 'RB',
            executionTiming: '日终收盘',
            calmar: 0.99,
            sharpe: 1.48,
            maxDrawdown: -0.212,
            winRate: 0.41,
            rating: 3.5,
            annualReturn: 0.209,
            trades: 48,
            pineCode,
          },
          {
            id: `${ind.id}-${curV?.id || 'v1'}-I`,
            indicatorId: ind.id,
            name: ind.name,
            version: curV?.label || 'v1',
            symbol: 'I',
            executionTiming: '日终收盘',
            calmar: 1.40,
            sharpe: 1.34,
            maxDrawdown: -0.104,
            winRate: 0.44,
            rating: 3.5,
            annualReturn: 0.145,
            trades: 36,
            pineCode,
          },
          {
            id: `${ind.id}-${curV?.id || 'v1'}-M`,
            indicatorId: ind.id,
            name: ind.name,
            version: curV?.label || 'v1',
            symbol: 'M',
            executionTiming: '日终收盘',
            calmar: 0.33,
            sharpe: 0.68,
            maxDrawdown: -0.261,
            winRate: 0.33,
            rating: 2.5,
            annualReturn: 0.086,
            trades: 41,
            pineCode,
          }
        );
      } else {
        // 其他可能加入候选池的指标
        for (const sym of ind.symbols) {
          const symMetric = curV?.result.perSymbol?.find(p => p.symbol === sym);
          const calmar = symMetric?.calmar ?? 1.1;
          const sharpe = symMetric?.sharpe ?? 1.2;
          const maxDD = symMetric?.maxDrawdown ?? -0.15;
          const winRate = symMetric?.winRate ?? 0.38;

          // 计算星级
          let rating = 3.0;
          if (calmar > 1.5 && sharpe > 1.4) rating = 4.5;
          else if (calmar > 1.2 || sharpe > 1.3) rating = 4.0;
          else if (calmar > 0.8) rating = 3.5;
          else if (calmar > 0.4) rating = 2.5;
          else rating = 2.0;

          rows.push({
            id: `${ind.id}-${curV?.id || 'v1'}-${sym}`,
            indicatorId: ind.id,
            name: ind.name,
            version: curV?.label || 'v1',
            symbol: sym,
            executionTiming: '日终收盘',
            calmar,
            sharpe,
            maxDrawdown: maxDD,
            winRate,
            rating,
            annualReturn: symMetric?.annualReturn ?? 0.12,
            trades: symMetric?.trades ?? 30,
            pineCode,
          });
        }
      }
    }

    return rows;
  }, [state.indicators]);

  // Selected rows
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 6. Apply Filter & Sorting
  const filteredRows = useMemo(() => {
    let list = [...allRows];

    // Filter: 卡玛 ⩾
    if (calmarMin.trim() !== '') {
      const val = parseFloat(calmarMin);
      if (!isNaN(val)) list = list.filter(r => r.calmar >= val);
    }

    // Filter: 夏普 ⩾
    if (sharpeMin.trim() !== '') {
      const val = parseFloat(sharpeMin);
      if (!isNaN(val)) list = list.filter(r => r.sharpe >= val);
    }

    // Filter: 回撤 ⩽ % (例如输入 20 表示回撤绝对值 <= 20%)
    if (drawdownMax.trim() !== '') {
      const val = parseFloat(drawdownMax);
      if (!isNaN(val)) {
        list = list.filter(r => Math.abs(r.maxDrawdown * 100) <= val);
      }
    }

    // Filter: 胜率 ⩾ % (例如输入 40 表示胜率 >= 40%)
    if (winRateMin.trim() !== '') {
      const val = parseFloat(winRateMin);
      if (!isNaN(val)) {
        list = list.filter(r => r.winRate * 100 >= val);
      }
    }

    // Filter: 品种
    if (symbolFilter !== '全部') {
      list = list.filter(r => r.symbol === symbolFilter);
    }

    // Filter: 执行时点
    if (timingFilter !== '全部') {
      list = list.filter(r => r.executionTiming === timingFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortField === 'score') return b.rating - a.rating;
      if (sortField === 'calmar') return b.calmar - a.calmar;
      if (sortField === 'sharpe') return b.sharpe - a.sharpe;
      if (sortField === 'drawdown') return Math.abs(a.maxDrawdown) - Math.abs(b.maxDrawdown);
      if (sortField === 'winRate') return b.winRate - a.winRate;
      return 0;
    });

    return list;
  }, [allRows, calmarMin, sharpeMin, drawdownMax, winRateMin, symbolFilter, timingFilter, sortField]);

  // Handle select all toggle
  const isAllSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.includes(r.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIdSet = new Set(filteredRows.map(r => r.id));
      setSelectedIds(selectedIds.filter(id => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...filteredRows.map(r => r.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleResetFilter = () => {
    setCalmarMin('');
    setSharpeMin('');
    setDrawdownMax('');
    setWinRateMin('');
    setSymbolFilter('全部');
    setTimingFilter('全部');
    setSortField('score');
  };

  // Handle Batch Export
  const handleBatchExport = () => {
    const selectedRows = allRows.filter(r => selectedIds.includes(r.id));
    if (selectedRows.length === 0) return;

    const fileNames = selectedRows.map(r => `${r.name} ${r.version}·${r.symbol}`);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Package TradingView script
    let content = `//@version=5\n// ================================================\n// TradingView Pine Script Batch Export\n// 导出时间: ${now.toLocaleString()}\n// 运行周期: ${exportPeriod}\n// 参数随导出: ${withParams ? '是' : '否'}\n// ================================================\n\n`;

    selectedRows.forEach(row => {
      const tvTicker = tickerMappings[row.symbol] || `${row.symbol}1!`;
      content += `// ------------------------------------------------\n`;
      content += `// 指标: ${row.name} (${row.version}) | 标的: ${row.symbol} (${tvTicker})\n`;
      content += `// ------------------------------------------------\n`;
      content += `${row.pineCode}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TV_Export_${selectedRows.length}_files_${Date.now()}.pine`;
    a.click();
    URL.revokeObjectURL(url);

    // Append to logs
    const newLog: ExportLogItem = {
      id: `log-${Date.now()}`,
      time: timeStr,
      fileCount: selectedRows.length,
      fileNames,
      period: exportPeriod,
      withParams,
    };
    setExportLogs([newLog, ...exportLogs]);
    showToast(`成功导出 ${selectedRows.length} 个策略脚本文件`);
  };

  // Handle Remove Row
  const handleRemoveRow = (row: CandidateRowItem) => {
    // Check if this is the last symbol of the indicator
    const remainingForInd = allRows.filter(r => r.indicatorId === row.indicatorId && r.id !== row.id);
    if (remainingForInd.length === 0) {
      store.toggleCandidatePool(row.indicatorId);
    }
    setSelectedIds(prev => prev.filter(x => x !== row.id));
    showToast(`已将 ${row.name} (${row.symbol}) 移出候选池`);
  };

  return (
    <div className="flex-1 bg-slate-50/60 flex flex-col p-5 overflow-y-auto select-none space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Top Filter Bar (筛选卡片，精准还原原图布局) */}
      <div className="bg-white rounded-xl border border-[#E5E8EE] p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3 text-xs">
          {/* Left inputs */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-bold text-slate-800 text-[13px]">筛选</span>

            {/* 卡玛 ⩾ */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">卡玛 ⩾</span>
              <input
                type="number"
                step="0.1"
                value={calmarMin}
                onChange={e => setCalmarMin(e.target.value)}
                placeholder=""
                className="w-14 h-7 px-1.5 border border-slate-200 rounded text-center text-xs text-slate-800 focus:border-[#2F6FED] outline-none"
              />
            </div>

            {/* 夏普 ⩾ */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">夏普 ⩾</span>
              <input
                type="number"
                step="0.1"
                value={sharpeMin}
                onChange={e => setSharpeMin(e.target.value)}
                placeholder=""
                className="w-14 h-7 px-1.5 border border-slate-200 rounded text-center text-xs text-slate-800 focus:border-[#2F6FED] outline-none"
              />
            </div>

            {/* 回撤 ⩽ % */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">回撤 ⩽ %</span>
              <input
                type="number"
                step="1"
                value={drawdownMax}
                onChange={e => setDrawdownMax(e.target.value)}
                placeholder=""
                className="w-14 h-7 px-1.5 border border-slate-200 rounded text-center text-xs text-slate-800 focus:border-[#2F6FED] outline-none"
              />
            </div>

            {/* 胜率 ⩾ % */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">胜率 ⩾ %</span>
              <input
                type="number"
                step="1"
                value={winRateMin}
                onChange={e => setWinRateMin(e.target.value)}
                placeholder=""
                className="w-14 h-7 px-1.5 border border-slate-200 rounded text-center text-xs text-slate-800 focus:border-[#2F6FED] outline-none"
              />
            </div>

            {/* 合约 */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">合约</span>
              <select
                value={symbolFilter}
                onChange={e => setSymbolFilter(e.target.value)}
                className="h-7 px-2 border border-slate-200 rounded text-xs text-slate-800 bg-white focus:border-[#2F6FED] outline-none cursor-pointer"
              >
                <option value="全部">全部</option>
                <option value="RB">螺纹主力连续 (RB)</option>
                <option value="I">铁矿主力连续 (I)</option>
                <option value="M">豆粕主力连续 (M)</option>
              </select>
            </div>

            {/* 执行时点 */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">执行时点</span>
              <select
                value={timingFilter}
                onChange={e => setTimingFilter(e.target.value)}
                className="h-7 px-2 border border-slate-200 rounded text-xs text-slate-800 bg-white focus:border-[#2F6FED] outline-none cursor-pointer"
              >
                <option value="全部">全部</option>
                <option value="日终收盘">日终收盘</option>
                <option value="盘中触发">盘中触发</option>
              </select>
            </div>

            {/* 排序 */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-600">排序</span>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="h-7 px-2 border border-slate-200 rounded text-xs text-slate-800 bg-white focus:border-[#2F6FED] outline-none cursor-pointer"
              >
                <option value="score">评分</option>
                <option value="calmar">卡玛</option>
                <option value="sharpe">夏普</option>
                <option value="drawdown">回撤小到大</option>
                <option value="winRate">胜率</option>
              </select>
            </div>

            {/* 重置 */}
            <button
              onClick={handleResetFilter}
              className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer transition-colors"
            >
              重置
            </button>
          </div>

          {/* Right count: 3 / 3 条 */}
          <div className="text-slate-400 text-xs font-mono ml-auto">
            {filteredRows.length} / {allRows.length} 条
          </div>
        </div>
      </div>

      {/* 2. Main Table (候选指标明细列表) */}
      <div className="bg-white rounded-xl border border-[#E5E8EE] shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-sans border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-[#2F6FED] focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 font-medium">指标</th>
              <th className="py-3 px-3 font-medium">版本</th>
              <th className="py-3 px-3 font-medium">具体合约</th>
              <th className="py-3 px-3 font-medium">执行时点</th>
              <th className="py-3 px-3 font-medium">卡玛</th>
              <th className="py-3 px-3 font-medium">夏普</th>
              <th className="py-3 px-3 font-medium">最大回撤</th>
              <th className="py-3 px-3 font-medium">胜率</th>
              <th className="py-3 px-3 font-medium">评分</th>
              <th className="py-3 px-4 font-medium text-right">操作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  {allRows.length === 0
                    ? '候选池目前为空。在指标工作台右上角点击「加入候选池」即可收藏优秀策略。'
                    : '未找到符合当前筛选条件的指标，可点击上方「重置」恢复查看。'}
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        className="rounded border-slate-300 text-[#2F6FED] focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* 指标名称 */}
                    <td className="py-3.5 px-3 font-bold text-slate-900">{row.name}</td>

                    {/* 版本 */}
                    <td className="py-3.5 px-3 font-mono text-slate-500">{row.version}</td>

                    {/* 具体合约 */}
                    <td className="py-3.5 px-3 font-semibold text-slate-800">{getContractName(row.symbol)}</td>

                    {/* 执行时点 */}
                    <td className="py-3.5 px-3 text-slate-600">{row.executionTiming}</td>

                    {/* 卡玛 */}
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-900">{row.calmar.toFixed(2)}</td>

                    {/* 夏普 */}
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-900">{row.sharpe.toFixed(2)}</td>

                    {/* 最大回撤 */}
                    <td className="py-3.5 px-3 font-mono text-slate-900">
                      {(row.maxDrawdown * 100).toFixed(1)}%
                    </td>

                    {/* 胜率 */}
                    <td className="py-3.5 px-3 font-mono text-slate-900">
                      {(row.winRate * 100).toFixed(0)}%
                    </td>

                    {/* 评分 (星级组件) */}
                    <td className="py-3.5 px-3">
                      <StarRating score={row.rating} />
                    </td>

                    {/* 操作 (Pine, 预览, 移除) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-3 text-xs">
                        <button
                          onClick={() => setPineModalItem(row)}
                          className="text-[#2F6FED] hover:text-[#2557CA] font-medium cursor-pointer"
                        >
                          Pine
                        </button>
                        <button
                          onClick={() => setPreviewItem(row)}
                          className="text-[#2F6FED] hover:text-[#2557CA] font-medium cursor-pointer"
                        >
                          预览
                        </button>
                        <button
                          onClick={() => handleRemoveRow(row)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                        >
                          移除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Bottom Section: 导出设置 & 导出记录 (左右分栏，对齐原图) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左卡片: 导出设置 */}
        <div className="bg-white rounded-xl border border-[#E5E8EE] p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">导出设置</h3>
              <button
                onClick={handleBatchExport}
                disabled={selectedIds.length === 0}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedIds.length > 0
                    ? 'bg-[#2F6FED] text-white hover:bg-[#2557CA] cursor-pointer shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                导出选中 ({selectedIds.length})
              </button>
            </div>

            {/* 映射配置: RB, I, M, 周期 */}
            <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
              {['RB', 'I', 'M'].map(sym => (
                <div key={sym} className="flex items-center space-x-1.5">
                  <span className="font-medium text-slate-700">{sym}</span>
                  <input
                    type="text"
                    value={tickerMappings[sym] || ''}
                    onChange={e =>
                      setTickerMappings({ ...tickerMappings, [sym]: e.target.value })
                    }
                    className="w-24 h-7 px-2 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-[#2F6FED] outline-none"
                  />
                </div>
              ))}

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500">周期</span>
                <select
                  value={exportPeriod}
                  onChange={e => setExportPeriod(e.target.value)}
                  className="h-7 px-2 border border-slate-200 rounded text-xs text-slate-800 bg-white focus:border-[#2F6FED] outline-none cursor-pointer"
                >
                  <option value="日线">日线</option>
                  <option value="60分钟">60分钟</option>
                  <option value="15分钟">15分钟</option>
                  <option value="5分钟">5分钟</option>
                </select>
              </div>
            </div>

            {/* Checkbox: 参数随导出 */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="with-params-cb"
                checked={withParams}
                onChange={e => setWithParams(e.target.checked)}
                className="rounded border-slate-300 text-[#2F6FED] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="with-params-cb" className="text-xs text-slate-700 cursor-pointer">
                参数随导出
              </label>
            </div>
          </div>
        </div>

        {/* 右卡片: 导出记录 */}
        <div className="bg-white rounded-xl border border-[#E5E8EE] p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">导出记录</h3>
            <span className="text-[11px] text-slate-400">共 {exportLogs.length} 条</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-32 text-xs font-mono text-slate-600 pr-1">
            {exportLogs.map(log => (
              <div key={log.id} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                <span className="text-slate-400 shrink-0 font-normal">{log.time}</span>
                <span className="text-slate-800">
                  {log.fileCount} 个文件: {log.fileNames.join('、')} 周期 {log.period}
                  {log.withParams ? ' · 参数随导出' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 预览弹窗 (Preview Modal) */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onOpenWorkbench={() => {
            store.setActiveIndicator(previewItem.indicatorId);
            store.setSelectedSymbol(previewItem.symbol);
            store.setActiveTab('workbench');
            setPreviewItem(null);
          }}
        />
      )}

      {/* 5. Pine Script 弹窗 (Pine Modal) */}
      {pineModalItem && (
        <PineScriptModal
          item={pineModalItem}
          tvTicker={tickerMappings[pineModalItem.symbol] || `${pineModalItem.symbol}1!`}
          period={exportPeriod}
          withParams={withParams}
          onClose={() => setPineModalItem(null)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};

// 评分星级组件 (★ ★ ★ ☆ ☆)
const StarRating: React.FC<{ score: number }> = ({ score }) => {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.4;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));

  return (
    <div className="flex items-center space-x-0.5 text-amber-500">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f-${i}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
      {hasHalf && <StarHalf className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e-${i}`} className="w-3.5 h-3.5 text-slate-200 fill-slate-200" />
      ))}
    </div>
  );
};

// 快速预览弹窗 (K线 + 资金曲线)
interface PreviewModalProps {
  item: CandidateRowItem;
  onClose: () => void;
  onOpenWorkbench: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose, onOpenWorkbench }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const bars = mockBars[item.symbol] || mockBars['RB'] || [];
    const dates = bars.slice(-120).map(b => b.date);
    const prices = bars.slice(-120).map(b => [b.open, b.close, b.low, b.high]);

    // 生成净值曲线
    let cur = 1.0;
    const navSeries: number[] = [];
    for (let i = 0; i < dates.length; i++) {
      const dayReturn = (Math.random() - 0.47) * 0.015;
      cur = cur * (1 + dayReturn);
      navSeries.push(Number(cur.toFixed(4)));
    }

    const option: echarts.EChartsOption = {
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      grid: [
        { left: 50, right: 30, top: 20, height: '55%' },
        { left: 50, right: 30, top: '70%', height: '22%' },
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { fontSize: 10, color: '#94A3B8' } },
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#F1F5F9' } } },
        { scale: true, gridIndex: 1, splitLine: { lineStyle: { color: '#F1F5F9' } }, axisLabel: { fontSize: 10 } },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: prices,
          itemStyle: {
            color: '#EF4444',
            color0: '#10B981',
            borderColor: '#EF4444',
            borderColor0: '#10B981',
          },
        },
        {
          name: '策略净值',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: navSeries,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#2F6FED', width: 2 },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 text-sm">{item.name} {item.version}</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2F6FED] font-mono text-xs font-semibold">
              {getContractName(item.symbol)}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Key KPI summary */}
          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center font-mono">
            <div>
              <div className="text-[11px] text-slate-400 font-sans">卡玛比率</div>
              <div className="text-sm font-bold text-slate-900">{item.calmar.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-sans">夏普比率</div>
              <div className="text-sm font-bold text-slate-900">{item.sharpe.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-sans">最大回撤</div>
              <div className="text-sm font-bold text-slate-900">{(item.maxDrawdown * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-sans">胜率</div>
              <div className="text-sm font-bold text-slate-900">{(item.winRate * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div ref={chartRef} className="w-full h-64 border border-slate-100 rounded-xl" />
        </div>

        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">执行时点: {item.executionTiming}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={onOpenWorkbench}
              className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2557CA] text-white text-xs rounded-lg font-medium flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <span>在指标工作台调优</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pine Script 查看与下载弹窗
interface PineScriptModalProps {
  item: CandidateRowItem;
  tvTicker: string;
  period: string;
  withParams: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const PineScriptModal: React.FC<PineScriptModalProps> = ({
  item,
  tvTicker,
  period,
  withParams,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  const pineScriptCode = `//@version=5
// Strategy: ${item.name} (${item.version})
// Symbol: ${item.symbol} -> TradingView: ${tvTicker}
// Period: ${period}
// Parameters Included: ${withParams ? 'true' : 'false'}

${item.pineCode || `strategy("${item.name}", overlay=true, default_qty_type=strategy.fixed, default_qty_value=1)
fastMA = ta.sma(close, 10)
slowMA = ta.sma(close, 20)
longCondition = ta.crossover(fastMA, slowMA)
if (longCondition)
    strategy.entry("Long", strategy.long)
shortCondition = ta.crossunder(fastMA, slowMA)
if (shortCondition)
    strategy.entry("Short", strategy.short)
plot(fastMA, color=color.blue, title="Fast MA")
plot(slowMA, color=color.orange, title="Slow MA")
`}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopied(true);
    onShowToast('Pine 脚本已成功复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pineScriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}_${item.symbol}_${item.version}.pine`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(`已保存 ${item.name}_${item.symbol}.pine 文件`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 text-sm">TradingView Pine Script</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2F6FED] font-mono text-xs font-semibold">
              {item.name} · {item.symbol}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="bg-slate-900 rounded-xl p-3.5 text-slate-100 font-mono text-xs overflow-y-auto flex-1 leading-relaxed border border-slate-800 select-text">
            <pre className="whitespace-pre-wrap">{pineScriptCode}</pre>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">TV 代码: {tvTicker} · 周期: {period}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制脚本'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2557CA] text-white text-xs rounded-lg font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .pine 文件</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
