import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Accordion, AccordionDetails, AccordionSummary, Avatar, Box, Button, Card, CardContent, Divider, IconButton, Stack, Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { summarize } from '../../domain/cashflow';
import { addPeriods, periodLabel, periodRule } from '../../domain/period';
import { driftHints, driftMinYen, monthDrifts, REVIEW_DONE_KEY, reviewStatus } from '../../domain/review';
import type { AppData } from '../../domain/types';
import { toggleCheck } from '../../db/ops';
import { yen } from '../../lib/money';
import { PeriodNav } from '../../components/PeriodNav';
import { Confetti } from '../../components/Confetti';
import { KITSUNE } from '../../components/Kitsune';
import { ActualRow, CardBills } from '../budget/parts';
import { DriftInline, DriftSettingsDialog, HintsCard } from './Drift';

/** ふりかえり: 実績を入れて、ずれを考える → 改善のヒント → 完了 */
export function ReviewPage({ data, period, setPeriod, current, menu }: {
  data: AppData; period: string; setPeriod: (p: string) => void; current: string; menu?: ReactNode;
}) {
  const startDay = periodRule(data.settings);
  const s = useMemo(() => summarize(data, period, current), [data, period, current]);
  const status = useMemo(() => reviewStatus(data, period), [data, period]);
  const drifts = useMemo(() => monthDrifts(data, period), [data, period]);
  const hints = useMemo(() => driftHints(data, addPeriods(period, 1)), [data, period]);
  const expense = s.categories.filter((c) => c.kind === 'expense');
  const others = s.categories.filter((c) => c.kind !== 'expense');
  const entered = expense.filter((c) => c.actual !== undefined).length;
  const driftOf = new Map(drifts.map((d) => [d.category.id, d]));
  const allEntered = status.missing === 0 && status.started;
  const future = period > current;
  const minYen = driftMinYen(data);
  const [settingDrift, setSettingDrift] = useState(false);

  // 完了した瞬間だけクラッカーを鳴らす
  const [fire, setFire] = useState(0);
  const wasDone = useRef(status.done);
  useEffect(() => {
    if (status.done && !wasDone.current) setFire((n) => n + 1);
    wasDone.current = status.done;
  }, [status.done]);

  return (
    <Stack spacing={2}>
      <Confetti fire={fire} />
      <PeriodNav value={period} onChange={setPeriod} startDay={startDay} current={current} leading={menu} />

      {status.done ? (
        <Card data-tour="review-steps" sx={{ bgcolor: 'soft', borderColor: 'transparent' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: '16px !important' }}>
            <Box component="img" src={KITSUNE.happy} alt="" sx={{ width: 72, flexShrink: 0 }} />
            <Box>
              <Typography fontWeight={900}>ふりかえり完了！</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>分かったことを、次の計画に活かそう。</Typography>
              {status.closed && (
                <Button size="small" color="inherit" sx={{ color: 'text.secondary', ml: -1 }}
                  onClick={() => toggleCheck(period, REVIEW_DONE_KEY, false)}>完了を取り消す</Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card data-tour="review-steps">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: '16px !important' }}>
            <Box component="img" src={KITSUNE.looking} alt="" sx={{ width: 52, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              {future ? 'この月はまだ始まっていないよ。月末になったらふりかえろう。'
                : `${periodLabel(period, startDay)}のふりかえり。合計を入れて、計画とずれたところの理由を考えよう。`}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 実績を入れて、ずれを考える */}
      <Section title="実績を入れて、ずれを考える" done={allEntered && status.untagged === 0}
        sub={`家計簿アプリのカテゴリ別の合計を入れよう（${entered} / ${expense.length}）。計画と${yen(minYen)}以上ずれたら、理由とひとことメモを残そう`}
        action={<IconButton size="small" aria-label="表示するずれの設定" onClick={() => setSettingDrift(true)} sx={{ color: 'text.secondary' }}><TuneIcon fontSize="small" /></IconButton>}>
        {expense.map((c, i) => {
          const d = driftOf.get(c.category.id);
          return (
            <Fragment key={c.category.id}>
              {i > 0 && <Divider />}
              <ActualRow row={c} period={period} plain />
              {d && <DriftInline drift={d} />}
            </Fragment>
          );
        })}
        {allEntered && drifts.length === 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>だいたい計画どおりだったよ。いい感じ！</Typography>
        )}
        {others.length > 0 && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&::before': { display: 'none' }, mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" fontWeight={700} color="text.secondary">収入・返済・積み立て</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              {others.map((c, i) => (
                <Fragment key={c.category.id}>
                  {i > 0 && <Divider />}
                  <ActualRow row={c} period={period} plain />
                </Fragment>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
      </Section>

      {settingDrift && <DriftSettingsDialog settings={data.settings} onClose={() => setSettingDrift(false)} />}

      {/* 改善のヒント */}
      {hints.length > 0 && <HintsCard hints={hints} />}

      {!status.done && !future && (
        <Button variant="contained" size="large" disabled={!allEntered} onClick={() => toggleCheck(period, REVIEW_DONE_KEY, true)}>
          ふりかえり完了
        </Button>
      )}
      {!status.done && !future && !allEntered && (
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: -1 }}>
          実績を全部入れると、完了にできるよ（あと {expense.length - entered} カテゴリ）
        </Typography>
      )}

      {s.cardBills.length > 0 && <CardBills bills={s.cardBills} period={period} data={data} />}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        支出の実績 {yen(expense.reduce((a, c) => a + (c.actual ?? 0), 0))} / 予算 {yen(expense.reduce((a, c) => a + c.planned, 0))}
      </Typography>
    </Stack>
  );
}

function Section({ title, sub, done, action, children }: {
  title: string; sub: string; done: boolean; action?: ReactNode; children: ReactNode;
}) {
  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {done && <Avatar sx={{ width: 26, height: 26, fontSize: 14, fontWeight: 900, bgcolor: 'success.main', color: 'background.paper' }}>✓</Avatar>}
          <Typography variant="subtitle1" fontWeight={900} sx={{ flex: 1 }}>{title}</Typography>
          {action}
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75, mb: 1, lineHeight: 1.7 }}>{sub}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}
