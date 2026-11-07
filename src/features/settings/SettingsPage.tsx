import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { countBetween } from '../../domain/items';
import { comparePeriods, periodYearLabel } from '../../domain/period';
import type { Account, AppData, Category, Item, Recurrence } from '../../domain/types';
import { DEFAULT_SETTINGS } from '../../domain/types';
import { db, newId } from '../../db/db';
import { yen } from '../../lib/money';
import { MoneyField } from '../../components/MoneyField';
import { AccountDialog, CategoryDialog, ItemDialog, KIND_LABEL } from './dialogs';
import { DataSection } from './DataSection';

function recurrenceText(r: Recurrence, startDay: number) {
  if (r.type === 'monthly') return '毎月';
  if (r.type === 'yearly') return `毎年${r.month}月`;
  return `1回のみ（${periodYearLabel(r.periodId, startDay)}）`;
}

/** 終わりが決まっている項目の「あと何回」（今月を含む）。毎月・毎年だけ */
function remainingText(i: Item, current: string) {
  if (!i.endPeriod || i.recurrence.type === 'once' || comparePeriods(i.endPeriod, current) < 0) return '';
  return `・あと${countBetween(i, i.endPeriod, current)}回`;
}

export type SettingsPageId = 'basic' | 'accounts' | 'categories' | 'items' | 'checklist' | 'import' | 'backup';

