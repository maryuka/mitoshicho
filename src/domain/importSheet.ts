// 元のスプレッドシート（年間お金計画表）を CSV で書き出したものを読み込む（純粋関数）。
//
// 想定するレイアウト（2026 シート）:
//   見出し行: … | 1月 | 2月 | … | 5/15-6/14 | … | 合計額
//   収入:   [収入] | 15日 | 給与 | 金額…
//   支出:   [支出] | 住居 | | 金額…                  ← カテゴリ（子がなければ同名の項目を1つ作る）
//                 | - 電気 | | 金額…                ← 直前のカテゴリの項目（親の行は合計なので使わない）
//                 | 25日 | ローンA | 金額…           ← 直前のカテゴリの項目（引落日つき）
//   クレカ: [クレカ] | 26日 | カードA | 金額…        ← カードと各月の請求額
//   「◯◯合計」などの集計行は読み飛ばし、クレカの後の集計・振り分けは読まない。
import { comparePeriods, periodId } from './period';
import type { CategoryKind } from './types';

/**
 * CSV（ファイル）とタブ区切り（スプレッドシートのセルをコピーして貼り付けたもの）の両方を読む。
 * タブを含めばタブ区切りとして扱う（金額の「40,000」にカンマが入るため）。
 */
export function parseTable(text: string): string[][] {
  return parseDelimited(text, text.includes('\t') ? '\t' : ',');
}

