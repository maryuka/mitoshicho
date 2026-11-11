import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Card, CardHeader, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { cardTodos, DEFAULT_BIG_MIN_YEN, homeBigExpenses, outlook, summarize, type CardTodo } from '../../domain/cashflow';
import { paydayProgress } from '../../domain/payday';
import { monthDrifts, reviewStatus } from '../../domain/review';
import { addPeriods, periodEnd, periodLabel, periodStart, periodRule } from '../../domain/period';
import type { AppData } from '../../domain/types';
import { billDatesText } from '../../lib/cardBill';
import { yen } from '../../lib/money';
import { CardBillDialog } from '../../components/CardBillDialog';
import { Bubble, KITSUNE } from '../../components/Kitsune';
import { BigExpensesCard, OutflowsCard } from './Outlook';
import { CycleCard, type CycleStage } from './Cycle';
import { SetupGuide } from './SetupGuide';

interface Cycle { stage: CycleStage; title: string; sub: string; action: string; onAction: () => void; message: string; fox: string }

/** ホーム: 今やることが分かる画面。サイクルの今の段階と、やることを1つだけ出す */
export function HomePage({ data, current, onOpenBudget, onOpenPlan, onOpenPayday, menu }: {
  data: AppData; current: string; onOpenBudget: (p: string) => void; onOpenPlan: (p: string) => void; onOpenPayday: () => void;
  menu?: ReactNode;
}) {
  const startDay = periodRule(data.settings);
  const [editing, setEditing] = useState<CardTodo | null>(null);
  // 定期項目がまだないあいだは「はじめの準備」を出す
  const setup = data.items.length === 0;
  const prev = addPeriods(current, -1);
  const review = useMemo(() => reviewStatus(data, prev), [data, prev]);
  const payday = useMemo(() => paydayProgress(data, current), [data, current]);
  const casualOver = useMemo(() => monthDrifts(data, prev).find((d) => d.diff > 0 && d.kind === 'casual'), [data, prev]);
  const home = data.settings.home ?? {};
  const showBig = home.big ?? true;
  const showOutflows = home.outflows ?? false;
  const bigMinYen = home.bigMinYen ?? DEFAULT_BIG_MIN_YEN;
  const big = useMemo(() => (setup || !showBig ? [] : homeBigExpenses(outlook(data, current), data.settings)), [setup, showBig, data, current]);
  const summary = useMemo(() => (setup || !showOutflows ? undefined : summarize(data, current, current)), [setup, showOutflows, data, current]);
  const daysIn = Math.floor((Date.now() - periodStart(current, startDay).getTime()) / 86400000);
  const daysLeft = Math.max(0, Math.ceil((periodEnd(current, startDay).getTime() - Date.now()) / 86400000));
  const prevLabel = periodLabel(prev, startDay);

  // サイクルの今の段階。先月のふりかえり → 給料日のチェック（月のはじめ5日）→ 今月の計画（月のはじめ1週間）→ 使う
  const cycle: Cycle = !review.done
    ? {
      stage: 'review', title: '先月をふりかえろう', action: '先月をふりかえる', onAction: () => onOpenBudget(prev), fox: KITSUNE.looking,
      sub: !review.started ? `${prevLabel}の合計を入れて、計画とくらべよう`
        : review.missing > 0 ? `${prevLabel}・あと ${review.missing} カテゴリ入れよう`
        : `ずれが大きかった ${review.untagged} つに、理由を付けよう`,
      message: !review.started || review.missing > 0 ? '先月のふりかえりをしよう！' : 'ずれの理由を考えてみよう',
    }
    : daysIn < 5 && payday.total > 0 && payday.done < payday.total
      ? {
        stage: 'plan', title: '給料日のチェックをしよう', sub: `入金と振り分け・あと ${payday.total - payday.done} 件`,
        action: '給料日のチェック', onAction: onOpenPayday, fox: KITSUNE.money, message: '給料日だね！ 入金と振り分けをチェックしよう',
      }
      : daysIn < 7
        ? {
          stage: 'plan', title: '今月の計画を立てよう', sub: '先月のずれをふまえて、今月の予算を見直そう',
          action: '今月の計画を開く', onAction: () => onOpenPlan(current), fox: KITSUNE.counting,
          message: casualOver ? `先月は${casualOver.category.name}が少し多め。今月の計画に活かそう` : '今月の計画を立てよう！',
        }
        : {
          stage: 'use', title: '計画どおりに使っていこう', sub: `ふりかえりまで、あと${daysLeft}日`,
          action: '今月の計画を見る', onAction: () => onOpenPlan(current), fox: KITSUNE.happy,
          message: casualOver ? `先月は${casualOver.category.name}が少し多め。今月は意識してみよう` : '今月も計画どおりにいこう！',
        };

  return (
    <Stack spacing={2}>
      <Box>
        {/* 上部の色付きの帯。コンテナの余白を打ち消して画面の端まで広げる */}
        <Box data-hero sx={{
          bgcolor: 'hero.main', color: 'hero.contrastText', textAlign: 'center', position: 'relative', overflow: 'hidden',
          mt: 'calc(-12px - env(safe-area-inset-top, 0px))', pt: 'calc(12px + env(safe-area-inset-top, 0px))', pb: 6,
          ml: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', pl: 'max(16px, env(safe-area-inset-left, 0px))',
          mr: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
          '&::after': {
            content: '""', position: 'absolute', left: '-10%', right: '-10%', bottom: -36, height: 72,
            bgcolor: 'background.default', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          },
        }}>
          {/* 左にメニュー、まん中に今月がいつからいつまでか（右は左右をそろえるための空き） */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {menu}
            {!setup && (
              <Typography fontWeight={900} sx={{ whiteSpace: 'nowrap' }}>
                <Box component="span" sx={{ fontSize: 12, opacity: 0.85, mr: 0.75 }}>今月</Box>{periodLabel(current, startDay)}
              </Typography>
            )}
            <Box sx={{ width: 44, flexShrink: 0 }} />
          </Box>
          <Box sx={{ mt: 0.5 }}><Bubble>{setup ? 'まずは準備から始めよう！' : cycle.message}</Bubble></Box>
          <Box component="img" src={setup ? KITSUNE.counting : cycle.fox} alt=""
            // 絵によって縦横比が違うので、高さをそろえて帯の高さが変わらないようにする
            sx={{ display: 'block', height: 112, width: 'auto', maxWidth: '60%', objectFit: 'contain', mx: 'auto', mt: 1.5, mb: 1 }} />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
          {setup ? <SetupGuide data={data} /> : <CycleCard {...cycle} />}
        </Box>
      </Box>

      {!setup && <Notices data={data} current={current} onCardTodo={setEditing} />}
      {!setup && showBig && <BigExpensesCard list={big} minYen={bigMinYen} startDay={startDay} onOpen={onOpenPlan} limit={3} />}
      {summary && <OutflowsCard summary={summary} title="今月の出金予定" />}
      {!setup && (
        <Button href="#prefs-home" startIcon={<TuneIcon />} color="inherit" size="small" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
          ホームをカスタマイズ
        </Button>
      )}

      {editing && (
        <CardBillDialog periodId={editing.periodId} bill={editing.bill} startDay={startDay} onClose={() => setEditing(null)} />
      )}
    </Stack>
  );
}

/** お知らせ: カードの請求額の確定、回収予定を過ぎた立替、バックアップ。あるときだけ出す */
function Notices({ data, current, onCardTodo }: { data: AppData; current: string; onCardTodo: (t: CardTodo) => void }) {
  const todos = useMemo(() => cardTodos(data, new Date(), current), [data, current]);
  const pending = data.receivables.filter((r) => !r.receivedAt && r.expectedPeriod <= current);
  const backupDays = data.settings.lastBackupAt
    ? Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) : undefined;
  const needBackup = backupDays === undefined || backupDays >= 30;
  if (todos.length === 0 && pending.length === 0 && !needBackup) return null;

  return (
    <Card data-tour="notices">
      <CardHeader title="お知らせ" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} sx={{ pb: 0 }} />
      <List dense>
        {todos.map((t) => (
          <Notice key={`${t.periodId}:${t.bill.card.id}`} icon={<CreditCardIcon color={t.overdue ? 'error' : 'warning'} />}
            primary={`${t.bill.card.name} の請求額が確定。金額を入れよう`}
            secondary={`${billDatesText(t.bill)}・予測 ${yen(t.bill.forecast)}`} onClick={() => onCardTodo(t)} />
        ))}
        {pending.length > 0 && (
          <Notice icon={<ReceiptLongIcon color="warning" />} primary="回収予定を過ぎた立替・精算があるよ"
            secondary={`${yen(pending.reduce((a, r) => a + r.amount, 0))}（${pending.length}件）`} href="#receivables" />
        )}
        {needBackup && (
          <Notice icon={<SaveAltIcon color="action" />} primary="バックアップを保存しよう"
            secondary={backupDays === undefined ? 'まだ保存していないよ' : `前回から ${backupDays} 日`} href="#prefs-backup" />
        )}
      </List>
    </Card>
  );
}

function Notice({ icon, primary, secondary, onClick, href }: {
  icon: ReactNode; primary: string; secondary: string; onClick?: () => void; href?: string;
}) {
  return (
    <ListItemButton onClick={onClick} {...(href ? { component: 'a', href } : {})}>
      <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
      <ListItemText primary={primary} secondary={secondary} primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }} />
      <ChevronRightIcon color="action" />
    </ListItemButton>
  );
}
