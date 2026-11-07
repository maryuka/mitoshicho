import { describe, expect, it } from 'vitest';
import { checklistOccurs } from './cashflow';
import type { ChecklistTemplate } from './types';

const t: ChecklistTemplate = { id: 'c', label: '送金', sortOrder: 0 };

describe('checklistOccurs', () => {
  it('繰り返しのない以前のデータは毎月', () => {
    expect(checklistOccurs(t, '2026-11')).toBe(true);
  });
  it('今月だけ', () => {
    const once = { ...t, recurrence: { type: 'once' as const, periodId: '2026-11' }, startPeriod: '2026-11', endPeriod: '2026-11' };
    expect(checklistOccurs(once, '2026-11')).toBe(true);
    expect(checklistOccurs(once, '2026-12')).toBe(false);
  });
  it('数か月に1回・毎年・終了月', () => {
    const every2 = { ...t, recurrence: { type: 'interval' as const, months: 2 }, startPeriod: '2026-11' };
    expect(['2026-10', '2026-11', '2026-12', '2027-01'].map((p) => checklistOccurs(every2, p))).toEqual([false, true, false, true]);
    const yearly = { ...t, recurrence: { type: 'yearly' as const, month: 3 } };
    expect(checklistOccurs(yearly, '2027-03')).toBe(true);
    expect(checklistOccurs(yearly, '2027-04')).toBe(false);
    expect(checklistOccurs({ ...t, endPeriod: '2026-12' }, '2027-01')).toBe(false);
  });
});
