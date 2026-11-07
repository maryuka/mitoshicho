import { describe, expect, it } from 'vitest';
import { itemOccurs } from './cashflow';
import { itemArchivePatch } from './items';
import type { Item } from './types';

const base: Item = {
  id: 'i', name: 'ローン', categoryId: 'c', defaultAmount: 1000, recurrence: { type: 'monthly' },
  startPeriod: '2026-01', sortOrder: 0, archived: false,
};

describe('itemArchivePatch', () => {
  it('終了月がなければ今月で止め、戻すと終了月なしに戻る', () => {
    const a = itemArchivePatch(base, true, '2026-10');
    expect(a).toEqual({ archived: true, endPeriod: '2026-10', endBeforeArchive: null });
    const archived = { ...base, ...a };
    expect(itemOccurs(archived, '2026-10')).toBe(true);
    expect(itemOccurs(archived, '2026-11')).toBe(false);
    expect(itemOccurs(archived, '2026-03')).toBe(true);
    expect(itemArchivePatch(archived, false, '2026-11')).toEqual({ archived: false, endPeriod: undefined, endBeforeArchive: undefined });
  });
  it('終了月が先なら今月にして、戻すと元の終了月になる', () => {
    const a = itemArchivePatch({ ...base, endPeriod: '2027-03' }, true, '2026-10');
    expect(a.endPeriod).toBe('2026-10');
    expect(itemArchivePatch({ ...base, ...a }, false, '2026-10').endPeriod).toBe('2027-03');
  });
  it('もう終わっている項目は終了月を変えない', () => {
    const a = itemArchivePatch({ ...base, endPeriod: '2026-05' }, true, '2026-10');
    expect(a).toEqual({ archived: true, endBeforeArchive: undefined });
    expect(itemArchivePatch({ ...base, endPeriod: '2026-05', ...a }, false, '2026-10')).toEqual({ archived: false });
  });
});
