import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box, Card, CardContent, CardHeader, Chip, Link, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import type { BigExpense, OutlookMonth } from '../../domain/cashflow';
import { periodStart, type StartDay } from '../../domain/period';
import { yen } from '../../lib/money';

const monthOf = (pid: string, startDay: StartDay) => `${periodStart(pid, startDay).getMonth() + 1}月`;

const REASON: Record<BigExpense['reason'], string> = { yearly: '年払い', interval: '数か月ごと', once: '1回だけ', override: 'この月だけ' };

/** この先1年の大きい出費の予定 */
export function BigExpensesCard({ months, startDay, onOpen }: {
  months: OutlookMonth[]; startDay: StartDay; onOpen: (pid: string) => void;
}) {
  const list = months.flatMap((m) => m.big);
  return (
    <Card data-tour="big">
      <CardHeader title="この先の大きい出費" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        subheader="この先1年。年払い・1回だけの出費と、いつもより多くした月" subheaderTypographyProps={{ variant: 'caption' }} sx={{ pb: 0 }} />
      {list.length === 0 ? (
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            まだないよ。旅行や家電の買い替えなどは、<Link href="#plan" underline="hover">計画</Link>でその月に足しておくと、ここに出るよ。
          </Typography>
        </CardContent>
      ) : (
        <List>
          {list.map((b) => (
            <ListItemButton key={`${b.periodId}:${b.item.id}`} onClick={() => onOpen(b.periodId)} sx={{ gap: 1.5 }}>
              <Box sx={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
                <Typography variant="subtitle2" fontWeight={900} sx={{ lineHeight: 1.2 }}>{monthOf(b.periodId, startDay)}</Typography>
              </Box>
              <ListItemText
                primary={b.memo || b.item.name}
                secondary={b.reason === 'override' ? `${b.memo ? `${b.item.name}・` : ''}いつもは ${yen(b.usual ?? 0)}` : b.category.name}
                primaryTypographyProps={{ fontWeight: 700, noWrap: true }} secondaryTypographyProps={{ noWrap: true }}
                sx={{ minWidth: 0 }} />
              <Stack alignItems="flex-end" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Typography fontWeight={700}>{yen(b.amount)}</Typography>
                <Chip label={REASON[b.reason]} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              </Stack>
              <ChevronRightIcon color="action" />
            </ListItemButton>
          ))}
        </List>
      )}
    </Card>
  );
}
