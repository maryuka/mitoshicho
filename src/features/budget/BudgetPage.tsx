import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box, Card, CardContent, Chip, Collapse, Divider, Link, Stack, Typography,
} from '@mui/material';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { amountFor, summarize, type CategoryRow } from '../../domain/cashflow';
import { periodLabel } from '../../domain/period';
import type { AppData, CategoryKind } from '../../domain/types';
import { patchEntry, setCategoryActual } from '../../db/ops';
import { signedYen, yen } from '../../lib/money';
import { MoneyField } from '../../components/MoneyField';
import { PeriodNav } from '../../components/PeriodNav';
import { BudgetBar } from '../../components/BudgetBar';

const SECTIONS: { kind: CategoryKind; label: string }[] = [
  { kind: 'expense', label: '支出' },
  { kind: 'debt', label: '返済' },
  { kind: 'saving', label: '貯金・投資' },
  { kind: 'income', label: '収入' },
];

/** 月ごとの予算と実績。実績は Zaim で集計したカテゴリ合計を入れて振り返る */
export function BudgetPage({ data, period, setPeriod, current, menu }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; menu?: ReactNode;
}) {
  const startDay = data.settings.periodStartDay;
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const expense = s.categories.filter((c) => c.kind === 'expense');
  const budget = expense.reduce((a, c) => a + c.planned, 0);
  const entered = expense.filter((c) => c.actual !== undefined);
  const spent = entered.reduce((a, c) => a + (c.actual ?? 0), 0);
  const diff = spent - entered.reduce((a, c) => a + c.planned, 0);
  const enteredAll = s.categories.filter((c) => c.actual !== undefined).length;

  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };

  return (
    <Stack spacing={2}>
      <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} leading={menu} />

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2} sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">支出の実績 / 予算</Typography>
              <Typography variant="h5" fontWeight={700}>
                {yen(spent)} <Typography component="span" color="text.secondary">/ {yen(budget)}</Typography>
              </Typography>
            </Box>
            {entered.length > 0 && (
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary">予算との差</Typography>
                <Typography variant="h6" fontWeight={700} color={diff > 0 ? 'error' : 'success.main'}>{signedYen(diff)}</Typography>
              </Box>
            )}
          </Stack>
          <BudgetBar value={spent} max={budget} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {enteredAll === 0
              ? `月末に Zaim でこの月（${periodLabel(period, startDay)}）のカテゴリ別合計を見て、実績欄に入力してください。予算どおりのものは「＝予算」で入れられます。`
              : `${enteredAll} / ${s.categories.length} カテゴリ入力済み`}
          </Typography>
        </CardContent>
      </Card>

      {SECTIONS.map(({ kind, label }) => {
        const cats = s.categories.filter((c) => c.kind === kind);
        if (cats.length === 0) return null;
        return (
          <Card key={kind}>
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 132, textAlign: 'center' }}>実績</Typography>
              </Stack>
              {cats.map((c, i) => (
                <Fragment key={c.category.id}>
                  {i > 0 && <Divider />}
                  <ReviewRow row={c} period={period} open={open.has(c.category.id)} onToggle={() => toggle(c.category.id)} />
                </Fragment>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function ReviewRow({ row, period, open, onToggle }: {
  row: CategoryRow; period: string; open: boolean; onToggle: () => void;
}) {
  const income = row.kind === 'income';
  const actual = row.actual;
  const over = actual !== undefined && !income && actual > row.planned;
  return (
    <Box sx={{ py: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box component="button" onClick={onToggle} aria-expanded={open}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: '100%', p: 0, border: 0, bgcolor: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
            {open ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
            <Typography noWrap>{row.category.name}</Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 3 }}>
            <Typography variant="caption" color="text.secondary" noWrap>予算 {yen(row.planned)}</Typography>
            {actual === undefined && row.planned > 0 && (
              <Link component="button" variant="caption" underline="hover"
                aria-label={`${row.category.name} を予算どおりで入力`}
                onClick={() => setCategoryActual(period, row.category.id, row.planned)} sx={{ whiteSpace: 'nowrap' }}>
                ＝予算
              </Link>
            )}
          </Stack>
        </Box>
        <MoneyField value={actual} sx={{ width: 132, flexShrink: 0 }} ariaLabel={`${row.category.name} の実績`}
          onChange={(v) => setCategoryActual(period, row.category.id, v)} />
      </Stack>

      {actual !== undefined ? (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {!income && <BudgetBar value={actual} max={row.planned} />}
          <Typography variant="caption" color={over ? 'error' : 'text.secondary'}>
            {income
              ? `予定との差 ${signedYen(actual - row.planned)}`
              : over ? `${yen(actual - row.planned)} 超過` : `${yen(row.planned - actual)} 余り`}
          </Typography>
        </Stack>
      ) : null}

      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ mt: 1, ml: 2.5, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
          {row.items.length === 0 && <Typography variant="caption" color="text.secondary">このカテゴリの項目はこの月にありません</Typography>}
          {row.items.map((r) => (
            <Stack key={r.item.id} direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {r.item.name}
                {r.viaCard && <Chip label="カード" size="small" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
              </Typography>
              <MoneyField value={r.hasOverride ? r.planned : undefined} placeholder={amountFor(r.item, period)} sx={{ width: 132, flexShrink: 0 }}
                ariaLabel={`${r.item.name} のこの月の予算`}
                onChange={(v) => patchEntry(period, r.item.id, { planned: v ?? null })} />
            </Stack>
          ))}
          {row.items.length > 0 && (
            <Typography variant="caption" color="text.secondary">この月だけの予算に変えられます（空欄ならいつもの金額）</Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
