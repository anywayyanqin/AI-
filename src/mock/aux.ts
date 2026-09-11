import { mulberry32 } from './prng';
import { Bar, Regime } from './price';

export interface AuxData {
  basis: number[];       // 基差 (现货 - 期货)
  inventory: number[];   // 库存指数 (万吨)
  oiChange: number[];    // 主力持仓变化 (手)
}

export function genAuxData(seed: number, bars: Bar[], regimes: Regime[]): AuxData {
  const rnd = mulberry32(seed + 9999);
  const n = bars.length;
  const basis: number[] = new Array(n);
  const inventory: number[] = new Array(n);
  const oiChange: number[] = new Array(n);

  let curBasis = 35;
  let curOi = 0;
  let curInv = 650;

  for (let t = 0; t < n; t++) {
    const reg = regimes[t] || 'range';
    const regBias = reg === 'up' ? 25 : reg === 'down' ? -20 : 0;
    const noiseB = (rnd() - 0.5) * 12;

    // AR(1) 均值回归: 0.85 * basis[t-1] + 0.15 * regimeBias + noise
    curBasis = 0.85 * curBasis + 0.15 * regBias + noiseB;
    basis[t] = Math.round(curBasis * 10) / 10;

    // 库存 (带52周季节性波动与价格反向累积)
    const weekNum = Math.floor(t / 5) % 52;
    const seasonal = 1 + 0.12 * Math.sin((2 * Math.PI * weekNum) / 52);
    const pReturn = t > 0 ? (bars[t].close - bars[t - 1].close) / bars[t - 1].close : 0;
    curInv = curInv * 0.995 + 650 * 0.005 * seasonal - pReturn * 120 + (rnd() - 0.5) * 4;
    inventory[t] = Math.round(curInv * 10) / 10;

    // 主力持仓日度变化
    const volZ = (bars[t].volume - 110000) / 40000;
    curOi = 0.3 * curOi + volZ * 1200 + (rnd() - 0.5) * 1800;
    oiChange[t] = Math.round(curOi);
  }

  return { basis, inventory, oiChange };
}
