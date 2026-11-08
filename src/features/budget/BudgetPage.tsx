import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box, Button, Card, CardContent, Chip, Divider, IconButton, Link, Stack, TextField, Typography,
} from '@mui/material';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { amountFor, summarize, type CardBillRow, type CategoryRow, type ItemRow } from '../../domain/cashflow';
import { OnceItemDialog } from '../settings/dialogs';
import { periodLabel, periodRule } from '../../domain/period';
import type { AppData, CategoryKind } from '../../domain/types';
import { patchEntry, saveCardBill, setCategoryActual } from '../../db/ops';
import { BILL_STATUS, billDatesText, billStatus } from '../../lib/cardBill';
import { CardBillDialog } from '../../components/CardBillDialog';
import { db, newId } from '../../db/db';
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

/** ふりかえり（月ごとの予算と実績）。実績は家計簿アプリで集計したカテゴリ合計を入れて振り返る */
export type Mode = 'budget' | 'actual';

/** 下のメニューの「計画」（mode=budget）と「ふりかえり」（mode=actual）の画面 */
export function BudgetPage({ mode, data, period, setPeriod, current, menu }: {
  mode: Mode; data: AppData; period: string; setPeriod: (p: string) => void; current: string; menu?: ReactNode;
}) {
  const startDay = periodRule(data.settings);
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);

  const expense = s.categories.filter((c) => c.kind === 'expense');
  const budget = expense.reduce((a, c) => a + c.planned, 0);
  const entered = expense.filter((c) => c.actual !== undefined);
  const spent = entered.reduce((a, c) => a + (c.actual ?? 0), 0);
  const diff = spent - entered.reduce((a, c) => a + c.planned, 0);
  const enteredAll = s.categories.filter((c) => c.actual !== undefined).length;
  const totalOf = (kind: CategoryKind) => s.categories.filter((c) => c.kind === kind).reduce((a, c) => a + c.planned, 0);

  return (
    <Stack spacing={2}>
      <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} leading={menu} />

      {mode === 'budget' ? (
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">この月の予算（支出）</Typography>
            <Typography variant="h5" fontWeight={700}>{yen(budget)}</Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
              {(['debt', 'saving', 'income'] as CategoryKind[]).map((k) => totalOf(k) > 0 && (
                <Typography key={k} variant="caption" color="text.secondary">
                  {SECTIONS.find((x) => x.kind === k)!.label} {yen(totalOf(k))}
                </Typography>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              項目の金額を変えると、この月だけの予算になります（空欄ならいつもの金額）。この月だけの項目も足せます。
            </Typography>
          </CardContent>
        </Card>
      ) : (
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
                ? `月末に家計簿アプリでこの月（${periodLabel(period, startDay)}）のカテゴリ別合計を見て、入力してください。予算どおりのものは「＝予算」で入れられます。カードの請求額はいちばん下で入力します。`
                : `${enteredAll} / ${s.categories.length} カテゴリ入力済み`}
            </Typography>
          </CardContent>
        </Card>
      )}

      {SECTIONS.map(({ kind, label }) => {
        const cats = s.categories.filter((c) => c.kind === kind);
        if (cats.length === 0) return null;
        return (
          <Card key={kind}>
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
                {mode === 'actual' && (
                  <Typography variant="caption" color="text.secondary" sx={{ width: 132, textAlign: 'center' }}>
                    {kind === 'income' ? '入金額' : '実績'}
                  </Typography>
                )}
              </Stack>
              {cats.map((c, i) => (
                <Fragment key={c.category.id}>
                  {i > 0 && <Divider />}
                  {mode === 'actual'
                    ? <ActualRow row={c} period={period} />
                    : <BudgetRow row={c} period={period} data={data} />}
                </Fragment>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {mode === 'actual' && s.cardBills.length > 0 && <CardBills bills={s.cardBills} period={period} data={data} />}
    </Stack>
  );
}

/** カード請求: この月に引き落とされる分。確定した日に請求額を入れる（空欄のあいだは予測で計算） */
function CardBills({ bills, period, data }: { bills: CardBillRow[]; period: string; data: AppData }) {
  const [editing, setEditing] = useState<CardBillRow | null>(null);
  return (
    <Card>
      <CardContent sx={{ pb: '8px !important' }}>
        <Typography variant="subtitle1" fontWeight={700}>カード請求</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          この月に引き落とされる分。請求額が確定したら入力してください（空欄のあいだは予測で計算します）。
        </Typography>
        {bills.map((b, i) => {
          const st = BILL_STATUS[billStatus(b)];
          return (
            <Fragment key={b.card.id}>
              {i > 0 && <Divider />}
              <Box sx={{ py: 1.25 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap>
                      {b.card.name}
                      <Chip label={st.label} color={st.color} size="small" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {billDatesText(b) || '日付未設定'}・予測 {yen(b.forecast)}
                    </Typography>
                  </Box>
                  <MoneyField value={b.actual} placeholder={b.forecast} sx={{ width: 132, flexShrink: 0 }} ariaLabel={`${b.card.name} の請求額`}
                    onChange={(v) => saveCardBill(period, b.card.id, { actual: v })} />
                  <IconButton size="small" aria-label={`${b.card.name} の日付・内訳`} onClick={() => setEditing(b)} sx={{ ml: -0.5 }}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
                {b.diff !== undefined && b.diff !== 0 && (
                  <Typography variant="caption" color={b.diff > 0 ? 'error' : 'success.main'}>
                    予測との差 {signedYen(b.diff)}{b.diff > 0 ? '（予測より多い）' : '（予測より少ない）'}
                  </Typography>
                )}
              </Box>
            </Fragment>
          );
        })}
      </CardContent>
      {editing && <CardBillDialog periodId={period} bill={editing} startDay={periodRule(data.settings)} onClose={() => setEditing(null)} />}
    </Card>
  );
}

/** 実績: カテゴリごとに家計簿アプリの合計を入れる */
function ActualRow({ row, period }: { row: CategoryRow; period: string }) {
  const income = row.kind === 'income';
  const actual = row.actual;
  const over = actual !== undefined && !income && actual > row.planned;
  return (
    <Box sx={{ py: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap>{row.category.name}</Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
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
    </Box>
  );
}

/** 予算: カテゴリの中の項目ごとに、この月の予算を見る・変える */
function BudgetRow({ row, period, data }: { row: CategoryRow; period: string; data: AppData }) {
  const [editing, setEditing] = useState<ItemRow | null>(null);
  return (
    <Box sx={{ py: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography noWrap sx={{ minWidth: 0 }}>{row.category.name}</Typography>
        <Typography fontWeight={700} sx={{ flexShrink: 0 }}>{yen(row.planned)}</Typography>
      </Stack>
      <Stack spacing={1} sx={{ mt: 1, ml: 1, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
        {row.items.length === 0 && <Typography variant="caption" color="text.secondary">この月の項目はありません</Typography>}
        {row.items.map((r) => (
          <Stack key={r.item.id} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {r.item.name}
                {r.viaCard && <Chip label="カード" size="small" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
              </Typography>
              {r.item.recurrence.type === 'once' && <Typography variant="caption" color="primary" display="block">この月だけ</Typography>}
              {r.hasOverride && r.item.recurrence.type !== 'once' && (
                <Typography variant="caption" color="primary" display="block">いつもは {yen(amountFor(r.item, period))}</Typography>
              )}
            </Box>
            <MoneyField value={r.hasOverride ? r.planned : undefined} placeholder={amountFor(r.item, period)} sx={{ width: 132, flexShrink: 0 }}
              ariaLabel={`${r.item.name} のこの月の予算`}
              onChange={(v) => patchEntry(period, r.item.id, { planned: v ?? null })} />
            {r.item.recurrence.type === 'once' && (
              <IconButton size="small" aria-label={`${r.item.name} を編集`} onClick={() => setEditing(r)} sx={{ ml: -0.5 }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
        <AddOnceItem period={period} categoryId={row.category.id} data={data} />
      </Stack>
      {editing && <OnceItemDialog value={editing.item} planned={editing.planned ?? 0} data={data} onClose={() => setEditing(null)} />}
    </Box>
  );
}

/** カテゴリの中に、この月だけの項目を足す（頻度「1回のみ」の項目として保存する。定期項目の一覧には出さない） */
function AddOnceItem({ period, categoryId, data }: { period: string; categoryId: string; data: AppData }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | undefined>();
  const valid = name.trim() !== '' && amount !== undefined;
  const add = async () => {
    if (!valid) return;
    const order = data.items.length ? Math.max(...data.items.map((i) => i.sortOrder)) + 1 : 0;
    await db.items.add({
      id: newId(), name: name.trim(), categoryId, defaultAmount: amount!,
      recurrence: { type: 'once', periodId: period }, startPeriod: period, endPeriod: period,
      sortOrder: order, archived: false,
    });
    setName(''); setAmount(undefined); setAdding(false);
  };
  if (!adding) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ alignSelf: 'flex-start' }}>
        この月だけの項目を追加
      </Button>
    );
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField id={`once-name-${categoryId}`} size="small" placeholder="項目名（例: 旅行）" value={name}
          onChange={(e) => setName(e.target.value)} sx={{ flex: 1, minWidth: 0 }} />
        <MoneyField value={amount} onChange={setAmount} ariaLabel="この月だけの項目の金額" sx={{ width: 132, flexShrink: 0 }} />
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" onClick={() => { setAdding(false); setName(''); setAmount(undefined); }}>やめる</Button>
        {/* 金額は欄を離れたときに確定するので、名前が入っていれば押せるようにしておく */}
        <Button size="small" variant="contained" disabled={!name.trim()} onClick={add}>追加</Button>
      </Stack>
    </Stack>
  );
}

