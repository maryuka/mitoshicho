import { Alert, Box, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { summarize, type CardTodo } from '../../domain/cashflow';
import { periodStart } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { yen } from '../../lib/money';
import { PeriodNav } from '../../components/PeriodNav';
import { CardBillDialog } from '../../components/CardBillDialog';
import { NormalView } from './NormalView';
import { PaydayPanel } from './PaydayPanel';

type Mode = 'normal' | 'payday';
const MODE_KEY = 'mitoshicho:mode';
const readMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'payday' ? 'payday' : 'normal'; } catch { return 'normal'; } };
const writeMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* 保存できなくても動く */ } };

export function HomePage({ data, period, setPeriod, current, onOpenBudget }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; onOpenBudget: (p: string) => void;
}) {
  const { periodStartDay: startDay, bufferThreshold } = data.settings;
  const [mode, setModeState] = useState<Mode>(readMode);
  const setMode = (m: Mode | null) => { if (m) { setModeState(m); writeMode(m); } };
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const [editing, setEditing] = useState<CardTodo | null>(null);

  // 月の初日から5日間は給料日モードをすすめる
  const daysIntoPeriod = Math.floor((Date.now() - periodStart(current, startDay).getTime()) / 86400000);
  const suggestPayday = mode === 'normal' && period === current && daysIntoPeriod < 5;
  const ok = s.buffer >= bufferThreshold;

  return (
    <Stack spacing={2}>
      <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} />

      <ToggleButtonGroup value={mode} exclusive onChange={(_, m) => setMode(m)} fullWidth size="small" color="primary">
        <ToggleButton value="normal">ふだん</ToggleButton>
        <ToggleButton value="payday">給料日モード</ToggleButton>
      </ToggleButtonGroup>

      {suggestPayday && (
        <Alert severity="info" onClick={() => setMode('payday')} sx={{ cursor: 'pointer' }}>
          給料日です。給料日モードで入金・請求・振り分けを確認しましょう
        </Alert>
      )}

      <Card sx={(t) => ({
        bgcolor: alpha(ok ? t.palette.success.main : t.palette.error.main, t.palette.mode === 'dark' ? 0.14 : 0.08),
        borderColor: alpha(ok ? t.palette.success.main : t.palette.error.main, 0.3),
      })}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">今月のバッファ</Typography>
          <Typography variant="h3" component="p" fontWeight={700} color={ok ? 'text.primary' : 'error'} sx={{ my: 0.5 }}>
            {yen(s.buffer)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ok ? `下限 ${yen(bufferThreshold)} をクリア` : `下限 ${yen(bufferThreshold)} まで あと ${yen(bufferThreshold - s.buffer)}`}
          </Typography>
          {mode === 'normal' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mt: 2 }}>
              <Figure label="収入" value={s.incomeTotal} />
              <Figure label="口座から出る" value={s.directOutTotal} />
              <Figure label="カード請求" value={s.cardBillTotal} />
              {s.receivableTotal > 0 && <Figure label="立替回収" value={s.receivableTotal} />}
            </Box>
          )}
        </CardContent>
      </Card>

      {mode === 'payday'
        ? <PaydayPanel data={data} period={period} current={current} />
        : <NormalView data={data} current={current} summary={s} onCardTodo={setEditing} onOpenBudget={onOpenBudget} />}

      {editing && (
        <CardBillDialog periodId={editing.periodId} bill={editing.bill} startDay={startDay} onClose={() => setEditing(null)} />
      )}
    </Stack>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, px: 1.5, py: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle1" fontWeight={700}>{yen(value)}</Typography>
    </Box>
  );
}
