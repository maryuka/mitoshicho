import { itemOccurs } from './cashflow';
import { addPeriods, comparePeriods } from './period';
import type { Item, Recurrence } from './types';

/**
 * 定期項目のアーカイブ／使用中に戻すときの変更内容。
 * アーカイブ: 今月までで止める（終了月が今月より後かなしなら、今月にする）。過去の月の予算はそのまま残る
 * 使用中に戻す: アーカイブで変えた終了月を元に戻す
 */
export function itemArchivePatch(item: Item, archive: boolean, current: string): Partial<Item> {
  if (archive) {
    if (item.archived) return {};
    const cut = !item.endPeriod || comparePeriods(item.endPeriod, current) > 0;
    return cut
      ? { archived: true, endPeriod: current, endBeforeArchive: item.endPeriod ?? null }
      : { archived: true, endBeforeArchive: undefined };
  }
  if (!item.archived) return {};
  return item.endBeforeArchive === undefined
    ? { archived: false }
    : { archived: false, endPeriod: item.endBeforeArchive ?? undefined, endBeforeArchive: undefined };
}

type Schedule = { recurrence: Recurrence; startPeriod: string };
const LIMIT = 1200; // 100年ぶん。これより先は探さない

/** 開始月から数えて n 回目が来る月（＝回数で決めたときの終了月）。n が 1 未満なら undefined */
export function endAfterCount(s: Schedule, n: number): string | undefined {
  if (!Number.isInteger(n) || n < 1) return undefined;
  let count = 0;
  for (let i = 0, p = s.startPeriod; i < LIMIT; i++, p = addPeriods(p, 1)) {
    if (itemOccurs({ ...s, endPeriod: undefined } as Item, p) && ++count === n) return p;
  }
  return undefined;
}

/** from 月から end 月までに来る回数（from を省くと開始月から＝全部の回数） */
export function countBetween(s: Schedule, end: string, from?: string): number {
  let p = from && comparePeriods(from, s.startPeriod) > 0 ? from : s.startPeriod;
  let count = 0;
  for (let i = 0; i < LIMIT && comparePeriods(p, end) <= 0; i++, p = addPeriods(p, 1)) {
    if (itemOccurs({ ...s, endPeriod: undefined } as Item, p)) count++;
  }
  return count;
}
