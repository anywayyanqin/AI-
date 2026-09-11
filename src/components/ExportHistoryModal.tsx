import React from 'react';
import { X, FileCode2, Download, CheckCircle, Clock } from 'lucide-react';
import { ExportRecord } from '../types';

interface ExportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ExportRecord[];
  onDownloadRecord: (record: ExportRecord) => void;
}

export const ExportHistoryModal: React.FC<ExportHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onDownloadRecord,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                TradingView Pine Script 导出记录
              </h3>
              <p className="text-xs text-slate-500">
                已生成与导出的 Pine Script 脚本历史快照
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
        <div className="p-4 flex-1 overflow-auto bg-white">
          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              暂无导出记录
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-2.5">指标名称</th>
                  <th className="p-2.5">TV 映射标的</th>
                  <th className="p-2.5">周期</th>
                  <th className="p-2.5">外部数据处理</th>
                  <th className="p-2.5">导出时间</th>
                  <th className="p-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-sans font-medium text-slate-900">
                      {rec.indicatorName}
                    </td>
                    <td className="p-2.5 text-blue-600 font-semibold">
                      {rec.tvSymbol}
                    </td>
                    <td className="p-2.5 text-slate-700">{rec.timeframe}</td>
                    <td className="p-2.5 font-sans">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        {rec.externalDataMode === 'seed'
                          ? 'request.seed导入'
                          : '纯技术面导出'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">
                      {rec.exportedAt}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => onDownloadRecord(rec)}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center space-x-1 shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载.pine</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            文件可直接在 TradingView Desktop / Web 端「Pine 编辑器」中另存并加载到K线图中。
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
