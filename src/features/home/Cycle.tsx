import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import type { ReactElement } from 'react';

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
