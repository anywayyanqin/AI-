import React, { useState } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { X, Check, Database, Sliders } from 'lucide-react';

interface TargetPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TargetPoolModal: React.FC<TargetPoolModalProps> = ({ isOpen, onClose }) => {
  const { state, store } = useWorkbenchStore();
  const [universe, setUniverse] = useState({ ...state.targetUniverse });

  if (!isOpen) return null;

  const exchanges = [
    { code: 'SHFE', name: '上期所' },
    { code: 'DCE', name: '大商所' },
    { code: 'CZCE', name: '郑商所' },
    { code: 'INE', name: '能源中心' },
    { code: 'CFFEX', name: '中金所' },
    { code: 'GFEX', name: '广期所' },
  ];

  const symbols = [
    { code: 'RB', name: '螺纹钢', ex: 'SHFE' },
    { code: 'I', name: '铁矿石', ex: 'DCE' },
    { code: 'M', name: '豆粕', ex: 'DCE' },
    { code: 'CU', name: '沪铜', ex: 'SHFE' },
    { code: 'TA', name: 'PTA', ex: 'CZCE' },
    { code: 'IF', name: '沪深300', ex: 'CFFEX' },
  ];

  const handleSave = () => {
    store.updateTargetUniverse(universe);
    onClose();
  };

  const toggleSymbol = (code: string) => {
    const list = universe.selectedSymbols;
    if (list.includes(code)) {
      if (list.length > 1) {
        setUniverse({ ...universe, selectedSymbols: list.filter(c => c !== code) });
      }
    } else {
      setUniverse({ ...universe, selectedSymbols: [...list, code] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E5E8EE] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EEF1F5] flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#2F6FED]" />
            <h3 className="font-bold text-sm text-slate-900">标的池与回测环境配置</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* 交易所 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-2">标的期货品种</label>
            <div className="grid grid-cols-3 gap-2">
              {symbols.map(s => {
                const active = universe.selectedSymbols.includes(s.code);
                return (
                  <button
                    key={s.code}
                    onClick={() => toggleSymbol(s.code)}
                    className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                      active
                        ? 'border-[#2F6FED] bg-[#EFF6FF] text-[#2F6FED] font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-mono">{s.code}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{s.name} ({s.ex})</div>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-[#2F6FED]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 合约类型与换月方式 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">合约类型</label>
              <select
                value={universe.contractType}
                onChange={e => setUniverse({ ...universe, contractType: e.target.value as any })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#2F6FED]"
              >
                <option value="main">主力连续 (主力换月自动拼接)</option>
                <option value="index">指数连续 (全合约持仓加权)</option>
                <option value="specific">指定月份合约 (2506)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">换月复权方式</label>
              <select
                value={universe.rollAdjustment}
                onChange={e => setUniverse({ ...universe, rollAdjustment: e.target.value as any })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#2F6FED]"
              >
                <option value="post">后复权 (基差连续平滑推荐)</option>
                <option value="pre">前复权</option>
                <option value="none">不复权 (原始价格切片)</option>
              </select>
            </div>
          </div>

          {/* 研报与数据源权限 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-2 flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-[#2F6FED]" />
              <span>数据源支持 (参与特征共振分析)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={universe.dataSources.industry}
                  onChange={e =>
                    setUniverse({
                      ...universe,
                      dataSources: { ...universe.dataSources, industry: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-[#2F6FED] focus:ring-0"
                />
                <span className="text-slate-700">产业数据库 (周度库存/产能利用率)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={universe.dataSources.market}
                  onChange={e =>
                    setUniverse({
                      ...universe,
                      dataSources: { ...universe.dataSources, market: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-[#2F6FED] focus:ring-0"
                />
                <span className="text-slate-700">市场公开数据 (现货基差/仓单/会员持仓)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={universe.dataSources.reports}
                  onChange={e =>
                    setUniverse({
                      ...universe,
                      dataSources: { ...universe.dataSources, reports: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-[#2F6FED] focus:ring-0"
                />
                <span className="text-slate-700">研报库 (买卖评级与宏观预警)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={universe.dataSources.opinions}
                  onChange={e =>
                    setUniverse({
                      ...universe,
                      dataSources: { ...universe.dataSources, opinions: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-[#2F6FED] focus:ring-0"
                />
                <span className="text-slate-700">观点库 (分析师即时策略观点)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EEF1F5] bg-slate-50/70 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-[#2F6FED] hover:bg-[#2557CA] text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            确认更新
          </button>
        </div>
      </div>
    </div>
  );
};
