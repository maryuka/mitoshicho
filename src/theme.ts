import { createTheme, type Theme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';

// ブランドの緑を軸に、ニュートラルは緑寄りのグレー
const palette = {
  light: { primary: '#1f6f5c', bg: '#f5f7f5', paper: '#ffffff', text: '#1d2420', muted: '#5f6b65', error: '#c2412d', success: '#1f7a4f', warning: '#a15c00' },
  dark: { primary: '#5cc0a2', bg: '#111513', paper: '#1a201d', text: '#e6ebe8', muted: '#9aa6a0', error: '#ff8a73', success: '#6fd19d', warning: '#f0b45a' },
};

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
