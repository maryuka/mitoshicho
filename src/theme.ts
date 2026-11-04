import { createTheme, type Theme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';

// 紺〜青を軸にした落ち着いた配色。ニュートラルは青みのあるグレー
const palette = {
  light: { primary: '#1e40af', bg: '#f4f6fa', paper: '#ffffff', text: '#0f172a', muted: '#64748b', divider: '#e2e8f0', error: '#dc2626', success: '#15803d', warning: '#b45309', hero: '#1e3a8a' },
  dark: { primary: '#8ab4f8', bg: '#0b1120', paper: '#131b2e', text: '#e2e8f0', muted: '#94a3b8', divider: '#243049', error: '#f87171', success: '#4ade80', warning: '#fbbf24', hero: '#1e3a8a' },
};

declare module '@mui/material/styles' {
  interface Palette { hero: { main: string; contrastText: string } }
  interface PaletteOptions { hero?: { main: string; contrastText: string } }
}

function build(mode: 'light' | 'dark'): Theme {
  const p = palette[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: p.primary },
      error: { main: p.error },
      success: { main: p.success },
      warning: { main: p.warning },
      background: { default: p.bg, paper: p.paper },
      text: { primary: p.text, secondary: p.muted },
      divider: p.divider,
      hero: { main: p.hero, contrastText: '#ffffff' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'xs' } },
      MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 3 }, bar: { borderRadius: 3 } } },
      MuiCssBaseline: { styleOverrides: { body: { fontVariantNumeric: 'tabular-nums' } } },
    },
  });
}

/** OS の設定と、埋め込み先が付ける data-theme 属性の両方に従う */
export function useAppTheme(): Theme {
  const [mode, setMode] = useState<'light' | 'dark'>(() => detect());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setMode(detect());
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', update); obs.disconnect(); };
  }, []);
  return useMemo(() => build(mode), [mode]);
}

function detect(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
