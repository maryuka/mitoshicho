import { describe, expect, it } from 'vitest';
import { cardBillRows, cardTodos, summarize, itemOccurs } from './cashflow';
import { addPeriods, dateInPeriod, lastDayBefore, periodLabel, periodOf, periodStart, periodYearLabel } from './period';
import { DEFAULT_SETTINGS, type AppData, type Item } from './types';

function item(p: Partial<Item> & Pick<Item, 'id' | 'categoryId' | 'defaultAmount'>): Item {
  return {
    name: p.id,
    recurrence: { type: 'monthly' },
    startPeriod: '2026-01',
    sortOrder: 0,
    archived: false,
    ...p,
  };
}

function baseData(): AppData {
  return {
    settings: DEFAULT_SETTINGS,
    accounts: [
      { id: 'bank', name: '銀行', kind: 'bank', sortOrder: 0, archived: false },
      { id: 'sub', name: 'サブ', kind: 'bank', sortOrder: 1, archived: false },
      { id: 'card', name: 'カード', kind: 'card', withdrawDay: 26, withdrawAccountId: 'sub', sortOrder: 2, archived: false },
    ],
    categories: [
      { id: 'inc', name: '給与', kind: 'income', sortOrder: 0, archived: false },
      { id: 'exp', name: '生活', kind: 'expense', sortOrder: 1, archived: false },
    ],
    items: [
      item({ id: 'salary', categoryId: 'inc', defaultAmount: 300000, day: 15, sourceAccountId: 'bank' }),
      item({ id: 'rent', categoryId: 'exp', defaultAmount: 100000, day: 27, sourceAccountId: 'bank' }),
      item({ id: 'phone', categoryId: 'exp', defaultAmount: 5000, sourceAccountId: 'card' }),
      item({ id: 'fee', categoryId: 'exp', defaultAmount: 6000, sourceAccountId: 'card', recurrence: { type: 'yearly', month: 3 } }),
    ],
    entries: [],
    categoryActuals: [],
    cardBills: [],
    receivables: [],
    checklistTemplates: [],
    checklistDone: [],
  };
}

function actual(periodId: string, categoryId: string, amount: number) {
  return { id: `${periodId}:${categoryId}`, periodId, categoryId, amount };
}

describe('カードの引落日のずらし方', () => {
  // 2026/4/26 は日曜。確定日はずらす前の引落日を基準にする
  const withShift = (shift?: 'before' | 'none' | 'after') => {
    const d = baseData();
    d.accounts = d.accounts.map((a) => (a.id === 'card' ? { ...a, withdrawShift: shift, confirmDay: 26 } : a));
    return cardBillRows(d, '2026-04')[0];
  };
  it('ずらし方に合わせて引落日が変わる', () => {
    expect(withShift().withdrawDate).toEqual(new Date(2026, 3, 26));
    expect(withShift('none').withdrawDate).toEqual(new Date(2026, 3, 26));
    expect(withShift('after').withdrawDate).toEqual(new Date(2026, 3, 27));
    expect(withShift('before').withdrawDate).toEqual(new Date(2026, 3, 24));
  });
  it('確定日はずらす前の引落日から決まる', () => {
    expect(withShift('after').confirmDate).toEqual(new Date(2026, 2, 26));
    expect(withShift('before').confirmDate).toEqual(new Date(2026, 2, 26));
  });
});

describe('この月だけの項目', () => {
  it('その月の予算にだけ入る', () => {
    const d = baseData();
    d.items.push(item({
      id: 'gift', categoryId: 'exp', defaultAmount: 7000, sourceAccountId: 'bank',
      recurrence: { type: 'once', periodId: '2026-04' }, startPeriod: '2026-04', endPeriod: '2026-04',
    }));
    const exp = (pid: string) => summarize(d, pid).categories.find((c) => c.category.id === 'exp')!.planned;
    expect(exp('2026-04') - exp('2026-05')).toBe(7000);
  });
});

