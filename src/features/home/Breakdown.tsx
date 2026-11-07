import { Box, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PeriodSummary } from '../../domain/cashflow';
import type { AppData } from '../../domain/types';
import { yen } from '../../lib/money';

export type BreakdownKind = 'income' | 'direct' | 'card' | 'saving' | 'receivable';

export const BREAKDOWN_LABEL: Record<BreakdownKind, string> = {
  income: '収入', direct: '口座から出る', card: 'カード請求', saving: '貯金・投資', receivable: '立替回収',
};

interface Line { label: string; amount: number; sub?: string }

/** ホームの数字（収入・口座から出る など）の内訳の行 */
export function breakdownLines(kind: BreakdownKind, s: PeriodSummary, data: AppData): Line[] {
  const itemsText = (catId: string, viaCard: boolean) => s.rows
    .filter((r) => r.category.id === catId && r.viaCard === viaCard && r.effective > 0)
    .map((r) => `${r.item.name} ${yen(r.effective)}`).join('、');
  switch (kind) {
    case 'income':
      return s.categories.filter((c) => c.kind === 'income' && c.effective !== 0).map((c) => ({
        label: c.category.name, amount: c.effective, sub: c.actual !== undefined ? '入金済み' : itemsText(c.category.id, false),
      }));
    case 'direct':
    case 'saving':
      return s.categories
        .filter((c) => c.kind !== 'income' && (kind === 'saving') === (c.kind === 'saving') && c.direct !== 0)
        .map((c) => ({ label: c.category.name, amount: c.direct, sub: itemsText(c.category.id, false) }));
    case 'card':
      return s.cardBills.filter((b) => b.effective !== 0).map((b) => ({
        label: b.card.name, amount: b.effective, sub: b.actual !== undefined ? '請求額を入力済み' : '予測',
      }));
    case 'receivable':
      return data.receivables.filter((r) => r.expectedPeriod === s.periodId)
        .map((r) => ({ label: r.title, amount: r.amount, sub: r.receivedAt ? '回収済み' : undefined }));
  }
}

export function BreakdownDialog({ kind, summary, data, total, onClose }: {
  kind: BreakdownKind; summary: PeriodSummary; data: AppData; total: number; onClose: () => void;
}) {
  const lines = breakdownLines(kind, summary, data);
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1.5 }}>
        <Box component="span" sx={{ flex: 1 }}>{BREAKDOWN_LABEL[kind]}の内訳</Box>
        <IconButton aria-label="閉じる" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {lines.length === 0 && <Typography variant="body2" color="text.secondary">この月はありません</Typography>}
          {lines.map((l, i) => (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
                <Typography variant="body2" fontWeight={700}>{l.label}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>{yen(l.amount)}</Typography>
              </Stack>
              {l.sub && <Typography variant="caption" color="text.secondary">{l.sub}</Typography>}
            </Box>
          ))}
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, pt: 1.5, borderTop: 2, borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={900}>合計</Typography>
          <Typography variant="body2" fontWeight={900}>{yen(total)}</Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
