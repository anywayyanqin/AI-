import React, { useState } from 'react';
import { TargetUniverse } from '../types';
import { EXCHANGES, FUTURES_SYMBOLS } from '../mockData';
import {
  Layers,
  CheckSquare,
  Square,
  Database,
  Calendar,
  Clock,
  ChevronDown,
  Info,
} from 'lucide-react';

interface TargetPoolBarProps {
  universe: TargetUniverse;
  onChangeUniverse: (universe: TargetUniverse) => void;
}

export const TargetPoolBar: React.FC<TargetPoolBarProps> = ({
  universe,
  onChangeUniverse,
}) => {
  const [exchangeDropdownOpen, setExchangeDropdownOpen] = useState(false);

  const toggleExchange = (code: string) => {
    const exists = universe.exchanges.includes(code);
    const newExchanges = exists
      ? universe.exchanges.filter((c) => c !== code)
      : [...universe.exchanges, code];
    onChangeUniverse({ ...universe, exchanges: newExchanges });
  };

  const toggleSymbol = (symbolCode: string) => {
    const exists = universe.selectedSymbols.includes(symbolCode);
    const newSymbols = exists
      ? universe.selectedSymbols.filter((s) => s !== symbolCode)
      : [...universe.selectedSymbols, symbolCode];
    onChangeUniverse({ ...universe, selectedSymbols: newSymbols });
  };

  const handleSelectAllSymbols = () => {
    const allAvailable = FUTURES_SYMBOLS.filter((s) =>
      universe.exchanges.includes(s.exchange)
    ).map((s) => s.code);
    onChangeUniverse({ ...universe, selectedSymbols: allAvailable });
  };

  const handleClearSymbols = () => {
    onChangeUniverse({ ...universe, selectedSymbols: [] });
  };

  const availableSymbols = FUTURES_SYMBOLS.filter((s) =>
    universe.exchanges.includes(s.exchange)
  );

  return (
    <section className="bg-white border-b border-slate-200 text-slate-700 text-xs px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Row 1: Exchange & Contract Setup */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs">
          {/* Label + Exchanges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 font-semibold text-blue-600 mr-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>标的池 (期货合约)</span>
            </div>

            {/* Exchanges Buttons */}
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 px-1.5">交易所:</span>
              {EXCHANGES.map((ex) => {
                const active = universe.exchanges.includes(ex.code);
                return (
                  <button
                    key={ex.code}
                    id={`btn-ex-${ex.code}`}
                    onClick={() => toggleExchange(ex.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      active
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    title={ex.name}
                  >
                    {ex.code}
                  </button>
                );
              })}
            </div>

            {/* Contract Type Radio */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <span className="text-slate-500">合约:</span>
              <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
                <input
                  type="radio"
                  name="contractType"
                  checked={universe.contractType === 'main'}
                  onChange={() =>
                    onChangeUniverse({ ...universe, contractType: 'main' })
                  }
                  className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                />
                <span className="font-medium">主力连续</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
                <input
                  type="radio"
                  name="contractType"
                  checked={universe.contractType === 'index'}
                  onChange={() =>
                    onChangeUniverse({ ...universe, contractType: 'index' })
                  }
                  className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                />
                <span className="font-medium">指数连续</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
                <input
                  type="radio"
                  name="contractType"
                  checked={universe.contractType === 'specific'}
                  onChange={() =>
                    onChangeUniverse({ ...universe, contractType: 'specific' })
                  }
                  className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                />
                <span className="font-medium">指定月份</span>
              </label>

              {universe.contractType === 'specific' && (
                <select
                  value={universe.specificMonth}
                  onChange={(e) =>
                    onChangeUniverse({
                      ...universe,
                      specificMonth: e.target.value,
                    })
                  }
                  className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                >
                  <option value="2506">2506</option>
                  <option value="2509">2509</option>
                  <option value="2510">2510</option>
                  <option value="2601">2601</option>
                </select>
              )}
            </div>
          </div>

          {/* Roll Adjustment & Frequency */}
          <div className="flex items-center space-x-3 text-slate-700">
            <div className="flex items-center space-x-1">
              <span className="text-slate-500">换月方式:</span>
              <select
                id="select-roll-adj"
                value={universe.rollAdjustment}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    rollAdjustment: e.target.value as any,
                  })
                }
                className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="post">后复权</option>
                <option value="pre">前复权</option>
                <option value="none">不复权</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">数据频率:</span>
              <select
                id="select-frequency"
                value={universe.frequency}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    frequency: e.target.value as any,
                  })
                }
                className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="1d">日线 (1D)</option>
                <option value="60m">60分钟</option>
                <option value="30m">30分钟</option>
                <option value="15m">15分钟</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Varieties list & Data sources */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 pt-2 border-t border-slate-100">
          {/* Variety Checkboxes */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 mr-1 font-medium">品种:</span>
            {availableSymbols.map((sym) => {
              const checked = universe.selectedSymbols.includes(sym.code);
              return (
                <button
                  key={sym.code}
                  id={`chip-symbol-${sym.code}`}
                  onClick={() => toggleSymbol(sym.code)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] transition-all ${
                    checked
                      ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      checked ? 'bg-blue-600' : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-medium text-slate-900">{sym.name}</span>
                  <span className="font-mono text-slate-500">{sym.code}</span>
                </button>
              );
            })}

            <div className="flex items-center space-x-1 ml-2">
              <button
                id="btn-select-all-symbols"
                onClick={handleSelectAllSymbols}
                className="text-[11px] text-blue-600 hover:underline font-medium px-1 py-0.5"
              >
                [全选]
              </button>
              <button
                id="btn-clear-symbols"
                onClick={handleClearSymbols}
                className="text-[11px] text-slate-500 hover:underline px-1 py-0.5"
              >
                [清空]
              </button>
              <span className="text-[10px] text-slate-500 ml-1">
                (已选 {universe.selectedSymbols.length} 个)
              </span>
            </div>
          </div>

          {/* Data Sources */}
          <div className="flex items-center space-x-3 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1 text-slate-500 font-medium">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>数据源:</span>
            </div>

            <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={universe.dataSources.reports}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    dataSources: {
                      ...universe.dataSources,
                      reports: e.target.checked,
                    },
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span>研报库</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={universe.dataSources.opinions}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    dataSources: {
                      ...universe.dataSources,
                      opinions: e.target.checked,
                    },
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span>观点库</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={universe.dataSources.industry}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    dataSources: {
                      ...universe.dataSources,
                      industry: e.target.checked,
                    },
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span>产业数据库</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={universe.dataSources.market}
                onChange={(e) =>
                  onChangeUniverse({
                    ...universe,
                    dataSources: {
                      ...universe.dataSources,
                      market: e.target.checked,
                    },
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span>市场公开数据 (行情/持仓/仓单/基差)</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};
