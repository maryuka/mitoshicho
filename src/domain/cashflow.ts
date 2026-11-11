// 期ごとの集計。スプシの SUM 手書きをすべてここで置き換える（純粋関数）。
import { shiftBusinessDay } from './holidays';
import { addPeriods, comparePeriods, dateInPeriod, lastDayBefore, parseISODate, parsePeriod, periodRule } from './period';
import type { Account, AppData, Category, CategoryActual, CategoryKind, ChecklistTemplate, Entry, Item, Settings } from './types';

/** その月のいつもの金額（途中からの金額の変更を反映。月ごとの上書きは含まない） */
export function amountFor(item: Item, pid: string): number {
  let amount = item.defaultAmount;
  for (const c of item.amountChanges ?? []) if (comparePeriods(c.from, pid) <= 0) amount = c.amount;
  return amount;
}

export function itemOccurs(item: Item, pid: string): boolean {
  if (comparePeriods(pid, item.startPeriod) < 0) return false;
  if (item.endPeriod && comparePeriods(pid, item.endPeriod) > 0) return false;
  const r = item.recurrence;
  switch (r.type) {
    case 'monthly':
      return true;
    case 'interval': {
      const a = parsePeriod(item.startPeriod);
      const b = parsePeriod(pid);
      return ((b.year - a.year) * 12 + (b.month - a.month)) % Math.max(1, r.months) === 0;
    }
    case 'yearly':
      return parsePeriod(pid).month === r.month;
    case 'once':
      return r.periodId === pid;
  }
}

/** その月の給料日のチェックリストに出すか */
export function checklistOccurs(t: ChecklistTemplate, pid: string): boolean {
  if (t.startPeriod && comparePeriods(pid, t.startPeriod) < 0) return false;
  if (t.endPeriod && comparePeriods(pid, t.endPeriod) > 0) return false;
  const r = t.recurrence ?? { type: 'monthly' };
  if (r.type === 'interval' && !t.startPeriod) return true;
  return itemOccurs({ recurrence: r, startPeriod: t.startPeriod ?? pid } as Item, pid);
}

export interface ItemRow {
  item: Item;
  category: Category;
  kind: CategoryKind;
  /** 予算（上書き or テンプレート）。発生しない期は undefined */
  planned?: number;
  /** 計算に使う額（= 予算）。実績はカテゴリ単位で持つ */
  effective: number;
  memo?: string;
  hasOverride: boolean;
  source?: Account;
  viaCard: boolean;
}

export interface CategoryRow {
  category: Category;
  kind: CategoryKind;
  items: ItemRow[];
  /** 項目の予算の合計 */
  planned: number;
  /** 振り返りで入力した実績合計 */
  actual?: number;
  /**
   * 計算に使う額。
   * 収入・過去の期: 実績 ?? 予算。今期以降の支出: max(実績, 予算)（残りの予算も出ていく前提）
   */
  effective: number;
  /** うちカード払い（予算ベース） */
  cardPaid: number;
  /** 口座から直接出ていく額 = effective − カード払い */
  direct: number;
  memo?: string;
}

export interface CardBillRow {
  card: Account;
  forecast: number;
  actual?: number;
  effective: number;
  /** 実績 − 予測（実績がある場合） */
  diff?: number;
  /** 予測の内訳（前期のカード払い項目） */
  forecastBreakdown: { label: string; amount: number }[];
  /** 引落日（個別入力 > カードの引落日） */
  withdrawDate?: Date;
  /** 請求確定日（個別入力 > カードの確定日から算出） */
  confirmDate?: Date;
}

export interface AllocationRow {
  account: Account;
  amount: number;
  breakdown: { label: string; amount: number }[];
}

export interface TimelineEvent {
  date: Date;
  label: string;
  amount: number; // 入金は +、出金は −
  confirmed: boolean;
  /** 出入りする口座の名前 */
  account?: string;
  /** カードの引落 */
  card?: boolean;
}

