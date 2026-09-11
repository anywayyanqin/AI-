import React, { useState, useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { X, CheckCircle2 } from 'lucide-react';

export const BacktestConfigDrawer: React.FC = () => {
  const { state, store } = useWorkbenchStore();
  const isOpen = state.isBacktestDrawerOpen;

  // Local editing state
  const [execTiming, setExecTiming] = useState<'close' | 'next_open'>('close');
  const [feeBp, setFeeBp] = useState<number>(1);
  const [slipTicks, setSlipTicks] = useState<number>(1);
  const [initialCapital, setInitialCapital] = useState<number>(1000000);
  const [isApplying, setIsApplying] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Sync state when opened
  useEffect(() => {
    if (isOpen && state.backtestConfig) {
      setExecTiming(state.backtestConfig.execTiming);
      setFeeBp(state.backtestConfig.feeBp);
      setSlipTicks(state.backtestConfig.slipTicks);
      setInitialCapital(state.backtestConfig.initialCapital);
    }
  }, [isOpen, state.backtestConfig]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        store.setBacktestDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, store]);

  if (!isOpen && !showToast) return null;

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      store.applyBacktestConfig({
        execTiming,
        feeBp: Number(feeBp) || 1,
        slipTicks: Number(slipTicks) || 1,
        initialCapital: Number(initialCapital) || 1000000,
      });
      setIsApplying(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }, 200);
  };

  const handleClose = () => {
    store.setBacktestDrawerOpen(false);
  };

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-14 right-6 z-60 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center space-x-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-100" />
          <span>已应用新回测配置并完成全量重新回测</span>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
            onClick={handleClose}
          />

          {/* Right Sidebar Drawer */}
          <div
            className="relative w-full max-w-[380px] bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-900">回测配置</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="关闭侧边栏"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              {/* Section 1: 执行时点 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2.5">执行时点</label>
                <div className="space-y-2.5">
                  {/* Option 1: 日终收盘 */}
                  <div
                    onClick={() => setExecTiming('close')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                      execTiming === 'close'
                        ? 'border-[#2F6FED] bg-[#F2F7FF]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          execTiming === 'close'
                            ? 'border-[#2F6FED] bg-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {execTiming === 'close' && (
                          <div className="w-2 h-2 rounded-full bg-[#2F6FED]" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 leading-tight">日终收盘</div>
                      <div className="text-xs text-slate-500 mt-1 leading-normal">
                        信号当日以收盘价成交
                      </div>
                    </div>
                  </div>

                  {/* Option 2: 次日开盘 */}
                  <div
                    onClick={() => setExecTiming('next_open')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                      execTiming === 'next_open'
                        ? 'border-[#2F6FED] bg-[#F2F7FF]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          execTiming === 'next_open'
                            ? 'border-[#2F6FED] bg-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {execTiming === 'next_open' && (
                          <div className="w-2 h-2 rounded-full bg-[#2F6FED]" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 leading-tight">次日开盘</div>
                      <div className="text-xs text-slate-500 mt-1 leading-normal">
                        信号次日以开盘价成交，更贴近实盘
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 手续费 & 滑点 */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    手续费（万分之）
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={feeBp}
                    onChange={e => setFeeBp(Number(e.target.value))}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-[#2F6FED] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    滑点（跳）
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={slipTicks}
                    onChange={e => setSlipTicks(Number(e.target.value))}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-[#2F6FED] transition-colors"
                  />
                </div>
              </div>

              {/* Section 3: 初始资金 */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  初始资金（元，各品种均分）
                </label>
                <input
                  type="number"
                  min="10000"
                  step="100000"
                  value={initialCapital}
                  onChange={e => setInitialCapital(Number(e.target.value))}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono outline-none focus:border-[#2F6FED] transition-colors"
                />
              </div>

              {/* Section 4: 提示说明 */}
              <div className="pt-1">
                <p className="text-xs text-slate-400 leading-relaxed">
                  应用后将按新配置对全部指标的各版本重新回测，KPI 与图表同步更新；已入池的候选条目保持入池时的快照不变。
                </p>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center space-x-2.5 shrink-0">
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 py-2.5 bg-[#2F6FED] hover:bg-[#2557CA] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-xs text-center"
              >
                {isApplying ? '回测计算中...' : '应用并重新回测'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
