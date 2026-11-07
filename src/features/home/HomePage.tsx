import { Alert, Box, Card, Chip, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { summarize, type CardTodo } from '../../domain/cashflow';
import { periodStart } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { yen } from '../../lib/money';
import { PeriodNav } from '../../components/PeriodNav';
import { CardBillDialog } from '../../components/CardBillDialog';
import { Bubble, HIYOKO } from '../../components/Hiyoko';
import { NormalView } from './NormalView';
import { PaydayPanel } from './PaydayPanel';

type Mode = 'normal' | 'payday';
const MODE_KEY = 'mitoshicho:mode';
const readMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'payday' ? 'payday' : 'normal'; } catch { return 'normal'; } };
const writeMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* 保存できなくても動く */ } };

export function HomePage({ data, period, setPeriod, current, onOpenBudget, menu }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; onOpenBudget: (p: string) => void; menu?: ReactNode;
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

  const minus = s.buffer < 0;
  const message = minus ? `今月 ${yen(-s.buffer)} 足りない！`
    : !ok ? `下限まで あと ${yen(bufferThreshold - s.buffer)}…ピンチかも`
    : mode === 'payday' ? '給料日だね！ 入金と請求をチェックしよう'
    : period === current ? '今月もお金はちゃんと回りそう！' : 'この月もお金は回りそう！';

  return (
    <Stack spacing={2}>
      <Box>
        {/* 上部のオレンジの帯。コンテナの余白を打ち消して画面の端まで広げる */}
        <Box data-hero sx={{
          bgcolor: 'hero.main', color: 'hero.contrastText', textAlign: 'center', position: 'relative', overflow: 'hidden',
          mt: 'calc(-12px - env(safe-area-inset-top, 0px))', pt: 'calc(12px + env(safe-area-inset-top, 0px))', pb: 7,
          ml: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', pl: 'max(16px, env(safe-area-inset-left, 0px))',
          mr: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
          '&::after': {
            content: '""', position: 'absolute', left: '-10%', right: '-10%', bottom: -36, height: 72,
            bgcolor: 'background.default', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          },
        }}>
          <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} leading={menu} onHero />
          <Box sx={{ mt: 1.5 }}><Bubble>{message}</Bubble></Box>
          <Box component="img" src={ok ? HIYOKO.happy : HIYOKO.worried} alt={ok ? '喜ぶひよこ' : '困っているひよこ'}
            sx={{ display: 'block', width: 150, maxWidth: '45%', mx: 'auto', mt: 1.5, mb: 1.5 }} />
          <ToggleButtonGroup value={mode} exclusive onChange={(_, m) => setMode(m)} size="small"
            sx={{ position: 'relative', zIndex: 1, '& .MuiToggleButton-root': {
              color: 'inherit', borderColor: alpha('#ffffff', 0.7), borderWidth: 2, px: 2.5, fontWeight: 700,
              '&:first-of-type': { borderRadius: '999px 0 0 999px' }, '&:last-of-type': { borderRadius: '0 999px 999px 0' },
              '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main', '&:hover': { bgcolor: 'background.paper' } },
            } }}>
            <ToggleButton value="normal">ふだん</ToggleButton>
            <ToggleButton value="payday">給料日モード</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Card sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">今月のバッファ</Typography>
              {/* OK は淡い黄、下限割れ（不足）は赤の枠、マイナスは赤で塗る */}
              <Chip size="small" label={ok ? 'OK' : minus ? 'マイナス' : '不足'} variant={!ok && !minus ? 'outlined' : 'filled'}
                sx={{ fontWeight: 900, ...(ok ? { bgcolor: 'soft', color: 'success.main' }
                  : minus ? { bgcolor: 'error.main', color: '#ffffff' }
                  : { borderColor: 'error.main', color: 'error.main', borderWidth: 1.5 }) }} />
            </Stack>
            <Typography variant="h3" component="p" fontWeight={900} color={minus ? 'error.main' : 'text.primary'} sx={{ my: 0.5 }}>{yen(s.buffer)}</Typography>
            <Box sx={{ display: 'inline-block', bgcolor: 'soft', color: ok ? 'primary.main' : 'error.main', fontWeight: 700, fontSize: 12, borderRadius: 999, px: 1.5, py: 0.5 }}>
              {ok ? `下限 ${yen(bufferThreshold)} をクリア` : `下限 ${yen(bufferThreshold)} まで あと ${yen(bufferThreshold - s.buffer)}`}
            </Box>
            {mode === 'normal' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 2, pt: 2, borderTop: 1.5, borderColor: 'divider', borderTopStyle: 'solid' }}>
                <Figure label="収入" value={s.incomeTotal} />
                <Figure label="口座から出る" value={s.directOutTotal} minus />
                <Figure label="カード請求" value={s.cardBillTotal} minus />
                {s.receivableTotal > 0 && <Figure label="立替回収" value={s.receivableTotal} />}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {suggestPayday && (
        <Alert severity="info" onClick={() => setMode('payday')} sx={{ cursor: 'pointer' }}>
          給料日です。給料日モードで入金・請求・振り分けを確認しましょう
        </Alert>
      )}

      {mode === 'payday'
        ? <PaydayPanel data={data} period={period} current={current} />
        : <NormalView data={data} current={current} summary={s} onCardTodo={setEditing} onOpenBudget={onOpenBudget} />}

      {editing && (
        <CardBillDialog periodId={editing.periodId} bill={editing.bill} startDay={startDay} onClose={() => setEditing(null)} />
      )}
    </Stack>
  );
}

function Figure({ label, value, minus }: { label: string; value: number; minus?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle1" fontWeight={700} color={minus ? 'error.main' : 'text.primary'}>{yen(value)}</Typography>
    </Box>
  );
}
