import { genBars } from '../src/mock/price';
import { genAuxData } from '../src/mock/aux';
import { basisMaResonanceRule } from '../src/engine/rules';
import { runMultiSymbolBacktest } from '../src/engine/backtest';
import { calcKpi, calcRecent1YKpi } from '../src/engine/metrics';
import { SYMBOL_CONFIGS, DEFAULT_SYMBOLS, MOCK_SEED } from '../src/mock/config';

const symbolBars: Record<string, any[]> = {};
const symbolAux: Record<string, any> = {};

const rbGen = genBars({ seed: MOCK_SEED, p0: SYMBOL_CONFIGS.RB.p0, tick: SYMBOL_CONFIGS.RB.tick });
symbolBars['RB'] = rbGen.bars;
symbolAux['RB'] = genAuxData(MOCK_SEED, rbGen.bars, rbGen.regimes);

const iGen = genBars({ seed: MOCK_SEED + 1, p0: SYMBOL_CONFIGS.I.p0, tick: SYMBOL_CONFIGS.I.tick, sharedRegimes: rbGen.regimes });
symbolBars['I'] = iGen.bars;
symbolAux['I'] = genAuxData(MOCK_SEED + 1, iGen.bars, iGen.regimes);

const mGen = genBars({ seed: MOCK_SEED + 2, p0: SYMBOL_CONFIGS.M.p0, tick: SYMBOL_CONFIGS.M.tick });
symbolBars['M'] = mGen.bars;
symbolAux['M'] = genAuxData(MOCK_SEED + 2, mGen.bars, mGen.regimes);

// v1: base (MA 20)
const v1Signals: Record<string, any[]> = {};
for (const sym of DEFAULT_SYMBOLS) {
  const res = basisMaResonanceRule({ symbol: sym, bars: symbolBars[sym], aux: symbolAux[sym] }, { ma: 20, basisWindow: 20, threshold: 0 });
  v1Signals[sym] = res.signals;
}
const btCfg = { capital: 100000, feeBp: 1, slipTicks: 1, execAt: 'close' as const };
const v1Bt = runMultiSymbolBacktest(symbolBars, v1Signals, btCfg);
const v1Kpi = calcKpi(v1Bt.nav, v1Bt.trades, symbolBars.RB.length);
const v1Rec = calcRecent1YKpi(v1Bt.nav, v1Bt.trades, symbolBars.RB.length);

// Proposal A: ATR filter (30% percentile)
const aSignals: Record<string, any[]> = {};
for (const sym of DEFAULT_SYMBOLS) {
  const res = basisMaResonanceRule({ symbol: sym, bars: symbolBars[sym], aux: symbolAux[sym] }, { ma: 20, basisWindow: 20, threshold: 0, atrFilterPct: 0.3 });
  aSignals[sym] = res.signals;
}
const aBt = runMultiSymbolBacktest(symbolBars, aSignals, btCfg);
const aKpi = calcKpi(aBt.nav, aBt.trades, symbolBars.RB.length);
const aRec = calcRecent1YKpi(aBt.nav, aBt.trades, symbolBars.RB.length);

// Proposal B: MA 40
const bSignals: Record<string, any[]> = {};
for (const sym of DEFAULT_SYMBOLS) {
  const res = basisMaResonanceRule({ symbol: sym, bars: symbolBars[sym], aux: symbolAux[sym] }, { ma: 40, basisWindow: 20, threshold: 0 });
  bSignals[sym] = res.signals;
}
const bBt = runMultiSymbolBacktest(symbolBars, bSignals, btCfg);
const bKpi = calcKpi(bBt.nav, bBt.trades, symbolBars.RB.length);
const bRec = calcRecent1YKpi(bBt.nav, bBt.trades, symbolBars.RB.length);

console.log('Proposal A:', aKpi, 'Recent 1Y:', aRec);
console.log('Proposal B:', bKpi, 'Recent 1Y:', bRec);

