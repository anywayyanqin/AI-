import React, { useState } from 'react';
import { X, ArrowUpDown, Download, Check, FileSpreadsheet } from 'lucide-react';
import { TradeItem } from '../types';

interface TradeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorName: string;
  symbol: string;
  trades: TradeItem[];
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  isOpen,
  onClose,
  indicatorName,
  symbol,
  trades,
}) => {
  const [filterDirection, setFilterDirection] = useState<'all' | '多' | '空'>('all');

  if (!isOpen) return null;

  const filteredTrades = trades.filter((t) => {
    if (filterDirection !== 'all' && t.direction !== filterDirection) return false;
    return true;
  });

  const handleExportCSV = () => {
    const header = 'ID,交易时间,合约标的,方向,动作,成交价,手数,手续费(元),平仓盈亏(元),盈亏比例(%)\n';
    const rows = trades
      .map(
        (t) =>
          `${t.id},${t.time},${t.symbol},${t.direction},${t.action},${t.price},${t.lots},${t.commission},${t.pnl || ''},${t.pnlRate || ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${symbol}_${indicatorName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                回测交易明细 — {indicatorName} ({symbol})
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                共记录 {trades.length} 笔仿真回测交易信号成交记录
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="all">全部方向</option>
              <option value="多">仅看多头</option>
              <option value="空">仅看空头</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出交易 CSV</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto bg-white p-4">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">时间</th>
                <th className="p-2.5">合约代码</th>
                <th className="p-2.5">方向</th>
                <th className="p-2.5">动作</th>
                <th className="p-2.5 text-right">成交价</th>
                <th className="p-2.5 text-right">手数</th>
                <th className="p-2.5 text-right">手续费</th>
                <th className="p-2.5 text-right">平仓盈亏</th>
                <th className="p-2.5 text-right">收益率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTrades.map((t, idx) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-2.5 text-slate-400">{idx + 1}</td>
                  <td className="p-2.5 text-slate-500 whitespace-nowrap">{t.time}</td>
                  <td className="p-2.5 font-semibold text-slate-900">{t.symbol}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.direction === '多'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-700">{t.action}</td>
                  <td className="p-2.5 text-right text-slate-900">
                    {t.price.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-right text-slate-700">{t.lots}手</td>
                  <td className="p-2.5 text-right text-slate-500">
                    ¥{t.commission.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right font-semibold">
                    {t.pnl !== undefined ? (
                      <span className={t.pnl >= 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {t.pnl >= 0 ? `+${t.pnl.toLocaleString()}` : t.pnl.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-semibold">
                    {t.pnlRate !== undefined ? (
                      <span className={t.pnlRate >= 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {t.pnlRate >= 0 ? `+${t.pnlRate.toFixed(2)}%` : `${t.pnlRate.toFixed(2)}%`}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            注：期货国内标准红涨绿跌；手续费已按万分之一折算，滑点按1跳计入成本。
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
