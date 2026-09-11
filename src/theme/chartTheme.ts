// 蓝白浅色专业金融图表主题 Tokens
export const chartTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#6B7280', fontSize: 11, fontFamily: 'Inter, PingFang SC, sans-serif' },
  grid: { borderColor: '#E5E8EE' },
  xAxis: {
    axisLine: { lineStyle: { color: '#E5E8EE' } },
    axisLabel: { color: '#9CA3AF', fontSize: 10 },
    splitLine: { show: false },
  },
  yAxis: {
    splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' as const } },
    axisLabel: { color: '#9CA3AF', fontSize: 10 },
  },
  // 国内期货红涨绿跌
  candle: {
    up: '#E5484D',
    down: '#2FA67A',
  },
  // 信号与涨跌色区分：买入蓝，卖出橙
  buyMark: {
    symbol: 'triangle',
    color: '#2F6FED',
    size: 9,
  },
  sellMark: {
    symbol: 'triangle',
    rotate: 180,
    color: '#F08C00',
    size: 9,
  },
  // 持仓背景区间
  holdLong: 'rgba(47, 111, 237, 0.08)',
  holdShort: 'rgba(240, 140, 0, 0.08)',
  // 净值走势
  nav: { color: '#2F6FED', width: 1.8 },
  navOld: { color: '#9CA3AF', width: 1.4, type: 'dashed' as const },
  benchmark: { color: '#B0B8C4', width: 1.1, type: 'dashed' as const },
  drawdown: { area: 'rgba(240, 140, 0, 0.18)', line: '#F08C00' },
  recent1Y: { color: '#C5CCD6', type: 'dashed' as const, label: '近1年' },
  // 预览态特殊标记
  filteredMark: { color: '#C5CCD6', hollow: true },
  addedMark: { color: '#2F6FED', borderColor: '#1E40AF', borderWidth: 1.5 },
  savedMark: { borderColor: '#FFFFFF', borderWidth: 1.5, shadow: true },
  tooltip: {
    bg: '#FFFFFF',
    border: '#E5E8EE',
    shadow: '0 8px 24px rgba(16,24,40,.10)',
    text: '#1F2937',
  },
};
