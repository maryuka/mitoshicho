// 給料日のチェックの進み具合（純粋関数）
import { checklistOccurs, summarize } from './cashflow';
import type { AppData } from './types';

/** 給料日のやること（収入の入力、立替の回収、振り分けとチェックリストのチェック）の数と、終わった数 */
export function paydayProgress(data: AppData, period: string, current = period): { total: number; done: number } {
  const s = summarize(data, period, current);
  const done = new Set(data.checklistDone.filter((c) => c.periodId === period).map((c) => c.key));
  const tasks = [
    ...s.categories.filter((c) => c.kind === 'income').map((c) => c.actual !== undefined),
    ...data.receivables.filter((r) => r.expectedPeriod === period).map((r) => !!r.receivedAt),
    ...s.allocation.map((a) => done.has(`alloc:${a.account.id}`)),
    ...data.checklistTemplates.filter((t) => checklistOccurs(t, period)).map((t) => done.has(t.id)),
  ];
  return { total: tasks.length, done: tasks.filter(Boolean).length };
}
