import { Box, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { db } from '../../db/db';
import { DEFAULT_BIG_MIN_YEN } from '../../domain/cashflow';
import { DEFAULT_SETTINGS, type HomeSettings, type Settings } from '../../domain/types';
import { MoneyField } from '../../components/MoneyField';

/** ホームに出すものの設定。変えたらすぐ保存する */
export function HomeFields({ settings }: { settings: Settings }) {
  const home = settings.home ?? {};
  const update = (patch: Partial<HomeSettings>) => db.settings.put({ ...DEFAULT_SETTINGS, ...settings, home: { ...home, ...patch } });
  const big = home.big ?? true;
  return (
    <Stack spacing={1.5} divider={<Divider />}>
      <Box>
        <Toggle label="この先の大きい出費" help="年払い・旅行など、この先1年の大きい出費"
          checked={big} onChange={(v) => update({ big: v })} />
        {big && (
          <MoneyField id="set-home-big-min" label="この金額以上を出す" value={home.bigMinYen ?? DEFAULT_BIG_MIN_YEN}
            onChange={(v) => update({ bigMinYen: v ?? 0 })} fullWidth sx={{ mt: 1.5 }} />
        )}
      </Box>
      <Toggle label="今月の出金予定" help="口座から出ていくお金を日付順に（計画の下と同じもの）"
        checked={home.outflows ?? false} onChange={(v) => update({ outflows: v })} />
    </Stack>
  );
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormControlLabel labelPlacement="start" sx={{ mx: 0, width: '100%', justifyContent: 'space-between', gap: 2 }}
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label={(
        <Box>
          <Typography fontWeight={700}>{label}</Typography>
          <Typography variant="caption" color="text.secondary">{help}</Typography>
        </Box>
      )} />
  );
}
