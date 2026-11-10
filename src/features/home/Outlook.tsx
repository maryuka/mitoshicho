import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box, ButtonBase, Card, CardContent, CardHeader, Chip, Link, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { BigExpense, OutlookMonth } from '../../domain/cashflow';
import { periodLabel, periodStart, type StartDay } from '../../domain/period';
import { signedYen, yen } from '../../lib/money';

const monthOf = (pid: string, startDay: StartDay) => `${periodStart(pid, startDay).getMonth() + 1}月`;

/** この先1年の、毎月の余りの棒グラフ。棒を押すとその月を選ぶ */
export function OutlookCard({ months, selected, onSelect, startDay }: {
  months: OutlookMonth[]; selected: string; onSelect: (pid: string) => void; startDay: StartDay;
}) {
  const total = months.reduce((a, m) => a + m.buffer, 0);
  const max = Math.max(1, ...months.map((m) => Math.abs(m.buffer)));
  const hasMinus = months.some((m) => m.buffer < 0);
  const H = 96; // 0 より上の高さ。マイナスの月があれば下にも同じだけ取る
  const hasBig = months.some((m) => m.big.length > 0);

  return (
    <Card data-tour="outlook" sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">この先1年の余り（合計）</Typography>
        <Typography variant="h4" component="p" fontWeight={900} color={total < 0 ? 'error.main' : 'text.primary'} sx={{ mt: 0.25 }}>
          {signedYen(total)}
        </Typography>

        <Box role="group" aria-label="月ごとの余り" sx={{ mt: 2, display: 'grid', gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`, columnGap: '2px' }}>
          {months.map((m) => {
            const on = m.periodId === selected;
            const h = Math.max(2, Math.round((Math.abs(m.buffer) / max) * H));
            const minus = m.buffer < 0;
            return (
              <ButtonBase key={m.periodId} onClick={() => onSelect(m.periodId)} aria-pressed={on}
                aria-label={`${periodLabel(m.periodId, startDay)} 余り ${yen(m.buffer)}${m.big.length ? `、大きい出費 ${m.big.length}件` : ''}`}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', borderRadius: 2, py: 0.5,
                  bgcolor: on ? 'soft' : 'transparent' }}>
                {/* 0 より上 */}
                <Box sx={{ height: H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {!minus && <Box sx={(t) => ({ width: '62%', maxWidth: 18, height: h, borderRadius: '4px 4px 0 0',
                    bgcolor: on ? t.palette.primary.main : t.palette.mode === 'dark' ? alpha(t.palette.text.primary, 0.28) : alpha(t.palette.primary.main, 0.45) })} />}
                </Box>
                <Box sx={{ height: '1.5px', bgcolor: 'divider' }} />
                {/* 0 より下 */}
                {hasMinus && (
                  <Box sx={{ height: H / 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {minus && <Box sx={(t) => ({ width: '62%', maxWidth: 18, height: Math.min(h, H / 2), borderRadius: '0 0 4px 4px',
                      bgcolor: on ? t.palette.error.main : alpha(t.palette.error.main, 0.5) })} />}
                  </Box>
                )}
                <Typography variant="caption" sx={{ mt: 0.5, fontSize: 10, letterSpacing: 0, lineHeight: 1.4,
                  fontWeight: on ? 900 : 500, color: on ? 'text.primary' : 'text.secondary', textAlign: 'center' }}>
                  {monthOf(m.periodId, startDay)}
                </Typography>
                <Box sx={{ height: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {m.big.length > 0 && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary' }} />}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        {hasBig && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">大きい出費がある月</Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

const REASON: Record<BigExpense['reason'], string> = { yearly: '年払い', interval: '数か月ごと', once: '1回だけ', override: 'この月だけ' };

/** この先1年の大きい出費の予定 */
export function BigExpensesCard({ months, startDay, onOpen }: {
  months: OutlookMonth[]; startDay: StartDay; onOpen: (pid: string) => void;
}) {
  const list = months.flatMap((m) => m.big);
  return (
    <Card data-tour="big">
      <CardHeader title="大きい出費の予定" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
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
