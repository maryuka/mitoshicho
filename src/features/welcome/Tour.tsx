import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KITSUNE } from '../../components/Kitsune';

export interface TourStep {
  /** 見せる画面 */
  route: 'home' | 'plan' | 'budget' | 'payday';
  /** 今月から何か月ずらして見せるか */
  offset?: number;
  /** 照らす場所（data-tour 属性）。なければ画面全体を暗くして真ん中に出す */
  target?: string;
  /** 照らす場所が画面にないとき（月によって出ないカードなど）は飛ばす */
  optional?: boolean;
  text: string;
}

/** 画面の案内。サンプルデータで、理想の使い方を順に見せる */
export const TOUR_STEPS: TourStep[] = [
  { route: 'home', target: 'cycle',
    text: 'サンプルデータで、ホームを見てみよう。計画する → 使う → ふりかえる のサイクルで、今どこにいて何をするかがここに出るよ。' },
  { route: 'home', target: 'notices', optional: true,
    text: 'カードの請求額が確定したときなどは、お知らせに出るよ。' },
  { route: 'home', target: 'big',
    text: '旅行・帰省・年払いなどの大きい出費は、先の予定として見えるよ。先が見えるから、今を気持ちよく使えるね。' },
  { route: 'payday', target: 'payday',
    text: '給料日には、入金の確認・立替の回収・口座への振り分けを順にチェックしていくよ。メニューからも開けるよ。' },
  { route: 'plan', offset: 1, target: 'summary',
    text: '「計画」では月ごとの予算を立てるよ。旅行がある月だけ趣味・娯楽を増やす、みたいにその月だけ変えられるよ。' },
  { route: 'budget', offset: -1, target: 'review-steps',
    text: '月末は「ふりかえり」。家計簿アプリの合計を入れて、計画とずれたところの理由を考えるよ。理由は付けたいものだけでOK。' },
  { route: 'home',
    text: 'こんなふうに使えたら理想！ さっそく、はじめの準備から入れていこう。' },
];

const PAD = 6; // 照らす枠を、要素より少し広げる
const GAP = 12; // 照らす枠と吹き出しの間

/** 暗くした画面の中で、説明する場所だけを照らし、狐が説明する */
export function Tour({ index, onNext, onFinish }: { index: number; onNext: () => void; onFinish: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) {
      if (step.optional) { onNext(); return; }
      window.scrollTo(0, 0);
      setRect(null);
      return;
    }
    // 画面に収まっていなければ、照らす場所が上に来るようにスクロールする（下の余白に吹き出しを出す）
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight - 240) window.scrollTo(0, Math.max(0, r.top + window.scrollY - 24));
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [step, onNext]);

  useEffect(() => { next.current?.focus(); }, [index]);

  // 照らす場所の下に余裕があれば吹き出しを下に、なければ上に出す
  const below = rect ? window.innerHeight - rect.bottom > 240 || rect.top < 240 : false;
  const place = rect
    ? below ? { top: Math.min(rect.bottom + PAD + GAP, window.innerHeight - 220) } : { bottom: window.innerHeight - rect.top + PAD + GAP }
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
        <Typography variant="caption" fontWeight={700} color="primary" component="p" sx={{ mb: 1 }}>サンプルデータで見ています</Typography>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'soft', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            <Box component="img" src={KITSUNE.looking} alt="" sx={{ width: 44, mt: 1.5 }} />
          </Box>
          <Typography id="tour-text" variant="body2" fontWeight={700} sx={{ lineHeight: 1.8, pt: 0.25 }}>{step.text}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={0.75} sx={{ flex: 1 }} aria-label={`${index + 1} / ${TOUR_STEPS.length}`}>
            {TOUR_STEPS.map((_, i) => (
              <Box key={i} sx={{ height: 6, borderRadius: 3, width: i === index ? 18 : 6, bgcolor: i === index ? 'primary.main' : 'text.disabled' }} />
            ))}
          </Stack>
          {!last && <Button color="inherit" sx={{ color: 'text.secondary' }} onClick={onFinish}>スキップ</Button>}
          <Button ref={next} variant="contained" sx={{ ml: 1 }} onClick={last ? onFinish : onNext}>
            {last ? 'はじめる' : '次へ'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
