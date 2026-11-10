import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box, Button, Card, CardContent, CardHeader, Link, List, ListItemButton, ListItemText, Typography,
} from '@mui/material';
import { useState } from 'react';
import type { BigExpense, OutlookMonth } from '../../domain/cashflow';
import { periodStart, type StartDay } from '../../domain/period';
import { yen } from '../../lib/money';

const monthOf = (pid: string, startDay: StartDay) => `${periodStart(pid, startDay).getMonth() + 1}月`;

const REASON: Record<BigExpense['reason'], string> = { yearly: '年払い', interval: '数か月ごと', once: '1回だけ', override: 'この月だけ' };

/** この先1年の大きい出費の予定。limit 件まで出し、残りは「もっと見る」で開く */
export function BigExpensesCard({ months, startDay, onOpen, limit }: {
  months: OutlookMonth[]; startDay: StartDay; onOpen: (pid: string) => void; limit?: number;
}) {
  const list = months.flatMap((m) => m.big);
  const [all, setAll] = useState(false);
  const shown = limit && !all ? list.slice(0, limit) : list;
  return (
    <Card data-tour="big">
      <CardHeader title="この先の大きい出費" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
      {list.length === 0 ? (
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            まだないよ。旅行や家電の買い替えなどは、<Link href="#plan" underline="hover">計画</Link>でその月に足しておくと、ここに出るよ。
          </Typography>
        </CardContent>
      ) : (
        <List dense>
          {shown.map((b) => (
            <ListItemButton key={`${b.periodId}:${b.item.id}`} onClick={() => onOpen(b.periodId)} sx={{ gap: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={900} sx={{ width: 36, flexShrink: 0, textAlign: 'center' }}>{monthOf(b.periodId, startDay)}</Typography>
              <ListItemText
                primary={b.memo || b.item.name}
                secondary={b.reason === 'override' ? `この月だけ・いつもは ${yen(b.usual ?? 0)}` : REASON[b.reason]}
                primaryTypographyProps={{ fontWeight: 700, noWrap: true }} secondaryTypographyProps={{ noWrap: true }}
                sx={{ minWidth: 0 }} />
              <Typography fontWeight={700} sx={{ flexShrink: 0 }}>{yen(b.amount)}</Typography>
              <ChevronRightIcon color="action" />
            </ListItemButton>
          ))}
          {limit && list.length > limit && (
            <Box sx={{ px: 2, pt: 0.5 }}>
              <Button size="small" onClick={() => setAll(!all)}>{all ? '閉じる' : `ほか ${list.length - limit} 件を見る`}</Button>
            </Box>
          )}
        </List>
      )}
    </Card>
  );
}
