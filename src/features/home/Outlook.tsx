import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ReactNode } from 'react';
import {
  Box, Button, ButtonBase, Card, CardContent, CardHeader, Chip, Link, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { BigExpense, OutlookMonth } from '../../domain/cashflow';
import { periodLabel, periodStart, type StartDay } from '../../domain/period';
import { signedYen, yen } from '../../lib/money';

const monthOf = (pid: string, startDay: StartDay) => `${periodStart(pid, startDay).getMonth() + 1}月`;

/** 計画の釣り合いの印。±0 は ✓、行き先未定は ＋、計画オーバーは ！ */
export function BalanceMark({ unassigned, size = 14 }: { unassigned: number; size?: number }) {
  if (unassigned === 0) return <CheckIcon sx={{ fontSize: size, color: 'success.main' }} />;
  if (unassigned > 0) return <AddCircleOutlineIcon sx={{ fontSize: size, color: 'text.secondary' }} />;
  return <ErrorOutlineIcon sx={{ fontSize: size, color: 'error.main' }} />;
}

/** この先1年の計画。棒は毎月の積み立て、下の印は計画が ±0 か。棒を押すとその月を選ぶ */
export function OutlookCard({ months, selected, onSelect, startDay }: {
  months: OutlookMonth[]; selected: string; onSelect: (pid: string) => void; startDay: StartDay;
}) {
  const total = months.reduce((a, m) => a + m.saving, 0);
  const max = Math.max(1, ...months.map((m) => m.saving));
  const H = 80;
  const hasBig = months.some((m) => m.big.length > 0);
  const legend: [ReactNode, string][] = [
    [<BalanceMark unassigned={0} size={13} />, '±0'],
    [<BalanceMark unassigned={1} size={13} />, '行き先未定あり'],
    [<BalanceMark unassigned={-1} size={13} />, '計画オーバー'],
  ];
  if (hasBig) legend.push([<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary', mx: '3.5px' }} />, '大きい出費']);

  return (
    <Card data-tour="outlook" sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">この先1年の積み立て（計画）</Typography>
        <Typography variant="h4" component="p" fontWeight={900} sx={{ mt: 0.25 }}>{yen(total)}</Typography>

        <Box role="group" aria-label="月ごとの計画" sx={{ mt: 2, display: 'grid', gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`, columnGap: '2px' }}>
          {months.map((m) => {
            const on = m.periodId === selected;
            const h = m.saving > 0 ? Math.max(2, Math.round((m.saving / max) * H)) : 0;
            const state = m.unassigned === 0 ? '±0' : m.unassigned > 0 ? `行き先未定 ${yen(m.unassigned)}` : `計画オーバー ${yen(-m.unassigned)}`;
            return (
              <ButtonBase key={m.periodId} onClick={() => onSelect(m.periodId)} aria-pressed={on}
                aria-label={`${periodLabel(m.periodId, startDay)} 積み立て ${yen(m.saving)}、${state}${m.big.length ? `、大きい出費 ${m.big.length}件` : ''}`}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', borderRadius: 2, py: 0.5, bgcolor: on ? 'soft' : 'transparent' }}>
                <Box sx={{ height: H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Box sx={(t) => ({ width: '62%', maxWidth: 18, height: h, borderRadius: '4px 4px 0 0',
                    bgcolor: on ? t.palette.primary.main : t.palette.mode === 'dark' ? alpha(t.palette.text.primary, 0.28) : alpha(t.palette.primary.main, 0.45) })} />
                </Box>
                <Box sx={{ height: '1.5px', bgcolor: 'divider' }} />
                <Typography variant="caption" sx={{ mt: 0.5, fontSize: 10, letterSpacing: 0, lineHeight: 1.4,
                  fontWeight: on ? 900 : 500, color: on ? 'text.primary' : 'text.secondary', textAlign: 'center' }}>
                  {monthOf(m.periodId, startDay)}
                </Typography>
                <Box sx={{ height: 16, display: 'grid', placeItems: 'center' }}><BalanceMark unassigned={m.unassigned} /></Box>
                <Box sx={{ height: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {m.big.length > 0 && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary' }} />}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        <Stack direction="row" useFlexGap flexWrap="wrap" columnGap={1.5} rowGap={0.5} sx={{ mt: 1 }}>
          {legend.map(([icon, label]) => (
            <Stack key={label} direction="row" spacing={0.5} alignItems="center">
              {icon}<Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** 選んだ月の計画: 収入の行き先と、±0 になっているか */
export function PlanMonthCard({ month: m, label, onOpenPlan }: { month: OutlookMonth; label: string; onOpenPlan: () => void }) {
  const row = (name: string, value: string, strong?: boolean) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
      <Typography variant="body2" color="text.secondary">{name}</Typography>
      <Typography fontWeight={strong ? 900 : 700}>{value}</Typography>
    </Stack>
  );
  const note = m.unassigned === 0 ? '収入の行き先が全部決まっているよ。このまま使ってOK！'
    : m.unassigned > 0 ? `${yen(m.unassigned)} の行き先がまだ決まっていないよ。積み立てに回すか、使う予定に足そう。`
    : `計画が収入を ${yen(-m.unassigned)} こえているよ。積み立てを減らすか、貯金から出すか決めておこう。`;
  return (
    <Card data-tour="month">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>{label}の計画</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <BalanceMark unassigned={m.unassigned} size={18} />
            <Typography variant="body2" fontWeight={900} color={m.unassigned < 0 ? 'error.main' : m.unassigned === 0 ? 'success.main' : 'text.secondary'}>
              {m.unassigned === 0 ? '±0' : signedYen(m.unassigned)}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={0.75}>
          {row('収入', yen(m.income))}
          {row('使う予定（支出・返済）', `-${yen(m.spend)}`)}
          {row('積み立て（貯金・投資）', `-${yen(m.saving)}`)}
        </Stack>
        <Typography variant="body2" sx={{ mt: 1.5, pt: 1.5, borderTop: 1.5, borderColor: 'divider', borderTopStyle: 'solid', lineHeight: 1.8 }}>{note}</Typography>
        <Button fullWidth variant="outlined" sx={{ mt: 1.5 }} onClick={onOpenPlan}>この月の計画を開く</Button>
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
