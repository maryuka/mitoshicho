import EditNoteIcon from '@mui/icons-material/EditNote';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import {
  Box, Button, Card, CardHeader, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  InputAdornment, Link, List, ListItem, ListItemIcon, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { useState } from 'react';
import { patchCategoryActual } from '../../db/ops';
import { db } from '../../db/db';
import { DEFAULT_DRIFT_THRESHOLD, DRIFT_LABEL, DRIFT_PRESETS, type Drift, type DriftHint } from '../../domain/review';
import { DEFAULT_SETTINGS, type DriftKind, type DriftThreshold, type Settings } from '../../domain/types';
import { MoneyField } from '../../components/MoneyField';
import { yen } from '../../lib/money';

/** ずれの一覧（見出しつき）。メモはダイアログで書く */
export function DriftGroup({ title, drifts }: { title: string; drifts: Drift[] }) {
  const [editing, setEditing] = useState<Drift | null>(null);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {drifts.map((d) => <DriftRow key={d.category.id} drift={d} onMemo={() => setEditing(d)} />)}
      </Stack>
      {editing && <MemoDialog drift={editing} onClose={() => setEditing(null)} />}
    </Box>
  );
}

const KINDS: DriftKind[] = ['ok', 'unexpected', 'casual'];

export function DriftRow({ drift: d, onMemo }: { drift: Drift; onMemo: () => void }) {
  const set = (k: DriftKind) => patchCategoryActual(d.periodId, d.category.id, { driftKind: d.kind === k ? null : k });
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography fontWeight={700} noWrap sx={{ minWidth: 0 }}>{d.category.name}</Typography>
        <Typography fontWeight={900} sx={{ flexShrink: 0 }}>{d.diff > 0 ? '+' : '-'}{yen(Math.abs(d.diff))}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">計画 {yen(d.planned)} → 実績 {yen(d.actual)}</Typography>
      {d.diff > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} role="group" aria-label={`${d.category.name}のずれの種類`}>
          {KINDS.map((k) => (
            <Chip key={k} label={DRIFT_LABEL[k]} size="small" onClick={() => set(k)} aria-pressed={d.kind === k}
              color={d.kind === k ? 'primary' : 'default'} variant={d.kind === k ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
          ))}
        </Stack>
      )}
      <Link component="button" type="button" variant="body2" underline="hover" onClick={onMemo}
        sx={{ mt: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.5, color: d.memo ? 'text.primary' : 'primary.main', textAlign: 'left' }}>
        <EditNoteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />{d.memo ? `「${d.memo}」` : 'ひとことメモ'}
      </Link>
    </Box>
  );
}

function MemoDialog({ drift, onClose }: { drift: Drift; onClose: () => void }) {
  const [memo, setMemo] = useState(drift.memo ?? '');
  const save = async () => { await patchCategoryActual(drift.periodId, drift.category.id, { memo }); onClose(); };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{drift.category.name}のメモ</DialogTitle>
      <DialogContent>
        <TextField fullWidth value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: 友だちの結婚式" sx={{ mt: 1 }}
          helperText="あとで見返したときに、思い出せるくらいで十分" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button onClick={save} variant="contained">保存</Button>
      </DialogActions>
    </Dialog>
  );
}

/** 続いているずれから出す、改善のヒント */
export function HintsCard({ hints }: { hints: DriftHint[] }) {
  return (
    <Card data-tour="hints">
      <CardHeader title="改善のヒント" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        subheader="ここ3か月で続いているずれ" subheaderTypographyProps={{ variant: 'caption' }} sx={{ pb: 0 }} />
      <List>
        {hints.slice(0, 3).map((h) => (
          <ListItem key={`${h.category.id}:${h.direction}`} alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><LightbulbOutlinedIcon color="primary" /></ListItemIcon>
            <ListItemText primary={h.text} primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.8 } }} />
          </ListItem>
        ))}
      </List>
    </Card>
  );
}

/** どのくらいのずれから出すかの設定 */
export function DriftSettingsDialog({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const init = settings.driftThreshold ?? DEFAULT_DRIFT_THRESHOLD;
  const [percent, setPercent] = useState(String(init.percent));
  const [yenValue, setYen] = useState<number | undefined>(init.yen);
  const p = Number(percent);
  const pError = percent.trim() === '' || !Number.isInteger(p) || p < 0 || p > 100;
  const value: DriftThreshold = { percent: p, yen: yenValue ?? 0 };
  const save = async () => {
    await db.settings.put({ ...DEFAULT_SETTINGS, ...settings, driftThreshold: value });
    onClose();
  };
  const pick = (v: DriftThreshold) => { setPercent(String(v.percent)); setYen(v.yen); };
  const preset = DRIFT_PRESETS.find((x) => x.value.percent === p && x.value.yen === yenValue);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>表示するずれ</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          計画の割合か金額の、大きい方をこえたずれだけを出すよ。
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }} role="group" aria-label="よく使う設定">
          {DRIFT_PRESETS.map((x) => (
            <Chip key={x.label} label={x.label} onClick={() => pick(x.value)} aria-pressed={preset === x}
              color={preset === x ? 'primary' : 'default'} variant={preset === x ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 2.5 }}>
          <TextField label="計画の" value={percent} onChange={(e) => setPercent(e.target.value)} error={pError}
            helperText={pError ? '0〜100 の整数' : undefined} sx={{ flex: 1 }}
            slotProps={{ htmlInput: { inputMode: 'numeric', style: { textAlign: 'right' } }, input: { endAdornment: <InputAdornment position="end">％</InputAdornment> } }} />
          <Typography sx={{ pt: 2, flexShrink: 0 }} color="text.secondary">か</Typography>
          <MoneyField label="金額" value={yenValue} onChange={setYen} sx={{ flex: 1.3 }} />
        </Stack>
        {!pError && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, lineHeight: 1.7 }}>
            例: 計画 {yen(30000)} なら、{yen(Math.max(value.yen, Math.round(30000 * p / 100)))} 以上ずれたら出す
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button onClick={save} variant="contained" disabled={pError}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
