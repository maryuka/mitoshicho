import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  BottomNavigation, BottomNavigationAction, Box, Container,
  IconButton, Paper, Stack, Typography,
} from '@mui/material';
import { useEffect, useState, type ReactElement } from 'react';
import { useAppData } from './db/useAppData';
import { SampleDataDialog } from './components/SampleDataDialog';
import { periodOf } from './domain/period';
import { HomePage } from './features/home/HomePage';
import { BudgetPage } from './features/budget/BudgetPage';
import { ReceivablesPage } from './features/receivables/ReceivablesPage';
import { SettingsPage, type SettingsPageId } from './features/settings/SettingsPage';
import { ConfirmHost } from './components/ConfirmDialog';
import { MENU_LABEL, MenuButton, MenuDrawer } from './components/MenuDrawer';
import { HiyokoLoading, HiyokoSays } from './components/Hiyoko';
import { Walkthrough } from './features/welcome/Walkthrough';

// 画面は #home 形式のハッシュで切り替える（静的ホスティングと埋め込みの両方で動く）
// ヘッダーは置かず、ホーム・予算と実績は左上のメニューボタンから、立替と設定の各ページを開く
type MainRoute = 'home' | 'budget';
const MAIN_TABS: { id: MainRoute; label: string; icon: ReactElement }[] = [
  { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  { id: 'budget', label: '予算と実績', icon: <TableChartIcon /> },
];
const SUB_ROUTES = Object.keys(MENU_LABEL);

/** メニューから開くページの先頭で、ひよこが言うひとこと */
const TIPS: Record<string, string> = {
  receivables: '立て替えたお金は、戻ってくる月を入れておくと見通しに入るよ！',
  'prefs-basic': '月の区切りは給料日。バッファの下限を決めておくと、足りないときに教えるよ！',
  'prefs-accounts': '請求確定日を入れておくと、確定したときに「やること」で知らせるよ！',
  'prefs-categories': 'カテゴリは Zaim と同じ名前にしておくと、実績を入れやすいよ！',
  'prefs-items': '毎月・毎年決まって出入りするお金を入れておこう！',
  'prefs-checklist': '給料日にやることを並べておくと、ホームの「給料日」でチェックできるよ！',
  'prefs-import': 'スプレッドシートのセルをコピーして貼り付けるだけで取り込めるよ！',
  'prefs-backup': 'データはこの端末の中だけ。ときどきバックアップしておくと安心だよ！',
};

const routeFromHash = (): string => {
  const h = location.hash.replace(/^#\/?/, '');
  return h === 'budget' || SUB_ROUTES.includes(h) ? h : 'home';
};
const go = (r: string) => { location.hash = `#${r}`; };

export function App() {
  const data = useAppData();
  const [route, setRoute] = useState<string>(routeFromHash);
  const [lastMain, setLastMain] = useState<MainRoute>(route === 'budget' ? 'budget' : 'home');
  const [period, setPeriod] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { if (route === 'home' || route === 'budget') setLastMain(route); }, [route]);

  if (!data) {
    return <HiyokoLoading />;
  }

  const current = periodOf(new Date(), data.settings.periodStartDay);
  const p = period ?? current;
  const isEmpty = data.items.length === 0 && data.accounts.length === 0;
  const isSub = SUB_ROUTES.includes(route);
  // データが空のあいだ（ウォークスルーと、そこから開く取り込み・復元のページ）は下のメニューを出さない
  const noNav = isEmpty;
  const openBudget = (pid: string) => { setPeriod(pid); go('budget'); };
  const menu = <MenuButton onClick={() => setMenuOpen(true)} />;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{
        pt: 'calc(12px + env(safe-area-inset-top, 0px))', pb: noNav ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 'calc(80px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
      }}>
        {isSub ? (
          <Stack spacing={2}>
            <SubHeader title={MENU_LABEL[route]} onBack={() => go(lastMain)} />
            {TIPS[route] && <HiyokoSays>{TIPS[route]}</HiyokoSays>}
            {route === 'receivables'
              ? <ReceivablesPage data={data} current={current} />
              : <SettingsPage page={route.replace('prefs-', '') as SettingsPageId} data={data} current={current} />}
          </Stack>
        ) : isEmpty ? (
          <Walkthrough onImport={() => go('prefs-import')} onSample={() => setSampleOpen(true)} onRestore={() => go('prefs-backup')} />
        ) : route === 'budget'
          ? <BudgetPage data={data} period={p} setPeriod={setPeriod} current={current} menu={menu} />
          : <HomePage data={data} period={p} setPeriod={setPeriod} current={current} onOpenBudget={openBudget} menu={menu} />}
      </Container>

      {!noNav && <Paper elevation={3} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, pb: 'env(safe-area-inset-bottom, 0px)' }}>
        <BottomNavigation showLabels value={isSub ? lastMain : route} onChange={(_, v: MainRoute) => go(v)}
          sx={{ maxWidth: 600, mx: 'auto' }}>
          {MAIN_TABS.map((t) => <BottomNavigationAction key={t.id} value={t.id} label={t.label} icon={t.icon} />)}
        </BottomNavigation>
      </Paper>}

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={(r) => { setMenuOpen(false); go(r); }} />
      <SampleDataDialog open={sampleOpen} hasData={false} onClose={() => setSampleOpen(false)} />
      <ConfirmHost />
    </Box>
  );
}

/** メニューから開いたページの上部: 戻るボタンと中央のタイトル */
function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center' }}>
      <IconButton aria-label="戻る" onClick={onBack} sx={{ justifySelf: 'start' }}><ArrowBackIosNewIcon /></IconButton>
      <Typography variant="subtitle1" fontWeight={700} textAlign="center" noWrap>{title}</Typography>
      <span />
    </Box>
  );
}
