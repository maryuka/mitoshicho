import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { countBetween } from '../../domain/items';
import { amountFor } from '../../domain/cashflow';
import { comparePeriods, periodFromLabel, periodYearLabel, periodRule, type StartDay } from '../../domain/period';
import type { Account, AppData, Category, ChecklistTemplate, Item, Recurrence } from '../../domain/types';
import { yen } from '../../lib/money';
import { AccountDialog, CategoryDialog, ChecklistDialog, ItemDialog, KIND_LABEL } from './dialogs';
import { DataSection } from './DataSection';
import { PaydayFields } from './PaydayFields';
import { DriftFields } from '../review/Drift';
import { HomeFields } from './HomeFields';
import { PlanFocusFields } from './PlanFocusFields';
import { AddFab } from '../../components/AddFab';
import { PageNote } from '../../components/PageNote';
import { useThemePref } from '../../theme';

function recurrenceText(r: Recurrence, startDay: StartDay) {
  if (r.type === 'monthly') return '毎月';
  if (r.type === 'interval') return `${r.months}か月に1回`;
  if (r.type === 'yearly') return `毎年${r.month}月`;
  return `1回のみ（${periodYearLabel(r.periodId, startDay)}）`;
}

/** 終わりが決まっている項目の「あと何回」（今月を含む）。毎月・毎年だけ */
function remainingText(i: Item, current: string) {
  if (!i.endPeriod || i.recurrence.type === 'once' || comparePeriods(i.endPeriod, current) < 0) return '';
  return `・あと${countBetween(i, i.endPeriod, current)}回`;
}

/** 今月より後にある、いちばん近い金額の変更 */
function nextChange(i: Item, current: string) {
  return i.amountChanges?.find((c) => comparePeriods(c.from, current) > 0);
}

export type SettingsPageId = 'basic' | 'appearance' | 'accounts' | 'categories' | 'items' | 'checklist' | 'review' | 'home' | 'plan' | 'import' | 'backup';

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
  const startDay = periodRule(data.settings);
  // 1回のみの項目は計画で扱うので、定期項目の一覧には出さない
  const recurring = data.items.filter((i) => i.recurrence.type !== 'once');
  const accounts = [...data.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const accName = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? '未設定';
  const s = data.settings;
  const [themePref, setThemePref] = useThemePref();

  return (
    <Stack spacing={2}>
      {page === 'basic' && <Section>
        <CardContent><PaydayFields settings={s} /></CardContent>
      </Section>}

      {page === 'plan' && <Section note="選ばなかったほうも、下に1行で出ます。口座のお金が足りなくなる月は、どちらを選んでもお知らせします。">
        <CardContent><PlanFocusFields settings={s} /></CardContent>
      </Section>}

      {page === 'home' && <Section>
        <CardContent><HomeFields settings={s} /></CardContent>
      </Section>}

      {page === 'review' && <Section>
        <CardContent><DriftFields settings={s} /></CardContent>
      </Section>}

      {page === 'appearance' && <Section>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>画面の明るさ</Typography>
          <ToggleButtonGroup value={themePref} exclusive fullWidth size="small" aria-label="画面の明るさ"
            onChange={(_, v) => { if (v) setThemePref(v); }}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700 } }}>
            <ToggleButton value="system">端末に合わせる</ToggleButton>
            <ToggleButton value="light">ライト</ToggleButton>
            <ToggleButton value="dark">ダーク</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
            この端末だけの設定です（バックアップには入りません）
          </Typography>
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
        note="家計簿アプリのカテゴリ名に合わせておくと、月末の振り返りが楽です。">
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
        note="登録した金額が毎月の予算に自動で入ります。その月だけの金額の変更や、1回だけの項目は「計画」で入れます。">
        <List dense>
          {recurring.length === 0 && <Empty>定期項目を登録してください</Empty>}
          {categories.map((c) => {
            const items = visible(recurring.filter((i) => i.categoryId === c.id)).sort((a, b) => a.sortOrder - b.sortOrder);
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
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="body2" fontWeight={600}>{yen(amountFor(i, current))}</Typography>
                          {nextChange(i, current) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {periodFromLabel(nextChange(i, current)!.from, startDay)} {yen(nextChange(i, current)!.amount)}
                            </Typography>
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </ul>
              </li>
            );
          })}
        </List>
        {toggle(recurring)}
      </Section>}

      {page === 'checklist' && <ChecklistSection data={data} current={current} />}
      {page === 'import' && <DataSection data={data} current={current} part="import" />}
      {page === 'backup' && <DataSection data={data} current={current} part="backup" />}

      {account && <AccountDialog value={account === 'new' ? undefined : account} data={data} onClose={() => setAccount(null)} />}
      {category && <CategoryDialog value={category === 'new' ? undefined : category} data={data} onClose={() => setCategory(null)} />}
      {item && <ItemDialog value={item === 'new' ? undefined : item} data={data} current={current} onClose={() => setItem(null)} />}
    </Stack>
  );
}

/** note はカードの外（上）に出すページの説明。onAdd があれば、画面右下に「追加」ボタンを出す */
function Section({ title, note, onAdd, children }: { title?: string; note?: ReactNode; onAdd?: () => void; children: ReactNode }) {
  return (
    <>
      {note && <PageNote>{note}</PageNote>}
      <Card>
        {title && <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />}
        {children}
      </Card>
      {onAdd && <AddFab onClick={onAdd} />}
    </>
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

function ChecklistSection({ data, current }: { data: AppData; current: string }) {
  const [editing, setEditing] = useState<ChecklistTemplate | 'new' | null>(null);
  const startDay = periodRule(data.settings);
  // 繰り返すものと、今月以降の「1回だけ」のもの（過ぎた月の1回だけのものは出さない）。1回だけのものは月の順に後ろへ
  const onceOf = (t: ChecklistTemplate) => (t.recurrence?.type === 'once' ? t.recurrence.periodId : undefined);
  const items = data.checklistTemplates
    .filter((t) => { const p = onceOf(t); return !p || comparePeriods(p, current) >= 0; })
    .sort((a, b) => (onceOf(a) ?? '').localeCompare(onceOf(b) ?? '') || a.sortOrder - b.sortOrder);
  return (
    <Section onAdd={() => setEditing('new')}
      note="口座ごとの送金チェックは自動で出ます。それ以外のやることを登録します。1回だけのやることは、頻度で月を選んで足せます（今月の分は「給料日のチェック」からも足せます）。">
      <List dense>
        {items.length === 0 && <Empty>やることを登録してください</Empty>}
        {items.map((t) => (
          <ListItem key={t.id} disablePadding>
            <ListItemButton onClick={() => setEditing(t)}>
              <ListItemText primary={t.label} secondary={checklistText(t, startDay)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {editing && <ChecklistDialog value={editing === 'new' ? undefined : editing} data={data} current={current} onClose={() => setEditing(null)} />}
    </Section>
  );
}

function checklistText(t: ChecklistTemplate, startDay: StartDay) {
  const parts = [recurrenceText(t.recurrence ?? { type: 'monthly' }, startDay)];
  if (t.endPeriod && t.recurrence?.type !== 'once') parts.push(`${periodYearLabel(t.endPeriod, startDay)} まで`);
  return parts.join('・');
}
