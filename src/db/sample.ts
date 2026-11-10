// 試用のためのサンプルデータ（金額・名前は架空）
import { addPeriods, parsePeriod, periodOf, periodRule } from '../domain/period';
import type { Account, AppData, CardBill, Category, ChecklistTemplate, Entry, Item, Receivable, Recurrence, CategoryActual, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { db } from './db';
import { clearAll } from './backup';

export async function loadSampleData(): Promise<void> {
  // ウォークスルーで選んだ給料日は残す
  const d = buildSampleData(await db.settings.get('app'));
  await clearAll();
  await db.transaction('rw', [db.settings, db.accounts, db.categories, db.items, db.entries, db.categoryActuals, db.cardBills, db.receivables, db.checklistTemplates], async () => {
    await db.settings.put(d.settings);
    await db.accounts.bulkAdd(d.accounts);
    await db.categories.bulkAdd(d.categories);
    await db.items.bulkAdd(d.items);
    await db.entries.bulkAdd(d.entries);
    await db.categoryActuals.bulkAdd(d.categoryActuals);
    await db.cardBills.bulkAdd(d.cardBills);
    await db.receivables.bulkAdd(d.receivables);
    await db.checklistTemplates.bulkAdd(d.checklistTemplates);
  });
}

/** サンプルデータを組み立てる（保存はしない）。給料日の設定は prev から引き継ぐ */
export function buildSampleData(prev?: Settings): AppData {
  const settings: Settings = { ...DEFAULT_SETTINGS, periodStartDay: prev?.periodStartDay ?? DEFAULT_SETTINGS.periodStartDay, holidayShift: prev?.holidayShift, startedAt: prev?.startedAt ?? new Date().toISOString() };
  const now = periodOf(new Date(), periodRule(settings));
  const start = addPeriods(now, -3);

  const accounts: Account[] = [
    { id: 'acc-main', name: 'メイン銀行', kind: 'bank', sortOrder: 0, archived: false },
    { id: 'acc-life', name: '生活費口座', kind: 'bank', sortOrder: 1, archived: false },
    { id: 'acc-pay', name: '引落口座', kind: 'bank', sortOrder: 2, archived: false },
    { id: 'acc-save', name: '貯金口座', kind: 'bank', sortOrder: 3, archived: false },
    { id: 'card-a', name: 'カードA', kind: 'card', withdrawDay: 26, withdrawShift: 'after', confirmDay: 11, withdrawAccountId: 'acc-pay', billLagPeriods: 1, sortOrder: 10, archived: false },
    { id: 'card-b', name: 'カードB', kind: 'card', withdrawDay: 10, withdrawShift: 'after', confirmDay: 25, withdrawAccountId: 'acc-pay', billLagPeriods: 1, sortOrder: 11, archived: false },
  ];

  const cat = (id: string, name: string, kind: Category['kind'], sortOrder: number): Category =>
    ({ id, name, kind, sortOrder, archived: false });
  const categories: Category[] = [
    cat('c-salary', '給与', 'income', 0),
    cat('c-other-in', 'その他収入', 'income', 1),
    cat('c-fixed', '住居', 'expense', 10),
    cat('c-util', '水道光熱費・日用品', 'expense', 11),
    cat('c-food', '食費', 'expense', 12),
    cat('c-enjoy', '趣味・娯楽', 'expense', 13),
    cat('c-friends', '交際費', 'expense', 14),
    cat('c-beauty', '美容', 'expense', 15),
    cat('c-medical', '病院', 'expense', 16),
    cat('c-sub', 'サブスク・通信', 'expense', 17),
    cat('c-annual', '年会費', 'expense', 18),
    cat('c-debt', '返済', 'debt', 30),
    cat('c-save', '貯金・投資', 'saving', 40),
  ];

  let order = 0;
  const monthly: Recurrence = { type: 'monthly' };
  const it = (
    name: string, categoryId: string, defaultAmount: number, sourceAccountId: string,
    day?: number, extra: Partial<Item> = {},
  ): Item => ({
    id: `item-${order}`, name, categoryId, defaultAmount, sourceAccountId, day,
    recurrence: monthly, startPeriod: start, sortOrder: order++, archived: false, ...extra,
  });
  const annualMonth = parsePeriod(addPeriods(now, 2)).month;

  const items: Item[] = [
    it('給与', 'c-salary', 280000, 'acc-main', settings.periodStartDay === 1 ? 25 : settings.periodStartDay),
    it('家賃', 'c-fixed', 85000, 'acc-main', 27),
    it('水道ガス', 'c-util', 2500, 'acc-pay', 20),
    it('電気', 'c-util', 4500, 'card-a'),
    it('日用品', 'c-util', 3000, 'acc-life'),
    it('食費', 'c-food', 20000, 'acc-life'),
    it('趣味・娯楽', 'c-enjoy', 30000, 'acc-life'),
    it('交際費', 'c-friends', 8000, 'acc-life'),
    it('ヘアケア', 'c-beauty', 3000, 'acc-life'),
    it('美容院', 'c-beauty', 7000, 'acc-life', undefined, { recurrence: { type: 'yearly', month: annualMonth } }),
    it('病院', 'c-medical', 3000, 'card-a'),
    it('動画サブスク', 'c-sub', 1500, 'card-a'),
    it('スマホ回線', 'c-sub', 1500, 'card-a'),
    it('音楽サブスク', 'c-sub', 600, 'card-a'),
    it('AIツール', 'c-sub', 2000, 'card-b'),
    it('通販会員 年会費', 'c-annual', 5900, 'card-a', undefined, { recurrence: { type: 'yearly', month: annualMonth } }),
    it('スマホ分割', 'c-debt', 4000, 'card-a', undefined, { endPeriod: addPeriods(now, 8) }),
    it('ローンA', 'c-debt', 12000, 'acc-pay', 27, { endPeriod: addPeriods(now, 14) }),
    it('奨学金返済', 'c-debt', 13000, 'acc-pay', 27),
    it('iDeCo', 'c-save', 10000, 'acc-pay', 26),
    it('生活防衛費', 'c-save', 30000, 'acc-save', 15),
    it('つみたて投資', 'c-save', 30000, 'acc-pay', 27),
    it('特別費の積み立て', 'c-save', 16400, 'acc-save', 15),
    it('帰省の交通費', 'c-enjoy', 40000, 'card-a', undefined, { recurrence: { type: 'once', periodId: addPeriods(now, 3) } }),
    it('冷蔵庫の買い替え', 'c-util', 40000, 'acc-life', undefined, { recurrence: { type: 'once', periodId: addPeriods(now, 6) } }),
  ];

  // 実績（家計簿アプリで集計したカテゴリ合計を振り返りで入れた想定）。前期は一部未入力にしておく
  const categoryActuals: CategoryActual[] = [];
  const act = (periodId: string, categoryId: string, amount: number) =>
    categoryActuals.push({ id: `${periodId}:${categoryId}`, periodId, categoryId, amount });
  const history: [string, number[]][] = [
    // [カテゴリ, [3期前, 2期前, 前期]]
    ['c-salary', [280000, 280000, 280000]],
    ['c-fixed', [85000, 85000, 85000]],
    ['c-util', [9200, 9800, 11400]],
    ['c-food', [21800, 18200, 24900]],
    ['c-enjoy', [36000, 27500, 41000]],
    ['c-friends', [6000, 11500, 9000]],
    ['c-beauty', [3000, 3000, 3000]],
    ['c-sub', [5600, 5600, 5600]],
    ['c-debt', [29000, 29000, 29000]],
    ['c-save', [40000, 40000, 0]],
  ];
  for (const [cat, values] of history) {
    values.forEach((v, i) => {
      const pid = addPeriods(now, i - 3);
      if (i === 2 && (cat === 'c-save')) return; // 前期は貯金が未入力
      act(pid, cat, v);
    });
  }

  // 大きい出費の月は、積み立てを減らして ±0 にしておく（item-21: つみたて投資、item-22: 特別費の積み立て）
  const entry = (n: number, itemId: string, planned: number, memo?: string): Entry =>
    ({ id: `${addPeriods(now, n)}:${itemId}`, periodId: addPeriods(now, n), itemId, planned, memo });
  const entries: Entry[] = [
    entry(1, 'item-6', 60000, '旅行'),
    entry(1, 'item-22', 0, '旅行の月'),
    entry(1, 'item-21', 16400, '旅行の月'),
    entry(2, 'item-22', 3500, '年払いの月'),
    entry(3, 'item-22', 0, '帰省の月'),
    entry(3, 'item-21', 6400, '帰省の月'),
    entry(6, 'item-22', 0, '冷蔵庫の買い替え'),
    entry(6, 'item-21', 6400, '冷蔵庫の買い替え'),
  ];

  const cardBills: CardBill[] = [];
  for (let i = 0; i <= 2; i++) {
    const pid = addPeriods(now, -i);
    cardBills.push({ id: `${pid}:card-a`, periodId: pid, cardId: 'card-a', actual: 27000 + i * 1200 });
    if (i > 0) cardBills.push({ id: `${pid}:card-b`, periodId: pid, cardId: 'card-b', actual: 3000 });
  }

  const receivables: Receivable[] = [
    { id: 'rcv-1', kind: 'reimbursement', title: '出張の交通費', amount: 18000, createdAt: new Date().toISOString(), expectedPeriod: now },
    { id: 'rcv-2', kind: 'split', title: '旅行の宿 割り勘', amount: 12000, createdAt: new Date().toISOString(), expectedPeriod: addPeriods(now, 1) },
  ];

  const checklistTemplates: ChecklistTemplate[] = [
    { id: 'chk-1', label: '引落口座の残高を確認', sortOrder: 0 },
    { id: 'chk-2', label: '立替・経費精算の入金を確認', sortOrder: 1 },
    { id: 'chk-3', label: 'バックアップを保存', sortOrder: 2 },
  ];

  return { settings, accounts, categories, items, entries, categoryActuals, cardBills, receivables, checklistTemplates, checklistDone: [] };
}
