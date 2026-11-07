import {
  Button, Card, CardHeader, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { useState } from 'react';
import { addPeriods, periodYearLabel, periodShortLabel, periodRule, type StartDay } from '../../domain/period';
import type { AppData, Receivable } from '../../domain/types';
import { db, newId } from '../../db/db';
import { AddFab } from '../../components/AddFab';
import { yen } from '../../lib/money';
import { MoneyField } from '../../components/MoneyField';
import { canAutoFocus } from '../../lib/device';

const KIND_LABEL = { reimbursement: '経費精算', split: '割り勘・立替' } as const;

export function ReceivablesPage({ data, current }: { data: AppData; current: string }) {
  const startDay = periodRule(data.settings);
  const [editing, setEditing] = useState<Receivable | 'new' | null>(null);
  const sorted = [...data.receivables].sort((a, b) => (a.expectedPeriod < b.expectedPeriod ? -1 : 1));
  const open = sorted.filter((r) => !r.receivedAt);
  const closed = sorted.filter((r) => r.receivedAt).reverse();

  const row = (r: Receivable) => (
    <ListItem key={r.id} disablePadding secondaryAction={
      <Typography fontWeight={600} color={!r.receivedAt && r.expectedPeriod < current ? 'error' : 'text.primary'}>{yen(r.amount)}</Typography>
    }>
      <ListItemIcon sx={{ minWidth: 0, pl: 1 }}>
        <Checkbox edge="start" checked={!!r.receivedAt} inputProps={{ 'aria-label': '回収済み' }}
          onChange={(e) => db.receivables.update(r.id, { receivedAt: e.target.checked ? new Date().toISOString() : undefined })} />
      </ListItemIcon>
      <ListItemButton onClick={() => setEditing(r)} sx={{ pr: 12 }}>
        <ListItemText primary={r.title} secondary={`${KIND_LABEL[r.kind]}・${periodShortLabel(r.expectedPeriod, startDay)} に回収予定`} />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">回収予定の月のバッファに加算されます。チェックで回収済みにします。</Typography>
      <Card>
        <CardHeader title="未回収" subheader={open.length > 0 ? yen(open.reduce((s, r) => s + r.amount, 0)) : undefined}
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
        <List>{open.length === 0 ? <ListItem><ListItemText secondary="未回収のものはありません" /></ListItem> : open.map(row)}</List>
      </Card>
      {closed.length > 0 && (
        <Card>
          <CardHeader title="回収済み" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
          <List>{closed.map(row)}</List>
        </Card>
      )}
      <AddFab onClick={() => setEditing('new')} />
      {editing && (
        <ReceivableDialog value={editing === 'new' ? undefined : editing} defaultPeriod={addPeriods(current, 1)}
          periodOptions={Array.from({ length: 8 }, (_, i) => addPeriods(current, i - 2))} startDay={startDay}
          onClose={() => setEditing(null)} />
      )}
    </Stack>
  );
}

function ReceivableDialog({ value, defaultPeriod, periodOptions, startDay, onClose }: {
  value?: Receivable; defaultPeriod: string; periodOptions: string[]; startDay: StartDay; onClose: () => void;
}) {
  const [title, setTitle] = useState(value?.title ?? '');
  const [kind, setKind] = useState<Receivable['kind']>(value?.kind ?? 'split');
  const [amount, setAmount] = useState<number | undefined>(value?.amount);
  const [period, setPeriod] = useState(value?.expectedPeriod ?? defaultPeriod);
  const options = periodOptions.includes(period) ? periodOptions : [period, ...periodOptions];
  const valid = title.trim() !== '' && amount !== undefined;

  const save = async () => {
    if (!valid) return;
    await db.receivables.put({
      id: value?.id ?? newId(), kind, title: title.trim(), amount: amount!, expectedPeriod: period,
      createdAt: value?.createdAt ?? new Date().toISOString(), receivedAt: value?.receivedAt,
    });
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{value ? '立替を編集' : '立替を追加'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="rcv-title" label="内容" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="rcv-kind" select label="種類" value={kind} onChange={(e) => setKind(e.target.value as Receivable['kind'])} fullWidth>
            <MenuItem value="split">割り勘・立替</MenuItem>
            <MenuItem value="reimbursement">経費精算</MenuItem>
          </TextField>
          <MoneyField id="rcv-amount" label="金額" value={amount} onChange={setAmount} fullWidth />
          <TextField id="rcv-period" select label="回収予定の月" value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth>
            {options.map((p) => <MenuItem key={p} value={p}>{periodYearLabel(p, startDay)}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        {value && <Button color="error" onClick={async () => { await db.receivables.delete(value.id); onClose(); }}>削除</Button>}
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" disabled={!valid} onClick={save}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
