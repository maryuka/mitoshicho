import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import { addPeriods, periodLabel } from '../domain/period';

export function PeriodNav({ value, onChange, startDay, current }: {
  value: string; onChange: (p: string) => void; startDay: number; current: string;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <IconButton onClick={() => onChange(addPeriods(value, -1))} aria-label="前の月"><ChevronLeftIcon /></IconButton>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={700}>{periodLabel(value, startDay)}</Typography>
        {value === current
          ? <Chip label="今月" size="small" color="primary" variant="outlined" />
          : <Button size="small" onClick={() => onChange(current)}>今月へ</Button>}
      </Stack>
      <IconButton onClick={() => onChange(addPeriods(value, 1))} aria-label="次の月"><ChevronRightIcon /></IconButton>
    </Stack>
  );
}
