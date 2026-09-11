import React from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  FileCode2,
  Filter,
  BarChart3,
  User,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'workbench' | 'backtest' | 'export';
  setActiveTab: (tab: 'workbench' | 'backtest' | 'export') => void;
  indicatorCount: number;
  backtestedCount: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  indicatorCount,
  backtestedCount,
  onOpenSettings,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs text-white">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                智能 AI 指标生成与回测平台
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                期货专用
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              研报库 · 观点库 · 产业数据库 · 市场多维数据驱动
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="nav-tab-workbench"
            onClick={() => setActiveTab('workbench')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'workbench'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1 指标工作台</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'workbench'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {indicatorCount}
            </span>
          </button>

          <button
            id="nav-tab-backtest"
            onClick={() => setActiveTab('backtest')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'backtest'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2 回测配置与结果</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'backtest'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {backtestedCount}
            </span>
          </button>

          <button
            id="nav-tab-export"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'export'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>3 筛选与 TV 导出</span>
          </button>
        </nav>

        {/* User & Settings */}
        <div className="flex items-center space-x-3">
          <button
            id="btn-global-settings"
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white shadow-2xs transition-colors"
            title="平台全局配置与数据源状态"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline font-medium">数据源/设置</span>
          </button>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800">王研究员</div>
              <div className="text-[10px] text-emerald-600 flex items-center space-x-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>量化黑色/有色组</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
