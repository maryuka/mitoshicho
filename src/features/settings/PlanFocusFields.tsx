import { FormControlLabel, Radio, RadioGroup, Typography, Box } from '@mui/material';
import { db } from '../../db/db';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/types';

const OPTIONS: { value: 'budget' | 'cash'; title: string; help: string }[] = [
  { value: 'budget', title: '予算', help: 'カードは使う月で数える。予算どおりに使えているかを見たいとき' },
  { value: 'cash', title: '口座のお金', help: 'カードは引き落とされる月で数える。引落のときに口座のお金が足りるかを見たいとき' },
];

/** 計画の上で大きく出す数字。選んでいないほうも1行で出す。変えたらすぐ保存する */
export function PlanFocusFields({ settings }: { settings: Settings }) {
  const value = settings.planFocus ?? 'budget';
  return (
    <RadioGroup value={value} aria-label="計画で大きく出す数字"
      onChange={(e) => db.settings.put({ ...DEFAULT_SETTINGS, ...settings, planFocus: e.target.value as 'budget' | 'cash' })}>
      {OPTIONS.map((o) => (
        <FormControlLabel key={o.value} value={o.value} control={<Radio />} sx={{ alignItems: 'flex-start', mx: 0, py: 0.75, gap: 0.5 }}
          label={(
            <Box sx={{ pt: 1 }}>
              <Typography fontWeight={700}>{o.title}</Typography>
              <Typography variant="caption" color="text.secondary">{o.help}</Typography>
            </Box>
          )} />
      ))}
    </RadioGroup>
  );
}
