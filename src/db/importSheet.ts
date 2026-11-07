import { comparePeriods } from '../domain/period';
import { splitDefault, type SheetImport } from '../domain/importSheet';
import { DEFAULT_SETTINGS, type Account, type CardBill, type Category, type Entry, type Item } from '../domain/types';
import { db, newId } from './db';

export interface ImportResult {
  categories: number;
  items: number;
  cards: number;
  monthlyOverrides: number;
  cardBills: number;
}

/**
 * スプレッドシートの読み込み結果を保存する。
 * replace: 口座・カテゴリ・項目・月ごとの予算・カード請求・実績を消してから入れる（立替とチェックリストは残す）
 * 追加のときは、同じ名前のカテゴリ・項目・カードに月ごとの予算を足す（いつもの金額は変えない）
 * カードの請求額は、今月より前の月だけ確定額として入れる（先の月はシート上の見込みのため）
 */
export async function applySheetImport(plan: SheetImport, opts: { replace: boolean; current: string }): Promise<ImportResult> {
  const result: ImportResult = { categories: 0, items: 0, cards: 0, monthlyOverrides: 0, cardBills: 0 };
  const firstPeriod = [...plan.periods].sort(comparePeriods)[0];

  await db.transaction('rw', [db.settings, db.accounts, db.categories, db.items, db.entries, db.cardBills, db.categoryActuals], async () => {
    if (opts.replace) {
      await Promise.all([db.accounts.clear(), db.categories.clear(), db.items.clear(), db.entries.clear(), db.cardBills.clear(), db.categoryActuals.clear()]);
      const s = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
      await db.settings.put({ ...s, periodStartDay: plan.startDay ?? s.periodStartDay });
    }
    const categories: Category[] = await db.categories.toArray();
    const items: Item[] = await db.items.toArray();
    const accounts: Account[] = await db.accounts.toArray();
    let catOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder + 1), 0);
    let itemOrder = items.reduce((m, i) => Math.max(m, i.sortOrder + 1), 0);
    let accOrder = accounts.reduce((m, a) => Math.max(m, a.sortOrder + 1), 0);
    const entries: Entry[] = [];
    const bills: CardBill[] = [];

    for (const ic of plan.categories) {
      let cat = categories.find((c) => c.name === ic.name && c.kind === ic.kind);
      if (!cat) {
        cat = { id: newId(), name: ic.name, kind: ic.kind, sortOrder: catOrder++, archived: false };
        categories.push(cat);
        await db.categories.add(cat);
        result.categories++;
      }
      for (const ii of ic.items) {
        let item = items.find((i) => i.categoryId === cat!.id && i.name === ii.name);
        const { defaultAmount, overrides } = splitDefault(ii.amounts, item?.defaultAmount);
        if (!item) {
          item = {
            id: newId(), name: ii.name, categoryId: cat.id, defaultAmount, day: ii.day,
            recurrence: { type: 'monthly' }, startPeriod: firstPeriod, sortOrder: itemOrder++, archived: false,
          };
          items.push(item);
          await db.items.add(item);
          result.items++;
        } else if (comparePeriods(firstPeriod, item.startPeriod) < 0) {
          await db.items.update(item.id, { startPeriod: firstPeriod });
        }
        for (const pid of plan.periods) {
          const id = `${pid}:${item.id}`;
          if (pid in overrides) entries.push({ id, periodId: pid, itemId: item.id, planned: overrides[pid] });
          else await db.entries.delete(id); // 取り込み直しでいつもの金額に戻った月
        }
      }
    }

    for (const ic of plan.cards) {
      let card = accounts.find((a) => a.kind === 'card' && a.name === ic.name);
      if (!card) {
        card = { id: newId(), name: ic.name, kind: 'card', withdrawDay: ic.withdrawDay, withdrawShift: 'after', billLagPeriods: 1, sortOrder: accOrder++, archived: false };
        accounts.push(card);
        await db.accounts.add(card);
        result.cards++;
      }
      for (const [pid, amount] of Object.entries(ic.bills)) {
        if (amount > 0 && comparePeriods(pid, opts.current) < 0) {
          bills.push({ id: `${pid}:${card.id}`, periodId: pid, cardId: card.id, actual: amount });
        }
      }
    }

    await db.entries.bulkPut(entries);
    await db.cardBills.bulkPut(bills);
    result.monthlyOverrides = entries.length;
    result.cardBills = bills.length;
  });
  return result;
}
