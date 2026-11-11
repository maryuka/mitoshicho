import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CategoryIcon from '@mui/icons-material/Category';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HomeIcon from '@mui/icons-material/Home';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TableViewIcon from '@mui/icons-material/TableView';
import TourOutlinedIcon from '@mui/icons-material/TourOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, ButtonBase, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import type { ReactElement, UIEvent } from 'react';

export interface MenuEntry {
  route: string;
  label: string;
  icon: ReactElement;
  /** アイコンの丸の色（テーマのパレット名） */
  tone: 'primary' | 'success' | 'warning' | 'info' | 'grey';
  /** ページを開かず、選んだときに何かをするだけの項目（画面の案内など） */
  action?: boolean;
}

/** メニューから画面の案内をもう一度始めるときの route */
export const TOUR_ROUTE = 'tour';

/**
 * いちばん上の tiles は、ふだん開くページを大きなタイルで（見出しなし）。
 * その下は設定で、どの画面に関わるかで分ける。見出しにはその画面のアイコン（タブと同じもの）を付ける
 */
interface MenuGroup { title?: string; icon?: ReactElement; tiles?: boolean; entries: MenuEntry[] }

export const MENU: MenuGroup[] = [
  {
    tiles: true,
    entries: [
      { route: 'payday', label: '給料日のチェック', icon: <PaymentsOutlinedIcon />, tone: 'primary' },
      { route: 'receivables', label: '立替・経費精算', icon: <ReceiptLongIcon />, tone: 'warning' },
    ],
  },
  {
    title: '給料日',
    icon: <PaymentsOutlinedIcon />,
    entries: [
      { route: 'prefs-checklist', label: '給料日のチェックリスト', icon: <ChecklistIcon />, tone: 'success' },
    ],
  },
  {
    title: 'ホーム',
    icon: <HomeIcon />,
    entries: [
      { route: 'prefs-home', label: 'ホームに出すもの', icon: <DashboardCustomizeOutlinedIcon />, tone: 'info' },
    ],
  },
  {
    title: '計画',
    icon: <EditCalendarIcon />,
    entries: [
      { route: 'prefs-items', label: '定期項目', icon: <EventRepeatIcon />, tone: 'primary' },
      { route: 'prefs-categories', label: 'カテゴリ', icon: <CategoryIcon />, tone: 'success' },
      { route: 'prefs-accounts', label: '口座・カード', icon: <AccountBalanceIcon />, tone: 'grey' },
    ],
  },
  {
    title: 'ふりかえり',
    icon: <FactCheckIcon />,
    entries: [
      { route: 'prefs-review', label: 'ずれを出す金額', icon: <FactCheckOutlinedIcon />, tone: 'warning' },
    ],
  },
  {
    title: 'アプリ全体',
    entries: [
      { route: 'prefs-basic', label: '月の区切り', icon: <TuneIcon />, tone: 'primary' },
      { route: 'prefs-appearance', label: '画面の明るさ', icon: <PaletteOutlinedIcon />, tone: 'info' },
      { route: 'prefs-import', label: 'スプレッドシートから取り込む', icon: <TableViewIcon />, tone: 'info' },
      { route: 'prefs-backup', label: 'バックアップと復元', icon: <SaveAltIcon />, tone: 'grey' },
      { route: TOUR_ROUTE, label: 'はじめの案内をもう一度見る', icon: <TourOutlinedIcon />, tone: 'primary', action: true },
    ],
  },
];

export const MENU_LABEL: Record<string, string> = Object.fromEntries(
  MENU.flatMap((g) => g.entries.filter((e) => !e.action).map((e) => [e.route, e.label])),
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

/** メニューをどこまでスクロールしていたか（閉じても覚えておく） */
let menuScroll = 0;

/** タイルや行の左の、色付きの丸いアイコン */
function ToneIcon({ entry: e, size }: { entry: MenuEntry; size: number }) {
  return (
    <Box sx={(t) => ({
      width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center',
      bgcolor: alpha(toneColor(t, e.tone), t.palette.mode === 'dark' ? 0.22 : 0.12), color: toneColor(t, e.tone),
      '& svg': { fontSize: size * 0.55 },
    })}>
      {e.icon}
    </Box>
  );
}

/** 左から出るメニュー。設定などをタイルで並べる */
export function MenuDrawer({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (route: string) => void;
}) {
  const renderGroup = (g: MenuGroup) => (
    <Box key={g.title ?? 'top'}>
      {g.title && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, color: 'text.secondary', '& svg': { fontSize: 20 } }}>
          {g.icon}
          <Typography variant="subtitle2" fontWeight={700}>{g.title}</Typography>
        </Stack>
      )}
      {g.tiles ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
          {g.entries.map((e) => (
            <ButtonBase key={e.route} onClick={() => onSelect(e.route)} focusRipple
              sx={(t) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5, p: 2, minHeight: 112,
                bgcolor: 'background.paper', borderRadius: '12px', border: 1, borderColor: 'divider', textAlign: 'left',
                '&:hover': { borderColor: alpha(toneColor(t, e.tone), 0.5) },
              })}>
              <ToneIcon entry={e} size={44} />
              <Typography variant="body2" fontWeight={700}>{e.label}</Typography>
            </ButtonBase>
          ))}
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {g.entries.map((e, i) => (
            <ButtonBase key={e.route} onClick={() => onSelect(e.route)} focusRipple
              sx={{ display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 1.5, px: 2, py: 1.25, textAlign: 'left',
                borderTop: i > 0 ? 1 : 0, borderColor: 'divider' }}>
              <ToneIcon entry={e} size={34} />
              <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>{e.label}</Typography>
              <ChevronRightIcon color="action" fontSize="small" />
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer anchor="left" open={open} onClose={onClose}
      slotProps={{
        paper: { sx: { width: 'min(86vw, 380px)', bgcolor: 'background.default' }, onScroll: (e: UIEvent<HTMLDivElement>) => { menuScroll = e.currentTarget.scrollTop; } },
        // 開き直したときは、前に見ていた位置から（設定のページから戻ったとき、下のほうの項目を探し直さなくていいように）
        transition: { onEntering: (node: HTMLElement) => { node.scrollTop = menuScroll; } },
      }}>
      <Box sx={{ pt: 'calc(16px + env(safe-area-inset-top, 0px))', pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary" sx={{ lineHeight: 1.3 }}>家計の見通し帳</Typography>
            <Typography variant="caption" color="text.secondary">先が見えるから、今を気持ちよく使える</Typography>
          </Box>
          <IconButton aria-label="メニューを閉じる" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Stack spacing={2.5}>
          {MENU.filter((g) => g.tiles).map(renderGroup)}
          {/* タイル以外はすべて設定。見出しで分かるようにする */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
              <SettingsOutlinedIcon color="action" />
              <Typography variant="subtitle1" fontWeight={900}>設定</Typography>
            </Stack>
            <Stack spacing={2}>{MENU.filter((g) => !g.tiles).map(renderGroup)}</Stack>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
}
