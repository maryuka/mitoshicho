import Dexie, { type Table } from 'dexie';
import type {
  Account, CardBill, Category, CategoryActual, ChecklistDone, ChecklistTemplate, Entry, Item, Receivable, Settings,
} from '../domain/types';

export class MitoshichoDB extends Dexie {
  settings!: Table<Settings, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  items!: Table<Item, string>;
  entries!: Table<Entry, string>;
  categoryActuals!: Table<CategoryActual, string>;
  cardBills!: Table<CardBill, string>;
  receivables!: Table<Receivable, string>;
  checklistTemplates!: Table<ChecklistTemplate, string>;
  checklistDone!: Table<ChecklistDone, string>;

  constructor() {
    super('mitoshicho');
    this.version(1).stores({
      settings: 'id',
      accounts: 'id',
      categories: 'id',
      items: 'id',
      entries: 'id, periodId, itemId',
      cardBills: 'id, periodId',
      receivables: 'id, expectedPeriod',
      checklistTemplates: 'id',
      checklistDone: 'id, periodId',
    });
    // v2: 実績を項目ごとの記録で持っていた時期（v3 で廃止）
    this.version(2).stores({ records: 'id, periodId, itemId' });
    // v3: 実績はカテゴリ合計で持つ（Zaim などで記録し、振り返りで合計を入れる）
    this.version(3).stores({ records: null, categoryActuals: 'id, periodId' }).upgrade(async (tx) => {
      const items = await tx.table('items').toArray();
      const entries = await tx.table('entries').toArray();
      let records: { periodId: string; itemId: string; amount: number }[] = [];
      try { records = await tx.table('records').toArray(); } catch { /* 記録テーブルがない場合は何もしない */ }
      const m = migrateLegacy({ items, entries, records });
      await tx.table('entries').clear();
      await tx.table('entries').bulkAdd(m.entries);
      await tx.table('categoryActuals').bulkPut(m.categoryActuals);
    });
  }
}

export const db = new MitoshichoDB();

export const TABLES = [
  'settings', 'accounts', 'categories', 'items', 'entries', 'categoryActuals',
  'cardBills', 'receivables', 'checklistTemplates', 'checklistDone',
] as const;
export type TableName = (typeof TABLES)[number];

export const newId = () => crypto.randomUUID();

type LegacyEntry = Entry & { actual?: number; settled?: boolean };
type LegacyRecord = { periodId: string; itemId: string; amount: number };

/**
 * 旧形式の実績（Entry.actual と項目ごとの記録）をカテゴリ合計に変換する。
 * DB の移行とバックアップの復元で使う。
 */
export function migrateLegacy(src: { items: Item[]; entries: LegacyEntry[]; records?: LegacyRecord[] }):
  { entries: Entry[]; categoryActuals: CategoryActual[] } {
  const catOf = new Map(src.items.map((i) => [i.id, i.categoryId]));
  const totals = new Map<string, CategoryActual>();
  const add = (periodId: string, itemId: string, amount: number) => {
    const categoryId = catOf.get(itemId);
    if (!categoryId) return;
    const id = `${periodId}:${categoryId}`;
    const cur = totals.get(id) ?? { id, periodId, categoryId, amount: 0 };
    cur.amount += amount;
    totals.set(id, cur);
  };
  for (const r of src.records ?? []) add(r.periodId, r.itemId, r.amount);
  const entries: Entry[] = [];
  for (const e of src.entries) {
    const { actual, settled: _settled, ...rest } = e;
    if (actual !== undefined) add(e.periodId, e.itemId, actual);
    if (rest.planned !== undefined || rest.memo) entries.push(rest);
  }
  return { entries, categoryActuals: [...totals.values()] };
}
