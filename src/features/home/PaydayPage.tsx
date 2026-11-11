import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { summarize } from '../../domain/cashflow';
import { mdLabel, periodLabel, periodRule, periodStart } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { yen } from '../../lib/money';
import { PaydayPanel } from './PaydayPanel';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** 給料日のチェック: 入金・立替の回収・口座への振り分け・チェックリスト */
export function PaydayPage({ data, current }: { data: AppData; current: string }) {
  const s = useMemo(() => summarize(data, current, current), [data, current]);
  const startDay = periodRule(data.settings);
  const payday = periodStart(current, startDay);
  return (
    <Stack spacing={2}>
      <Card data-tour="buffer">
        <CardContent>
          {/* いつの給料日のチェックか（今の月の始まりの日。土日・祝日でずれた日） */}
          <Typography fontWeight={900}>{mdLabel(payday)}（{WEEK[payday.getDay()]}）の給料日</Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            {periodLabel(current, startDay)}の1か月分
          </Typography>
          <Typography variant="body2" color="text.secondary">振り分けたあとに残るお金</Typography>
          <Typography variant="h4" component="p" fontWeight={900} color={s.buffer < 0 ? 'error.main' : 'text.primary'} sx={{ my: 0.5 }}>
            {yen(s.buffer)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            収入 {yen(s.incomeTotal)} − 口座から出るお金 {yen(s.directOutTotal)} − カードの引落 {yen(s.cardBillTotal)}
            {s.receivableTotal > 0 ? ` + 立替の回収 ${yen(s.receivableTotal)}` : ''}
          </Typography>
        </CardContent>
      </Card>
      <PaydayPanel data={data} period={current} current={current} />
    </Stack>
  );
}
