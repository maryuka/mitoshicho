import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import HomeIcon from '@mui/icons-material/Home';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {
  BottomNavigation, BottomNavigationAction, Box, Container,
  IconButton, Paper, Stack, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useAppData } from './db/useAppData';
import { addPeriods, periodOf, periodRule } from './domain/period';
import { buildSampleData } from './db/sample';
import { db } from './db/db';
import { HomePage } from './features/home/HomePage';
import { PaydayPage } from './features/home/PaydayPage';
import { PlanPage } from './features/plan/PlanPage';
import { ReviewPage } from './features/review/ReviewPage';
import { ReceivablesPage } from './features/receivables/ReceivablesPage';
import { SettingsPage, type SettingsPageId } from './features/settings/SettingsPage';
import { ConfirmHost } from './components/ConfirmDialog';
import { MENU_LABEL, MenuButton, MenuDrawer, TOUR_ROUTE } from './components/MenuDrawer';
import { KitsuneLoading, KitsuneSays } from './components/Kitsune';
import { TOUR_STEPS, Tour } from './features/welcome/Tour';
import { Walkthrough } from './features/welcome/Walkthrough';

// 画面は #home 形式のハッシュで切り替える（静的ホスティングと埋め込みの両方で動く）
// ヘッダーは置かず、下のメニューでホーム・計画・ふりかえりを切り替え、立替と設定の各ページは左上のメニューボタンから開く
// 計画（#plan）は月ごとの予算、ふりかえり（#budget）は月末の実績の入力
type MainRoute = 'home' | 'plan' | 'budget';
const MAIN_TABS: { id: MainRoute; label: string; icon: ReactElement }[] = [
  { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  { id: 'plan', label: '計画', icon: <EditCalendarIcon /> },
  { id: 'budget', label: 'ふりかえり', icon: <FactCheckIcon /> },
];
const isMain = (r: string): r is MainRoute => MAIN_TABS.some((t) => t.id === r);
const SUB_ROUTES = Object.keys(MENU_LABEL);

/** メニューから開くページの先頭で、狐が言うひとこと */
const TIPS: Record<string, string> = {
  payday: '給料日には、入金と口座への振り分けをここでチェックしよう！',
  receivables: '立て替えたお金は、戻ってくる月を入れておくと見通しに入るよ！',
  'prefs-basic': '月の区切りは給料日。土日祝のときのずらし方も選べるよ！',
  'prefs-accounts': '請求確定日を入れておくと、確定したときにホームの「お知らせ」で知らせるよ！',
  'prefs-categories': 'カテゴリはいつも使う家計簿アプリと同じ名前にしておくと、実績を入れやすいよ！',
  'prefs-items': '毎月・毎年決まって出入りするお金を入れておこう！',
  'prefs-home': 'ホームに出すものを選べるよ。よく見るものだけにしておこう！',
  'prefs-review': '小さなずれまで気になるなら金額を下げて、大きいものだけ見たいなら上げよう！',
  'prefs-appearance': '画面の明るさを選べるよ。夜はダークが目にやさしいよ！',
  'prefs-checklist': '給料日にやることを並べておくと、「給料日のチェック」でチェックできるよ！',
  'prefs-import': 'スプレッドシートのセルをコピーして貼り付けるだけで取り込めるよ！',
  'prefs-backup': 'データはこの端末の中だけ。ときどきバックアップしておくと安心だよ！',
};

const routeFromHash = (): string => {
  const h = location.hash.replace(/^#\/?/, '');
  return isMain(h) || SUB_ROUTES.includes(h) ? h : 'home';
};
const go = (r: string) => { location.hash = `#${r}`; };

export function App() {
  const data = useAppData();
  const [hashRoute, setRoute] = useState<string>(routeFromHash);
  const [lastMain, setLastMain] = useState<MainRoute>(isMain(hashRoute) ? hashRoute : 'home');
  const [period, setPeriod] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  // メニューから、はじめのウォークスルーをもう一度見ているあいだ（データはそのまま）
  const [replaying, setReplaying] = useState(false);
  const nextTour = useCallback(() => setTourIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1)), []);
  // 画面の案内のあいだは、保存せずに組み立てたサンプルデータを見せる
  const touring = !!data?.settings.tourPending && !!data.settings.startedAt;
  const startDay = data?.settings.periodStartDay;
  const holidayShift = data?.settings.holidayShift;
  const sample = useMemo(
    () => (touring ? buildSampleData({ id: 'app', periodStartDay: startDay ?? 15, holidayShift }) : null),
    [touring, startDay, holidayShift],
  );

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { if (isMain(hashRoute)) setLastMain(hashRoute); }, [hashRoute]);

  if (!data) {
    return <KitsuneLoading />;
  }

  const current = periodOf(new Date(), periodRule(data.settings));
  const isEmpty = !data.settings.startedAt && data.items.length === 0 && data.accounts.length === 0;
  const tour = sample && !isEmpty && !replaying ? TOUR_STEPS[tourIndex] : null;
  const view = tour && sample ? sample : data;
  const route = tour ? tour.route : hashRoute;
  const p = tour ? addPeriods(current, tour.offset ?? 0) : period ?? current;
  const finishTour = () => {
    const { tourPending: _done, ...rest } = data.settings;
    void db.settings.put(rest);
    window.scrollTo(0, 0);
  };
  const isSub = SUB_ROUTES.includes(route);
  // 下のメニューを出さないのは、データが空のあいだ（ウォークスルーなど）と、左のメニューから開いたページ（「‹ 戻る」で戻る）
  const noNav = isEmpty || replaying || isSub;
  const openBudget = (pid: string) => { setPeriod(pid); go('budget'); };
  const openPlan = (pid: string) => { setPeriod(pid); go('plan'); };
  const menu = <MenuButton onClick={() => setMenuOpen(true)} />;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{
        pt: 'calc(12px + env(safe-area-inset-top, 0px))', pb: noNav ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 'calc(84px + env(safe-area-inset-bottom, 0px))',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
      }}>
        {replaying ? (
          <Walkthrough settings={data.settings} onStart={() => {
            setReplaying(false);
            setTourIndex(0);
            void db.settings.put({ ...data.settings, tourPending: true });
            go('home');
          }} />
        ) : isSub ? (
          <Stack spacing={2}>
            <SubHeader title={MENU_LABEL[route]} onBack={() => go(lastMain)} />
            {TIPS[route] && <KitsuneSays>{TIPS[route]}</KitsuneSays>}
            {route === 'payday' ? <PaydayPage data={view} current={current} />
              : route === 'receivables'
              ? <ReceivablesPage data={view} current={current} />
              : <SettingsPage page={route.replace('prefs-', '') as SettingsPageId} data={view} current={current} />}
          </Stack>
        ) : isEmpty ? (
          <Walkthrough settings={data.settings} />
        ) : route === 'budget'
          ? <ReviewPage data={view} period={p} setPeriod={setPeriod} current={current} menu={menu} />
          : route === 'plan'
          ? <PlanPage data={view} period={p} setPeriod={setPeriod} current={current} menu={menu} />
          : <HomePage data={view} current={current} onOpenBudget={openBudget} onOpenPlan={openPlan} onOpenPayday={() => go('payday')} menu={menu} />}
      </Container>

      {!noNav && <Paper elevation={3} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, pb: 'env(safe-area-inset-bottom, 0px)' }}>
        <BottomNavigation showLabels value={isSub ? lastMain : route} onChange={(_, v: MainRoute) => go(v)}
          sx={{
            maxWidth: 600, mx: 'auto', height: 64,
            // 選んでいるタブはアイコンを横長の丸で囲む
            '& .nav-icon': { display: 'grid', placeItems: 'center', width: 56, height: 30, borderRadius: 999, transition: 'background-color .2s' },
            '& .Mui-selected .nav-icon': { bgcolor: 'soft' },
            '& .MuiBottomNavigationAction-label': { mt: 0.25, fontWeight: 700 },
          }}>
          {MAIN_TABS.map((t) => (
            <BottomNavigationAction key={t.id} value={t.id} label={t.label} icon={<span className="nav-icon">{t.icon}</span>} />
          ))}
        </BottomNavigation>
      </Paper>}

      {tour && <Tour index={tourIndex} onNext={nextTour} onFinish={finishTour} />}
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={(r) => {
        setMenuOpen(false);
        if (r === TOUR_ROUTE) {
          // ウォークスルーから見直す。「始める」で画面の案内に進む。どちらも今のデータはそのまま
          setReplaying(true);
          window.scrollTo(0, 0);
          return;
        }
        go(r);
      }} />
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
