import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, ListSubheader, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { useState } from 'react';
import { addPeriods, periodLabel } from '../../domain/period';
import type { Account, AppData, Category, CategoryKind, Item, Recurrence } from '../../domain/types';
import { db, newId } from '../../db/db';
import { MoneyField } from '../../components/MoneyField';
import { confirmDialog } from '../../components/ConfirmDialog';
import { canAutoFocus } from '../../lib/device';

export const KIND_LABEL: Record<CategoryKind, string> = { income: '収入', expense: '支出', debt: '返済', saving: '貯金・投資' };
const nextOrder = (xs: { sortOrder: number }[]) => (xs.length ? Math.max(...xs.map((x) => x.sortOrder)) + 1 : 0);

function Actions({ archived, onArchive, onDelete, onSave, onClose, valid }: {
  archived?: boolean; onArchive?: (archived: boolean) => void; onDelete?: () => void;
  onSave: () => void; onClose: () => void; valid: boolean;
}) {
  return (
    <DialogActions>
      {onDelete && <Button color="error" onClick={onDelete}>削除</Button>}
      {onArchive && <Button onClick={() => onArchive(!archived)}>{archived ? '使用中に戻す' : 'アーカイブ'}</Button>}
      <Button onClick={onClose}>キャンセル</Button>
      <Button variant="contained" disabled={!valid} onClick={onSave}>保存</Button>
    </DialogActions>
  );
}

export function AccountDialog({ value, data, onClose }: { value?: Account; data: AppData; onClose: () => void }) {
  const [name, setName] = useState(value?.name ?? '');
  const [kind, setKind] = useState<Account['kind']>(value?.kind ?? 'bank');
  const [withdrawDay, setWithdrawDay] = useState<number | undefined>(value?.withdrawDay ?? 26);
  const [confirmDay, setConfirmDay] = useState<number | undefined>(value?.confirmDay);
  const [withdrawAccountId, setWithdrawAccountId] = useState(value?.withdrawAccountId ?? '');
  const [lag, setLag] = useState(value?.billLagPeriods ?? 1);
  const banks = data.accounts.filter((a) => a.kind === 'bank' && a.id !== value?.id);
  const valid = name.trim() !== '';

  const save = async () => {
    const base = { id: value?.id ?? newId(), name: name.trim(), kind, sortOrder: value?.sortOrder ?? nextOrder(data.accounts), archived: value?.archived ?? false };
    await db.accounts.put(kind === 'card'
      ? { ...base, withdrawDay, confirmDay, withdrawAccountId: withdrawAccountId || undefined, billLagPeriods: lag }
      : base);
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{value ? '口座・カードを編集' : '口座・カードを追加'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="acc-name" label="名前" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="acc-kind" select label="種類" value={kind} onChange={(e) => setKind(e.target.value as Account['kind'])} fullWidth>
            <MenuItem value="bank">銀行口座</MenuItem>
            <MenuItem value="card">クレジットカード</MenuItem>
          </TextField>
          {kind === 'card' && (
            <>
              <Stack direction="row" spacing={1}>
                <DayField id="acc-withdraw-day" label="引落日（毎月）" value={withdrawDay} onChange={setWithdrawDay} />
                <DayField id="acc-confirm-day" label="請求確定日（毎月）" value={confirmDay} onChange={setConfirmDay} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                確定日になるとホームに「請求額を入力」が出ます。月ごとにずれる場合は、その月の請求を開いて日付を変えられます。
              </Typography>
              <TextField id="acc-withdraw-account" select label="引落口座" value={withdrawAccountId} onChange={(e) => setWithdrawAccountId(e.target.value)} fullWidth>
                <MenuItem value="">（未設定）</MenuItem>
                {banks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
              <TextField id="acc-lag" select label="請求のタイミング" value={lag} onChange={(e) => setLag(Number(e.target.value))} fullWidth>
                <MenuItem value={0}>使った月と同じ月に引落</MenuItem>
                <MenuItem value={1}>使った月の翌月に引落</MenuItem>
                <MenuItem value={2}>使った月の2か月後に引落</MenuItem>
              </TextField>
            </>
          )}
        </Stack>
      </DialogContent>
      <Actions archived={value?.archived} valid={valid} onSave={save} onClose={onClose}
        onArchive={value && (async (a) => { await db.accounts.update(value.id, { archived: a }); onClose(); })} />
    </Dialog>
  );
}

function DayField({ id, label, value, onChange }: { id: string; label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <TextField id={id} select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} fullWidth>
      <MenuItem value="">（未設定）</MenuItem>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <MenuItem key={d} value={d}>{d}日</MenuItem>)}
    </TextField>
  );
}

