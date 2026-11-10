import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { cardBillRows, cardTodos, type CardTodo, type PeriodSummary } from '../../domain/cashflow';
import { addPeriods, mdLabel } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { billDatesText } from '../../lib/cardBill';
import { signedYen, yen } from '../../lib/money';

export function NormalView({ data, current, summary: s, onCardTodo }: {
  data: AppData; current: string; summary: PeriodSummary;
  onCardTodo: (t: CardTodo) => void;
}) {
  const todos = useMemo(() => cardTodos(data, new Date(), current), [data, current]);
  const upcoming = useMemo(() => {
    const now = new Date();
    return [current, addPeriods(current, 1)]
      .flatMap((pid) => cardBillRows(data, pid))
      .filter((b) => b.actual === undefined && b.confirmDate && b.confirmDate > now && b.forecast > 0)
      .sort((a, b) => a.confirmDate!.getTime() - b.confirmDate!.getTime());
  }, [data, current]);

  // 先月の実績の入力は、ホームの「今やること」で扱う
  const pending = data.receivables.filter((r) => !r.receivedAt && r.expectedPeriod <= s.periodId);
  const openReceivables = data.receivables.filter((r) => !r.receivedAt);
  const backupDays = data.settings.lastBackupAt
    ? Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) : undefined;
  const needBackup = data.items.length > 0 && (backupDays === undefined || backupDays >= 30);
  const hasTodo = todos.length > 0 || pending.length > 0 || needBackup;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      {(hasTodo || upcoming.length > 0) && (
        <Card data-tour="todo">
          <CardHeader title="やること" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
          <List>
            {todos.map((t) => (
              <Todo key={`${t.periodId}:${t.bill.card.id}`} icon={<CreditCardIcon color={t.overdue ? 'error' : 'warning'} />}
                primary={`${t.bill.card.name} の請求額が確定しました。金額を入力`}
                secondary={`${billDatesText(t.bill)}・予測 ${yen(t.bill.forecast)}${t.overdue ? '・引落日を過ぎています' : ''}`}
                onClick={() => onCardTodo(t)} />
            ))}
            {pending.length > 0 && (
              <Todo icon={<ReceiptLongIcon color="warning" />}
                primary={`回収予定を過ぎた立替・精算 ${yen(pending.reduce((a, r) => a + r.amount, 0))}（${pending.length}件）`}
                href="#receivables" />
            )}
            {needBackup && (
              <Todo icon={<SaveAltIcon color="action" />}
                primary={backupDays === undefined ? 'まだバックアップを保存していません' : `最後のバックアップから ${backupDays} 日経っています`}
                href="#prefs-backup" />
            )}
            {!hasTodo && (
              <ListItem><ListItemText secondary="今やることはありません" /></ListItem>
            )}
          </List>
          {upcoming.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2, pb: 2 }}>
              次の確定: {upcoming.slice(0, 3).map((b) => `${b.card.name} ${mdLabel(b.confirmDate!)}`).join('、')}
            </Typography>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="入出金の予定" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
        <List dense>
          {s.timeline.length === 0 && <ListItem><ListItemText secondary="日付つきの項目がありません" /></ListItem>}
          {s.timeline.map((e, i) => (
            <ListItem key={i} divider={i < s.timeline.length - 1} sx={{ opacity: e.date < today ? 0.55 : 1 }}
              secondaryAction={
                <Typography variant="body2" fontWeight={700} color={e.amount > 0 ? 'success.main' : 'error.main'}>
                  {signedYen(e.amount)}
                </Typography>
              }>
              <Typography variant="body2" color="text.secondary" sx={{ width: 48, flexShrink: 0 }}>
                {e.date.getMonth() + 1}/{e.date.getDate()}
              </Typography>
              <ListItemText primary={e.label} />
              {!e.confirmed && <Chip label="予定" size="small" variant="outlined" sx={{ mr: 9 }} />}
            </ListItem>
          ))}
        </List>
      </Card>

      <Card>
        <CardHeader title="立替・経費精算" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          action={<Button size="small" href="#receivables" endIcon={<ChevronRightIcon />}>一覧・追加</Button>} sx={{ pb: 0 }} />
        <CardContent>
          {openReceivables.length === 0
            ? <Typography variant="body2" color="text.secondary">未回収のものはありません</Typography>
            : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="body2">未回収</Typography>
                <Typography variant="h6" component="span" fontWeight={700}>{yen(openReceivables.reduce((a, r) => a + r.amount, 0))}</Typography>
                <Typography variant="body2" color="text.secondary">（{openReceivables.length}件）</Typography>
              </Box>
            )}
        </CardContent>
      </Card>
    </>
  );
}

function Todo({ icon, primary, secondary, onClick, href }: {
  icon: ReactNode; primary: string; secondary?: string; onClick?: () => void; href?: string;
}) {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={onClick} {...(href ? { component: 'a', href } : {})}>
        <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
        <ListItemText primary={primary} secondary={secondary} />
        <ChevronRightIcon color="action" />
      </ListItemButton>
    </ListItem>
  );
}
