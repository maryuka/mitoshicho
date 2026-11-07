import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HIYOKO } from '../../components/Hiyoko';

interface Step { image: string; title: string; body: ReactNode }

const STEPS: Step[] = [
  {
    image: HIYOKO.happy, title: 'みとおし帳へようこそ！',
    body: <>給料日ごとに「今月お金が回るか」を<br />見通すための家計アプリだよ。</>,
  },
  {
    image: HIYOKO.counting, title: '月ごとに予算を立てる',
    body: <>月の区切りは給料日。<br />カテゴリごとに「使っていい額」を決めておこう。</>,
  },
  {
    image: HIYOKO.sunglasses, title: '給料日のチェックもかんたん',
    body: <>入金・カード請求・口座への振り分けを<br />まとめてチェックできるよ。</>,
  },
  {
    image: HIYOKO.reading, title: '月末に振り返る',
    body: <>日々の記録は Zaim で。<br />月末にカテゴリの合計を入れて<br />予算と比べよう。</>,
  },
  {
    image: HIYOKO.rain, title: 'さっそく始めよう',
    body: <>データはこの端末の中だけに保存されるよ。<br />どこから始める？</>,
  },
];

// 取り込み画面などから戻ってきたときは、最後のページ（始め方の選択）から出す
let reachedLast = false;

/** はじめて開いたとき（データが空のとき）のウォークスルー。横にスワイプしてページを送る */
export function Walkthrough({ onImport, onSample, onRestore }: {
  onImport: () => void; onSample: () => void; onRestore: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;
  const [index, setIndex] = useState(reachedLast ? last : 0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    if (reachedLast) el.scrollLeft = last * el.clientWidth;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(i);
      if (i === last) reachedLast = true;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [last]);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 36 }}>
        {index < last && <Button color="inherit" sx={{ color: 'text.secondary' }} onClick={() => goTo(last)}>スキップ</Button>}
      </Box>

      <Box ref={track} aria-roledescription="カルーセル" sx={{
        flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain',
        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        mx: -2,
      }}>
        {STEPS.map((s, i) => (
          <Box key={s.title} role="group" aria-label={`${i + 1} / ${STEPS.length}`} aria-hidden={i !== index}
            sx={{ flex: '0 0 100%', scrollSnapAlign: 'center', scrollSnapStop: 'always', px: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2 }}>
            <Box sx={{ width: 220, maxWidth: '70%', aspectRatio: '1', borderRadius: '50%', bgcolor: 'soft', display: 'grid', placeItems: 'center' }}>
              <Box component="img" src={s.image} alt="" sx={{ width: '78%' }} />
            </Box>
            <Typography variant="h6" fontWeight={900} sx={{ mt: 1, textWrap: 'balance' }}>{s.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>{s.body}</Typography>
          </Box>
        ))}
      </Box>

      <Stack direction="row" spacing={1} justifyContent="center" sx={{ my: 3 }}>
        {STEPS.map((s, i) => (
          <Box key={s.title} component="button" type="button" aria-label={`${i + 1}ページ目へ`} aria-current={i === index}
            onClick={() => goTo(i)}
            sx={{ p: 0, border: 0, cursor: 'pointer', height: 8, borderRadius: 4, transition: 'width .2s, background-color .2s',
              width: i === index ? 24 : 8, bgcolor: i === index ? 'primary.main' : 'divider' }} />
        ))}
      </Stack>

      {index < last ? (
        <Button variant="contained" size="large" fullWidth onClick={() => goTo(index + 1)}>次へ</Button>
      ) : (
        <Stack spacing={1}>
          <Button variant="contained" size="large" fullWidth onClick={onImport}>スプレッドシートから取り込む</Button>
          <Button variant="outlined" size="large" fullWidth onClick={onSample}>サンプルデータで試す</Button>
          <Button color="inherit" sx={{ color: 'text.secondary' }} onClick={onRestore}>バックアップから復元する</Button>
        </Stack>
      )}
    </Box>
  );
}
