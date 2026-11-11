import { describe, expect, it } from 'vitest';
import { driftHints, isNotable, missingActuals, monthDrifts, reviewStatus } from './review';
import { DEFAULT_SETTINGS, type AppData, type CategoryActual } from './types';

function data(actuals: CategoryActual[]): AppData {
  const cat = (id: string, kind: 'income' | 'expense') => ({ id, name: id, kind, sortOrder: 0, archived: false });
  const item = (id: string, categoryId: string, defaultAmount: number) =>
    ({ id, name: id, categoryId, defaultAmount, recurrence: { type: 'monthly' as const }, startPeriod: '2026-01', sortOrder: 0, archived: false });
  return {
    // 細かいずれも見たいので 1,000円にしておく（既定は 5,000円）
    settings: { ...DEFAULT_SETTINGS, driftMinYen: 1000 }, accounts: [],
    categories: [cat('給与', 'income'), cat('食費', 'expense'), cat('趣味', 'expense'), cat('日用品', 'expense')],
    items: [item('a', '給与', 300000), item('b', '食費', 20000), item('c', '趣味', 30000), item('d', '日用品', 3000)],
    entries: [], categoryActuals: actuals, cardBills: [], receivables: [], checklistTemplates: [], checklistDone: [],
  };
}
const act = (pid: string, categoryId: string, amount: number, extra: Partial<CategoryActual> = {}): CategoryActual =>
  ({ id: `${pid}:${categoryId}`, periodId: pid, categoryId, amount, ...extra });

describe('review', () => {
  it('細かいずれは出さない（既定は5,000円以上）', () => {
    expect(isNotable(4999)).toBe(false);
    expect(isNotable(5000)).toBe(true);
    expect(isNotable(-5000)).toBe(true);
    expect(isNotable(0, 0)).toBe(false);
  });

  it('ずれの大きさは設定で変えられる', () => {
    expect(isNotable(600, 500)).toBe(true);
    expect(isNotable(2500, 3000)).toBe(false);
    const d = data([act('2026-05', '食費', 20600), act('2026-05', '趣味', 41000)]);
    expect(monthDrifts(d, '2026-05').map((x) => x.category.id)).toEqual(['趣味']);
    d.settings = { ...d.settings, driftMinYen: 500 };
    expect(monthDrifts(d, '2026-05').map((x) => x.category.id)).toEqual(['趣味', '食費']);
    d.settings = { ...d.settings, driftMinYen: 20000 };
    expect(monthDrifts(d, '2026-05')).toEqual([]);
    // 設定がなければ 5,000円
    d.settings = { ...d.settings, driftMinYen: undefined };
    expect(monthDrifts(d, '2026-05').map((x) => x.category.id)).toEqual(['趣味']);
  });

  it('その月の目立つずれを、大きい順に出す', () => {
    const d = data([act('2026-05', '食費', 24900, { driftKind: 'casual' }), act('2026-05', '趣味', 41000, { memo: 'ライブ' }), act('2026-05', '日用品', 3100)]);
    const r = monthDrifts(d, '2026-05');
    expect(r.map((x) => [x.category.id, x.diff, x.kind, x.memo])).toEqual([['趣味', 11000, undefined, 'ライブ'], ['食費', 4900, 'casual', undefined]]);
    expect(missingActuals(d, '2026-05')).toBe(0);
    expect(missingActuals(d, '2026-06')).toBe(3);
  });

  it('同じ向きのずれが2回以上続いたら、種類に合わせたヒントを出す', () => {
    const d = data([
      act('2026-05', '趣味', 41000, { driftKind: 'ok' }), act('2026-04', '趣味', 36000, { driftKind: 'ok' }),
      act('2026-05', '食費', 24900, { driftKind: 'casual' }), act('2026-03', '食費', 23000),
      act('2026-04', '日用品', 1500), act('2026-03', '日用品', 1800),
    ]);
    const h = driftHints(d, '2026-06');
    expect(h.map((x) => [x.category.id, x.direction, x.count, x.kind])).toEqual([
      ['趣味', 'over', 2, 'ok'], ['食費', 'over', 2, 'casual'], ['日用品', 'under', 2, undefined],
    ]);
    expect(h[0].text).toContain('計画を増やしてもいいかも');
    expect(h[1].text).toContain('見直してみよう');
    expect(h[2].text).toContain('ほかに回せるかも');
  });

  it('入力して、目立つオーバーに種類を付けたら、ふりかえり完了', () => {
    expect(reviewStatus(data([]), '2026-05')).toEqual({ started: false, missing: 3, untagged: 0, closed: false, done: false });
    const entered = data([act('2026-05', '食費', 24900), act('2026-05', '趣味', 30000), act('2026-05', '日用品', 3000)]);
    expect(reviewStatus(entered, '2026-05')).toEqual({ started: true, missing: 0, untagged: 1, closed: false, done: false });
    const tagged = data([act('2026-05', '食費', 24900, { driftKind: 'ok' }), act('2026-05', '趣味', 30000), act('2026-05', '日用品', 3000)]);
    expect(reviewStatus(tagged, '2026-05').done).toBe(true);
    // 理由を付けなくても、完了を押せば完了
    entered.checklistDone.push({ id: '2026-05:review', periodId: '2026-05', key: 'review', doneAt: '2026-06-01' });
    expect(reviewStatus(entered, '2026-05')).toMatchObject({ closed: true, done: true });
  });
});
