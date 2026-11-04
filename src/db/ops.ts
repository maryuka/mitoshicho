import { categoryActualId, entryId } from '../domain/cashflow';
import { db } from './db';

/** Entry（期ごとの予算上書き）を部分更新する。空になれば削除 */
export async function patchEntry(
  periodId: string, itemId: string, patch: { planned?: number | null; memo?: string },
): Promise<void> {
  const id = entryId(periodId, itemId);
  const cur = await db.entries.get(id);
  const next = { id, periodId, itemId, ...cur };
  if ('planned' in patch) next.planned = patch.planned ?? undefined;
  if ('memo' in patch) next.memo = patch.memo?.trim() || undefined;
  if (next.planned === undefined && !next.memo) await db.entries.delete(id);
  else await db.entries.put(next);
}

/** カテゴリの実績合計を入れる。undefined なら消す */
export async function setCategoryActual(periodId: string, categoryId: string, amount: number | undefined): Promise<void> {
  const id = categoryActualId(periodId, categoryId);
  if (amount === undefined) await db.categoryActuals.delete(id);
  else await db.categoryActuals.put({ id, periodId, categoryId, amount });
}

export interface CardBillPatch {
  actual?: number;
  withdrawDate?: string;
  confirmDate?: string;
  memo?: string;
}

/** カード請求を部分更新する。指定したキーだけ書き換え、すべて空なら削除 */
export async function saveCardBill(periodId: string, cardId: string, patch: CardBillPatch): Promise<void> {
  const id = `${periodId}:${cardId}`;
  const cur = await db.cardBills.get(id);
  const next = { id, periodId, cardId, ...cur, ...patch };
  if (next.memo !== undefined && !next.memo.trim()) next.memo = undefined;
  if (!next.withdrawDate) next.withdrawDate = undefined;
  if (!next.confirmDate) next.confirmDate = undefined;
  if (next.actual === undefined && !next.withdrawDate && !next.confirmDate && !next.memo) {
    await db.cardBills.delete(id);
    return;
  }
  await db.cardBills.put(next);
}

export async function toggleCheck(periodId: string, key: string, done: boolean): Promise<void> {
  const id = `${periodId}:${key}`;
  if (done) await db.checklistDone.put({ id, periodId, key, doneAt: new Date().toISOString() });
  else await db.checklistDone.delete(id);
}
