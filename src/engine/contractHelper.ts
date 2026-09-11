export const CONTRACT_NAME_MAP: Record<string, string> = {
  RB: '螺纹主力连续',
  I: '铁矿主力连续',
  M: '豆粕主力连续',
  HC: '热卷主力连续',
  J: '焦炭主力连续',
  JM: '焦煤主力连续',
  ZC: '动煤主力连续',
  CU: '沪铜主力连续',
  AL: '沪铝主力连续',
  ZN: '沪锌主力连续',
  AU: '沪金主力连续',
  AG: '沪银主力连续',
  RU: '橡胶主力连续',
  TA: 'PTA主力连续',
  MA: '甲醇主力连续',
  PP: 'PP主力连续',
  V: 'PVC主力连续',
  Y: '豆油主力连续',
  P: '棕油主力连续',
  C: '玉米主力连续',
  CS: '淀粉主力连续',
  CF: '棉花主力连续',
  SR: '白糖主力连续',
  OI: '菜油主力连续',
  RM: '菜粕主力连续',
  IF: '沪深300主力连续',
  IH: '上证50主力连续',
  IC: '中证500主力连续',
  IM: '中证1000主力连续',
};

export function getContractName(symbol: string, contractType?: string): string {
  if (!symbol) return '';
  if (CONTRACT_NAME_MAP[symbol]) {
    if (contractType === 'index') {
      return CONTRACT_NAME_MAP[symbol].replace('主力连续', '指数连续');
    }
    return CONTRACT_NAME_MAP[symbol];
  }
  // If already contains '主力' or '连续' or specific month like 'RB2510'
  if (symbol.includes('主力') || symbol.includes('连续') || /\d{4}/.test(symbol)) {
    return symbol;
  }
  return `${symbol}主力连续`;
}

export function formatContractList(symbols: string[] = [], contractType?: string): string {
  return symbols.map(s => getContractName(s, contractType)).join(' · ');
}
