// ふりかえり: 計画とのずれと、続いているずれ（改善のヒント）。純粋関数
import { buildIndex, categoryRows, itemRows } from './cashflow';
import { addPeriods } from './period';
import type { AppData, Category, DriftKind } from './types';

export const DRIFT_LABEL: Record<DriftKind, string> = { ok: '納得', unexpected: '想定外', casual: 'なんとなく' };

export interface Drift {
  periodId: string;
  category: Category;
  planned: number;
  actual: number;
  /** 実績 − 計画。プラスはオーバー、マイナスは少なく済んだ */
  diff: number;
  kind?: DriftKind;
  memo?: string;
}

/** 細かいずれは出さない。計画の1割か 1,000円の、大きい方をこえたものだけ */
export function isNotable(planned: number, diff: number): boolean {
  return Math.abs(diff) >= Math.max(1000, Math.round(planned * 0.1));
}

/** その月の、支出カテゴリの目立つずれ（大きい順）。実績が入っていないカテゴリは出さない */
export function monthDrifts(data: AppData, pid: string): Drift[] {
  const idx = buildIndex(data);
  return categoryRows(data, pid, itemRows(data, pid, idx), idx)
    .filter((c) => c.kind === 'expense' && c.actual !== undefined)
    .map((c) => {
      const rec = idx.actuals.get(`${pid}:${c.category.id}`);
      return { periodId: pid, category: c.category, planned: c.planned, actual: c.actual!, diff: c.actual! - c.planned, kind: rec?.driftKind, memo: rec?.memo };
    })
    .filter((d) => isNotable(d.planned, d.diff))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** その月の支出カテゴリのうち、実績が未入力の数 */
export function missingActuals(data: AppData, pid: string): number {
  const idx = buildIndex(data);
  return categoryRows(data, pid, itemRows(data, pid, idx), idx)
    .filter((c) => c.kind === 'expense' && c.planned > 0 && c.actual === undefined).length;
}

export interface DriftHint {
  category: Category;
  direction: 'over' | 'under';
  /** 直近 months か月のうち、同じ向きにずれた回数 */
  count: number;
  months: number;
  /** いちばん多く付いている種類 */
  kind?: DriftKind;
  text: string;
}

/** 先月までの months か月で、同じカテゴリが2回以上同じ向きにずれていたら、改善のヒントにする */
export function driftHints(data: AppData, current: string, months = 3): DriftHint[] {
  const all = Array.from({ length: months }, (_, i) => monthDrifts(data, addPeriods(current, -1 - i))).flat();
  const groups = new Map<string, Drift[]>();
  for (const d of all) {
    const key = `${d.category.id}:${d.diff > 0 ? 'over' : 'under'}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const hints: DriftHint[] = [];
  for (const ds of groups.values()) {
    if (ds.length < 2) continue;
    const direction = ds[0].diff > 0 ? 'over' : 'under';
    const counts = new Map<DriftKind, number>();
    for (const d of ds) if (d.kind) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
    const kind = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const name = ds[0].category.name;
    const head = `${name}が${months}か月中${ds.length}回${direction === 'over' ? 'オーバー' : '少なく済んでいる'}。`;
    const text = direction === 'under' ? `${head}予算を減らして、ほかに回せるかも`
      : kind === 'ok' ? `${head}いつも納得の使い方なら、計画を増やしてもいいかも`
      : kind === 'unexpected' ? `${head}想定外が続くなら、予備として少し多めに計画しておくと安心`
      : kind === 'casual' ? `${head}なんとなく増えているなら、ここだけ見直してみよう`
      : `${head}計画の金額を見直してみる？`;
    hints.push({ category: ds[0].category, direction, count: ds.length, months, kind, text });
  }
  // オーバーを先に、回数の多い順。同じなら見つかった順（先月の大きいずれから）
  const rank = (h: DriftHint) => (h.direction === 'over' ? 0 : 1);
  return hints.sort((a, b) => rank(a) - rank(b) || b.count - a.count);
}

export interface ReviewStatus {
  /** 実績が1つでも入っているか */
  started: boolean;
  /** 実績が未入力の支出カテゴリの数 */
  missing: number;
  /** 種類が付いていない、目立つオーバーの数 */
  untagged: number;
  /** 「ふりかえり完了」を押した */
  closed: boolean;
  /** 完了を押したか、実績が全部入って目立つオーバーに全部種類が付いた */
  done: boolean;
}

/** 「ふりかえり完了」を記録するキー（給料日のチェックと同じ表に、月ごとに入れる） */
export const REVIEW_DONE_KEY = 'review';

/** その月のふりかえりの進み具合。入力して、ずれの理由を考えたら（または完了を押したら）完了 */
export function reviewStatus(data: AppData, pid: string): ReviewStatus {
  const started = data.categoryActuals.some((a) => a.periodId === pid);
  const missing = missingActuals(data, pid);
  const untagged = monthDrifts(data, pid).filter((d) => d.diff > 0 && !d.kind).length;
  const closed = data.checklistDone.some((c) => c.periodId === pid && c.key === REVIEW_DONE_KEY);
  return { started, missing, untagged, closed, done: closed || (started && missing === 0 && untagged === 0) };
}
