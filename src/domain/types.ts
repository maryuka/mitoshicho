// 金額はすべて整数（円）。期 ID は開始月の 'YYYY-MM'。

/** 土日・祝日のずらし方。before: 前の平日 / none: ずらさない / after: 後の平日 */
export type HolidayShift = 'before' | 'none' | 'after';

export interface Settings {
  id: 'app';
  periodStartDay: number; // 給料日（期の開始日）
  /** 給料日が土日・祝日のとき、期の始まりをどうずらすか（なければ before） */
  holidayShift?: HolidayShift;
  lastBackupAt?: string;
}

export type AccountKind = 'bank' | 'card';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** card: 引落日（毎月） */
  withdrawDay?: number;
  /** card: 引落日が土日・祝日のときのずらし方（なければずらさない） */
  withdrawShift?: HolidayShift;
  /** card: 請求額の確定日（毎月）。引落日より前の直近のこの日に確定する */
  confirmDay?: number;
  /** card: 引落口座 */
  withdrawAccountId?: string;
  /** card: 使った期の何期あとに請求されるか（既定 1） */
  billLagPeriods?: number;
  sortOrder: number;
  archived: boolean;
}

export type CategoryKind = 'income' | 'expense' | 'debt' | 'saving';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  sortOrder: number;
  archived: boolean;
}

export type Recurrence =
  | { type: 'monthly' }
  /** 開始月から months か月ごと（2〜12） */
  | { type: 'interval'; months: number }
  | { type: 'yearly'; month: number }
  | { type: 'once'; periodId: string };

export interface AmountChange { from: string; amount: number }

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  defaultAmount: number;
  /** 途中から金額が変わる場合（家賃の改定など）。from の月から amount になる。from の古い順 */
  amountChanges?: AmountChange[];
  /** 入出金日（タイムライン用） */
  day?: number;
  /** 収入: 入金先口座 / それ以外: 支払い元（口座 or カード） */
  sourceAccountId?: string;
  recurrence: Recurrence;
  startPeriod: string;
  endPeriod?: string;
  /** 終了月を回数で決めたとき 'count'（編集画面で回数の入力に戻すため。終了月は endPeriod に入っている） */
  endBy?: 'count';
  sortOrder: number;
  archived: boolean;
  /** アーカイブで終了月を今月にした場合の、元の終了月（なしなら null）。使用中に戻すときに使う */
  endBeforeArchive?: string | null;
}

/** 期 × 項目 の上書き値。テンプレートどおりなら存在しない */
export interface Entry {
  id: string; // `${periodId}:${itemId}`
  periodId: string;
  itemId: string;
  /** この期だけの予算（未指定ならテンプレートの金額） */
  planned?: number;
  memo?: string;
}

/** 期 × カテゴリ の実績合計（家計簿アプリなどで集計した額を振り返りで入力） */
export interface CategoryActual {
  id: string; // `${periodId}:${categoryId}`
  periodId: string;
  categoryId: string;
  amount: number;
  memo?: string;
}

export interface CardBill {
  id: string; // `${periodId}:${cardId}`
  periodId: string;
  cardId: string;
  actual?: number;
  /** この期の引落日（土日祝でずれる場合など）。YYYY-MM-DD */
  withdrawDate?: string;
  /** この期の請求確定日。YYYY-MM-DD */
  confirmDate?: string;
  memo?: string;
}

export interface Receivable {
  id: string;
  kind: 'reimbursement' | 'split';
  title: string;
  amount: number;
  createdAt: string;
  expectedPeriod: string;
  receivedAt?: string;
}

export interface ChecklistTemplate {
  id: string;
  label: string;
  sortOrder: number;
  /** 繰り返し。なければ毎月（以前のデータ）。「今月だけ」は once */
  recurrence?: Recurrence;
  /** 開始月・終了月。なければ制限なし */
  startPeriod?: string;
  endPeriod?: string;
}

export interface ChecklistDone {
  id: string; // `${periodId}:${key}`
  periodId: string;
  key: string; // テンプレート ID or `alloc:${accountId}`
  doneAt: string;
}

export interface AppData {
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  items: Item[];
  entries: Entry[];
  categoryActuals: CategoryActual[];
  cardBills: CardBill[];
  receivables: Receivable[];
  checklistTemplates: ChecklistTemplate[];
  checklistDone: ChecklistDone[];
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  periodStartDay: 15,
};