export interface PeriodSummary {
  periodId: string;
  rows: ItemRow[];
  categories: CategoryRow[];
  incomeTotal: number;
  /** 収入以外の項目の合計（カード払い含む、使う予定の総額） */
  spendTotal: number;
  /** うちカード払い（この期は現金で出ていかない） */
  cardPaidTotal: number;
  /** 口座から直接出ていく項目の合計 */
  directOutTotal: number;
  /** directOutTotal のうち、貯金・投資カテゴリの分（ホームで分けて見せる） */
  savingDirectTotal: number;
  cardBills: CardBillRow[];
  cardBillTotal: number;
  receivableTotal: number;
  /** 現金での出金合計 = 口座払い + カード請求 */
  cashOutTotal: number;
  buffer: number;
  allocation: AllocationRow[];
  timeline: TimelineEvent[];
  unconfirmedCardBills: number;
}

const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export interface Index {
  accounts: Map<string, Account>;
  categories: Map<string, Category>;
  entries: Map<string, Entry>;
  actuals: Map<string, CategoryActual>;
}

export function buildIndex(data: AppData): Index {
  return {
    accounts: new Map(data.accounts.map((a) => [a.id, a])),
    categories: new Map(data.categories.map((c) => [c.id, c])),
    entries: new Map(data.entries.map((e) => [e.id, e])),
    actuals: new Map(data.categoryActuals.map((a) => [a.id, a])),
  };
}

export function entryId(pid: string, itemId: string): string {
  return `${pid}:${itemId}`;
}

export function itemRows(data: AppData, pid: string, idx = buildIndex(data)): ItemRow[] {
  const rows: ItemRow[] = [];
  for (const item of [...data.items].sort(byOrder)) {
    const category = idx.categories.get(item.categoryId);
    if (!category) continue;
    const entry = idx.entries.get(entryId(pid, item.id));
    const planned = entry?.planned ?? (itemOccurs(item, pid) ? amountFor(item, pid) : undefined);
    if (planned === undefined && !entry) continue;
    const source = item.sourceAccountId ? idx.accounts.get(item.sourceAccountId) : undefined;
    rows.push({
      item,
      category,
      kind: category.kind,
      planned,
      effective: planned ?? 0,
      memo: entry?.memo,
      hasOverride: !!entry,
      source,
      viaCard: category.kind !== 'income' && source?.kind === 'card',
    });
  }
  return rows;
}

/** current: 今の期。これより前の期は実績だけで計算する（既定は pid 自身） */
export function categoryRows(data: AppData, pid: string, rows: ItemRow[], idx = buildIndex(data), current = pid): CategoryRow[] {
  const past = comparePeriods(pid, current) < 0;
  const result: CategoryRow[] = [];
  for (const category of [...data.categories].sort(byOrder)) {
    const items = rows.filter((r) => r.category.id === category.id);
    const actualRec = idx.actuals.get(categoryActualId(pid, category.id));
    if (items.length === 0 && !actualRec) continue;
    const planned = items.reduce((s, r) => s + (r.planned ?? 0), 0);
    const actual = actualRec?.amount;
    const effective = category.kind === 'income' || past
      ? actual ?? planned
      : Math.max(actual ?? 0, planned);
    const cardPaid = items.filter((r) => r.viaCard).reduce((s, r) => s + r.effective, 0);
    result.push({
      category, kind: category.kind, items, planned, actual, effective,
      cardPaid, direct: Math.max(0, effective - cardPaid), memo: actualRec?.memo,
    });
  }
  return result;
}

export function categoryActualId(pid: string, categoryId: string): string {
  return `${pid}:${categoryId}`;
}

