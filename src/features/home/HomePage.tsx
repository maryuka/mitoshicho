import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Alert, Box, ButtonBase, Card, Chip, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { summarize, type CardTodo } from '../../domain/cashflow';
import { periodStart, periodRule } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { yen } from '../../lib/money';
import { PeriodNav } from '../../components/PeriodNav';
import { CardBillDialog } from '../../components/CardBillDialog';
import { Bubble, KITSUNE } from '../../components/Kitsune';
import { NormalView } from './NormalView';
import { SetupGuide } from './SetupGuide';
import { PaydayPanel } from './PaydayPanel';
import { BREAKDOWN_LABEL, BreakdownDialog, type BreakdownKind } from './Breakdown';

export type HomeMode = 'normal' | 'payday';
type Mode = HomeMode;
const MODE_KEY = 'mitoshicho:mode';
const readMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'payday' ? 'payday' : 'normal'; } catch { return 'normal'; } };
const writeMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* 保存できなくても動く */ } };

export function HomePage({ data, period, setPeriod, current, onOpenBudget, menu, forceMode }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; onOpenBudget: (p: string) => void; menu?: ReactNode;
  /** 画面の案内で、表示を「ふだん」「給料日」に固定する（保存はしない） */
  forceMode?: Mode;
}) {
  const startDay = periodRule(data.settings);
  const [savedMode, setModeState] = useState<Mode>(readMode);
  const mode = forceMode ?? savedMode;
  const setMode = (m: Mode | null) => { if (m) { setModeState(m); writeMode(m); } };
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const [editing, setEditing] = useState<CardTodo | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownKind | null>(null);
  const totals: Record<BreakdownKind, number> = {
    income: s.incomeTotal, direct: s.directOutTotal - s.savingDirectTotal, card: s.cardBillTotal,
    saving: s.savingDirectTotal, receivable: s.receivableTotal,
  };

  // 月の初日から5日間は「給料日」への切り替えをすすめる
  const daysIntoPeriod = Math.floor((Date.now() - periodStart(current, startDay).getTime()) / 86400000);
  const suggestPayday = mode === 'normal' && period === current && daysIntoPeriod < 5;
  // バッファが 0 円以上なら OK、マイナスなら足りない
  const minus = s.buffer < 0;
  const ok = !minus;
  // 定期項目がまだないあいだは、バッファの代わりに「はじめの準備」を出す
  const setup = data.items.length === 0;
  const message = setup ? 'まずは準備から始めよう！' : minus ? `今月 ${yen(-s.buffer)} 足りない！`
    : mode === 'payday' ? '給料日だね！ 入金と振り分けをチェックしよう'
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
          <Box component="img" src={setup ? KITSUNE.counting : ok ? KITSUNE.happy : KITSUNE.worried} alt={setup ? '準備する狐' : ok ? '喜ぶ狐' : '困っている狐'}
            // 絵によって縦横比が違うので、高さをそろえて帯の高さが変わらないようにする
            sx={{ display: 'block', height: 112, width: 'auto', maxWidth: '60%', objectFit: 'contain', mx: 'auto', mt: 1.5, mb: 1.5 }} />
          {!setup && <ToggleButtonGroup value={mode} exclusive onChange={(_, m) => setMode(m)} size="small"
            sx={{ position: 'relative', zIndex: 1, '& .MuiToggleButton-root': {
              color: 'inherit', borderColor: alpha('#ffffff', 0.7), borderWidth: 2, px: 2.5, fontWeight: 700,
              '&:first-of-type': { borderRadius: '999px 0 0 999px' }, '&:last-of-type': { borderRadius: '0 999px 999px 0' },
              '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main', '&:hover': { bgcolor: 'background.paper' } },
            } }}>
            <ToggleButton value="normal">ふだん</ToggleButton>
            <ToggleButton value="payday">給料日</ToggleButton>
          </ToggleButtonGroup>}
        </Box>

        {setup ? <Box sx={{ position: 'relative', zIndex: 1, mt: -4 }}><SetupGuide data={data} /></Box> : <Card data-tour="buffer" sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">今月のバッファ</Typography>
              <Chip size="small" label={ok ? 'OK' : 'マイナス'}
                sx={{ fontWeight: 900, ...(ok ? { bgcolor: 'soft', color: 'success.main' } : { bgcolor: 'error.main', color: '#ffffff' }) }} />
            </Stack>
            <Typography variant="h3" component="p" fontWeight={900} color={minus ? 'error.main' : 'text.primary'} sx={{ my: 0.5 }}>{yen(s.buffer)}</Typography>
            {mode === 'normal' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mt: 2, pt: 2, borderTop: 1.5, borderColor: 'divider', borderTopStyle: 'solid' }}>
                <Figure kind="income" value={totals.income} onOpen={setBreakdown} />
                <Figure kind="direct" value={totals.direct} minus onOpen={setBreakdown} />
                <Figure kind="card" value={totals.card} minus onOpen={setBreakdown} />
                {totals.saving > 0 && <Figure kind="saving" value={totals.saving} onOpen={setBreakdown} />}
                {totals.receivable > 0 && <Figure kind="receivable" value={totals.receivable} onOpen={setBreakdown} />}
              </Box>
            )}
          </CardContent>
        </Card>}
      </Box>

      {!setup && suggestPayday && (
        <Alert severity="info" onClick={() => setMode('payday')} sx={{ cursor: 'pointer' }}>
          給料日です。「給料日」に切り替えて、入金・振り分けを確認しましょう
        </Alert>
      )}

      {setup ? null : mode === 'payday'
        ? <PaydayPanel data={data} period={period} current={current} />
        : <NormalView data={data} current={current} summary={s} onCardTodo={setEditing} onOpenBudget={onOpenBudget} />}

      {breakdown && (
        <BreakdownDialog kind={breakdown} summary={s} data={data} total={totals[breakdown]} onClose={() => setBreakdown(null)} />
      )}
      {editing && (
        <CardBillDialog periodId={editing.periodId} bill={editing.bill} startDay={startDay} onClose={() => setEditing(null)} />
      )}
    </Stack>
  );
}

/** 内訳を開ける数字 */
function Figure({ kind, value, minus, onOpen }: { kind: BreakdownKind; value: number; minus?: boolean; onOpen: (k: BreakdownKind) => void }) {
  return (
    <ButtonBase onClick={() => onOpen(kind)} focusRipple aria-label={`${BREAKDOWN_LABEL[kind]}の内訳`}
      sx={{ display: 'block', textAlign: 'left', borderRadius: 2, mx: -1, px: 1, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', letterSpacing: 0 }}>
        {BREAKDOWN_LABEL[kind]}<ChevronRightIcon sx={{ fontSize: 14 }} />
      </Typography>
      <Typography variant="subtitle1" fontWeight={700} color={minus ? 'error.main' : 'text.primary'} sx={{ whiteSpace: 'nowrap' }}>{yen(value)}</Typography>
    </ButtonBase>
  );
}
