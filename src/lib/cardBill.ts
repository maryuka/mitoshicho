import type { CardBillRow } from '../domain/cashflow';
import { mdLabel } from '../domain/period';

/** 「11/26 引落・11/11 確定」のような短い説明 */
export function billDatesText(bill: CardBillRow): string {
  const parts: string[] = [];
  if (bill.withdrawDate) parts.push(`${mdLabel(bill.withdrawDate)} 引落`);
  if (bill.confirmDate) parts.push(`${mdLabel(bill.confirmDate)} 確定`);
  return parts.join('・');
}

export type BillStatus = 'entered' | 'confirmed' | 'waiting' | 'overdue';

export function billStatus(bill: CardBillRow, today = new Date()): BillStatus {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (bill.actual !== undefined) return 'entered';
  if (bill.withdrawDate && bill.withdrawDate < t) return 'overdue';
  if (!bill.confirmDate || bill.confirmDate <= t) return 'confirmed';
  return 'waiting';
}

export const BILL_STATUS: Record<BillStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  entered: { label: '入力済み', color: 'success' },
  confirmed: { label: '確定・未入力', color: 'warning' },
  waiting: { label: '確定待ち', color: 'default' },
  overdue: { label: '引落日を過ぎています', color: 'error' },
};
