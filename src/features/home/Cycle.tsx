import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, List, ListItem, ListItemIcon, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { useState, type ReactElement } from 'react';
import { patchCategoryActual } from '../../db/ops';
import { DRIFT_LABEL, type Drift, type DriftHint } from '../../domain/review';
import type { DriftKind } from '../../domain/types';
import { yen } from '../../lib/money';

export type CycleStage = 'plan' | 'use' | 'review';

const STAGES: { id: CycleStage; label: string; icon: ReactElement; angle: number }[] = [
  { id: 'plan', label: '計画する', icon: <EditCalendarIcon />, angle: -90 },
  { id: 'use', label: '使う', icon: <ShoppingBagOutlinedIcon />, angle: 30 },
  { id: 'review', label: 'ふりかえる', icon: <FactCheckIcon />, angle: 150 },
];

const SIZE = 148; // 輪の図の大きさ
const R = 48; // 輪の半径
const C = SIZE / 2;
const at = (deg: number, r = R) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];

/** 計画する → 使う → ふりかえる の輪。今いる段階を光らせ、今やることを1つだけ出す */
export function CycleCard({ stage, title, sub, action, onAction }: {
  stage: CycleStage; title: string; sub: string; action: string; onAction: () => void;
}) {
  // 段階のあいだの矢印（ノードにかからないよう、両端を少し空ける）
  const arcs = STAGES.map((s, i) => {
    const from = s.angle + 26;
    const to = STAGES[(i + 1) % STAGES.length].angle + (i === STAGES.length - 1 ? 360 : 0) - 26;
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  });
  const current = STAGES.find((s) => s.id === stage)!;

  return (
    <Card data-tour="cycle" sx={{ position: 'relative', zIndex: 1, mt: -4 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: '16px !important' }}>
        <Box role="img" aria-label={`計画する、使う、ふりかえるのサイクル。今は「${current.label}」`}
          sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0, color: 'divider' }}>
          <Box component="svg" viewBox={`0 0 ${SIZE} ${SIZE}`} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <marker id="cycle-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {arcs.map((d) => <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" markerEnd="url(#cycle-arrow)" />)}
          </Box>
          {STAGES.map((s) => {
            const on = s.id === stage;
            const [x, y] = at(s.angle);
            return (
              <Box key={s.id} sx={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', display: 'grid', justifyItems: 'center' }}>
                <Box sx={(t) => ({ width: on ? 40 : 34, height: on ? 40 : 34, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  bgcolor: on ? 'primary.main' : 'soft', color: on ? 'primary.contrastText' : 'text.secondary',
                  boxShadow: on ? `0 0 0 5px ${t.palette.soft}` : 'none', '& svg': { fontSize: on ? 22 : 18 } })}>
                  {s.icon}
                </Box>
                <Typography sx={{ position: 'absolute', top: '100%', mt: 0.25, fontSize: 10, fontWeight: on ? 900 : 700, whiteSpace: 'nowrap',
                  color: on ? 'primary.main' : 'text.secondary' }}>{s.label}</Typography>
              </Box>
            );
          })}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>今やること</Typography>
          <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.4 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.7 }}>{sub}</Typography>
          <Button variant={stage === 'use' ? 'outlined' : 'contained'} size="small" onClick={onAction} sx={{ mt: 1.25 }}>{action}</Button>
        </Box>
      </CardContent>
    </Card>
  );
}

/** 先月のふりかえり: 目立つずれだけを出し、種類と一言メモを付けられる */
export function ReviewCard({ label, drifts, reviewed, onOpen }: {
  label: string; drifts: Drift[]; reviewed: boolean; onOpen: () => void;
}) {
  const over = drifts.filter((d) => d.diff > 0).slice(0, 3);
  const under = drifts.filter((d) => d.diff < 0).slice(0, 2);
  const [editing, setEditing] = useState<Drift | null>(null);

  return (
    <Card data-tour="review">
      <CardHeader title={`${label}のふりかえり`} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        subheader={reviewed ? '計画とのずれが大きかったところ' : undefined} subheaderTypographyProps={{ variant: 'caption' }}
        action={reviewed ? <Button size="small" onClick={onOpen}>すべて見る</Button> : undefined} sx={{ pb: 0 }} />
      <CardContent>
        {!reviewed ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              家計簿アプリのカテゴリ別の合計を入れると、計画とのずれがここに出るよ。
            </Typography>
            <Button variant="contained" onClick={onOpen}>ふりかえる</Button>
          </Stack>
        ) : drifts.length === 0 ? (
          <Typography variant="body2" sx={{ lineHeight: 1.8 }}>だいたい計画どおりだったよ。いい感じ！</Typography>
        ) : (
          <Stack spacing={2}>
            {over.length > 0 && <Group title="計画より多かった" drifts={over} onMemo={setEditing} />}
            {under.length > 0 && <Group title="計画より少なく済んだ" drifts={under} onMemo={setEditing} />}
          </Stack>
        )}
      </CardContent>
      {editing && <MemoDialog drift={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function Group({ title, drifts, onMemo }: { title: string; drifts: Drift[]; onMemo: (d: Drift) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography>
      <Stack spacing={1.5} sx={{ mt: 0.75 }}>
        {drifts.map((d) => <DriftRow key={d.category.id} drift={d} onMemo={() => onMemo(d)} />)}
      </Stack>
    </Box>
  );
}

const KINDS: DriftKind[] = ['ok', 'unexpected', 'casual'];

function DriftRow({ drift: d, onMemo }: { drift: Drift; onMemo: () => void }) {
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
