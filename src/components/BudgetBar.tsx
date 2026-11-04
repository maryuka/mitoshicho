import { LinearProgress } from '@mui/material';

/** 予算の消化バー。超過したら警告色 */
export function BudgetBar({ value, max }: { value: number; max: number }) {
  const over = max > 0 ? value > max : value > 0;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : over ? 100 : 0;
  return (
    <LinearProgress
      variant="determinate"
      value={pct}
      color={over ? 'error' : 'primary'}
      aria-label={over ? '予算超過' : '予算の消化率'}
    />
  );
}
