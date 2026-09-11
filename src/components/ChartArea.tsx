import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useWorkbenchStore, mockBars } from '../store/workbenchStore';
import { chartTheme } from '../theme/chartTheme';
import { diffSignals } from '../engine/metrics';
import {
  Maximize2,
  Minimize2,
  Calendar,
  Layers,
  TrendingUp,
  X,
  Check,
  Eye,
  Sliders,
} from 'lucide-react';

export const ChartArea: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { state, store, activeIndicator } = useWorkbenchStore();

  const curVer = activeIndicator?.versions.find(v => v.id === activeIndicator.currentVersionId);
  const previewProposal = state.previewProposal;

  const symbol = state.selectedSymbol;
  const bars = mockBars[symbol] || mockBars['RB'];

  // 1. 初始化 ECharts 实例
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, []);

  // 2. 聚焦指定交易跳转缩放
  useEffect(() => {
    if (!state.focusedTradeDate || !chartInstance.current) return;
    const idx = bars.findIndex(b => b.date === state.focusedTradeDate);
    if (idx >= 0) {
      const startPct = Math.max(0, ((idx - 30) / bars.length) * 100);
      const endPct = Math.min(100, ((idx + 30) / bars.length) * 100);
      chartInstance.current.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start: startPct,
        end: endPct,
      });
    }
  }, [state.focusedTradeDate, bars]);

  // 3. 更新图表配置
  useEffect(() => {
    if (!chartInstance.current || !activeIndicator || !curVer) return;

    const dates = bars.map(b => b.date);
    const candleData = bars.map(b => [b.open, b.close, b.low, b.high]);

    // 当前版本的信号与持仓
    const curSignals = curVer.result.symbolSignals[symbol] || [];
    const curPositions = curVer.result.positions.filter(p => p.symbol === symbol);

    // 预览态数据
    const isPreview = Boolean(previewProposal);
    let previewSignals = previewProposal?.result.symbolSignals[symbol] || [];
    let previewPositions = previewProposal?.result.positions.filter(p => p.symbol === symbol) || [];

    // 信号点集 markPoint 构建
    const markPoints: any[] = [];

    if (!isPreview) {
      if (state.layerVisibility.signals) {
        for (const sig of curSignals) {
          const isBuy = sig.action === 'open_long' || sig.action === 'close_short';
          const isSell = sig.action === 'open_short' || sig.action === 'close_long';
          if (!isBuy && !isSell) continue;

          markPoints.push({
            name: isBuy ? '买入' : '卖出',
            coord: [sig.date, sig.price],
            symbol: chartTheme.buyMark.symbol,
            symbolRotate: isBuy ? 0 : 180,
            symbolSize: chartTheme.buyMark.size,
            itemStyle: {
              color: isBuy ? chartTheme.buyMark.color : chartTheme.sellMark.color,
            },
            label: {
              show: true,
              formatter: isBuy ? 'B' : 'S',
              position: isBuy ? 'bottom' : 'top',
              fontSize: 9,
              color: isBuy ? chartTheme.buyMark.color : chartTheme.sellMark.color,
            },
          });
        }
      }
    } else {
      // 预览态：区分 保留(普通)、被过滤(空心灰)、新增(蓝深边)
      const diff = diffSignals(curSignals, previewSignals);

      if (state.layerVisibility.signals) {
        // 保留的信号
        for (const sig of diff.retained) {
          const isBuy = sig.action === 'open_long' || sig.action === 'close_short';
          markPoints.push({
            name: isBuy ? '保留买入' : '保留卖出',
            coord: [sig.date, sig.price],
            symbol: 'triangle',
            symbolRotate: isBuy ? 0 : 180,
            symbolSize: 8,
            itemStyle: { color: isBuy ? '#2F6FED' : '#F08C00' },
          });
        }

        // 被过滤的旧信号 (空心灰)
        for (const sig of diff.filtered) {
          const isBuy = sig.action === 'open_long' || sig.action === 'close_short';
          markPoints.push({
            name: '被过滤信号',
            coord: [sig.date, sig.price],
            symbol: 'triangle',
            symbolRotate: isBuy ? 0 : 180,
            symbolSize: 8,
            itemStyle: {
              color: '#FFFFFF',
              borderColor: '#9CA3AF',
              borderWidth: 1.5,
            },
            label: {
              show: true,
              formatter: '✕',
              fontSize: 8,
              color: '#9CA3AF',
              position: 'inside',
            },
          });
        }

        // 新增的信号 (蓝带深蓝外边框)
        for (const sig of diff.added) {
          const isBuy = sig.action === 'open_long' || sig.action === 'close_short';
          markPoints.push({
            name: '新增信号',
            coord: [sig.date, sig.price],
            symbol: 'triangle',
            symbolRotate: isBuy ? 0 : 180,
            symbolSize: 10,
            itemStyle: {
              color: '#2F6FED',
              borderColor: '#1E3A8A',
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: '+',
              fontSize: 9,
              color: '#FFFFFF',
              position: 'inside',
            },
          });
        }
      }
    }

    // 持仓背景区间 markArea
    const markAreaIntervals: any[] = [];
    if (state.layerVisibility.positions) {
      const posToRender = isPreview ? previewPositions : curPositions;
      for (const pos of posToRender) {
        markAreaIntervals.push([
          {
            xAxis: pos.startDate,
            itemStyle: {
              color: pos.side === 'long' ? chartTheme.holdLong : chartTheme.holdShort,
            },
          },
          {
            xAxis: pos.endDate,
          },
        ]);
      }
    }

    // 近1年分割线 markLine (最后 244 根 bar)
    const cutIdx = Math.max(0, dates.length - 244);
    const recent1YDate = dates[cutIdx];
    const markLines: any[] = [
      {
        xAxis: recent1YDate,
        lineStyle: {
          color: chartTheme.recent1Y.color,
          type: 'dashed',
          width: 1.2,
        },
        label: {
          show: true,
          position: 'end',
          formatter: '近1年',
          color: '#6B7280',
          fontSize: 10,
        },
      },
    ];

    // 时间范围对应的 DataZoom 默认位置
    let startZoom = 0;
    if (state.timeRange === '1Y') startZoom = Math.max(0, ((dates.length - 244) / dates.length) * 100);
    else if (state.timeRange === '3Y') startZoom = Math.max(0, ((dates.length - 732) / dates.length) * 100);
    else if (state.timeRange === '5Y') startZoom = Math.max(0, ((dates.length - 1220) / dates.length) * 100);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#B0B8C4', type: 'dashed' } },
        backgroundColor: chartTheme.tooltip.bg,
        borderColor: chartTheme.tooltip.border,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { fontSize: 11, color: chartTheme.tooltip.text },
        extraCssText: `box-shadow: ${chartTheme.tooltip.shadow}; border-radius: 6px;`,
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const date = params[0].axisValue;
          const symbolFullName = symbol === 'RB' ? '螺纹钢' : symbol === 'I' ? '铁矿石' : '豆粕';
          let content = `<div style="font-weight:bold;margin-bottom:4px;color:#111827">${date} · ${symbol}主力合约 (${symbolFullName})</div>`;

          for (const item of params) {
            if (item.seriesName === 'K线' && Array.isArray(item.data)) {
              const o = Number(item.data[0]) || 0;
              const c = Number(item.data[1]) || 0;
              const l = Number(item.data[2]) || 0;
              const h = Number(item.data[3]) || 0;
              const chg = o !== 0 ? (((c - o) / o) * 100).toFixed(2) : '0.00';
              const color = c >= o ? chartTheme.candle.up : chartTheme.candle.down;
              content += `<div style="color:${color};margin-bottom:4px;">
                开: ${o} · 收: ${c} · 高: ${h} · 低: ${l} (${chg}%)
              </div>`;
            } else if (item.seriesName.includes('净值')) {
              content += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="color:#6B7280">${item.seriesName}:</span>
                <span style="font-weight:600;color:${item.color}">${item.data ?? '-'}</span>
              </div>`;
            } else if (item.seriesName === '基准走势') {
              content += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="color:#6B7280">基准 (买入持有):</span>
                <span style="color:#9CA3AF">${item.data ?? '-'}</span>
              </div>`;
            } else if (item.seriesName === '回撤幅度') {
              const ddVal = item.data != null ? (Number(item.data) * 100).toFixed(1) : '0.0';
              content += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="color:#F08C00">动态回撤:</span>
                <span style="font-weight:600;color:#F08C00">${ddVal}%</span>
              </div>`;
            }
          }
          return content;
        },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
      },
      grid: [
        // Upper Grid: K线 (0%~62%)
        {
          left: 54,
          right: 20,
          top: 30,
          height: '56%',
          borderColor: chartTheme.grid.borderColor,
        },
        // Lower Grid: 净值与回撤 (68%~92%)
        {
          left: 54,
          right: 20,
          top: '67%',
          height: '22%',
          borderColor: chartTheme.grid.borderColor,
        },
      ],
      xAxis: [
        // Upper xAxis
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: chartTheme.xAxis.axisLine,
          axisLabel: { show: false },
          splitLine: chartTheme.xAxis.splitLine,
          min: 'dataMin',
          max: 'dataMax',
          gridIndex: 0,
        },
        // Lower xAxis
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: chartTheme.xAxis.axisLine,
          axisLabel: chartTheme.xAxis.axisLabel,
          splitLine: chartTheme.xAxis.splitLine,
          min: 'dataMin',
          max: 'dataMax',
          gridIndex: 1,
        },
      ],
      yAxis: [
        // Upper yAxis: K线价格
        {
          scale: true,
          splitLine: chartTheme.yAxis.splitLine,
          axisLabel: chartTheme.yAxis.axisLabel,
          gridIndex: 0,
        },
        // Lower yAxis (Left): 净值
        {
          scale: true,
          splitLine: chartTheme.yAxis.splitLine,
          axisLabel: chartTheme.yAxis.axisLabel,
          gridIndex: 1,
        },
        // Lower yAxis (Right): 回撤百分比 (隐藏轴线)
        {
          scale: true,
          show: false,
          min: -0.5,
          max: 0.05,
          gridIndex: 1,
        },
      ],
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 4,
          height: 16,
          borderColor: '#E5E8EE',
          fillerColor: 'rgba(47, 111, 237, 0.1)',
          handleStyle: { color: '#2F6FED' },
          start: startZoom,
          end: 100,
          textStyle: { fontSize: 10, color: '#9CA3AF' },
        },
        {
          type: 'inside',
          xAxisIndex: [0, 1],
        },
      ],
      series: [
        // 1. Candlestick series
        {
          name: 'K线',
          type: 'candlestick' as const,
          data: candleData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: chartTheme.candle.up,
            color0: chartTheme.candle.down,
            borderColor: chartTheme.candle.up,
            borderColor0: chartTheme.candle.down,
          },
          markPoint: {
            data: markPoints,
          },
          markArea: {
            silent: true,
            data: markAreaIntervals,
          },
        },

        // 2. 净值曲线
        ...(isPreview
          ? [
              // 预览态旧净值 (虚线灰)
              {
                name: `原净值 (${curVer.label})`,
                type: 'line' as const,
                data: curVer.result.nav,
                xAxisIndex: 1,
                yAxisIndex: 1,
                showSymbol: false,
                lineStyle: chartTheme.navOld,
                itemStyle: { color: chartTheme.navOld.color },
              },
              // 预览态新净值 (实线蓝)
              {
                name: `方案净值 (${previewProposal?.title})`,
                type: 'line' as const,
                data: previewProposal?.result.nav || [],
                xAxisIndex: 1,
                yAxisIndex: 1,
                showSymbol: false,
                lineStyle: chartTheme.nav,
                itemStyle: { color: chartTheme.nav.color },
                markLine: {
                  silent: true,
                  data: markLines,
                },
              },
            ]
          : [
              // 正常状态单一实线净值
              {
                name: '策略净值',
                type: 'line' as const,
                data: curVer.result.nav,
                xAxisIndex: 1,
                yAxisIndex: 1,
                showSymbol: false,
                lineStyle: chartTheme.nav,
                itemStyle: { color: chartTheme.nav.color },
                markLine: {
                  silent: true,
                  data: markLines,
                },
              },
            ]),

        // 3. 基准走势 (买入持有等权)
        ...(state.layerVisibility.benchmark
          ? [
              {
                name: '基准走势',
                type: 'line' as const,
                data: curVer.result.benchmark,
                xAxisIndex: 1,
                yAxisIndex: 1,
                showSymbol: false,
                lineStyle: chartTheme.benchmark,
                itemStyle: { color: chartTheme.benchmark.color },
              },
            ]
          : []),

        // 4. 动态回撤面积
        {
          name: '回撤幅度',
          type: 'line' as const,
          data: isPreview ? previewProposal?.result.drawdown : curVer.result.drawdown,
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          lineStyle: { width: 1, color: chartTheme.drawdown.line },
          areaStyle: { color: chartTheme.drawdown.area },
        },
      ],
    };

    chartInstance.current.setOption(option, true);
  }, [bars, curVer, previewProposal, symbol, state.timeRange, state.layerVisibility]);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-white flex flex-col relative transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-4' : 'flex-1 min-h-[140px]'
      }`}
    >
      {/* 1. Chart Toolbar */}
      <div className="h-9 px-4 border-b border-[#EEF1F5] flex items-center justify-between text-xs shrink-0 select-none bg-white">
        {/* Left: Symbol buttons & time range */}
        <div className="flex items-center space-x-3">
          {/* Symbol selector: 具体合约 */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded">
            {['RB', 'I', 'M'].map(sym => {
              const isSel = state.selectedSymbol === sym;
              const names: Record<string, string> = { RB: '螺纹主力连续', I: '铁矿主力连续', M: '豆粕主力连续' };
              return (
                <button
                  key={sym}
                  onClick={() => store.setSelectedSymbol(sym)}
                  title={`${sym} · ${names[sym]}`}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    isSel ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {names[sym]}
                </button>
              );
            })}
          </div>

          <div className="h-3 w-[1px] bg-slate-200" />

          {/* Time range buttons */}
          <div className="flex items-center space-x-0.5">
            {[
              { id: '1Y', label: '1Y' },
              { id: '3Y', label: '3Y' },
              { id: '5Y', label: '5Y' },
              { id: 'all', label: '全部' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => store.setTimeRange(r.id as any)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                  state.timeRange === r.id
                    ? 'bg-[#EFF6FF] text-[#2F6FED] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Layer switches & Fullscreen */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-slate-600 text-[11px]">
            <label className="flex items-center space-x-1 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={state.layerVisibility.benchmark}
                onChange={() => store.toggleLayer('benchmark')}
                className="rounded border-slate-300 text-[#2F6FED] focus:ring-0 cursor-pointer w-3 h-3"
              />
              <span>基准走势</span>
            </label>
          </div>

          <div className="h-3 w-[1px] bg-slate-200" />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-slate-500 hover:text-slate-800 p-1 rounded transition-colors cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏图表'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Preview Mode Banner */}
      {previewProposal && (
        <div className="h-8 px-4 bg-[#EFF6FF] border-b border-[#BFDBFE] flex items-center justify-between text-xs text-[#1E40AF] select-none shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#2F6FED] animate-ping" />
            <span className="font-semibold">正在预览:</span>
            <span className="font-bold">{previewProposal.title}</span>
            <span className="text-slate-400">│</span>
            <span className="font-mono text-[11px]">
              年化 {(((previewProposal.result?.kpi?.annualReturn ?? 0)) * 100).toFixed(1)}% · 回撤 {(((previewProposal.result?.kpi?.maxDrawdown ?? 0)) * 100).toFixed(1)}% · 卡玛 {(previewProposal.result?.kpi?.calmar ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => store.applyProposal(previewProposal)}
              className="px-2.5 py-0.5 bg-[#2F6FED] hover:bg-[#2557CA] text-white rounded text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Check className="w-3 h-3" />
              <span>应用为 v{(activeIndicator?.versions.length || 1) + 1}</span>
            </button>
            <button
              onClick={() => store.setPreviewProposal(null)}
              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
              <span>退出预览</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. ECharts Container */}
      <div ref={chartRef} className="w-full flex-1 min-h-[100px]" />
    </div>
  );
};
