import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  BottomNavigation, BottomNavigationAction, Box, Button, Card, CardContent, CircularProgress, Container,
  IconButton, Paper, Stack, Typography,
} from '@mui/material';
import { useEffect, useState, type ReactElement } from 'react';
import { useAppData } from './db/useAppData';
import { loadSampleData } from './db/sample';
import { periodOf } from './domain/period';
import { HomePage } from './features/home/HomePage';
import { BudgetPage } from './features/budget/BudgetPage';
import { ReceivablesPage } from './features/receivables/ReceivablesPage';
import { SettingsPage, type SettingsPageId } from './features/settings/SettingsPage';
import { ConfirmHost } from './components/ConfirmDialog';
import { MENU_LABEL, MenuButton, MenuDrawer } from './components/MenuDrawer';

// 画面は #home 形式のハッシュで切り替える（静的ホスティングと埋め込みの両方で動く）
// ヘッダーは置かず、ホーム・予算と実績は左上のメニューボタンから、立替と設定の各ページを開く
type MainRoute = 'home' | 'budget';
const MAIN_TABS: { id: MainRoute; label: string; icon: ReactElement }[] = [
  { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  { id: 'budget', label: '予算と実績', icon: <TableChartIcon /> },
];
const SUB_ROUTES = Object.keys(MENU_LABEL);

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

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { if (route === 'home' || route === 'budget') setLastMain(route); }, [route]);

  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  const current = periodOf(new Date(), data.settings.periodStartDay);
  const p = period ?? current;
  const isEmpty = data.items.length === 0 && data.accounts.length === 0;
  const isSub = SUB_ROUTES.includes(route);
  const openBudget = (pid: string) => { setPeriod(pid); go('budget'); };
  const menu = <MenuButton onClick={() => setMenuOpen(true)} />;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{
        pt: 'calc(12px + env(safe-area-inset-top, 0px))', pb: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
      }}>
        {isSub ? (
          <Stack spacing={2}>
            <SubHeader title={MENU_LABEL[route]} onBack={() => go(lastMain)} />
            {route === 'receivables'
              ? <ReceivablesPage data={data} current={current} />
              : <SettingsPage page={route.replace('prefs-', '') as SettingsPageId} data={data} current={current} />}
          </Stack>
        ) : isEmpty ? (
          <Stack spacing={2}>
            <Box>{menu}</Box>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>ようこそ</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  給料日ごとに「今月お金が回るか」を確認して、月末に Zaim の集計で予算を振り返るアプリです。データはこの端末の中だけに保存されます。
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="contained" onClick={() => go('prefs-import')}>スプレッドシートから取り込む</Button>
                  <Button variant="outlined" onClick={() => loadSampleData()}>サンプルデータで試す</Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        ) : route === 'budget'
          ? <BudgetPage data={data} period={p} setPeriod={setPeriod} current={current} menu={menu} />
          : <HomePage data={data} period={p} setPeriod={setPeriod} current={current} onOpenBudget={openBudget} menu={menu} />}
      </Container>

      <Paper elevation={3} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, pb: 'env(safe-area-inset-bottom, 0px)' }}>
        <BottomNavigation showLabels value={isSub ? lastMain : route} onChange={(_, v: MainRoute) => go(v)}
          sx={{ maxWidth: 600, mx: 'auto' }}>
          {MAIN_TABS.map((t) => <BottomNavigationAction key={t.id} value={t.id} label={t.label} icon={t.icon} />)}
        </BottomNavigation>
      </Paper>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={(r) => { setMenuOpen(false); go(r); }} />
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
