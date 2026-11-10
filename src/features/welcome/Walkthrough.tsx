import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KITSUNE } from '../../components/Kitsune';
import { db } from '../../db/db';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/types';
import { PaydayFields } from '../settings/PaydayFields';

interface Step { image: string; title: string; body: ReactNode; setup?: boolean }

const STEPS: Step[] = [
  {
    image: KITSUNE.happy, title: 'みとおし帳へようこそ！',
    body: <>
      給料日ごとに「今月お金が回るか」を<br />見通すための家計アプリだよ。
      <Box component="ul" sx={{ textAlign: 'left', display: 'inline-block', m: 0, mt: 1.5, pl: 2.5 }}>
        <li>月ごとに予算を立てる</li>
        <li>給料日に入金と振り分けをチェック</li>
        <li>月末に家計簿アプリの合計で振り返る</li>
      </Box>
    </>,
  },
  {
    image: KITSUNE.counting, title: '給料日を教えてね', setup: true,
    body: <>給料日から次の給料日の前日までを<br />「1か月」として数えるよ。</>,
  },
  {
    image: KITSUNE.money, title: 'さっそく始めよう',
    body: <>データはこの端末の中だけに保存されるよ。<br />スプレッドシートの取り込みやサンプルデータ、<br />バックアップからの復元は<br />メニューの「データ」からできるよ。</>,
  },
];

/** はじめて開いたとき（データが空のとき）のウォークスルー。横にスワイプしてページを送る */
export function Walkthrough({ settings }: { settings: Settings }) {
  const track = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(i);
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
            <Box sx={{ width: s.setup ? 140 : 220, maxWidth: '70%', aspectRatio: '1', borderRadius: '50%', bgcolor: 'soft', display: 'grid', placeItems: 'center' }}>
              <Box component="img" src={s.image} alt="" sx={{ width: '78%' }} />
            </Box>
            <Typography variant="h6" fontWeight={900} sx={{ mt: 1, textWrap: 'balance' }}>{s.title}</Typography>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ lineHeight: 1.9 }}>{s.body}</Typography>
            {s.setup && (
              <Box sx={{ width: '100%', textAlign: 'left', mt: 1 }}>
                <PaydayFields settings={settings} />
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, textAlign: 'center' }}>
                  あとからメニューの「月の区切り」で変えられるよ
                </Typography>
              </Box>
            )}
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
        <Button variant="contained" size="large" fullWidth
          onClick={() => db.settings.put({ ...DEFAULT_SETTINGS, ...settings, startedAt: new Date().toISOString(), tourPending: true })}>始める</Button>
      )}
    </Box>
  );
}