/** メニューから開く設定の各ページ。1ページに1つの項目だけを出す */
export function SettingsPage({ page, data, current }: { page: SettingsPageId; data: AppData; current: string }) {
  const [account, setAccount] = useState<Account | 'new' | null>(null);
  const [category, setCategory] = useState<Category | 'new' | null>(null);
  const [item, setItem] = useState<Item | 'new' | null>(null);
  const [showArchived, setShowArchivedState] = useState(readShowArchived);
  const setShowArchived = (v: boolean) => { setShowArchivedState(v); writeShowArchived(v); };
  const visible = <T extends { archived: boolean }>(list: T[]) => (showArchived ? list : list.filter((x) => !x.archived));
  const toggle = (list: { archived: boolean }[]) => (
    <ArchivedToggle count={list.filter((x) => x.archived).length} shown={showArchived} onChange={setShowArchived} />
  );
  const startDay = data.settings.periodStartDay;
  const accounts = [...data.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const accName = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? '未設定';
  const s = data.settings;
  const updateSettings = (patch: Partial<typeof s>) => db.settings.put({ ...DEFAULT_SETTINGS, ...s, ...patch });

  return (
    <Stack spacing={2}>
      {page === 'basic' && <Section>
        <CardContent>
          <Stack spacing={2}>
            <TextField id="set-start-day" select label="月の開始日（給料日）" value={s.periodStartDay}
              onChange={(e) => updateSettings({ periodStartDay: Number(e.target.value) })} fullWidth
              helperText={s.periodStartDay === 1 ? undefined : '土日・祝日のときは、前の平日から次の月が始まります'}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <MenuItem key={d} value={d}>{d === 1 ? '1日（暦月）' : `${d}日`}</MenuItem>)}
            </TextField>
            <MoneyField id="set-threshold" label="バッファの下限" value={s.bufferThreshold} fullWidth
              onChange={(v) => updateSettings({ bufferThreshold: v ?? 0 })} />
          </Stack>
        </CardContent>
      </Section>}

      {page === 'accounts' && <Section onAdd={() => setAccount('new')}>
        <List dense>
          {accounts.length === 0 && <Empty>口座やカードを登録してください</Empty>}
          {visible(accounts).map((a) => (
            <ListItem key={a.id} disablePadding sx={{ opacity: a.archived ? 0.5 : 1 }}>
              <ListItemButton onClick={() => setAccount(a)}>
                <ListItemIcon sx={{ minWidth: 36 }}>{a.kind === 'card' ? <CreditCardIcon fontSize="small" /> : <AccountBalanceIcon fontSize="small" />}</ListItemIcon>
                <ListItemText primary={a.name}
                  secondary={a.kind === 'card'
                    ? `${a.confirmDay ? `${a.confirmDay}日確定・` : ''}${a.withdrawDay ?? '?'}日引落 → ${accName(a.withdrawAccountId)}`
                    : '銀行口座'} />
                {a.archived && <ArchivedChip />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {toggle(accounts)}
      </Section>}

      {page === 'categories' && <Section onAdd={() => setCategory('new')}
        subheader="Zaim のカテゴリ名に合わせておくと、月末の振り返りが楽です。">
        <List dense>
          {categories.length === 0 && <Empty>カテゴリを登録してください</Empty>}
          {visible(categories).map((c) => (
            <ListItem key={c.id} disablePadding sx={{ opacity: c.archived ? 0.5 : 1 }}>
              <ListItemButton onClick={() => setCategory(c)}>
                <ListItemText primary={c.name} />
                {c.archived && <ArchivedChip />}
                <Typography variant="caption" color="text.secondary">{KIND_LABEL[c.kind]}</Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {toggle(categories)}
      </Section>}

      {page === 'items' && <Section onAdd={categories.length > 0 ? () => setItem('new') : undefined}
        subheader="登録した金額が毎月の予算に自動で入ります。月ごとの変更は「予算と実績」でカテゴリを開いて行えます。">
        <List dense>
          {data.items.length === 0 && <Empty>定期項目を登録してください</Empty>}
          {categories.map((c) => {
            const items = visible(data.items.filter((i) => i.categoryId === c.id)).sort((a, b) => a.sortOrder - b.sortOrder);
            if (items.length === 0) return null;
            return (
              <li key={c.id}>
                <ul style={{ padding: 0 }}>
                  <ListSubheader sx={{ lineHeight: '32px' }}>{c.name}</ListSubheader>
                  {items.map((i) => (
                    <ListItem key={i.id} disablePadding sx={{ opacity: i.archived ? 0.5 : 1 }}>
                      <ListItemButton onClick={() => setItem(i)}>
                        <ListItemText primary={i.name}
                          secondary={`${recurrenceText(i.recurrence, startDay)}${i.day ? `・${i.day}日` : ''}・${accName(i.sourceAccountId)}${remainingText(i, current)}`} />
                        {i.archived && <ArchivedChip />}
                        <Typography variant="body2" fontWeight={600}>{yen(i.defaultAmount)}</Typography>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </ul>
              </li>
            );
          })}
        </List>
        {toggle(data.items)}
      </Section>}

      {page === 'checklist' && <ChecklistSection data={data} />}
      {page === 'import' && <DataSection data={data} current={current} part="import" />}
      {page === 'backup' && <DataSection data={data} current={current} part="backup" />}

      {account && <AccountDialog value={account === 'new' ? undefined : account} data={data} onClose={() => setAccount(null)} />}
      {category && <CategoryDialog value={category === 'new' ? undefined : category} data={data} onClose={() => setCategory(null)} />}
      {item && <ItemDialog value={item === 'new' ? undefined : item} data={data} current={current} onClose={() => setItem(null)} />}
    </Stack>
  );
}

function Section({ title, subheader, onAdd, children }: { title?: string; subheader?: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subheader={subheader}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} subheaderTypographyProps={{ variant: 'caption' }}
        action={onAdd && <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>追加</Button>} sx={{ pb: 0 }} />
      {children}
    </Card>
  );
}

// アーカイブ済みを一覧に出すかどうか（端末ごとに覚える。口座・カテゴリ・定期項目で共通）
const SHOW_ARCHIVED_KEY = 'mitoshicho:showArchived';
const readShowArchived = () => { try { return localStorage.getItem(SHOW_ARCHIVED_KEY) === '1'; } catch { return false; } };
const writeShowArchived = (v: boolean) => { try { localStorage.setItem(SHOW_ARCHIVED_KEY, v ? '1' : '0'); } catch { /* 保存できなくても動く */ } };

/** 一覧の下に置く「アーカイブ済みを表示／隠す」。アーカイブ済みがないときは出さない */
function ArchivedToggle({ count, shown, onChange }: { count: number; shown: boolean; onChange: (v: boolean) => void }) {
  if (count === 0) return null;
  return (
    <Box sx={{ px: 1, pb: 1 }}>
      <Button size="small" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => onChange(!shown)}
        startIcon={shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <Inventory2OutlinedIcon fontSize="small" />}>
        {shown ? 'アーカイブ済みを隠す' : `アーカイブ済みを表示（${count}件）`}
      </Button>
    </Box>
  );
}

function ArchivedChip() {
  return <Chip label="アーカイブ" size="small" variant="outlined" sx={{ mx: 1, height: 20, fontSize: 10 }} />;
}

function Empty({ children }: { children: ReactNode }) {
  return <ListItem><ListItemText secondary={children} /></ListItem>;
}

function ChecklistSection({ data }: { data: AppData }) {
  const [label, setLabel] = useState('');
  const items = [...data.checklistTemplates].sort((a, b) => a.sortOrder - b.sortOrder);
  const add = async () => {
    if (!label.trim()) return;
    const order = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0;
    await db.checklistTemplates.add({ id: newId(), label: label.trim(), sortOrder: order });
    setLabel('');
  };
  return (
    <Section subheader="口座ごとの送金チェックは自動で出ます。それ以外のやることを登録します。">
      <List dense>
        {items.map((t) => (
          <ListItem key={t.id} secondaryAction={
            <IconButton edge="end" aria-label={`${t.label} を削除`} onClick={() => db.checklistTemplates.delete(t.id)}><CloseIcon fontSize="small" /></IconButton>
          }>
            <ListItemText primary={t.label} />
          </ListItem>
        ))}
      </List>
      <CardContent sx={{ pt: 0 }}>
        <Stack direction="row" spacing={1}>
          <TextField id="checklist-new" value={label} placeholder="例: 楽天へ支払い分を送金" fullWidth
            onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <Button variant="outlined" onClick={add}>追加</Button>
        </Stack>
      </CardContent>
    </Section>
  );
}
