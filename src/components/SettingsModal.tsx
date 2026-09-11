import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  Database,
  Server,
  Zap,
  RefreshCw,
  FileCode2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [syncNotice, setSyncNotice] = useState(false);

  if (!isOpen) return null;

  const handleSyncDataSources = () => {
    setSyncNotice(true);
    setTimeout(() => setSyncNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                平台全局设置与数据源健康度
              </h3>
              <p className="text-xs text-slate-500">
                研报库 · 观点库 · 产业数据库 · 回测引擎配置
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 bg-white text-slate-700">
          {/* Data Sources Health */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>知识库与数据源连接状态</span>
              </span>
              <button
                onClick={handleSyncDataSources}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center space-x-1 hover:underline font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>立即同步增量数据</span>
              </button>
            </div>

            {syncNotice && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex items-center space-x-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>已同步最新 42 篇期货深度研报及今日交易所盘后仓单持仓数据</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">券商研报库 (ReportDB)</div>
                  <div className="text-[10px] text-slate-500">12,480 篇 · 结构化因子索引</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  运行正常
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">机构观点库 (OpinionDB)</div>
                  <div className="text-[10px] text-slate-500">28 家期货研究所多空情绪</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  实时更新
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">高频产业数据库 (IndustryDB)</div>
                  <div className="text-[10px] text-slate-500">钢联 / 卓创 / SMM 现货基差</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  延迟 &lt; 50ms
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">交易所公开行情与持仓</div>
                  <div className="text-[10px] text-slate-500">上期所/大商所/郑商所/中金所/广期所</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  直连就绪
                </span>
              </div>
            </div>
          </div>

          {/* Engine Parameters */}
          <div className="space-y-2.5 pt-3 border-t border-slate-200">
            <span className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              <span>量化回测与代码编译器设置</span>
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">Python 回测执行引擎:</span>
                <span className="text-slate-900">Python 3.10 (pandas 2.2, numpy 1.26)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">TradingView Pine Script 编译器:</span>
                <span className="text-blue-600 font-semibold">//@version=5 (默认)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">基准合约对标规则:</span>
                <span className="text-slate-900 font-sans">自动选取对应品种主力连续指数 (后复权)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-2xs transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
