export const MOCK_SEED = 1387;

export const DEFAULT_SYMBOLS = ['RB', 'I', 'M'];

export const SYMBOL_CONFIGS: Record<
  string,
  {
    name: string;
    p0: number;
    tick: number;
    exchange: string;
    multiplier: number;
    category: string;
  }
> = {
  RB: {
    name: '螺纹钢',
    p0: 3600,
    tick: 1,
    exchange: 'SHFE',
    multiplier: 10,
    category: '黑色',
  },
  I: {
    name: '铁矿石',
    p0: 780,
    tick: 0.5,
    exchange: 'DCE',
    multiplier: 100,
    category: '黑色',
  },
  M: {
    name: '豆粕',
    p0: 2900,
    tick: 1,
    exchange: 'DCE',
    multiplier: 10,
    category: '农产品',
  },
};

export const BACKTEST_DATE_RANGE = {
  start: '2019-01-02',
  end: '2025-06-30',
};
