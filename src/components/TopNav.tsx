import React from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { Sliders } from 'lucide-react';

interface TopNavProps {
  onOpenTargetModal?: () => void;
  onOpenSettingsModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenTargetModal, onOpenSettingsModal }) => {
  const { state, store } = useWorkbenchStore();
  const candidateCount = state.indicators.filter(i => i.inCandidatePool).length;

  return (
    <header className="h-12 w-full bg-white border-b border-[#E5E8EE] px-4 flex items-center justify-between select-none z-20 shrink-0">
      {/* Left brand & main tabs */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#2F6FED] flex items-center justify-center text-white text-xs font-black shadow-sm">
            ◆
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">
            指标工坊 <span className="text-[11px] font-normal text-slate-400 ml-1">期货量化原型</span>
          </span>
        </div>

        <nav className="flex items-center space-x-1 border-l border-[#EEF1F5] pl-5 h-7">
          <button
            onClick={() => store.setActiveTab('workbench')}
            className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center space-x-1.5 font-medium cursor-pointer ${
              state.activeTab === 'workbench'
                ? 'bg-[#EFF6FF] text-[#2F6FED]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className={`text-[13px] leading-none ${state.activeTab === 'workbench' ? 'text-[#2F6FED]' : 'text-slate-400'}`}>
              {state.activeTab === 'workbench' ? '●' : '○'}
            </span>
            <span>指标工作台</span>
          </button>

          <button
            onClick={() => store.setActiveTab('candidatePool')}
            className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center space-x-1.5 font-medium cursor-pointer ${
              state.activeTab === 'candidatePool'
                ? 'bg-[#EFF6FF] text-[#2F6FED]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className={`text-[13px] leading-none ${state.activeTab === 'candidatePool' ? 'text-[#2F6FED]' : 'text-slate-400'}`}>
              {state.activeTab === 'candidatePool' ? '●' : '○'}
            </span>
            <span>候选池 ({candidateCount})</span>
          </button>
        </nav>
      </div>

      {/* Right global settings */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSettingsModal}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="回测配置独立侧边栏"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
