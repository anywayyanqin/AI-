import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode2, Terminal } from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
  language: 'python' | 'pinescript';
  filename?: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  code,
  language,
  filename = 'indicator_code.txt',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              {language === 'python' ? (
                <Terminal className="w-4 h-4" />
              ) : (
                <FileCode2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-mono">
                {language === 'python' ? 'Python 3.10+ (pandas/numpy)' : 'TradingView Pine Script v5'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>复制代码</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载文件</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Body */}
        <div className="p-4 flex-1 overflow-auto bg-slate-900 font-mono text-xs text-slate-100 leading-relaxed select-text border-y border-slate-800">
          <pre className="whitespace-pre-wrap">{code}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            {language === 'python'
              ? '可直接放入量化回测环境或结合本地 backtest.py 执行'
              : '可直接粘贴至 TradingView Pine Editor 进行回测与警报设置'}
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 px-3 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium shadow-2xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
