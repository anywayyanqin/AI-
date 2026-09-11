import React, { useState } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import {
  ChevronDown,
  Save,
  Cloud,
  CloudCheck,
  BookmarkPlus,
  BookmarkCheck,
  Download,
  Plus,
  Check,
  History,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface WorkbenchHeaderProps {
  onExportPine: () => void;
  onOpenNewIndicatorModal: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  onExportPine,
  onOpenNewIndicatorModal,
}) => {
  const { state, store, activeIndicator } = useWorkbenchStore();
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  if (!activeIndicator) return null;

  const curVer = activeIndicator.versions.find(v => v.id === activeIndicator.currentVersionId);
  const kpi = curVer?.result.kpi || {
    sharpe: 0,
    annualReturn: 0,
    maxDrawdown: 0,
    calmar: 0,
    winRate: 0,
    trades: 0,
  };

  return (
    <div className="w-full bg-white border-b border-[#E5E8EE] shrink-0 select-none">
      {/* 1. Indicator Tabs */}
      <div className="flex items-center justify-between px-4 pt-2 border-b border-[#EEF1F5] bg-slate-50/60">
        <div className="flex items-center space-x-1">
          {state.indicators.map(ind => {
            const isActive = ind.id === activeIndicator.id;
            return (
              <button
                key={ind.id}
                onClick={() => store.setActiveIndicator(ind.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-t-md transition-all flex items-center space-x-1.5 border-t border-l border-r cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 border-[#E5E8EE] font-semibold shadow-xs -mb-[1px]'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <span>{ind.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ind.isDirty ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  title={ind.isDirty ? '有未保存修改' : '已保存'}
                />
              </button>
            );
          })}

          <button
            onClick={onOpenNewIndicatorModal}
            className="px-2 py-1 text-slate-400 hover:text-[#2F6FED] hover:bg-white rounded transition-colors text-xs flex items-center space-x-1 cursor-pointer"
            title="新建指标"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px]">新建</span>
          </button>
        </div>
      </div>

      {/* 2. Title Row & Actions */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Title, tags, version, dependencies */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {activeIndicator.name}
            </h1>
          </div>

          {/* Version Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer border border-slate-200 transition-colors"
            >
              <span>{curVer?.label || 'v1'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {versionDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setVersionDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-[#E5E8EE] z-40 py-1 text-xs">
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 font-semibold border-b border-slate-100 flex items-center justify-between">
                    <span>版本历史与回退</span>
                    <History className="w-3 h-3" />
                  </div>
                  {activeIndicator.versions.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        store.switchVersion(v.id);
                        setVersionDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start space-x-2 transition-colors cursor-pointer ${
                        v.id === activeIndicator.currentVersionId ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <span className={`font-mono font-bold mt-0.5 ${v.id === activeIndicator.currentVersionId ? 'text-[#2F6FED]' : 'text-slate-700'}`}>
                        {v.label}
                      </span>
                      <div className="flex-1 truncate">
                        <div className="font-medium text-slate-800 truncate">{v.changeSummary}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          年化 {(((v.result?.kpi?.annualReturn ?? 0)) * 100).toFixed(1)}% · 回撤 {(((v.result?.kpi?.maxDrawdown ?? 0)) * 100).toFixed(1)}%
                          {v.savedAt && ` · 存入 ${v.savedAt}`}
                        </div>
                      </div>
                      {v.id === activeIndicator.currentVersionId && (
                        <Check className="w-3.5 h-3.5 text-[#2F6FED] shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Saved status: 仅保留云朵图标，hover时展示上次保存时间 */}
          <div className="flex items-center text-xs relative group">
            <button
              type="button"
              onClick={() => activeIndicator.isDirty && store.saveCurrentVersion()}
              disabled={!activeIndicator.isDirty}
              title={
                activeIndicator.isDirty
                  ? `当前有修改未保存 · 上次保存时间: ${curVer?.savedAt || '无'}`
                  : `上次保存时间: ${curVer?.savedAt || '已是最新'}`
              }
              className={`p-1 rounded transition-colors select-none flex items-center justify-center ${
                activeIndicator.isDirty
                  ? 'cursor-pointer hover:bg-slate-100 text-slate-700'
                  : 'cursor-default text-slate-500 hover:bg-slate-50'
              }`}
            >
              {activeIndicator.isDirty ? (
                <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4 text-slate-700 stroke-[1.8]" />
                  <div className="absolute inset-0 flex items-center justify-center space-x-[1.5px] pt-0.5">
                    <span className="w-[2px] h-[2px] rounded-full bg-slate-800" />
                    <span className="w-[2px] h-[2px] rounded-full bg-slate-800" />
                    <span className="w-[2px] h-[2px] rounded-full bg-slate-800" />
                  </div>
                </div>
              ) : (
                <CloudCheck className="w-4 h-4 text-emerald-600 stroke-[1.8] shrink-0" />
              )}
            </button>

            {/* Hover Floating Tooltip */}
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:flex flex-col items-center z-30 whitespace-nowrap">
              <div className="bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded shadow-lg backdrop-blur-xs">
                {activeIndicator.isDirty
                  ? `未保存 · 上次保存: ${curVer?.savedAt || '无'}`
                  : `上次保存时间: ${curVer?.savedAt || '已是最新'}`}
              </div>
            </div>
          </div>

          {/* Data dependency source buttons */}
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] text-slate-500 border-l border-slate-200 pl-3">
            <span className="text-slate-400">数据源:</span>
            <button
              type="button"
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
              title="数据源: 基差"
            >
              基差
            </button>
            <button
              type="button"
              onClick={() => store.setSelectedSymbol('RB')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
              title="数据源: 螺纹钢主力连续"
            >
              螺纹钢主力连续
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* 保存按钮 (Primary, locks version) */}
          <button
            onClick={() => store.saveCurrentVersion()}
            disabled={!activeIndicator.isDirty}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeIndicator.isDirty
                ? 'bg-[#2F6FED] hover:bg-[#2557CA] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            title={activeIndicator.isDirty ? '锁定并保存当前版本' : '当前版本已是最新已存状态'}
          >
            {activeIndicator.isDirty ? (
              <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                <Cloud className="w-3.5 h-3.5 text-white stroke-[2]" />
                <div className="absolute inset-0 flex items-center justify-center space-x-[1.5px] pt-0.5">
                  <span className="w-[1.5px] h-[1.5px] rounded-full bg-white" />
                  <span className="w-[1.5px] h-[1.5px] rounded-full bg-white" />
                  <span className="w-[1.5px] h-[1.5px] rounded-full bg-white" />
                </div>
              </div>
            ) : (
              <CloudCheck className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{activeIndicator.isDirty ? '保存' : '已保存'}</span>
          </button>

          {/* 加入候选池 */}
          <button
            onClick={() => store.toggleCandidatePool()}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1.5 border transition-all cursor-pointer ${
              activeIndicator.inCandidatePool
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-[#E5E8EE] hover:bg-slate-50'
            }`}
          >
            {activeIndicator.inCandidatePool ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>已在候选池</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 text-slate-400" />
                <span>加入候选池</span>
              </>
            )}
          </button>

          {/* 导出 Pine ▾ */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#2F6FED] border border-[#2F6FED] rounded text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>导出 Pine</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {exportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#E5E8EE] z-40 py-1 text-xs">
                  <button
                    onClick={() => {
                      onExportPine();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center space-x-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#2F6FED]" />
                    <span>TradingView Pine Script</span>
                  </button>
                  <button
                    onClick={() => {
                      // 快速下载当前 Pine Script
                      const blob = new Blob([curVer?.pineCode || ''], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${activeIndicator.name}_${curVer?.label || 'v1'}.pine`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>下载 .pine 文件</span>
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([curVer?.pythonCode || ''], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${activeIndicator.name}_${curVer?.label || 'v1'}.py`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center space-x-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>下载 Python 回测策略</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. 1-Line KPI Summary */}
      <div className="px-4 py-1.5 bg-slate-50/90 border-t border-[#EEF1F5] flex items-center justify-between text-xs font-mono overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 text-slate-700 shrink-0">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">夏普</span>
            <span className="font-bold text-slate-900">{(kpi.sharpe ?? 0).toFixed(2)}</span>
          </div>
          <span className="text-slate-300">│</span>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">年化</span>
            <span className="font-bold text-slate-900">{((kpi.annualReturn ?? 0) * 100).toFixed(1)}%</span>
          </div>
          <span className="text-slate-300">│</span>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">回撤</span>
            <span className="font-bold text-[#F08C00]">{((kpi.maxDrawdown ?? 0) * 100).toFixed(1)}%</span>
          </div>
          <span className="text-slate-300">│</span>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">卡玛</span>
            <span className="font-bold text-[#2F6FED]">{(kpi.calmar ?? 0).toFixed(2)}</span>
          </div>
          <span className="text-slate-300">│</span>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">胜率</span>
            <span className="font-semibold text-slate-800">{((kpi.winRate ?? 0) * 100).toFixed(1)}%</span>
          </div>
          <span className="text-slate-300">│</span>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">笔数</span>
            <span className="font-semibold text-slate-800">{kpi.trades ?? 0} 笔</span>
          </div>
        </div>
      </div>
    </div>
  );
};
