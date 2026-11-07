import { describe, expect, it } from 'vitest';
import { amountFor, itemOccurs } from './cashflow';
import { countBetween, endAfterCount, itemArchivePatch } from './items';
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

describe('回数で終わる', () => {
  it('毎月 12 回なら 11 か月後が最終回', () => {
    expect(endAfterCount(base, 12)).toBe('2026-12');
    expect(countBetween(base, '2026-12')).toBe(12);
    expect(countBetween(base, '2026-12', '2026-10')).toBe(3);
  });
  it('毎年は指定の月だけ数える', () => {
    const y = { ...base, recurrence: { type: 'yearly' as const, month: 3 } };
    expect(endAfterCount(y, 2)).toBe('2027-03');
    expect(countBetween(y, '2027-03')).toBe(2);
  });
  it('0 回や小数は決められない', () => {
    expect(endAfterCount(base, 0)).toBeUndefined();
    expect(endAfterCount(base, 1.5)).toBeUndefined();
  });
});

describe('途中からの金額の変更', () => {
  it('変更の月から新しい金額になる', () => {
    const i = { ...base, amountChanges: [{ from: '2026-04', amount: 1200 }, { from: '2027-04', amount: 1500 }] };
    expect(amountFor(i, '2026-03')).toBe(1000);
    expect(amountFor(i, '2026-04')).toBe(1200);
    expect(amountFor(i, '2027-03')).toBe(1200);
    expect(amountFor(i, '2027-05')).toBe(1500);
  });
});

describe('◯か月に1回', () => {
  it('開始月から数えて n か月ごと', () => {
    const i = { ...base, startPeriod: '2026-11', recurrence: { type: 'interval' as const, months: 3 } };
    expect(['2026-11', '2026-12', '2027-01', '2027-02', '2027-05'].map((p) => itemOccurs(i, p))).toEqual([true, false, false, true, true]);
    expect(endAfterCount(i, 3)).toBe('2027-05');
  });
});
