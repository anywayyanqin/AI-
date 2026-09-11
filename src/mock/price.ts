import { mulberry32 } from './prng';
import { genTradingDays } from './calendar';

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Regime = 'up' | 'down' | 'range';

export const REGIMES: Record<Regime, { drift: number; vol: number; revert: number; len: [number, number] }> = {
  up:    { drift:  0.0012, vol: 0.013, revert: 0,    len: [40, 110] },
  down:  { drift: -0.0011, vol: 0.015, revert: 0,    len: [40, 100] },
  range: { drift:  0,      vol: 0.010, revert: 0.04, len: [50, 130] },
};

export interface GenBarsOptions {
  seed: number;
  start?: string;
  end?: string;
  p0: number;
  tick: number;
  sharedRegimes?: Regime[];
}

export function genBars(opts: GenBarsOptions): { bars: Bar[]; regimes: Regime[] } {
  const rnd = mulberry32(opts.seed);
  const gauss = () => {
    const u = Math.max(1e-7, 1 - rnd());
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const dates = genTradingDays(opts.start || '2019-01-02', opts.end || '2025-06-30');
  const bars: Bar[] = [];
  const recordedRegimes: Regime[] = [];

  let close = opts.p0;
  let anchor = opts.p0;
  let regime: Regime = 'range';
  let left = 0;

  const q = (x: number) => {
    const rounded = Math.round(x / opts.tick) * opts.tick;
    return opts.tick < 1 ? Number(rounded.toFixed(2)) : Math.round(rounded);
  };

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];

    if (opts.sharedRegimes && opts.sharedRegimes[i] && rnd() < 0.65) {
      regime = opts.sharedRegimes[i];
    } else if (left-- <= 0) {
      const pick = rnd();
      regime = pick < 0.32 ? 'up' : pick < 0.58 ? 'down' : 'range';
      const [a, b] = REGIMES[regime].len;
      left = a + Math.floor(rnd() * (b - a));
      anchor = close;
    }

    recordedRegimes.push(regime);
    const r = REGIMES[regime];
    const ret = r.drift + r.vol * gauss() + r.revert * Math.log(Math.max(1e-4, anchor / close));
    const jump = 1 + 0.0035 * gauss();
    const open = close * jump;
    close = close * Math.exp(ret);

    const baseRange = Math.abs(close - open) + close * r.vol * (0.35 + 0.65 * rnd());
    const high = Math.max(open, close) + baseRange * rnd() * 0.55;
    const low = Math.min(open, close) - baseRange * rnd() * 0.55;

    const baseVol = 85000 + 55000 * rnd() * (1 + Math.abs(ret) * 45);

    bars.push({
      date,
      open: q(open),
      high: q(high),
      low: q(low),
      close: q(close),
      volume: Math.round(baseVol),
    });
  }

  return { bars, regimes: recordedRegimes };
}
