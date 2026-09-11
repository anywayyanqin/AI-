import React, { useState } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { ChevronDown, ChevronRight, Save, Check, Play, SlidersHorizontal } from 'lucide-react';
import { IndicatorParams } from '../engine/rules';

export const ParamBar: React.FC = () => {
  const { state, activeIndicator, store } = useWorkbenchStore();
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!activeIndicator) return null;

  const curVer = activeIndicator.versions.find(v => v.id === activeIndicator.currentVersionId);
  const params = curVer?.params || {};

  const [formParams, setFormParams] = useState<IndicatorParams>({ ...params });

  // Sync when active indicator or version changes
  React.useEffect(() => {
    if (curVer) {
      setFormParams({ ...curVer.params });
    }
  }, [activeIndicator.id, curVer?.id]);

  const handleApply = () => {
    store.updateParams(formParams);
  };

  const handleSave = () => {
    store.updateParams(formParams);
    store.saveCurrentVersion();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const paramSummary = Object.entries(curVer?.params || {})
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');

  return (
    <div className="w-full bg-slate-50 border-t border-b border-[#E5E8EE] shrink-0 text-xs select-none">
      {/* Collapsed Bar / Header */}
      <div className="h-8 px-4 flex items-center justify-between">
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 text-slate-700 flex-1 truncate py-1"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}

          <span className="font-semibold text-slate-900 shrink-0">参数:</span>
          <span className="font-mono text-slate-600 truncate">{paramSummary || '默认参数'}</span>

          <span className="text-slate-300">│</span>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              store.setBacktestDrawerOpen(true);
            }}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-100/80 hover:bg-blue-50 text-slate-600 hover:text-[#2F6FED] border border-slate-200/80 transition-colors cursor-pointer group shrink-0"
            title="点击修改回测区间、资金、手续费与滑点等配置"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-400 group-hover:text-[#2F6FED]" />
            <span className="font-mono text-[11px]">
              2019-01~2025-06 · {state.backtestConfig?.execTiming === 'next_open' ? '次日开盘' : '日终收盘'} · 万{state.backtestConfig?.feeBp ?? 1} · {state.backtestConfig?.slipTicks ?? 1}跳 · {((state.backtestConfig?.initialCapital ?? 1000000) / 10000)}万
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2 shrink-0 pl-3">
          <button
            onClick={handleApply}
            className="px-2.5 py-1 bg-[#2F6FED] hover:bg-[#2557CA] text-white rounded text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>重新回测</span>
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div className="p-4 bg-white border-t border-[#EEF1F5] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in duration-150">
          {/* Rule-specific param fields */}
          {activeIndicator.ruleKey === 'basisMaResonance' && (
            <>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">MA 慢线周期</label>
                <input
                  type="number"
                  value={Number(formParams.ma ?? 20)}
                  onChange={e => setFormParams({ ...formParams, ma: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">基差平滑窗口</label>
                <input
                  type="number"
                  value={Number(formParams.basisWindow ?? 20)}
                  onChange={e => setFormParams({ ...formParams, basisWindow: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">基差共振阈值</label>
                <input
                  type="number"
                  step="0.1"
                  value={Number(formParams.threshold ?? 0)}
                  onChange={e => setFormParams({ ...formParams, threshold: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">ATR 过滤分位 (0~1)</label>
                <input
                  type="number"
                  step="0.05"
                  value={Number(formParams.atrFilterPct ?? 0)}
                  onChange={e => setFormParams({ ...formParams, atrFilterPct: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">方向过滤</label>
                <select
                  value={String(formParams.direction ?? 'both')}
                  onChange={e => setFormParams({ ...formParams, direction: e.target.value as any })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-[#2F6FED]"
                >
                  <option value="both">多空双向</option>
                  <option value="long">只做多</option>
                  <option value="short">只做空</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">最短持仓天数</label>
                <input
                  type="number"
                  value={Number(formParams.minHold ?? 0)}
                  onChange={e => setFormParams({ ...formParams, minHold: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>
            </>
          )}

          {activeIndicator.ruleKey === 'inventoryTurningPoint' && (
            <>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">库存拐点平滑窗口</label>
                <input
                  type="number"
                  value={Number(formParams.invWindow ?? 15)}
                  onChange={e => setFormParams({ ...formParams, invWindow: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">价格趋势 MA 周期</label>
                <input
                  type="number"
                  value={Number(formParams.maPeriod ?? 20)}
                  onChange={e => setFormParams({ ...formParams, maPeriod: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>
            </>
          )}

          {activeIndicator.ruleKey === 'oiMomentum' && (
            <>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">持仓窗口 (天)</label>
                <input
                  type="number"
                  value={Number(formParams.oiWindow ?? 10)}
                  onChange={e => setFormParams({ ...formParams, oiWindow: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">持仓异动手数阈值</label>
                <input
                  type="number"
                  value={Number(formParams.oiThreshold ?? 500)}
                  onChange={e => setFormParams({ ...formParams, oiThreshold: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
                />
              </div>
            </>
          )}

          {/* Standard backtest environment controls */}
          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1">滑点跳数</label>
            <input
              type="number"
              defaultValue={1}
              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1">手续费 (万分比)</label>
            <input
              type="number"
              defaultValue={1}
              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSave}
              className="w-full py-1.5 bg-[#2F6FED] hover:bg-[#2557CA] text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saved ? '已保存' : '保存'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
