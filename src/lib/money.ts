const fmt = new Intl.NumberFormat('ja-JP');

export const yen = (n: number) => `¥${fmt.format(n)}`;
export const num = (n: number) => fmt.format(n);
export const signedYen = (n: number) => (n > 0 ? `+${yen(n)}` : n < 0 ? `−${yen(-n)}` : yen(0));

/**
 * 金額入力をパースする。「12000+30000+44000」のような足し算・引き算も可。
 * 空なら undefined、解釈できなければ null。
 */
export function parseAmount(input: string): number | undefined | null {
  const s = input.replace(/[,，\s¥円]/g, '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[＋]/g, '+').replace(/[−ー－]/g, '-');
  if (s === '') return undefined;
  if (!/^-?\d+([+-]\d+)*$/.test(s)) return null;
  return (s.match(/[+-]?\d+/g) ?? []).reduce((acc, t) => acc + Number(t), 0);
}
