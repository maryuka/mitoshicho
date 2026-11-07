// 日本の祝日（内閣府の「国民の祝日」に準じる）。2000〜2099年を想定し、外部のデータは使わずに計算する
// 春分・秋分の日は天文計算の近似式（1980〜2099年で有効）。正式には前年2月の官報で決まる

const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`;

/** その月の n 回目の月曜日 */
function nthMonday(y: number, m: number, n: number): number {
  const first = new Date(y, m - 1, 1).getDay(); // 0=日
  const offset = (8 - first) % 7; // 最初の月曜日までの日数
  return 1 + offset + (n - 1) * 7;
}

function equinox(y: number, base: number): number {
  return Math.floor(base + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
}

/** 振替休日・国民の休日を除いた、その年の祝日 */
function baseHolidays(y: number): Set<string> {
  const s = new Set<string>();
  const add = (m: number, d: number) => s.add(key(y, m, d));
  add(1, 1);
  add(1, nthMonday(y, 1, 2)); // 成人の日
  add(2, 11);
  if (y >= 2020) add(2, 23); // 天皇誕生日
  add(3, equinox(y, 20.8431)); // 春分の日
  add(4, 29);
  add(5, 3); add(5, 4); add(5, 5);
  // 海の日・スポーツの日・山の日（東京大会の年は日付が移った）
  if (y === 2020) { add(7, 23); add(7, 24); add(8, 10); }
  else if (y === 2021) { add(7, 22); add(7, 23); add(8, 8); }
  else {
    add(7, nthMonday(y, 7, 3));
    if (y >= 2016) add(8, 11);
    add(10, nthMonday(y, 10, 2));
  }
  add(9, nthMonday(y, 9, 3)); // 敬老の日
  add(9, equinox(y, 23.2488)); // 秋分の日
  add(11, 3);
  add(11, 23);
  if (y <= 2018) add(12, 23); // 平成の天皇誕生日
  if (y === 2019) { add(4, 30); add(5, 1); add(5, 2); add(10, 22); } // 即位に伴う休日
  return s;
}

const cache = new Map<number, Set<string>>();

/** 振替休日と国民の休日まで含めた、その年の休日（祝日） */
function holidaysOf(y: number): Set<string> {
  const hit = cache.get(y);
  if (hit) return hit;
  const base = baseHolidays(y);
  const all = new Set(base);
  const isBase = (d: Date) => base.has(key(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  for (let d = new Date(y, 0, 1); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    // 振替休日: 祝日が日曜なら、その後の最初の祝日でない日
    if (isBase(d) && d.getDay() === 0) {
      const sub = new Date(d);
      do sub.setDate(sub.getDate() + 1); while (isBase(sub));
      all.add(key(sub.getFullYear(), sub.getMonth() + 1, sub.getDate()));
    }
    // 国民の休日: 祝日にはさまれた平日
    const prev = new Date(d); prev.setDate(d.getDate() - 1);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    if (!isBase(d) && d.getDay() !== 0 && isBase(prev) && isBase(next)) all.add(key(y, d.getMonth() + 1, d.getDate()));
  }
  cache.set(y, all);
  return all;
}

export function isHoliday(d: Date): boolean {
  return holidaysOf(d.getFullYear()).has(key(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}

/** 土日・祝日なら、その前の平日にずらす */
export function previousBusinessDay(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)) d.setDate(d.getDate() - 1);
  return d;
}

/** 土日・祝日なら、その後の平日にずらす */
export function nextBusinessDay(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)) d.setDate(d.getDate() + 1);
  return d;
}

/** 土日・祝日のときに、ずらし方に合わせて前／後の平日にする */
export function shiftBusinessDay(date: Date, shift: 'before' | 'none' | 'after'): Date {
  if (shift === 'before') return previousBusinessDay(date);
  if (shift === 'after') return nextBusinessDay(date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
