import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import {
  Avatar, Card, CardContent, CardHeader, Link, List, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import type { AppData } from '../../domain/types';

interface SetupStep { route: string; title: string; sub: string; icon: ReactElement; done: boolean }

/** 定期項目がまだないあいだ、ホームに出す「はじめの準備」 */
export function SetupGuide({ data }: { data: AppData }) {
  const steps: SetupStep[] = [
    { route: 'prefs-accounts', title: '口座・カードを登録', sub: '給料が入る口座や、引き落としに使うカード', icon: <AccountBalanceIcon />, done: data.accounts.length > 0 },
    { route: 'prefs-categories', title: 'カテゴリを作る', sub: '給与・家賃・食費など。家計簿アプリと同じ名前がおすすめ', icon: <CategoryIcon />, done: data.categories.length > 0 },
    { route: 'prefs-items', title: '定期項目を入れる', sub: '毎月・毎年決まって出入りするお金', icon: <EventRepeatIcon />, done: data.items.length > 0 },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card>
      <CardHeader title="はじめの準備" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 900 }}
        subheader="3つ入れると、お金が回るかを見通せるよ" sx={{ pb: 0 }} />
      <List>
        {steps.map((s, i) => (
          <ListItemButton key={s.route} href={`#${s.route}`} component="a" sx={{ py: 1.25 }}>
            <ListItemAvatar>
              <Avatar sx={{
                bgcolor: s.done ? 'transparent' : i === next ? 'primary.main' : 'soft',
                color: s.done ? 'success.main' : i === next ? 'primary.contrastText' : 'text.secondary',
              }}>
                {s.done ? <CheckCircleIcon sx={{ fontSize: 36 }} /> : s.icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={`${i + 1}. ${s.title}`} secondary={s.sub}
              primaryTypographyProps={{ fontWeight: 700, color: s.done ? 'text.secondary' : 'text.primary' }} />
            <ChevronRightIcon color="action" />
          </ListItemButton>
        ))}
      </List>
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">まとめて入れたいときは</Typography>
          <Link href="#prefs-import" variant="body2" underline="hover">スプレッドシートから取り込む</Link>
          <Link href="#prefs-backup" variant="body2" underline="hover">サンプルデータで試す・バックアップから復元する</Link>
        </Stack>
      </CardContent>
    </Card>
  );
}