export function CategoryDialog({ value, data, onClose }: { value?: Category; data: AppData; onClose: () => void }) {
  const [name, setName] = useState(value?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(value?.kind ?? 'expense');
  const valid = name.trim() !== '';
  const save = async () => {
    await db.categories.put({ id: value?.id ?? newId(), name: name.trim(), kind, sortOrder: value?.sortOrder ?? nextOrder(data.categories), archived: value?.archived ?? false });
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{value ? 'カテゴリを編集' : 'カテゴリを追加'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="cat-name" label="名前（Zaim のカテゴリ名に合わせると振り返りが楽です）" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="cat-kind" select label="種類" value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)} fullWidth>
            {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => <MenuItem key={k} value={k}>{KIND_LABEL[k]}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <Actions archived={value?.archived} valid={valid} onSave={save} onClose={onClose}
        onArchive={value && (async (a) => { await db.categories.update(value.id, { archived: a }); onClose(); })} />
    </Dialog>
  );
}

export function ItemDialog({ value, data, current, onClose }: { value?: Item; data: AppData; current: string; onClose: () => void }) {
  const startDay = data.settings.periodStartDay;
  const cats = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const [name, setName] = useState(value?.name ?? '');
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? cats[0]?.id ?? '');
  const [amount, setAmount] = useState<number | undefined>(value?.defaultAmount);
  const [day, setDay] = useState<number | undefined>(value?.day);
  const [source, setSource] = useState(value?.sourceAccountId ?? '');
  const [recType, setRecType] = useState<Recurrence['type']>(value?.recurrence.type ?? 'monthly');
  const [month, setMonth] = useState(value?.recurrence.type === 'yearly' ? value.recurrence.month : 1);
  const [once, setOnce] = useState(value?.recurrence.type === 'once' ? value.recurrence.periodId : current);
  const [startPeriod, setStartPeriod] = useState(value?.startPeriod ?? current);
  const [endPeriod, setEndPeriod] = useState(value?.endPeriod ?? '');
  const options = Array.from({ length: 49 }, (_, i) => addPeriods(current, i - 24));
  const withValue = (v: string) => (v && !options.includes(v) ? [v, ...options] : options);
  const kind = data.categories.find((c) => c.id === categoryId)?.kind;
  const valid = name.trim() !== '' && amount !== undefined && categoryId !== '';
  const accounts = data.accounts.filter((a) => (!a.archived || a.id === source) && (kind !== 'income' || a.kind === 'bank'));

  const save = async () => {
    if (!valid) return;
    const recurrence: Recurrence = recType === 'monthly' ? { type: 'monthly' }
      : recType === 'yearly' ? { type: 'yearly', month } : { type: 'once', periodId: once };
    await db.items.put({
      id: value?.id ?? newId(), name: name.trim(), categoryId, defaultAmount: amount!, day,
      sourceAccountId: source || undefined, recurrence,
      startPeriod: recType === 'once' ? once : startPeriod,
      endPeriod: recType === 'once' ? once : endPeriod || undefined,
      sortOrder: value?.sortOrder ?? nextOrder(data.items), archived: value?.archived ?? false,
    });
    onClose();
  };
  const remove = async () => {
    if (!value) return;
    if (!await confirmDialog(`「${value.name}」と、その月ごとの予算の変更をすべて削除します。よろしいですか？`)) return;
    await db.transaction('rw', db.items, db.entries, async () => {
      await db.entries.where('itemId').equals(value.id).delete();
      await db.items.delete(value.id);
    });
    onClose();
  };
  const monthSelect = (id: string, label: string, v: string, set: (s: string) => void, allowEmpty = false) => (
    <TextField id={id} select label={label} value={v} onChange={(e) => set(e.target.value)} fullWidth>
      {allowEmpty && <MenuItem value="">（なし）</MenuItem>}
      {withValue(v).map((p) => <MenuItem key={p} value={p}>{periodLabel(p, startDay)}</MenuItem>)}
    </TextField>
  );

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{value ? '定期項目を編集' : '定期項目を追加'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="item-name" label="名前" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="item-category" select label="カテゴリ" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
            {cats.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}（{KIND_LABEL[c.kind]}）</MenuItem>)}
          </TextField>
          <MoneyField id="item-amount" label="金額（毎回の予算）" value={amount} onChange={setAmount} fullWidth />
          <TextField id="item-source" select label={kind === 'income' ? '入金先' : '支払い元'} value={source} onChange={(e) => setSource(e.target.value)} fullWidth
            helperText={kind === 'income' ? undefined : 'カードを選ぶと翌月のカード請求の予測に入ります'}>
            <MenuItem value="">（未設定）</MenuItem>
            {accounts.some((a) => a.kind === 'bank') && <ListSubheader>銀行口座</ListSubheader>}
            {accounts.filter((a) => a.kind === 'bank').map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            {accounts.some((a) => a.kind === 'card') && <ListSubheader>カード</ListSubheader>}
            {accounts.filter((a) => a.kind === 'card').map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <DayField id="item-day" label="入出金日（任意・予定の表示用）" value={day} onChange={setDay} />
          <TextField id="item-recurrence" select label="頻度" value={recType} onChange={(e) => setRecType(e.target.value as Recurrence['type'])} fullWidth>
            <MenuItem value="monthly">毎月</MenuItem>
            <MenuItem value="yearly">毎年（年会費など）</MenuItem>
            <MenuItem value="once">1回のみ（臨時）</MenuItem>
          </TextField>
          {recType === 'yearly' && (
            <TextField id="item-month" select label="何月か" value={month} onChange={(e) => setMonth(Number(e.target.value))} fullWidth>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <MenuItem key={m} value={m}>{m}月</MenuItem>)}
            </TextField>
          )}
          {recType === 'once'
            ? monthSelect('item-once', '月', once, setOnce)
            : (
              <>
                {monthSelect('item-start', '開始月', startPeriod, setStartPeriod)}
                {monthSelect('item-end', '終了月（返済の最終回など）', endPeriod, setEndPeriod, true)}
              </>
            )}
        </Stack>
      </DialogContent>
      <Actions archived={value?.archived} valid={valid} onSave={save} onClose={onClose}
        onArchive={value && (async (a) => { await db.items.update(value.id, { archived: a }); onClose(); })}
        onDelete={value && remove} />
    </Dialog>
  );
}
