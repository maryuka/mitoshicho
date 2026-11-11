import EditNoteIcon from '@mui/icons-material/EditNote';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import {
  Box, Button, Card, CardHeader, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, List, ListItem, ListItemIcon, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { useState } from 'react';
import { patchCategoryActual } from '../../db/ops';
import { db } from '../../db/db';
import { DEFAULT_DRIFT_MIN_YEN, DRIFT_LABEL, type Drift, type DriftHint } from '../../domain/review';
import { DEFAULT_SETTINGS, type DriftKind, type Settings } from '../../domain/types';
import { MoneyField } from '../../components/MoneyField';
import { yen } from '../../lib/money';

const KINDS: DriftKind[] = ['ok', 'unexpected', 'casual'];

/** 実績の行の下に出す、ずれと理由・メモ。オーバーには種類を付けられる */
export function DriftInline({ drift: d }: { drift: Drift }) {
  const [editing, setEditing] = useState(false);
  const set = (k: DriftKind) => patchCategoryActual(d.periodId, d.category.id, { driftKind: d.kind === k ? null : k });
  const over = d.diff > 0;
  return (
    <Box sx={{ mt: 0.25, mb: 0.5, pl: 1.25, borderLeft: 3, borderColor: over ? 'primary.main' : 'divider' }}>
      <Typography variant="body2" fontWeight={700}>
        計画より{over ? `${yen(d.diff)} 多かった` : `${yen(-d.diff)} 少なく済んだ`}
      </Typography>
      {over && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} role="group" aria-label={`${d.category.name}のずれの種類`}>
          {KINDS.map((k) => (
            <Chip key={k} label={DRIFT_LABEL[k]} size="small" onClick={() => set(k)} aria-pressed={d.kind === k}
              color={d.kind === k ? 'primary' : 'default'} variant={d.kind === k ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
          ))}
        </Stack>
      )}
      <Link component="button" type="button" variant="body2" underline="hover" onClick={() => setEditing(true)}
        sx={{ mt: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.5, color: d.memo ? 'text.primary' : 'primary.main', textAlign: 'left' }}>
        <EditNoteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />{d.memo ? `「${d.memo}」` : 'ひとことメモ'}
      </Link>
      {editing && <MemoDialog drift={d} onClose={() => setEditing(false)} />}
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

/** どのくらいのずれから出すかの設定（メニューの「ふりかえりの設定」ページ）。変えたらすぐ保存する */
export function DriftFields({ settings }: { settings: Settings }) {
  const minYen = settings.driftMinYen ?? DEFAULT_DRIFT_MIN_YEN;
  const update = (v: number) => db.settings.put({ ...DEFAULT_SETTINGS, ...settings, driftMinYen: v });
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        ふりかえりで、計画とこの金額以上ずれたカテゴリだけに、理由とメモの欄を出します。
      </Typography>
      <MoneyField id="set-drift-min" label="この金額以上ずれたら出す" value={minYen} onChange={(v) => update(v ?? 0)} fullWidth sx={{ mt: 2 }} />
    </Box>
  );
}
