import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, List, ListItem, ListItemButton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { yen } from '../lib/money';

export interface ScheduleRow {
  key: string;
  /** 日付が決まっていれば日付。なければ label（例: 12月） */
  date?: Date;
  label?: string;
  title: string;
  sub?: string;
  amount: number;
  onClick?: () => void;
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const startOfToday = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };

/** 日付・名前・金額の予定の一覧。計画の出金予定と、ホームの予定で同じ見た目にする。過ぎた日は薄くする */
export function ScheduleList({ rows, footer }: { rows: ScheduleRow[]; footer?: ReactNode }) {
  const today = startOfToday();
  return (
    <List dense disablePadding>
      {rows.map((r) => {
        const past = !!r.date && r.date < today;
        const body = (
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', minWidth: 0, opacity: past ? 0.5 : 1 }}>
            <DateBadge date={r.date} label={r.label} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{r.title}</Typography>
              {r.sub && <Typography variant="caption" color="text.secondary" noWrap component="p">{r.sub}</Typography>}
            </Box>
            <Typography fontWeight={700} sx={{ flexShrink: 0 }}>{yen(r.amount)}</Typography>
            {r.onClick && <ChevronRightIcon color="action" sx={{ ml: -0.5 }} />}
          </Stack>
        );
        return r.onClick
          ? <ListItemButton key={r.key} onClick={r.onClick} sx={{ py: 0.75 }}>{body}</ListItemButton>
          : <ListItem key={r.key} sx={{ py: 0.75 }}>{body}</ListItem>;
      })}
      {footer}
    </List>
  );
}

/** 左の日付。11/27 と曜日、または「12月」 */
function DateBadge({ date, label }: { date?: Date; label?: string }) {
  return (
    <Box sx={{ width: 44, flexShrink: 0, textAlign: 'center', lineHeight: 1.2 }}>
      <Typography variant="subtitle2" fontWeight={900} sx={{ lineHeight: 1.3 }}>
        {date ? `${date.getMonth() + 1}/${date.getDate()}` : label}
      </Typography>
      {date && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>{WEEK[date.getDay()]}</Typography>
      )}
    </Box>
  );
}