export function cardBillRows(data: AppData, pid: string, idx = buildIndex(data)): CardBillRow[] {
  const cards = data.accounts.filter((a) => a.kind === 'card').sort(byOrder);
  const prevRows = new Map<number, ItemRow[]>();
  const rowsFor = (lag: number) => {
    if (!prevRows.has(lag)) prevRows.set(lag, itemRows(data, addPeriods(pid, -lag), idx));
    return prevRows.get(lag)!;
  };
  const result: CardBillRow[] = [];
  for (const card of cards) {
    const lag = card.billLagPeriods ?? 1;
    const charged = rowsFor(lag).filter((r) => r.viaCard && r.source?.id === card.id && r.effective !== 0);
    const forecast = charged.reduce((s, r) => s + r.effective, 0);
    const bill = data.cardBills.find((b) => b.periodId === pid && b.cardId === card.id);
    const actual = bill?.actual;
    if (card.archived && forecast === 0 && actual === undefined) continue;
    // 予定どおりの引落日。確定日はこれを基準にし、引落日だけを土日・祝日でずらす
    const nominalWithdraw = card.withdrawDay !== undefined ? dateInPeriod(pid, periodRule(data.settings), card.withdrawDay) : undefined;
    const withdrawDate = bill?.withdrawDate ? parseISODate(bill.withdrawDate)
      : nominalWithdraw && shiftBusinessDay(nominalWithdraw, card.withdrawShift ?? 'none');
    const confirmBase = bill?.withdrawDate ? withdrawDate : nominalWithdraw;
    const confirmDate = bill?.confirmDate ? parseISODate(bill.confirmDate)
      : confirmBase && card.confirmDay !== undefined ? lastDayBefore(confirmBase, card.confirmDay) : undefined;
    result.push({
      withdrawDate,
      confirmDate,
      card,
      forecast,
      actual,
      effective: actual ?? forecast,
      diff: actual !== undefined ? actual - forecast : undefined,
      forecastBreakdown: charged.map((r) => ({ label: r.item.name, amount: r.effective })),
    });
  }
  return result;
}

export function summarize(data: AppData, pid: string, current = pid): PeriodSummary {
  const idx = buildIndex(data);
  const startDay = periodRule(data.settings);
  const rows = itemRows(data, pid, idx);
  const categories = categoryRows(data, pid, rows, idx, current);
  const cardBills = cardBillRows(data, pid, idx);

  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const incomeTotal = sum(categories.filter((c) => c.kind === 'income').map((c) => c.effective));
  const outCats = categories.filter((c) => c.kind !== 'income');
  const outRows = rows.filter((r) => r.kind !== 'income');
  const spendTotal = sum(outCats.map((c) => c.effective));
  const cardPaidTotal = sum(outCats.map((c) => c.cardPaid));
  const directOutTotal = sum(outCats.map((c) => c.direct));
  const savingDirectTotal = sum(outCats.filter((c) => c.kind === 'saving').map((c) => c.direct));
  const cardBillTotal = sum(cardBills.map((b) => b.effective));
  const receivableTotal = sum(
    data.receivables.filter((r) => r.expectedPeriod === pid).map((r) => r.amount),
  );
  const cashOutTotal = directOutTotal + cardBillTotal;
  const buffer = incomeTotal - cashOutTotal + receivableTotal;

  // 振り分け: 口座ごとに出ていく額（口座払いの項目 + カードの引落）
  const alloc = new Map<string, AllocationRow>();
  const addAlloc = (accountId: string | undefined, label: string, amount: number) => {
    if (!accountId || amount === 0) return;
    const account = idx.accounts.get(accountId);
    if (!account || account.kind !== 'bank') return;
    const row = alloc.get(accountId) ?? { account, amount: 0, breakdown: [] };
    row.amount += amount;
    row.breakdown.push({ label, amount });
    alloc.set(accountId, row);
  };
  for (const r of outRows) if (!r.viaCard) addAlloc(r.item.sourceAccountId, r.item.name, r.effective);
  for (const b of cardBills) addAlloc(b.card.withdrawAccountId, `${b.card.name} 引落`, b.effective);
  const allocation = [...alloc.values()].sort((a, b) => a.account.sortOrder - b.account.sortOrder);

  // タイムライン
  const timeline: TimelineEvent[] = [];
  for (const r of rows) {
    if (r.viaCard || r.effective === 0 || r.item.day === undefined) continue;
    timeline.push({
      date: dateInPeriod(pid, startDay, r.item.day),
      label: r.item.name,
      amount: r.kind === 'income' ? r.effective : -r.effective,
      confirmed: r.kind === 'income' && idx.actuals.has(categoryActualId(pid, r.category.id)),
      account: r.source?.name,
    });
  }
  for (const b of cardBills) {
    if (b.effective === 0 || !b.withdrawDate) continue;
    timeline.push({
      date: b.withdrawDate,
      label: `${b.card.name} 引落`,
      amount: -b.effective,
      confirmed: b.actual !== undefined,
      account: b.card.withdrawAccountId ? idx.accounts.get(b.card.withdrawAccountId)?.name : undefined,
      card: true,
    });
  }
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime() || a.amount - b.amount);

  return {
    periodId: pid,
    rows,
    categories,
    incomeTotal,
    spendTotal,
    cardPaidTotal,
    directOutTotal,
    savingDirectTotal,
    cardBills,
    cardBillTotal,
    receivableTotal,
    cashOutTotal,
    buffer,
    allocation,
    timeline,
    unconfirmedCardBills: cardBills.filter((b) => b.actual === undefined && b.forecast > 0).length,
  };
}

