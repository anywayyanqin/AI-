import React, { useState } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { X, Copy, Check, Download, ExternalLink, HelpCircle } from 'lucide-react';

interface PineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorId?: string;
}

export const PineExportModal: React.FC<PineExportModalProps> = ({ isOpen, onClose, indicatorId }) => {
  const { state } = useWorkbenchStore();
  const [copied, setCopied] = useState(false);
  const [tvSymbol, setTvSymbol] = useState('SHFE:RB1!');
  const [timeframe, setTimeframe] = useState('1D');
  const [externalMode, setExternalMode] = useState<'seed' | 'technicalOnly'>('seed');

  if (!isOpen) return null;

  const targetInd = indicatorId
    ? state.indicators.find(i => i.id === indicatorId)
    : state.indicators.find(i => i.id === state.activeIndicatorId);

  if (!targetInd) return null;

  const curV = targetInd.versions.find(v => v.id === targetInd.currentVersionId);
  const pineCode = curV?.pineCode || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(pineCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pineCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetInd.name}_${curV?.label || 'v1'}_tv5.pine`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E5E8EE] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EEF1F5] flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-[#2F6FED] text-white flex items-center justify-center text-xs font-bold">
              TV
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              导出为 TradingView Pine Script v5 策略
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-[#EEF1F5] grid grid-cols-3 gap-3 text-xs shrink-0">
          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1">TradingView 代码格式</label>
            <input
              type="text"
              value={tvSymbol}
              onChange={e => setTvSymbol(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-800 font-mono outline-none focus:border-[#2F6FED]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1">推荐周期</label>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-800 outline-none focus:border-[#2F6FED]"
            >
              <option value="1D">1D (日线 - 推荐)</option>
              <option value="60m">60m (小时线)</option>
              <option value="30m">30m (半小时线)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1">基本面/外部数据模式</label>
            <select
              value={externalMode}
              onChange={e => setExternalMode(e.target.value as any)}
              className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-800 outline-none focus:border-[#2F6FED]"
            >
              <option value="seed">内置模拟基差特征 (直接回测)</option>
              <option value="technicalOnly">纯技术共振切片</option>
            </select>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">
              指标: <span className="font-bold text-slate-800">{targetInd.name}</span> (版本: {curV?.label})
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#E5E8EE] rounded text-xs text-slate-700 flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? '已复制到剪贴板' : '复制代码'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#E5E8EE] rounded text-xs text-slate-700 flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>下载 .pine 文件</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 p-3 bg-slate-950 text-slate-200 rounded-lg text-xs font-mono overflow-auto leading-relaxed border border-slate-800">
            <code>{pineCode}</code>
          </pre>

          {/* Quick instructions for user */}
          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-normal flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-[#2F6FED] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">TradingView 二次回测步骤：</span>
              1. 打开 TradingView 图表并在底部点击「Pine 编辑器」；
              2. 将上述代码全选粘贴并点击「添加到图表」；
              3. 在「策略测试器」中可直接查验完整资金曲线、胜率、逐笔盈亏与滑点敏感度。
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EEF1F5] bg-slate-50/70 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2F6FED] hover:bg-[#2557CA] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
