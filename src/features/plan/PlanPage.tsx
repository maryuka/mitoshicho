import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent, CardHeader, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { bigExpenses, summarize, type BigExpense, type CategoryRow, type PeriodSummary } from '../../domain/cashflow';
import { addPeriods, periodLabel, periodRule, periodStart } from '../../domain/period';
import { DRIFT_LABEL, driftHints, monthDrifts, type Drift, type DriftHint } from '../../domain/review';
import type { AppData, CategoryKind } from '../../domain/types';
import { db, newId } from '../../db/db';
import { yen } from '../../lib/money';
import { MoneyField } from '../../components/MoneyField';
import { PeriodNav } from '../../components/PeriodNav';
import { KITSUNE } from '../../components/Kitsune';
import { CategoryItems } from '../budget/parts';
import { OnceItemDialog } from '../settings/dialogs';
import { OutflowsCard } from '../home/Outlook';
import { ScheduleList } from '../../components/ScheduleList';

const REASON: Record<BigExpense['reason'], string> = { yearly: '年払い', interval: '数か月ごと', once: '1回だけ', override: 'いつもより多め' };

/** 計画: その月の大きい出費と、カテゴリごとの予算を、先月のずれをふまえてざっくり決める */
export function PlanPage({ data, period, setPeriod, current, menu }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; menu?: ReactNode;
}) {
  const startDay = periodRule(data.settings);
  const focus = data.settings.planFocus ?? 'budget';
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const big = useMemo(() => bigExpenses(data, period), [data, period]);
  const prev = addPeriods(period, -1);
  const drifts = useMemo(() => new Map(monthDrifts(data, prev).map((d) => [d.category.id, d])), [data, prev]);
  // この月の前の3か月で続いているずれ（ふりかえりの「改善のヒント」と同じもの）。カテゴリごとに1つ
  const hints = useMemo(() => {
    const m = new Map<string, DriftHint>();
    for (const h of driftHints(data, period)) if (!m.has(h.category.id)) m.set(h.category.id, h);
    return m;
  }, [data, period]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BigExpense | null>(null);

  const total = (k: CategoryKind[]) => s.categories.filter((c) => k.includes(c.kind)).reduce((a, c) => a + c.planned, 0);
  const income = total(['income']);
  const spend = total(['expense', 'debt']);
  const saving = total(['saving']);
  const over = spend + saving - income;
  const expense = s.categories.filter((c) => c.kind === 'expense');
  const others = s.categories.filter((c) => c.kind !== 'expense');

  return (
    <Stack spacing={2}>
      <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} leading={menu} />

      <Card data-tour="summary">
        <CardContent sx={{ pb: '16px !important' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box component="img" src={KITSUNE.counting} alt="" sx={{ width: 52, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              {periodLabel(period, startDay)}の計画。先月のずれをふまえて、ざっくり決めよう。
            </Typography>
          </Stack>
          {/* 「予算」（カードは使う月で数える）と「口座のお金」（カードは引き落とされる月で数える）。設定で選んだほうを大きく、もう一方は1行で */}
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1.5, borderColor: 'divider', borderTopStyle: 'solid' }}>
            {focus === 'cash' ? <>
              <CashMain s={s} />
              <BudgetLine income={income} spend={spend} saving={saving} />
            </> : <>
              <SectionLabel title="予算" note="カードは使う月で数える" />
              <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                <Figure label="収入" value={income} />
                <Figure label="使う予定" value={spend} />
                <Figure label="積み立て" value={saving} />
              </Stack>
            </>}
            {/* 口座のお金が足りなくなる月は、そちらでまとめて伝える（同じ助言を2回出さない） */}
            {over > 0 && s.buffer >= 0 && (
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1, lineHeight: 1.7 }}>
                計画が収入を {yen(over)} こえているよ。積み立てを減らすか、貯金から出すか決めておこう。
              </Typography>
            )}
            {focus === 'cash' ? (s.buffer < 0 && <ShortNote s={s} />) : <CashLine s={s} />}
          </Box>
        </CardContent>
      </Card>

      <Card data-tour="plan-big">
        <CardHeader title="この月の大きい出費" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          subheader="旅行・家電・年払いなど。先に入れておくと安心" subheaderTypographyProps={{ variant: 'caption' }} sx={{ pb: 0 }} />
        {big.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>この月はないよ。</Typography>
        ) : (
          <ScheduleList rows={big.map((b) => ({
            key: b.item.id, date: b.date, label: `${periodStart(period, startDay).getMonth() + 1}月`,
            title: b.memo || b.item.name, amount: b.amount,
            sub: `${b.category.name}・${b.reason === 'override' ? `いつもは ${yen(b.usual ?? 0)}` : REASON[b.reason]}`,
            onClick: b.reason === 'once' ? () => setEditing(b) : undefined,
          }))} />
        )}
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setAdding(true)}>大きい出費を追加</Button>
        </Box>
      </Card>

      <Card data-tour="plan-categories">
        <CardHeader title="カテゴリごとの予算" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          subheader="開くと、項目ごとにこの月だけの金額に変えられるよ" subheaderTypographyProps={{ variant: 'caption' }} sx={{ pb: 0 }} />
        <CardContent sx={{ pt: 1, pb: '8px !important' }}>
          {expense.map((c) => <CategoryRowView key={c.category.id} row={c} drift={drifts.get(c.category.id)} hint={hints.get(c.category.id)} period={period} data={data} />)}
          {others.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={700} component="p" sx={{ mt: 2, mb: 0.5 }}>収入・返済・積み立て</Typography>
              {others.map((c) => <CategoryRowView key={c.category.id} row={c} period={period} data={data} />)}
            </>
          )}
        </CardContent>
      </Card>

      <OutflowsCard summary={s} title="出金予定" />

      {adding && <AddBigExpenseDialog data={data} period={period} onClose={() => setAdding(false)} />}
      {editing && <OnceItemDialog value={editing.item} planned={editing.amount} data={data} onClose={() => setEditing(null)} />}
    </Stack>
  );
}

