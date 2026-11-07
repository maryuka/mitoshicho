import { describe, expect, it } from 'vitest';
import { isHoliday, previousBusinessDay } from './holidays';
import { dateInPeriod, periodEnd, periodOf, periodStart, toISODate } from './period';

const d = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); };

describe('祝日', () => {
  it('2026年の祝日（振替休日・国民の休日を含む）', () => {
    const list = ['2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20', '2026-04-29', '2026-05-03',
      '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
      '2026-10-12', '2026-11-03', '2026-11-23'];
    for (const s of list) expect(isHoliday(d(s)), s).toBe(true);
    let count = 0;
    for (let x = d('2026-01-01'); x.getFullYear() === 2026; x.setDate(x.getDate() + 1)) if (isHoliday(x)) count++;
    expect(count).toBe(list.length);
  });
  it('2025年の振替休日', () => {
    expect(isHoliday(d('2025-02-24'))).toBe(true); // 天皇誕生日(日)の振替
    expect(isHoliday(d('2025-11-24'))).toBe(true); // 勤労感謝の日(日)の振替
    expect(isHoliday(d('2025-05-06'))).toBe(true); // こどもの日の振替
  });
  it('土日祝なら前の平日', () => {
    expect(toISODate(previousBusinessDay(d('2026-11-15')))).toBe('2026-11-13'); // 日曜 → 金曜
    expect(toISODate(previousBusinessDay(d('2026-01-12')))).toBe('2026-01-09'); // 成人の日(月) → 金曜
    expect(toISODate(previousBusinessDay(d('2026-05-06')))).toBe('2026-05-01'); // 連休明けの振替休日 → 5/1
    expect(toISODate(previousBusinessDay(d('2026-10-15')))).toBe('2026-10-15'); // 平日はそのまま
  });
});

describe('給料日のずれと期', () => {
  it('期の初日は前の平日、前の期はその前日まで', () => {
    expect(toISODate(periodStart('2026-11', 15))).toBe('2026-11-13');
    expect(toISODate(periodEnd('2026-10', 15))).toBe('2026-11-12');
    expect(periodOf(d('2026-11-13'), 15)).toBe('2026-11');
    expect(periodOf(d('2026-11-12'), 15)).toBe('2026-10');
  });
  it('暦月（1日始まり）はずらさない', () => {
    expect(toISODate(periodStart('2026-11', 1))).toBe('2026-11-01'); // 日曜でもそのまま
  });
  it('翌月の給料日が月をまたいで前にずれるとき', () => {
    // 開始日 3日: 2027/1/3(日)→1/2(土)→1/1(元日)→2026/12/31 にずれる
    expect(toISODate(periodStart('2027-01', 3))).toBe('2026-12-31');
    expect(periodOf(d('2026-12-31'), 3)).toBe('2027-01');
  });
  it('項目の日付は、ずらす前の給料日でどの月かを決める', () => {
    // 11月の期は 11/13 から始まるが、14日の項目はずらす前の給料日（15日）より前なので翌月の 12/14 になる
    expect(toISODate(dateInPeriod('2026-11', 15, 14))).toBe('2026-12-14');
    expect(toISODate(dateInPeriod('2026-11', 15, 20))).toBe('2026-11-20');
  });
});
