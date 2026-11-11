import { Box, Button, Card, CardContent, CardHeader, Link, Typography } from '@mui/material';
import { useState } from 'react';
import { outflows, type BigExpense, type PeriodSummary } from '../../domain/cashflow';
import { periodStart, type StartDay } from '../../domain/period';
import { yen } from '../../lib/money';
import { ScheduleList } from '../../components/ScheduleList';

const monthOf = (pid: string, startDay: StartDay) => `${periodStart(pid, startDay).getMonth() + 1}月`;

const REASON: Record<BigExpense['reason'], string> = { yearly: '年払い', interval: '数か月ごと', once: '1回だけ', override: 'この月だけ' };

const header = (title: string, sub?: string) => (
  <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
    subheader={sub} subheaderTypographyProps={{ variant: 'caption' }} sx={{ pb: 0.5 }} />
);

/** この先1年の大きい出費の予定。limit 件まで出し、残りは「もっと見る」で開く */
export function BigExpensesCard({ list, minYen, startDay, onOpen, limit }: {
  list: BigExpense[]; minYen: number; startDay: StartDay; onOpen: (pid: string) => void; limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? list.slice(0, limit) : list;
  return (
    <Card data-tour="big">
      {header('この先の大きい出費', `${yen(minYen)}以上の、年払い・旅行など`)}
      {list.length === 0 ? (
        <CardContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            まだないよ。旅行や家電の買い替えなどは、<Link href="#plan" underline="hover">計画</Link>でその月に足しておくと、ここに出るよ。
          </Typography>
        </CardContent>
      ) : (
        <ScheduleList
          rows={shown.map((b) => ({
            key: `${b.periodId}:${b.item.id}`, date: b.date, label: monthOf(b.periodId, startDay),
            title: b.memo || b.item.name, amount: b.amount, onClick: () => onOpen(b.periodId),
            sub: b.reason === 'override' ? `この月だけ・いつもは ${yen(b.usual ?? 0)}` : REASON[b.reason],
          }))}
          footer={limit && list.length > limit ? (
            <Box sx={{ px: 2, pb: 1 }}>
              <Button size="small" onClick={() => setAll(!all)}>{all ? '閉じる' : `ほか ${list.length - limit} 件を見る`}</Button>
            </Box>
          ) : undefined} />
      )}
    </Card>
  );
}

/** その月に口座から出ていくお金を日付順に。計画の下と、ホームで使う */
export function OutflowsCard({ summary, title, tour }: { summary: PeriodSummary; title: string; tour?: string }) {
  const list = outflows(summary);
  const total = list.reduce((a, e) => a - e.amount, 0);
  return (
    <Card data-tour={tour}>
      {header(title, '口座から出ていくお金を日付順に。カード払いは引落の日にまとめて出るよ')}
      {list.length === 0 ? (
        <CardContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            定期項目に入出金日を入れると、ここに出るよ。
          </Typography>
        </CardContent>
      ) : (
        <ScheduleList
          rows={list.map((e, i) => ({
            key: `${i}:${e.label}`, date: e.date, title: e.label, amount: -e.amount,
            sub: [e.account && `${e.account}から`, e.card && (e.confirmed ? '確定' : '予測')].filter(Boolean).join('・') || undefined,
          }))}
          footer={(
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pt: 1, pb: 1.5, mt: 0.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={700}>合計</Typography>
              <Typography variant="body2" fontWeight={900}>{yen(total)}</Typography>
            </Box>
          )} />
      )}
    </Card>
  );
}