export interface CardTodo {
  periodId: string;
  bill: CardBillRow;
  /** 引落日を過ぎても未入力 */
  overdue: boolean;
}

/**
 * 確定日を迎えたのに請求額が未入力のカード請求。
 * 確定日が未設定のカードは引落日の期に入ったら対象にする。
 */
export function cardTodos(data: AppData, today: Date, currentPeriod: string): CardTodo[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todos: CardTodo[] = [];
  for (const pid of [addPeriods(currentPeriod, -1), currentPeriod, addPeriods(currentPeriod, 1)]) {
    for (const bill of cardBillRows(data, pid)) {
      if (bill.actual !== undefined) continue;
      const hasBillRecord = data.cardBills.some((b) => b.periodId === pid && b.cardId === bill.card.id);
      if (bill.forecast === 0 && !hasBillRecord) continue;
      const due = bill.confirmDate ?? (comparePeriods(pid, currentPeriod) <= 0 ? t : undefined);
      if (!due || due > t) continue;
      todos.push({ periodId: pid, bill, overdue: !!bill.withdrawDate && bill.withdrawDate < t });
    }
  }
  return todos;
}

/** 先の予定として目立たせる出費。年払い・数か月ごと・1回のみの項目と、いつもより多くしたその月だけの予算 */
export interface BigExpense {
  periodId: string;
  item: Item;
  category: Category;
  amount: number;
  /** その月だけの予算に付けたメモ（例: 旅行） */
  memo?: string;
  /** いつもの金額（その月だけ増やしたとき）。いつもは出ない月なら 0 */
  usual?: number;
  /** 入出金日が決まっていれば、その日付 */
  date?: Date;
  reason: 'yearly' | 'interval' | 'once' | 'override';
}

export function bigExpenses(data: AppData, pid: string, idx = buildIndex(data)): BigExpense[] {
  const out: BigExpense[] = [];
  const startDay = periodRule(data.settings);
  for (const r of itemRows(data, pid, idx)) {
    if (r.kind === 'income' || r.kind === 'saving' || !r.planned) continue;
    const rec = r.item.recurrence;
    const usual = itemOccurs(r.item, pid) ? amountFor(r.item, pid) : 0;
    const date = r.item.day !== undefined ? dateInPeriod(pid, startDay, r.item.day) : undefined;
    const base = { periodId: pid, item: r.item, category: r.category, amount: r.planned, memo: r.memo, date };
    if (r.hasOverride && r.planned > usual) out.push({ ...base, usual, reason: 'override' });
    else if (rec.type === 'yearly' || rec.type === 'once') out.push({ ...base, reason: rec.type });
    else if (rec.type === 'interval' && rec.months >= 3) out.push({ ...base, reason: 'interval' });
  }
  return out.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
}

/** 口座から出ていくお金を日付順に（入出金日のある項目と、カードの引落） */
export function outflows(s: PeriodSummary): TimelineEvent[] {
  return s.timeline.filter((e) => e.amount < 0);
}

export const DEFAULT_BIG_MIN_YEN = 10000;

/** ホームに出す、この先の大きい出費。設定の金額以上のものだけ */
export function homeBigExpenses(months: OutlookMonth[], settings: Settings): BigExpense[] {
  const min = settings.home?.bigMinYen ?? DEFAULT_BIG_MIN_YEN;
  return months.flatMap((m) => m.big).filter((b) => b.amount >= min);
}

export interface OutlookMonth {
  periodId: string;
  big: BigExpense[];
}

/** current から months か月分の、大きい出費の予定 */
export function outlook(data: AppData, current: string, months = 12): OutlookMonth[] {
  const idx = buildIndex(data);
  return Array.from({ length: months }, (_, i) => {
    const pid = addPeriods(current, i);
    return { periodId: pid, big: bigExpenses(data, pid, idx) };
  });
}