const cashResult = (s: PeriodSummary) => (s.buffer < 0 ? `${yen(-s.buffer)} 足りない` : `${yen(s.buffer)} 残る`);
const cashFormula = (s: PeriodSummary) =>
  `収入 ${yen(s.incomeTotal)} − 口座から出るお金 ${yen(s.directOutTotal)} − カードの引落 ${yen(s.cardBillTotal)}`
  + (s.receivableTotal > 0 ? ` + 立替の回収 ${yen(s.receivableTotal)}` : '');

/** 口座のお金を大きく（設定で「口座のお金」を選んだとき）。給料日のチェックの「残るお金」と同じ計算 */
function CashMain({ s }: { s: PeriodSummary }) {
  return (
    <Box>
      <SectionLabel title="口座のお金" note="カードは引き落とされる月で数える" />
      <Typography variant="h5" component="p" fontWeight={900} color={s.buffer < 0 ? 'error.main' : 'text.primary'} sx={{ mt: 0.5 }}>
        {cashResult(s)}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25, lineHeight: 1.7 }}>{cashFormula(s)}</Typography>
    </Box>
  );
}

/** 予算を1行で（設定で「口座のお金」を選んだとき） */
function BudgetLine({ income, spend, saving }: { income: number; spend: number; saving: number }) {
  return (
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: 'divider', lineHeight: 1.7 }}>
      <Box component="span" fontWeight={900} color="text.primary" sx={{ mr: 0.75 }}>予算</Box>
      収入 {yen(income)}・使う予定 {yen(spend)}・積み立て {yen(saving)}（カードは使う月で数える）
    </Typography>
  );
}

/**
 * 口座のお金を1行で（設定で「予算」を選んだとき）。
 * 足りなくなる月だけは、見のがさないように目立たせて、ひとこと添える
 */
function CashLine({ s }: { s: PeriodSummary }) {
  if (s.buffer < 0) return <ShortNote s={s} withResult />;
  return (
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: 'divider', lineHeight: 1.7 }}>
      <Box component="span" fontWeight={900} color="text.primary" sx={{ mr: 0.75 }}>口座のお金</Box>
      {cashResult(s)}（カードは引き落とされる月で数える）
    </Typography>
  );
}

