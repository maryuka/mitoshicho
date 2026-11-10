import { createTheme, type Theme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';

// ライトは狐に合わせたオレンジと黄色。ダークは黒に近い無彩色を背景にし、オレンジと黄色はアクセントだけに使う
const palette = {
  light: { primary: '#ea7d12', bg: '#fffaf0', paper: '#ffffff', text: '#3b2a17', muted: '#8c7558', divider: '#f1e4cc', error: '#d9480f', success: '#3f9a4a', warning: '#c77700', hero: '#f7a531', heroText: '#ffffff', soft: '#fff3c4', bubble: '#ffffff', scrim: 'rgba(59, 42, 23, 0.6)' },
  dark: { primary: '#ffad4d', bg: '#0b0b0c', paper: '#161618', text: '#ededef', muted: '#a1a1aa', divider: '#2a2a2e', error: '#ff8a5b', success: '#6bcf77', warning: '#ffd23f', hero: '#161617', heroText: '#ededef', soft: '#232325', bubble: '#232325', scrim: 'rgba(0, 0, 0, 0.72)' },
};

/** 丸ゴシック。index.html で Google Fonts から読み込む（読めないときは端末の丸ゴシック・ゴシック） */
export const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';

declare module '@mui/material/styles' {
  interface Palette { hero: { main: string; contrastText: string }; soft: string; bubble: string; scrim: string }
  interface PaletteOptions { hero?: { main: string; contrastText: string }; soft?: string; bubble?: string; scrim?: string }
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
      hero: { main: p.hero, contrastText: p.heroText },
      soft: p.soft,
      bubble: p.bubble,
      scrim: p.scrim,
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: FONT,
      fontWeightMedium: 700,
      fontWeightBold: 900,
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999 } } },
      MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 20, borderWidth: 1.5 } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'xs' } },
      MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 3 }, bar: { borderRadius: 3 } } },
      MuiCssBaseline: { styleOverrides: { body: { fontVariantNumeric: 'tabular-nums' } } },
    },
  });
}

/** 画面の明るさの設定。system は端末（と埋め込み先）に合わせる */
export type ThemePref = 'system' | 'light' | 'dark';
const THEME_KEY = 'mitoshicho:theme';
const THEME_EVENT = 'mitoshicho:theme';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
}

export function writeThemePref(v: ThemePref) {
  try { localStorage.setItem(THEME_KEY, v); } catch { /* 保存できなくても、この画面の間は切り替わる */ }
  window.dispatchEvent(new CustomEvent<ThemePref>(THEME_EVENT, { detail: v }));
}

/** 画面の明るさの設定を読み書きする */
export function useThemePref(): [ThemePref, (v: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(readThemePref);
  useEffect(() => {
    const on = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);
  return [pref, writeThemePref];
}

/** 設定でライト／ダークを選んでいればそれに、「端末に合わせる」なら OS の設定と埋め込み先が付ける data-theme 属性に従う */
export function useAppTheme(): Theme {
  const [pref] = useThemePref();
  const [system, setSystem] = useState<'light' | 'dark'>(() => detect());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystem(detect());
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', update); obs.disconnect(); };
  }, []);
  const mode = pref === 'system' ? system : pref;
  return useMemo(() => build(mode), [mode]);
}

function detect(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
