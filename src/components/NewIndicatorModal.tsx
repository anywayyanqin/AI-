import React, { useState } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { X, Sparkles, PlusCircle } from 'lucide-react';

interface NewIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewIndicatorModal: React.FC<NewIndicatorModalProps> = ({ isOpen, onClose }) => {
  const { store } = useWorkbenchStore();
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dimension, setDimension] = useState<'fundamental' | 'technical' | 'capital'>('fundamental');

  if (!isOpen) return null;

  const presets = [
    {
      name: '宏观基差动量',
      dimension: 'fundamental' as const,
      ruleKey: 'basisMaResonance',
      desc: '现货基差上穿0轴与价格均线共振，过滤虚假突破',
    },
    {
      name: '产业库存去化拐点',
      dimension: 'fundamental' as const,
      ruleKey: 'inventoryTurningPoint',
      desc: '周度高频库存去化二阶导数转正时做多',
    },
    {
      name: '主力机构持仓偏离',
      dimension: 'capital' as const,
      ruleKey: 'oiMomentum',
      desc: '前20名净持仓连续3日正向放量跟随',
    },
  ];

  const handleCreate = (chosenName?: string, ruleKey?: string, dim?: 'fundamental' | 'technical' | 'capital') => {
    const finalName = chosenName || name.trim() || '新建共振指标';
    const finalRule = ruleKey || 'basisMaResonance';
    const finalDim = dim || dimension;
    store.addNewIndicator(finalName, finalRule, finalDim);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E5E8EE] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-[#EEF1F5] flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#2F6FED]" />
            <h3 className="font-bold text-sm text-slate-900">通过自然语言新建交易指标</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">指标名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：现货基差强共振 v1"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#2F6FED]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">分析维度</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fundamental', label: '基本面+技术面' },
                { id: 'technical', label: '纯技术面' },
                { id: 'capital', label: '资金面持仓' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setDimension(d.id as any)}
                  className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                    dimension === d.id
                      ? 'border-[#2F6FED] bg-[#EFF6FF] text-[#2F6FED] font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">自然语言描述需求</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述您的交易思想，如：在螺纹钢主力连续日线上，当现货基差大于0且均线呈多头排列时开多，若ATR偏低则过滤..."
              className="w-full h-20 p-2.5 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#2F6FED] resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-500 mb-1.5 text-[11px]">或选择经典量化模板快速生成：</label>
            <div className="space-y-1.5">
              {presets.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCreate(p.name, p.ruleKey, p.dimension)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-[#2F6FED] hover:bg-[#EFF6FF]/40 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.desc}</div>
                  </div>
                  <PlusCircle className="w-4 h-4 text-[#2F6FED] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#EEF1F5] bg-slate-50/70 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => handleCreate()}
            className="px-4 py-1.5 rounded-lg bg-[#2F6FED] hover:bg-[#2557CA] text-white text-xs font-semibold cursor-pointer shadow-2xs"
          >
            生成并进入工作台
          </button>
        </div>
      </div>
    </div>
  );
};
