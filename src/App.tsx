import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Card, CardContent, CircularProgress, Container,
  IconButton, Paper, Stack, Tab, Tabs, Toolbar, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { useEffect, useState, type ReactElement } from 'react';
import { useAppData } from './db/useAppData';
import { loadSampleData } from './db/sample';
import { periodOf } from './domain/period';
import { HomePage } from './features/home/HomePage';
import { BudgetPage } from './features/budget/BudgetPage';
import { ReceivablesPage } from './features/receivables/ReceivablesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ConfirmHost } from './components/ConfirmDialog';

// 画面は #home 形式のハッシュで切り替える（静的ホスティングと埋め込みの両方で動く）
export type Route = 'home' | 'budget' | 'receivables' | 'prefs';
const ROUTES: Route[] = ['home', 'budget', 'receivables', 'prefs'];
const MAIN_TABS: { id: Route; label: string; icon: ReactElement }[] = [
  { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  { id: 'budget', label: '予算と実績', icon: <TableChartIcon /> },
];
const BACK_TO: Partial<Record<Route, Route>> = { receivables: 'home', prefs: 'home' };

const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : 'home';
};
const go = (r: Route) => { location.hash = `#${r}`; };

export function App() {
  const data = useAppData();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [period, setPeriod] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  const current = periodOf(new Date(), data.settings.periodStartDay);
  const p = period ?? current;
  const isEmpty = data.items.length === 0 && data.accounts.length === 0;
  const back = BACK_TO[route];
  const tabValue = MAIN_TABS.some((t) => t.id === route) ? route : false;
  const openBudget = (pid: string) => { setPeriod(pid); go('budget'); };

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0}
        sx={{ top: 'env(safe-area-inset-top, 0px)', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ gap: 2, pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))' }}>
          {back
            ? <Button startIcon={<ArrowBackIcon />} onClick={() => go(back)}>戻る</Button>
            : <Typography variant="h6" component="h1" color="primary" fontWeight={700}>見通し帳</Typography>}
          {wide && (
            <Tabs value={tabValue} onChange={(_, v: Route) => go(v)} sx={{ flex: 1 }}>
              {MAIN_TABS.map((t) => <Tab key={t.id} value={t.id} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 64 }} />)}
            </Tabs>
          )}
          <Box sx={{ flex: wide ? 0 : 1 }} />
          <IconButton aria-label="設定" onClick={() => go('prefs')} color={route === 'prefs' ? 'primary' : 'default'}><SettingsIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{
        pt: 2, pb: wide ? 4 : 'calc(80px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
      }}>
        {isEmpty && route !== 'prefs' ? (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>ようこそ</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                給料日ごとに「今月お金が回るか」を確認して、月末に Zaim の集計で予算を振り返るアプリです。データはこの端末の中だけに保存されます。
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={() => loadSampleData()}>サンプルデータで試す</Button>
                <Button variant="outlined" onClick={() => go('prefs')}>スプレッドシートから取り込む・自分で登録する</Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <>
            {route === 'home' && <HomePage data={data} period={p} setPeriod={setPeriod} current={current} onOpenBudget={openBudget} />}
            {route === 'budget' && <BudgetPage data={data} period={p} setPeriod={setPeriod} current={current} />}
            {route === 'receivables' && <ReceivablesPage data={data} current={current} />}
            {route === 'prefs' && <SettingsPage data={data} current={current} />}
          </>
        )}
      </Container>

      {!wide && (
        <Paper elevation={3} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, pb: 'env(safe-area-inset-bottom, 0px)' }}>
          <BottomNavigation showLabels value={tabValue === false ? (BACK_TO[route] ?? false) : tabValue} onChange={(_, v: Route) => go(v)}>
            {MAIN_TABS.map((t) => <BottomNavigationAction key={t.id} value={t.id} label={t.label} icon={t.icon} />)}
          </BottomNavigation>
        </Paper>
      )}
      <ConfirmHost />
    </Box>
  );
}
