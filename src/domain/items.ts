import { comparePeriods } from './period';
import type { Item } from './types';

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
