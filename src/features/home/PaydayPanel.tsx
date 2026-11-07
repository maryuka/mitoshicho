import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion, AccordionDetails, AccordionSummary, Avatar, Box, Button, Card, CardContent, CardHeader, Checkbox, Chip,
  FormControlLabel, IconButton, Link, List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checklistOccurs, summarize, type CardBillRow } from '../../domain/cashflow';
import type { AppData, ChecklistTemplate } from '../../domain/types';
import { saveCardBill, setCategoryActual, toggleCheck } from '../../db/ops';
import { db, newId } from '../../db/db';
import { BILL_STATUS, billDatesText, billStatus } from '../../lib/cardBill';
import { signedYen, yen } from '../../lib/money';
import { MoneyField } from '../../components/MoneyField';
import { CardBillDialog } from '../../components/CardBillDialog';
import { Confetti } from '../../components/Confetti';
import { HIYOKO } from '../../components/Hiyoko';

/** 給料日の作業: 収入確定 → カード請求 → 立替回収 → 振り分け → チェックリスト */
export function PaydayPanel({ data, period, current }: { data: AppData; period: string; current: string }) {
  const startDay = data.settings.periodStartDay;
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const [editingBill, setEditingBill] = useState<CardBillRow | null>(null);
  const incomes = s.categories.filter((c) => c.kind === 'income');
  const receivables = data.receivables.filter((r) => r.expectedPeriod === period);
  const done = new Set(data.checklistDone.filter((c) => c.periodId === period).map((c) => c.key));
  const templates = data.checklistTemplates.filter((t) => checklistOccurs(t, period)).sort((a, b) => a.sortOrder - b.sortOrder);

  // 給料日のやることが全部終わったか（収入・カード請求の入力、立替の回収、振り分けとチェックリストのチェック）
  const tasks = [
    ...incomes.map((c) => c.actual !== undefined),
    ...s.cardBills.filter((b) => b.forecast > 0 || b.actual !== undefined).map((b) => b.actual !== undefined),
    ...receivables.map((r) => !!r.receivedAt),
    ...s.allocation.map((a) => done.has(`alloc:${a.account.id}`)),
    ...templates.map((t) => done.has(t.id)),
  ];
  const allDone = tasks.length > 0 && tasks.every(Boolean);
  // 終わっていない状態から全部終わった瞬間だけクラッカーを鳴らす（開いたときに終わっていたら鳴らさない）
  const [fire, setFire] = useState(0);
  const wasDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasDone.current) setFire((n) => n + 1);
    wasDone.current = allDone;
  }, [allDone]);

  return (
    <>
      <Confetti fire={fire} />
      {allDone && (
        <Card sx={{ bgcolor: 'soft', borderColor: 'transparent' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: '16px !important' }}>
            <Box component="img" src={HIYOKO.happy} alt="" sx={{ width: 72, flexShrink: 0 }} />
            <Box>
              <Typography fontWeight={900}>ぜんぶ完了！</Typography>
              <Typography variant="body2" color="text.secondary">給料日のやること、おつかれさま</Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      <Step no={1} title="収入を確定">
        {incomes.length === 0 && <Empty>この月の収入項目がありません</Empty>}
        <Stack spacing={1.5}>
          {incomes.map((c) => (
            <Row key={c.category.id} label={c.category.name} sub={`予定 ${yen(c.planned)}`}>
              <MoneyField value={c.actual} placeholder={c.planned} sx={{ flex: 1 }} ariaLabel={`${c.category.name} の入金額`}
                onChange={(v) => setCategoryActual(period, c.category.id, v)} />
              {c.actual === undefined && (
                <Button variant="outlined" onClick={() => setCategoryActual(period, c.category.id, c.planned)}>予定どおり</Button>
              )}
            </Row>
          ))}
        </Stack>
      </Step>

      <Step no={2} title="カード請求額を入力">
        {s.cardBills.length === 0 && <Empty>カードが登録されていません</Empty>}
        <Stack spacing={2}>
          {s.cardBills.map((b) => {
            const st = BILL_STATUS[billStatus(b)];
            return (
              <Box key={b.card.id}>
                <Row
                  label={<>{b.card.name} <Chip label={st.label} color={st.color} size="small" variant="outlined" sx={{ ml: 0.5 }} /></>}
                  sub={`${billDatesText(b) || '日付未設定'}・予測 ${yen(b.forecast)}`}>
                  <MoneyField value={b.actual} placeholder={b.forecast} sx={{ flex: 1 }} ariaLabel={`${b.card.name} の請求額`}
                    onChange={(v) => saveCardBill(period, b.card.id, { actual: v })} />
                  <Button variant="outlined" onClick={() => setEditingBill(b)}>日付・内訳</Button>
                </Row>
                {b.diff !== undefined && b.diff !== 0 && (
                  <Typography variant="caption" color={b.diff > 0 ? 'error' : 'success.main'}>
                    予測との差 {signedYen(b.diff)}{b.diff > 0 ? '（予測より多い）' : '（予測より少ない）'}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </Step>

      <Step no={3} title="立替・経費精算の回収">
        {receivables.length === 0 && <Empty>この月に回収予定のものはありません</Empty>}
        {receivables.map((r) => (
          <CheckRow key={r.id} checked={!!r.receivedAt} label={r.title} amount={r.amount}
            onChange={(c) => db.receivables.update(r.id, { receivedAt: c ? new Date().toISOString() : undefined })} />
        ))}
        <Link href="#receivables" variant="body2" underline="hover">立替を追加・一覧</Link>
      </Step>

      <Step no={4} title="振り分け（各口座へ送金）">
        {s.allocation.length === 0 && <Empty>口座払いの項目がありません</Empty>}
        {s.allocation.map((a) => {
          const key = `alloc:${a.account.id}`;
          return (
            <Box key={a.account.id}>
              <CheckRow checked={done.has(key)} label={a.account.name} amount={a.amount} strong
                onChange={(c) => toggleCheck(period, key, c)} />
              <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 0 } }}>
                  <Typography variant="caption" color="text.secondary">内訳</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <List dense disablePadding>
                    {a.breakdown.map((x, i) => (
                      <ListItem key={i} disableGutters sx={{ pl: 2 }} secondaryAction={<Typography variant="body2" color="text.secondary">{yen(x.amount)}</Typography>}>
                        <ListItemText secondary={x.label} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Box>
          );
        })}
      </Step>

      <Step no={5} title="チェックリスト">
        {templates.length === 0 && <Empty>やることはありません。毎月のものはメニューの「給料日のチェックリスト」で登録できます</Empty>}
        {templates.map((t) => (
          <Stack key={t.id} direction="row" alignItems="center">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <CheckRow checked={done.has(t.id)} label={t.label} onChange={(c) => toggleCheck(period, t.id, c)} />
            </Box>
            {t.recurrence?.type === 'once' && (
              <>
                <Chip label="今月だけ" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                <IconButton aria-label={`${t.label} を消す`} size="small" onClick={() => removeOnce(t.id, period)}><CloseIcon fontSize="small" /></IconButton>
              </>
            )}
          </Stack>
        ))}
        <AddOnce period={period} order={data.checklistTemplates} />
      </Step>

      {editingBill && (
        <CardBillDialog periodId={period} bill={editingBill} startDay={startDay} onClose={() => setEditingBill(null)} />
      )}
    </>
  );
}

function Step({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader
        avatar={<Avatar sx={{ bgcolor: 'primary.main', width: 26, height: 26, fontSize: 14 }}>{no}</Avatar>}
        title={title} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
      <CardContent><Stack spacing={1}>{children}</Stack></CardContent>
    </Card>
  );
}

/** 1段目に名前と補足、2段目に入力欄とボタン */
function Row({ label, sub, children }: { label: ReactNode; sub: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Box>
        <Typography variant="body1" component="div">{label}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={1}>{children}</Stack>
    </Stack>
  );
}

function CheckRow({ checked, label, amount, strong, onChange }: {
  checked: boolean; label: string; amount?: number; strong?: boolean; onChange: (checked: boolean) => void;
}) {
  return (
    <Stack direction="row" alignItems="center">
      <FormControlLabel sx={{ flex: 1, mr: 0 }}
        control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={<Typography sx={{ textDecoration: checked ? 'line-through' : 'none', color: checked ? 'text.secondary' : 'text.primary' }}>{label}</Typography>} />
      {amount !== undefined && <Typography fontWeight={strong ? 700 : 400}>{yen(amount)}</Typography>}
    </Stack>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <Typography variant="body2" color="text.secondary">{children}</Typography>;
}

/** 今月だけのやることを足す */
function AddOnce({ period, order }: { period: string; order: ChecklistTemplate[] }) {
  const [label, setLabel] = useState('');
  const add = async () => {
    if (!label.trim()) return;
    const sortOrder = order.length ? Math.max(...order.map((x) => x.sortOrder)) + 1 : 0;
    await db.checklistTemplates.add({
      id: newId(), label: label.trim(), sortOrder,
      recurrence: { type: 'once', periodId: period }, startPeriod: period, endPeriod: period,
    });
    setLabel('');
  };
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <TextField id="checklist-once" value={label} placeholder="今月だけのやることを追加" fullWidth
        onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }} />
      <Button variant="outlined" onClick={add} disabled={!label.trim()} sx={{ flexShrink: 0 }}>追加</Button>
    </Stack>
  );
}

/** 今月だけのやることを、チェックの記録ごと消す */
async function removeOnce(id: string, period: string) {
  await db.transaction('rw', db.checklistTemplates, db.checklistDone, async () => {
    await db.checklistTemplates.delete(id);
    await db.checklistDone.delete(`${period}:${id}`);
  });
}
