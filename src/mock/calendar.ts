/**
 * 中国期货交易日历生成
 * 涵盖 2019-01-02 至 2025-06-30
 * 跳过周末及主要法定节假日 (元旦、春节、清明、五一、端午、中秋、国庆等)
 */

export function isHoliday(d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();

  // 元旦 (约1月1日-3日)
  if (m === 1 && day <= 3) return true;

  // 春节 (农历正月初一前后，对应公历大致在 1月下旬至 2月中旬)
  if (y === 2019 && m === 2 && day >= 4 && day <= 10) return true;
  if (y === 2020 && m === 1 && day >= 24 && day <= 31) return true;
  if (y === 2021 && m === 2 && day >= 11 && day <= 17) return true;
  if (y === 2022 && m === 1 && day >= 31) return true;
  if (y === 2022 && m === 2 && day <= 6) return true;
  if (y === 2023 && m === 1 && day >= 21 && day <= 27) return true;
  if (y === 2024 && m === 2 && day >= 10 && day <= 17) return true;
  if (y === 2025 && m === 1 && day >= 28) return true;
  if (y === 2025 && m === 2 && day <= 4) return true;

  // 清明 (4月4-6日)
  if (m === 4 && day >= 4 && day <= 6) return true;

  // 五一劳动节 (5月1-5日)
  if (m === 5 && day >= 1 && day <= 5) return true;

  // 端午节 (公历大致在 6月中上旬)
  if (y === 2019 && m === 6 && day === 7) return true;
  if (y === 2020 && m === 6 && day >= 25 && day <= 27) return true;
  if (y === 2021 && m === 6 && day === 14) return true;
  if (y === 2022 && m === 6 && day === 3) return true;
  if (y === 2023 && m === 6 && day >= 22 && day <= 24) return true;
  if (y === 2024 && m === 6 && day === 10) return true;
  if (y === 2025 && m === 5 && day === 31) return true;

  // 中秋 & 国庆 (9月中下旬至10月7日)
  if (m === 10 && day <= 7) return true;
  if (y === 2019 && m === 9 && day === 13) return true;
  if (y === 2021 && m === 9 && day >= 19 && day <= 21) return true;
  if (y === 2022 && m === 9 && day >= 10 && day <= 12) return true;
  if (y === 2023 && m === 9 && day === 29) return true;
  if (y === 2024 && m === 9 && day >= 15 && day <= 17) return true;

  return false;
}

export function genTradingDays(startStr = '2019-01-02', endStr = '2025-06-30'): string[] {
  const dates: string[] = [];
  const current = new Date(startStr);
  const end = new Date(endStr);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(current)) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