export function parseCsv(text: string): string[][] {
  return parseDelimited(text, ',');
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

export interface ImportedItem {
  name: string;
  day?: number;
  /** 期 ID → 金額（空欄は 0） */
  amounts: Record<string, number>;
}

export interface ImportedCategory {
  name: string;
  kind: CategoryKind;
  items: ImportedItem[];
}

export interface ImportedCard {
  name: string;
  withdrawDay?: number;
  bills: Record<string, number>;
}

export interface SheetImport {
  periods: string[];
  /** 見出しの「5/15-6/14」から読み取った月の開始日 */
  startDay?: number;
  categories: ImportedCategory[];
  cards: ImportedCard[];
  warnings: string[];
}

const MONTH_ONLY = /^(\d{1,2})月$/;
const MONTH_RANGE = /^(\d{1,2})\/(\d{1,2})\s*[-〜~ー－]\s*(\d{1,2})\/(\d{1,2})$/;
const DAY = /^(\d{1,2})日$/;
const DAY_SUFFIX = /\s*(\d{1,2})日$/;
const SECTIONS = { 収入: 'income', 支出: 'expense', クレカ: 'card' } as const;
type Section = (typeof SECTIONS)[keyof typeof SECTIONS];

function categoryKind(name: string): CategoryKind {
  if (/返済|ローン/.test(name)) return 'debt';
  if (/貯金|投資|積立/.test(name)) return 'saving';
  return 'expense';
}

function parseCell(raw: string | undefined): number | null {
  const s = (raw ?? '').replace(/[¥,，\s円]/g, '');
  if (s === '' || s === '-' || s === '−') return 0;
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

export function parseBudgetSheet(rows: string[][], year: number): SheetImport {
  const warnings: string[] = [];

  // 見出し行と、月の列を探す
  let headerIndex = -1;
  let monthCols: { col: number; month: number; startDay?: number }[] = [];
  for (let r = 0; r < Math.min(rows.length, 10) && headerIndex < 0; r++) {
    const cols = rows[r].flatMap((v, col) => {
      const t = v.trim();
      const m1 = MONTH_ONLY.exec(t);
      if (m1) return [{ col, month: Number(m1[1]) }];
      const m2 = MONTH_RANGE.exec(t);
      if (m2) return [{ col, month: Number(m2[1]), startDay: Number(m2[2]) }];
      return [];
    });
    if (cols.length >= 3) { headerIndex = r; monthCols = cols; }
  }
  if (headerIndex < 0) {
    throw new Error('月の見出し行（「1月」や「5/15-6/14」）が見つかりませんでした。年間お金計画表のシートを CSV で書き出したファイルか確認してください。');
  }

  // 月の列 → 期 ID（12月の次に1月が来たら翌年）
  let y = year;
  let prevMonth = 0;
  const colPeriods = monthCols.map((c) => {
    if (c.month < prevMonth) y++;
    prevMonth = c.month;
    return { col: c.col, pid: periodId(y, c.month) };
  });
  const periods = colPeriods.map((c) => c.pid);
  const startDay = monthCols.find((c) => c.startDay)?.startDay;
  const labelEnd = monthCols[0].col;

  const amountsOf = (row: string[], label: string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const { col, pid } of colPeriods) {
      const v = parseCell(row[col]);
      if (v === null) {
        warnings.push(`「${label}」の ${pid} の値「${row[col]}」を読めなかったので 0 にしました`);
        out[pid] = 0;
      } else out[pid] = v;
    }
    return out;
  };

  const income: ImportedCategory = { name: '収入', kind: 'income', items: [] };
  const categories: ImportedCategory[] = [];
  const cards: ImportedCard[] = [];
  let section: Section | null = null;
  let parent: { cat: ImportedCategory; ownAmounts: Record<string, number>; hasChildren: boolean } | null = null;
  const closeParent = () => {
    if (parent && !parent.hasChildren) {
      parent.cat.items.push({ name: parent.cat.name, amounts: parent.ownAmounts });
    }
    parent = null;
  };

  for (const row of rows.slice(headerIndex + 1)) {
    let labels = row.slice(0, labelEnd).map((v) => v.trim()).filter(Boolean);
    labels = labels.filter((v, i) => v !== labels[i - 1]); // 結合セルの重複を除く
    if (labels.length === 0) continue;

    const head = labels[0];
    if (head in SECTIONS) {
      closeParent();
      section = SECTIONS[head as keyof typeof SECTIONS];
      labels = labels.slice(1);
      if (labels.length === 0) continue;
    } else if (/合計$/.test(head)) {
      closeParent();
      if (section === 'card') section = null; // クレカの後は集計なので読まない
      continue;
    } else if (section === 'card' && !DAY.test(head)) {
      section = null;
      continue;
    }
    if (!section) continue;

    const dayLabel = labels.length >= 2 && DAY.test(labels[0]) ? labels[0] : undefined;
    const name = labels[labels.length - 1];
    const day = dayLabel ? Number(DAY.exec(dayLabel)![1]) : undefined;

    if (section === 'income') {
      income.items.push({ name, day, amounts: amountsOf(row, name) });
      continue;
    }

    if (section === 'card') {
      const bills = amountsOf(row, name);
      cards.push({ name, withdrawDay: day, bills });
      continue;
    }

    // 支出
    if (/^[-‐－ー]\s*/.test(name) && labels.length === 1) {
      const raw = name.replace(/^[-‐－ー]\s*/, '');
      const m = DAY_SUFFIX.exec(raw);
      const item = { name: m ? raw.replace(DAY_SUFFIX, '') : raw, day: m ? Number(m[1]) : undefined, amounts: amountsOf(row, raw) };
      if (!parent) { warnings.push(`「${raw}」の親カテゴリが見つからなかったので読み飛ばしました`); continue; }
      parent.cat.items.push(item);
      parent.hasChildren = true;
    } else if (dayLabel && parent) {
      parent.cat.items.push({ name, day, amounts: amountsOf(row, name) });
      parent.hasChildren = true;
    } else {
      closeParent();
      const cat: ImportedCategory = { name, kind: categoryKind(name), items: [] };
      categories.push(cat);
      parent = { cat, ownAmounts: amountsOf(row, name), hasChildren: false };
    }
  }
  closeParent();

  return {
    periods,
    startDay,
    categories: income.items.length > 0 ? [income, ...categories] : categories,
    cards,
    warnings,
  };
}

/**
 * 月ごとの金額から、いつもの金額と、それと違う月を求める。
 * いつもの金額は最後の月の値（シートの先の予定が一番新しい計画のため）。
 */
export function splitDefault(amounts: Record<string, number>, base?: number): { defaultAmount: number; overrides: Record<string, number> } {
  const pids = Object.keys(amounts).sort(comparePeriods);
  const defaultAmount = base ?? (pids.length ? amounts[pids[pids.length - 1]] : 0);
  const overrides: Record<string, number> = {};
  for (const p of pids) if (amounts[p] !== defaultAmount) overrides[p] = amounts[p];
  return { defaultAmount, overrides };
}
