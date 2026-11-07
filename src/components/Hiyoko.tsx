import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import counting from '../assets/hiyoko/counting.webp';
import cracker from '../assets/hiyoko/cracker.webp';
import happy from '../assets/hiyoko/happy.webp';
import reading from '../assets/hiyoko/reading.webp';
import rocket from '../assets/hiyoko/rocket.webp';
import sunglasses from '../assets/hiyoko/sunglasses.webp';
import worried from '../assets/hiyoko/worried.webp';

// イラスト: ぴよたそ（https://hiyokoyarou.com/）。規約により直リンクはせず、ダウンロードした画像を同梱している
export const HIYOKO = { happy, worried, counting, reading, sunglasses, cracker, rocket };

/** 下向きのしっぽが付いた吹き出し（ホームの上部用） */
export function Bubble({ children }: { children: ReactNode }) {
  return (
    <Box sx={{
      display: 'inline-block', position: 'relative', bgcolor: 'bubble', color: 'text.primary',
      fontWeight: 700, fontSize: 14, px: 2.5, py: 1.25, borderRadius: 999,
      '&::after': {
        content: '""', position: 'absolute', left: '50%', bottom: -7, ml: '-7px',
        borderStyle: 'solid', borderWidth: '7px 7px 0', borderColor: 'transparent', borderTopColor: 'bubble',
      },
    }}>{children}</Box>
  );
}

/** ひよこのアイコンと、ひとことの吹き出し（メニューから開くページの先頭用） */
export function HiyokoSays({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'soft', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        <Box component="img" src={HIYOKO.counting} alt="" sx={{ width: 60, mt: 1 }} />
      </Box>
      <Box sx={(t) => ({
        position: 'relative', flex: 1, minWidth: 0, bgcolor: 'background.paper', border: `1.5px solid ${t.palette.divider}`,
        borderRadius: 4, px: 1.5, py: 1.25,
        '&::before': {
          content: '""', position: 'absolute', left: -7, top: '50%', mt: '-6px', width: 10, height: 10,
          bgcolor: 'background.paper', borderLeft: `1.5px solid ${t.palette.divider}`, borderBottom: `1.5px solid ${t.palette.divider}`,
          transform: 'rotate(45deg)',
        },
      })}>
        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.7 }}>{children}</Typography>
      </Box>
    </Box>
  );
}

/** 読み込み中の表示 */
export function HiyokoLoading() {
  return (
    <Box role="status" sx={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1.5, minHeight: '70vh', textAlign: 'center', px: 3 }}>
      <Box sx={{ width: 170, height: 170, borderRadius: '50%', bgcolor: 'soft', display: 'grid', placeItems: 'center' }}>
        <Box component="img" src={HIYOKO.reading} alt="" sx={{
          width: 130, animation: 'hiyoko-bob 1.6s ease-in-out infinite',
          '@keyframes hiyoko-bob': { '50%': { transform: 'translateY(-5px) rotate(-2deg)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={900}>読み込み中…</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        給料日には、入金とカード請求を<br />まとめて確認できるよ。
      </Typography>
    </Box>
  );
}