/** 口座のお金が足りなくなる月のひとこと */
function ShortNote({ s, withResult }: { s: PeriodSummary; withResult?: boolean }) {
  return (
    <Box sx={{ mt: 1.25, p: 1.25, borderRadius: '8px', bgcolor: 'soft' }}>
      {withResult && <>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
          <Typography variant="body2" fontWeight={900}>口座のお金</Typography>
          <Typography fontWeight={900} color="error.main" sx={{ flexShrink: 0 }}>{cashResult(s)}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ fontSize: 11 }}>カードは引き落とされる月で数える</Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, lineHeight: 1.7 }}>{cashFormula(s)}</Typography>
      </>}
      <Typography variant="caption" component="p" sx={{ mt: withResult ? 0.5 : 0, lineHeight: 1.7 }}>
        この月は出ていくお金が多めで、口座のお金が足りなくなりそう。積み立てを少し減らすか、貯金から出すか決めておこう。
      </Typography>
    </Box>
  );
}

function SectionLabel({ title, note }: { title: string; note: string }) {
  return (
    <Typography variant="body2" component="p" sx={{ minWidth: 0 }}>
      <Box component="span" fontWeight={900}>{title}</Box>
      <Box component="span" sx={{ color: 'text.secondary', fontSize: 11, ml: 0.75 }}>{note}</Box>
    </Typography>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{yen(value)}</Typography>
    </Box>
  );
}

/** カテゴリ1行。先月のずれがあれば小さく添える。開くと項目ごとの金額 */
function CategoryRowView({ row, drift, hint, period, data }: {
  row: CategoryRow; drift?: Drift; hint?: DriftHint; period: string; data: AppData;
}) {
  return (
    <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&::before': { display: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, '& .MuiAccordionSummary-content': { my: 1.25, minWidth: 0 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ minWidth: 0 }}>{row.category.name}</Typography>
              {/* 改善のヒントがあるカテゴリ。開くとヒントの文が出る */}
              {hint && <LightbulbOutlinedIcon color="primary" sx={{ fontSize: 18, flexShrink: 0 }} titleAccess="改善のヒントあり" />}
            </Stack>
            <Typography fontWeight={700} sx={{ flexShrink: 0, mr: 1 }}>{yen(row.planned)}</Typography>
          </Stack>
          {drift && (
            <Chip size="small" variant="outlined" sx={{ mt: 0.5, height: 22, fontSize: 11, maxWidth: '100%' }}
              label={`先月 ${drift.diff > 0 ? '+' : '-'}${yen(Math.abs(drift.diff))}${drift.kind ? `・${DRIFT_LABEL[drift.kind]}` : ''}${drift.memo ? `「${drift.memo}」` : ''}`} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>
        {hint && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, p: 1.25, borderRadius: '8px', bgcolor: 'soft' }}>
            <LightbulbOutlinedIcon color="primary" sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{hint.text}</Typography>
          </Stack>
        )}
        <CategoryItems row={row} period={period} data={data} />
      </AccordionDetails>
    </Accordion>
  );
}

/** 大きい出費を、この月だけの項目として足す */
function AddBigExpenseDialog({ data, period, onClose }: { data: AppData; period: string; onClose: () => void }) {
  const cats = data.categories.filter((c) => !c.archived && (c.kind === 'expense' || c.kind === 'debt')).sort((a, b) => a.sortOrder - b.sortOrder);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? '');
  const [amount, setAmount] = useState<number | undefined>();
  const valid = name.trim() !== '' && categoryId !== '' && amount !== undefined;
  const save = async () => {
    if (!valid) return;
    const order = data.items.length ? Math.max(...data.items.map((i) => i.sortOrder)) + 1 : 0;
    await db.items.add({
      id: newId(), name: name.trim(), categoryId, defaultAmount: amount!,
      recurrence: { type: 'once', periodId: period }, startPeriod: period, endPeriod: period, sortOrder: order, archived: false,
    });
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>大きい出費を追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="名前" placeholder="例: 旅行・冷蔵庫の買い替え" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField select label="カテゴリ" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
            {cats.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <MoneyField label="金額" value={amount} onChange={setAmount} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button onClick={save} variant="contained" disabled={!name.trim() || !categoryId}>追加</Button>
      </DialogActions>
    </Dialog>
  );
}
