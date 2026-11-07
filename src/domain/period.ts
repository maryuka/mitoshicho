// 期（給料日〜次の給料日の前日）の計算
// 給料日が土日・祝日なら前の平日に支払われるので、期の始まりもその日にずらす（開始日 1日＝暦月はずらさない）
import { previousBusinessDay } from './holidays';

export function periodId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parsePeriod(id: string): { year: number; month: number } {
  const [y, m] = id.split('-').map(Number);
  return { year: y, month: m };
}

export function addPeriods(id: string, n: number): string {
  const { year, month } = parsePeriod(id);
  const idx = year * 12 + (month - 1) + n;
  return periodId(Math.floor(idx / 12), (idx % 12) + 1);
}

export function comparePeriods(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function periodRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addPeriods(from, i));
}

/** 月末を超える開始日（例 31日）は月末に丸める */
function clampDay(year: number, month: number, day: number): number {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

/** 予定どおりの給料日（土日祝でずらす前） */
function nominalStart(id: string, startDay: number): Date {
  const { year, month } = parsePeriod(id);
  return new Date(year, month - 1, clampDay(year, month, startDay));
}

/** 期の初日＝実際の給料日 */
export function periodStart(id: string, startDay: number): Date {
  const d = nominalStart(id, startDay);
  return startDay === 1 ? d : previousBusinessDay(d);
}

export function periodEnd(id: string, startDay: number): Date {
  const next = periodStart(addPeriods(id, 1), startDay);
  return new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
}

export function periodOf(date: Date, startDay: number): string {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const id = periodId(day.getFullYear(), day.getMonth() + 1);
  // 翌月の給料日が前にずれてこの月に入ってくることもある（開始日が月初に近いとき）
  if (day >= periodStart(addPeriods(id, 1), startDay)) return addPeriods(id, 1);
  return day >= periodStart(id, startDay) ? id : addPeriods(id, -1);
}

const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

export function periodLabel(id: string, startDay: number): string {
  if (startDay === 1) {
    const { year, month } = parsePeriod(id);
    return `${year}年${month}月`;
  }
  return `${md(periodStart(id, startDay))}〜${md(periodEnd(id, startDay))}`;
}

/** 年まで入れた表記。選択肢など、いつのことか分からなくなる場所で使う（例: 2026/10/15〜11/14、2026/12/15〜2027/1/14） */
export function periodYearLabel(id: string, startDay: number): string {
  if (startDay === 1) {
    const { year, month } = parsePeriod(id);
    return `${year}年${month}月`;
  }
  const s = periodStart(id, startDay);
  const e = periodEnd(id, startDay);
  const end = e.getFullYear() === s.getFullYear() ? md(e) : `${e.getFullYear()}/${md(e)}`;
  return `${s.getFullYear()}/${md(s)}〜${end}`;
}

/** 期の初日だけを年つきで（例: 2027/4/15〜）。幅の狭い場所で使う */
export function periodFromLabel(id: string, startDay: number): string {
  if (startDay === 1) { const { year, month } = parsePeriod(id); return `${year}年${month}月〜`; }
  const s = periodStart(id, startDay);
  return `${s.getFullYear()}/${md(s)}〜`;
}

export function periodShortLabel(id: string, startDay: number): string {
  if (startDay === 1) return `${parsePeriod(id).month}月`;
  return `${md(periodStart(id, startDay))}-${md(periodEnd(id, startDay))}`;
}

/** 期の中で day 日が来る日付（タイムライン用） */
export function dateInPeriod(id: string, startDay: number, day: number): Date {
  // どちらの月の day 日かは、ずらす前の給料日で決める（給料日のずれで項目が2回・0回にならないように）
  const start = nominalStart(id, startDay);
  const y = start.getFullYear();
  const m = start.getMonth() + 1;
  if (day >= start.getDate()) return new Date(y, m - 1, clampDay(y, m, day));
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return new Date(ny, nm - 1, clampDay(ny, nm, day));
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** date より前で、日が day になる直近の日付（確定日の算出に使う） */
export function lastDayBefore(date: Date, day: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const same = new Date(y, m - 1, clampDay(y, m, day));
  if (same < date) return same;
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return new Date(py, pm - 1, clampDay(py, pm, day));
}

export const mdLabel = md;
