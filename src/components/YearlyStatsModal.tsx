import React from 'react';
import { X, Calendar, TrendingUp } from 'lucide-react';
import { YearlyStat } from '../types';

interface YearlyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorName: string;
  symbol: string;
  yearlyStats: YearlyStat[];
}

export const YearlyStatsModal: React.FC<YearlyStatsModalProps> = ({
  isOpen,
  onClose,
  indicatorName,
  symbol,
  yearlyStats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                分年度收益与风险评估 — {indicatorName} ({symbol})
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                跨周期年度收益稳健性、回撤极值及胜率分布
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
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-2.5">年份</th>
                <th className="p-2.5 text-right">年度收益率</th>
                <th className="p-2.5 text-right">最大回撤</th>
                <th className="p-2.5 text-right">交易胜率</th>
                <th className="p-2.5 text-right">交易次数</th>
                <th className="p-2.5 text-right">盈亏比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {yearlyStats.map((stat) => (
                <tr key={stat.year} className="hover:bg-slate-50">
                  <td className="p-2.5 font-semibold text-slate-900 flex items-center space-x-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>{stat.year}</span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-red-600">
                    +{(stat.annualReturn * 100).toFixed(1)}%
                  </td>
                  <td className="p-2.5 text-right text-emerald-600 font-medium">
                    {(stat.maxDrawdown * 100).toFixed(1)}%
                  </td>
                  <td className="p-2.5 text-right text-slate-800">
                    {(stat.winRate * 100).toFixed(0)}%
                  </td>
                  <td className="p-2.5 text-right text-slate-600">
                    {stat.tradeCount} 笔
                  </td>
                  <td className="p-2.5 text-right text-slate-800 font-semibold">
                    {stat.profitRatio.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>收益指标均已计入手续费和主力连续换月成本。</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-medium"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
