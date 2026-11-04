import { describe, expect, it } from 'vitest';
import { parseBudgetSheet, parseCsv, splitDefault } from './importSheet';

// 元のスプレッドシートと同じレイアウトの架空データ
const CSV = `年間お金計画表,,,11月,12/15-1/14,1/15-2/14,合計額
収入,前月末,バイト,"10,000",,,"10,000"
,15日,給与,"300,000","300,000","310,000","910,000"
,その他,,,"5,000",,"5,000"
収入合計,,,"310,000","305,000","310,000","925,000"
支出,家賃,,"80,000","80,000","80,000","240,000"
,光熱費,,"8,000","9,000","9,000","26,000"
,- 電気,,"5,000","6,000","6,000","17,000"
,- ガス 20日,,"3,000","3,000","3,000","9,000"
,返済,,"10,000","10,000",-,"20,000"
,25日,ローンA,"10,000","10,000",,"20,000"
支出合計,,,"98,000","99,000","89,000","286,000"
クレカ,26日,カードA,"40,000","38,000",,"78,000"
,10日,カードB,,"2,000",#REF!,"2,000"
クレカ合計,,,"40,000","40,000",,"80,000"
支出の中のクレカ支払い合計,,,"5,000","6,000","6,000",
振り分け,,生活費用,"1,000","1,000","1,000",
`;

describe('parseCsv', () => {
  it('引用符・カンマ・改行を扱う', () => {
    expect(parseCsv('a,"1,000","x""y"\r\nb,,"改\n行"\n')).toEqual([['a', '1,000', 'x"y'], ['b', '', '改\n行']]);
  });
});

describe('parseBudgetSheet', () => {
  const r = parseBudgetSheet(parseCsv(CSV), 2026);

  it('見出しから月と開始日を読み、12月の次は翌年にする', () => {
    expect(r.periods).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(r.startDay).toBe(15);
  });

  it('収入は1つのカテゴリにまとめ、日付と名前を読む', () => {
    const inc = r.categories[0];
    expect(inc.kind).toBe('income');
    expect(inc.items.map((i) => [i.name, i.day])).toEqual([['バイト', undefined], ['給与', 15], ['その他', undefined]]);
    expect(inc.items[1].amounts).toEqual({ '2026-11': 300000, '2026-12': 300000, '2027-01': 310000 });
  });

  it('子のないカテゴリは同名の項目を作り、子があれば親の合計行は使わない', () => {
    const names = r.categories.slice(1).map((c) => [c.name, c.kind, c.items.map((i) => i.name)]);
    expect(names).toEqual([
      ['家賃', 'expense', ['家賃']],
      ['光熱費', 'expense', ['電気', 'ガス']],
      ['返済', 'debt', ['ローンA']],
    ]);
    expect(r.categories[2].items[1].day).toBe(20);
    expect(r.categories[3].items[0].day).toBe(25);
  });

  it('クレカの行からカードと請求額を読み、読めない値は警告して 0 にする', () => {
    expect(r.cards.map((c) => [c.name, c.withdrawDay])).toEqual([['カードA', 26], ['カードB', 10]]);
    expect(r.cards[1].bills['2027-01']).toBe(0);
    expect(r.warnings).toHaveLength(1);
  });

  it('月の見出しがなければエラー', () => {
    expect(() => parseBudgetSheet(parseCsv('a,b,c\n1,2,3'), 2026)).toThrow();
  });
});

describe('splitDefault', () => {
  it('最後の月の値をいつもの金額にし、違う月だけ上書きにする', () => {
    expect(splitDefault({ '2026-01': 0, '2026-02': 5000, '2026-03': 8000, '2026-04': 5000 }))
      .toEqual({ defaultAmount: 5000, overrides: { '2026-01': 0, '2026-03': 8000 } });
  });
  it('既存のいつもの金額を基準にもできる（追加で取り込むとき）', () => {
    expect(splitDefault({ '2027-01': 5000, '2027-02': 6000 }, 5000))
      .toEqual({ defaultAmount: 5000, overrides: { '2027-02': 6000 } });
  });
});
