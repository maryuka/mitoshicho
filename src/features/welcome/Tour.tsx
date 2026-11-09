import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KITSUNE } from '../../components/Kitsune';
import { db } from '../../db/db';
import type { Settings } from '../../domain/types';

interface TourStep { target: string; text: string }

/** 画面の案内で照らす場所（data-tour 属性）と、狐のひとこと */
const STEPS: TourStep[] = [
  { target: 'setup', text: 'まずはここから！ 口座・カード、カテゴリ、定期項目の3つを入れると、今月お金が回るかが見えるよ。' },
  { target: 'period', text: '給料日から次の給料日の前日までが1か月。‹ › で前後の月を見られるよ。' },
  { target: 'tab-plan', text: '「計画」では、月ごとの予算を立てるよ。その月だけの出費も足せるよ。' },
  { target: 'tab-budget', text: '「ふりかえり」では、月末に家計簿アプリの合計を入れて、予算とくらべるよ。' },
  { target: 'menu', text: '設定や、スプレッドシートの取り込み・バックアップはメニューにあるよ。さっそく準備を始めよう！' },
];

const PAD = 6; // 照らす枠を、要素より少し広げる
const GAP = 12; // 照らす枠と吹き出しの間

/** ウォークスルーのあと、ホームで一度だけ出す画面の案内。暗くした画面の中で、説明する場所だけを照らす */
export function Tour({ settings }: { settings: Settings }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'nearest' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [step.target]);

  useEffect(() => { next.current?.focus(); }, [index]);

  const finish = () => {
    const { tourPending: _done, ...rest } = settings;
    void db.settings.put(rest);
  };

  // 照らす場所が画面の下半分なら吹き出しを上に、上半分なら下に出す
  const below = !rect || rect.top + rect.height / 2 < window.innerHeight / 2;
  const place = rect
    ? below ? { top: rect.bottom + PAD + GAP } : { bottom: window.innerHeight - rect.top + PAD + GAP }
    : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <Box role="dialog" aria-modal="true" aria-labelledby="tour-text"
      sx={{ position: 'fixed', inset: 0, zIndex: (t) => t.zIndex.modal }}>
      {rect ? (
        <Box aria-hidden sx={(t) => ({
          position: 'fixed', left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: '14px', boxShadow: `0 0 0 9999px ${t.palette.scrim}`, outline: `2px solid ${t.palette.primary.main}`,
          transition: 'all .25s ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        })} />
      ) : <Box aria-hidden sx={{ position: 'fixed', inset: 0, bgcolor: 'scrim' }} />}

      <Paper elevation={6} sx={{
        position: 'fixed', left: 16, right: 16, maxWidth: 420, mx: 'auto', borderRadius: '20px', p: 2, ...place,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'soft', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            <Box component="img" src={KITSUNE.looking} alt="" sx={{ width: 44, mt: 1.5 }} />
          </Box>
          <Typography id="tour-text" variant="body2" fontWeight={700} sx={{ lineHeight: 1.8, pt: 0.25 }}>{step.text}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={0.75} sx={{ flex: 1 }} aria-label={`${index + 1} / ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <Box key={s.target} sx={{ height: 6, borderRadius: 3, width: i === index ? 18 : 6, bgcolor: i === index ? 'primary.main' : 'divider' }} />
            ))}
          </Stack>
          {!last && <Button color="inherit" sx={{ color: 'text.secondary' }} onClick={finish}>スキップ</Button>}
          <Button ref={next} variant="contained" sx={{ ml: 1 }} onClick={() => (last ? finish() : setIndex(index + 1))}>
            {last ? 'はじめる' : '次へ'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