describe('period', () => {
  it('15日始まりの期を判定する', () => {
    expect(periodOf(new Date(2026, 10, 4), 15)).toBe('2026-10');
    expect(periodOf(new Date(2026, 10, 15), 15)).toBe('2026-11');
    expect(periodLabel('2026-12', 15)).toBe('12/15〜1/14');
    expect(addPeriods('2026-12', 1)).toBe('2027-01');
    expect(addPeriods('2026-01', -1)).toBe('2025-12');
  });
  it('期内の日付は開始日より前なら翌月になる', () => {
    expect(dateInPeriod('2026-10', 15, 26)).toEqual(new Date(2026, 9, 26));
    expect(dateInPeriod('2026-10', 15, 10)).toEqual(new Date(2026, 10, 10));
  });
  it('給料日が土日のときのずらし方を選べる', () => {
    // 2026/11/15 は日曜
    const before = { day: 15, shift: 'before' as const };
    const none = { day: 15, shift: 'none' as const };
    const after = { day: 15, shift: 'after' as const };
    expect(periodStart('2026-11', before)).toEqual(new Date(2026, 10, 13));
    expect(periodStart('2026-11', none)).toEqual(new Date(2026, 10, 15));
    expect(periodStart('2026-11', after)).toEqual(new Date(2026, 10, 16));
    expect(periodLabel('2026-10', after)).toBe('10/15〜11/15');
    expect(periodOf(new Date(2026, 10, 15), after)).toBe('2026-10');
    expect(periodOf(new Date(2026, 10, 16), after)).toBe('2026-11');
    expect(periodOf(new Date(2026, 10, 14), before)).toBe('2026-11');
    // 数だけのときは今までどおり前にずらす
    expect(periodStart('2026-11', 15)).toEqual(new Date(2026, 10, 13));
  });
  it('月末の給料日を後ろにずらすと翌月に入る', () => {
    // 2026/1/31 は土曜 → 2/2（月）
    const after = { day: 31, shift: 'after' as const };
    expect(periodStart('2026-01', after)).toEqual(new Date(2026, 1, 2));
    expect(periodOf(new Date(2026, 1, 1), after)).toBe('2025-12');
    expect(periodOf(new Date(2026, 1, 2), after)).toBe('2026-01');
  });
});

describe('itemOccurs', () => {
  it('年1回の項目は指定月の期だけ', () => {
    const fee = baseData().items[3];
    expect(itemOccurs(fee, '2026-03')).toBe(true);
    expect(itemOccurs(fee, '2026-04')).toBe(false);
  });
  it('終了期より後は発生しない', () => {
    const it = item({ id: 'x', categoryId: 'exp', defaultAmount: 1, endPeriod: '2026-05' });
    expect(itemOccurs(it, '2026-05')).toBe(true);
    expect(itemOccurs(it, '2026-06')).toBe(false);
  });
});

describe('summarize', () => {
  it('カード払いは当期の現金支出に入れず、翌期の請求予測に入れる（二重計上しない）', () => {
    const s = summarize(baseData(), '2026-03');
    expect(s.spendTotal).toBe(111000);
    expect(s.cardPaidTotal).toBe(11000);
    expect(s.directOutTotal).toBe(100000);
    // 2月分のカード払い（phone 5000）が3月期に請求される
    expect(s.cardBills[0].forecast).toBe(5000);
    expect(s.buffer).toBe(300000 - 100000 - 5000);

    const next = summarize(baseData(), '2026-04');
    expect(next.cardBills[0].forecast).toBe(11000); // phone + 年会費
  });

  it('実績があれば予定より優先し、カード請求の差額を出す', () => {
    const d = baseData();
    d.categoryActuals.push(actual('2026-03', 'inc', 310000));
    d.cardBills.push({ id: '2026-03:card', periodId: '2026-03', cardId: 'card', actual: 8000 });
    const s = summarize(d, '2026-03');
    expect(s.incomeTotal).toBe(310000);
    expect(s.cardBills[0].diff).toBe(3000);
    expect(s.buffer).toBe(310000 - 100000 - 8000);
    expect(s.unconfirmedCardBills).toBe(0);
  });

  it('立替回収は予定の期のバッファに加算する', () => {
    const d = baseData();
    d.receivables.push({ id: 'r', kind: 'split', title: '割り勘', amount: 4000, createdAt: '', expectedPeriod: '2026-03' });
    expect(summarize(d, '2026-03').buffer).toBe(300000 - 100000 - 5000 + 4000);
  });

  it('振り分けは口座払いとカード引落を口座ごとに集計する', () => {
    const s = summarize(baseData(), '2026-03');
    const byId = Object.fromEntries(s.allocation.map((a) => [a.account.id, a.amount]));
    expect(byId).toEqual({ bank: 100000, sub: 5000 });
  });

  it('タイムラインは日付順で、カード払い項目そのものは出さない', () => {
    const s = summarize(baseData(), '2026-03');
    expect(s.timeline.map((e) => e.label)).toEqual(['salary', 'カード 引落', 'rent']);
  });
});

