import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { addPeriods, periodLabel } from '../domain/period';

/** 月の切り替え。leading には左上のメニューボタンを置く */
export function PeriodNav({ value, onChange, startDay, current, leading, onHero }: {
  value: string; onChange: (p: string) => void; startDay: number; current: string; leading?: ReactNode;
  /** ホーム上部の色付きの帯の上に置くとき */
  onHero?: boolean;
}) {
  const ic = onHero ? 'inherit' : 'default';
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {leading}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flex: 1, minWidth: 0 }}>
      <IconButton color={ic} onClick={() => onChange(addPeriods(value, -1))} aria-label="前の月"><ChevronLeftIcon /></IconButton>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={900} noWrap>{periodLabel(value, startDay)}</Typography>
        {value === current
          ? <Chip label="今月" size="small" color="primary" variant={onHero ? 'filled' : 'outlined'}
            sx={onHero ? { bgcolor: 'background.paper', color: 'primary.main', fontWeight: 700 } : undefined} />
          : <Button size="small" color={onHero ? 'inherit' : 'primary'} onClick={() => onChange(current)}>今月へ</Button>}
      </Stack>
      <IconButton color={ic} onClick={() => onChange(addPeriods(value, 1))} aria-label="次の月"><ChevronRightIcon /></IconButton>
      </Stack>
    </Stack>
  );
}
