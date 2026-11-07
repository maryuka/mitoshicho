import { MenuItem, Stack, TextField } from '@mui/material';
import { db } from '../../db/db';
import type { HolidayShift, Settings } from '../../domain/types';
import { DEFAULT_SETTINGS } from '../../domain/types';

/** 選んだ日を例にした説明（土曜なら、前は金曜・後は月曜） */
function shiftHelp(shift: HolidayShift, day: number): string {
  if (shift === 'none') return '土日・祝日でも、毎月同じ日に次の月が始まります';
  return shift === 'before'
    ? `例: ${day}日が土曜なら、${day - 1}日（金）から次の月が始まります`
    : `例: ${day}日が土曜なら、${day + 2}日（月）から次の月が始まります`;
}

/** 給料日（月の開始日）と、土日・祝日のときのずらし方。月の区切りのページとウォークスルーで使う */
export function PaydayFields({ settings: s }: { settings: Settings }) {
  const update = (patch: Partial<Settings>) => db.settings.put({ ...DEFAULT_SETTINGS, ...s, ...patch });
  const shift = s.holidayShift ?? 'before';
  return (
    <Stack spacing={2}>
      <TextField id="set-start-day" select label="月の開始日（給料日）" value={s.periodStartDay}
        onChange={(e) => update({ periodStartDay: Number(e.target.value) })} fullWidth>
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <MenuItem key={d} value={d}>{d === 1 ? '1日（暦月）' : `${d}日`}</MenuItem>)}
      </TextField>
      {s.periodStartDay !== 1 && (
        <TextField id="set-holiday-shift" select label="給料日が土日・祝日のとき" value={shift}
          onChange={(e) => update({ holidayShift: e.target.value as HolidayShift })} fullWidth
          helperText={shiftHelp(shift, s.periodStartDay)}>
          <MenuItem value="before">前の平日にずらす</MenuItem>
          <MenuItem value="none">ずらさない</MenuItem>
          <MenuItem value="after">後の平日にずらす</MenuItem>
        </TextField>
      )}
    </Stack>
  );
}