describe('カードの確定日', () => {
  it('確定日は引落日より前の直近のその日', () => {
    expect(lastDayBefore(new Date(2026, 10, 26), 11)).toEqual(new Date(2026, 10, 11));
    expect(lastDayBefore(new Date(2026, 10, 10), 25)).toEqual(new Date(2026, 9, 25));
    expect(lastDayBefore(new Date(2026, 0, 10), 31)).toEqual(new Date(2025, 11, 31));
  });

  function withConfirm(): AppData {
    const d = baseData();
    d.accounts[2] = { ...d.accounts[2], confirmDay: 11 }; // 26日引落・11日確定
    return d;
  }

  it('確定日の前はやることに出ず、確定日を過ぎたら出る', () => {
    const d = withConfirm();
    // 2026-03 期（3/15〜4/14）の引落は 3/26、確定は 3/11
    // 2026-02 期の請求（2/26 引落）は 2/11 に確定する
    expect(cardTodos(d, new Date(2026, 1, 10), '2026-01').map((t) => t.periodId)).toEqual([]);
    const todos = cardTodos(d, new Date(2026, 1, 11), '2026-01');
    expect(todos.map((t) => t.periodId)).toEqual(['2026-02']);
    expect(todos[0].overdue).toBe(false);
  });

  it('金額を入れるとやることから消え、引落日を過ぎて未入力なら期限切れ', () => {
    const d = withConfirm();
    d.cardBills.push({ id: '2026-02:card', periodId: '2026-02', cardId: 'card', actual: 5000 });
    expect(cardTodos(d, new Date(2026, 2, 27), '2026-03')[0].overdue).toBe(true);
    d.cardBills.push({ id: '2026-03:card', periodId: '2026-03', cardId: 'card', actual: 5000 });
    expect(cardTodos(d, new Date(2026, 2, 27), '2026-03').map((t) => t.periodId)).toEqual([]);
  });

  it('個別に入れた引落日・確定日を優先する', () => {
    const d = withConfirm();
    d.cardBills.push({ id: '2026-02:card', periodId: '2026-02', cardId: 'card', actual: 5000 });
    d.cardBills.push({ id: '2026-03:card', periodId: '2026-03', cardId: 'card', withdrawDate: '2026-03-27', confirmDate: '2026-03-20' });
    const bill = summarize(d, '2026-03').cardBills[0];
    expect(bill.withdrawDate).toEqual(new Date(2026, 2, 27));
    expect(bill.confirmDate).toEqual(new Date(2026, 2, 20));
    expect(cardTodos(d, new Date(2026, 2, 15), '2026-03')).toEqual([]);
  });
});

describe('カテゴリの実績', () => {
  const cat = (d: AppData, pid: string, current?: string) =>
    summarize(d, pid, current).categories.find((c) => c.category.id === 'exp')!;

  it('予算は項目の合計、実績は入力したカテゴリ合計', () => {
    const d = baseData();
    d.categoryActuals.push(actual('2026-03', 'exp', 98000));
    const c = cat(d, '2026-03', '2026-04');
    expect(c.planned).toBe(111000); // rent + phone + 年会費
    expect(c.actual).toBe(98000);
  });

  it('過去の期は実績をそのまま使う', () => {
    const d = baseData();
    d.categoryActuals.push(actual('2026-03', 'exp', 98000));
    const s = summarize(d, '2026-03', '2026-04');
    expect(s.spendTotal).toBe(98000);
    // カード払い 11000 は請求側で数えるので、口座から出るのは残り
    expect(s.directOutTotal).toBe(87000);
  });

  it('今期の支出は 予算と実績の大きい方 を見込む', () => {
    const d = baseData();
    d.categoryActuals.push(actual('2026-03', 'exp', 30000));
    expect(cat(d, '2026-03').effective).toBe(111000);
    d.categoryActuals[0] = actual('2026-03', 'exp', 130000);
    expect(cat(d, '2026-03').effective).toBe(130000);
  });

  it('収入は実績があれば実績', () => {
    const d = baseData();
    d.categoryActuals.push(actual('2026-03', 'inc', 280000));
    expect(summarize(d, '2026-03').incomeTotal).toBe(280000);
  });
});
describe('periodYearLabel', () => {
  it('年を入れて表示する', () => {
    expect(periodYearLabel('2026-10', 15)).toBe('2026/10/15〜11/12'); // 11/15 は日曜なので次の期は 11/13 から
    expect(periodYearLabel('2026-12', 15)).toBe('2026/12/15〜2027/1/14');
    expect(periodYearLabel('2026-10', 1)).toBe('2026年10月');
  });
});
