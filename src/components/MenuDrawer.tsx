import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CategoryIcon from '@mui/icons-material/Category';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import MenuIcon from '@mui/icons-material/Menu';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import TableViewIcon from '@mui/icons-material/TableView';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, ButtonBase, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';

export interface MenuEntry {
  route: string;
  label: string;
  icon: ReactElement;
  /** アイコンの丸の色（テーマのパレット名） */
  tone: 'primary' | 'success' | 'warning' | 'info' | 'grey';
}

export const MENU: { title: string; entries: MenuEntry[] }[] = [
  {
    title: 'お金のこと',
    entries: [
      { route: 'receivables', label: '立替・経費精算', icon: <ReceiptLongIcon />, tone: 'warning' },
    ],
  },
  {
    title: '設定',
    entries: [
      { route: 'prefs-basic', label: '月の区切り', icon: <TuneIcon />, tone: 'primary' },
      { route: 'prefs-accounts', label: '口座・カード', icon: <AccountBalanceIcon />, tone: 'grey' },
      { route: 'prefs-categories', label: 'カテゴリ', icon: <CategoryIcon />, tone: 'success' },
      { route: 'prefs-items', label: '定期項目', icon: <EventRepeatIcon />, tone: 'primary' },
      { route: 'prefs-checklist', label: '給料日のチェックリスト', icon: <ChecklistIcon />, tone: 'success' },
      { route: 'prefs-appearance', label: '見た目の設定', icon: <PaletteOutlinedIcon />, tone: 'info' },
    ],
  },
  {
    title: 'データ',
    entries: [
      { route: 'prefs-import', label: 'スプレッドシートから取り込む', icon: <TableViewIcon />, tone: 'info' },
      { route: 'prefs-backup', label: 'バックアップと復元', icon: <SaveAltIcon />, tone: 'grey' },
    ],
  },
];

export const MENU_LABEL: Record<string, string> = Object.fromEntries(
  MENU.flatMap((g) => g.entries.map((e) => [e.route, e.label])),
);

const toneColor = (t: Theme, tone: MenuEntry['tone']) =>
  tone === 'grey' ? t.palette.text.secondary : t.palette[tone].main;

/** 左上の丸いメニューボタン */
export function MenuButton({ onClick }: { onClick: () => void }) {
  // ホームの色付きの帯（data-hero）の上では、白の半透明にする
  return (
    <IconButton aria-label="メニュー" onClick={onClick}
      sx={(t) => ({ width: 44, height: 44, flexShrink: 0, color: 'primary.main', bgcolor: alpha(t.palette.primary.main, 0.12),
        '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.2) },
        '[data-hero] &': { color: 'inherit', bgcolor: alpha('#ffffff', 0.22), '&:hover': { bgcolor: alpha('#ffffff', 0.3) } } })}>
      <MenuIcon />
    </IconButton>
  );
}

/** 左から出るメニュー。設定などをタイルで並べる */
export function MenuDrawer({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (route: string) => void;
}) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}
      slotProps={{ paper: { sx: { width: 'min(86vw, 380px)', bgcolor: 'background.default' } } }}>
      <Box sx={{ pt: 'calc(16px + env(safe-area-inset-top, 0px))', pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary" sx={{ lineHeight: 1.3 }}>家計の見通し帳</Typography>
            <Typography variant="caption" color="text.secondary">先が見えるから、今を気持ちよく使える</Typography>
          </Box>
          <IconButton aria-label="メニューを閉じる" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Stack spacing={3}>
          {MENU.map((g) => (
            <Box key={g.title}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{g.title}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
                {g.entries.map((e) => (
                  <ButtonBase key={e.route} onClick={() => onSelect(e.route)} focusRipple
                    sx={(t) => ({
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5, p: 2, minHeight: 112,
                      bgcolor: 'background.paper', borderRadius: '12px', border: 1, borderColor: 'divider', textAlign: 'left',
                      '&:hover': { borderColor: alpha(toneColor(t, e.tone), 0.5) },
                    })}>
                    <Box sx={(t) => ({
                      width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      bgcolor: alpha(toneColor(t, e.tone), t.palette.mode === 'dark' ? 0.22 : 0.12), color: toneColor(t, e.tone),
                    })}>
                      {e.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={700}>{e.label}</Typography>
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Drawer>
  );
}
