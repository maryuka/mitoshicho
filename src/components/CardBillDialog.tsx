import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import type { CardBillRow } from '../domain/cashflow';
import { periodLabel, toISODate } from '../domain/period';
import { saveCardBill } from '../db/ops';
import { signedYen, yen } from '../lib/money';
import { MoneyField } from './MoneyField';
import { canAutoFocus } from '../lib/device';

/** カード請求の入力: 請求額・引落日・確定日 */
export function CardBillDialog({ periodId, bill, startDay, onClose }: {
  periodId: string; bill: CardBillRow; startDay: number; onClose: () => void;
}) {
  const [actual, setActual] = useState<number | undefined>(bill.actual);
  const [withdrawDate, setWithdrawDate] = useState(bill.withdrawDate ? toISODate(bill.withdrawDate) : '');
  const [confirmDate, setConfirmDate] = useState(bill.confirmDate ? toISODate(bill.confirmDate) : '');
  const diff = actual !== undefined ? actual - bill.forecast : undefined;

  const save = async () => {
    await saveCardBill(periodId, bill.card.id, {
      actual, withdrawDate: withdrawDate || undefined, confirmDate: confirmDate || undefined,
    });
    onClose();
  };
  const unconfirm = async () => {
    await saveCardBill(periodId, bill.card.id, { actual: undefined });
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{bill.card.name} の請求</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {periodLabel(periodId, startDay)} の月に引き落とされる分。予測 {yen(bill.forecast)}
          </Typography>
          <MoneyField label="請求額（確定したら入力）" value={actual} placeholder={bill.forecast} onChange={setActual} autoFocus={canAutoFocus} fullWidth />
          {diff !== undefined && diff !== 0 && (
            <Alert severity={diff > 0 ? 'warning' : 'success'}>予測との差 {signedYen(diff)}</Alert>
          )}
          <Stack direction="row" spacing={1}>
            <TextField id="bill-withdraw-date" label="引落日" type="date" value={withdrawDate}
              onChange={(e) => setWithdrawDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            <TextField id="bill-confirm-date" label="確定日" type="date" value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            確定日になるとホームの「やること」に請求額の入力が出ます。毎月の既定の日付はカードの設定で変えられます。
          </Typography>
          {bill.forecastBreakdown.length > 0 && (
            <Accordion disableGutters variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">予測の内訳（先月のカード払い）</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <List dense disablePadding>
                  {bill.forecastBreakdown.map((x, i) => (
                    <ListItem key={i} disableGutters secondaryAction={<Typography variant="body2">{yen(x.amount)}</Typography>}>
                      <ListItemText primary={x.label} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {bill.actual !== undefined && <Button onClick={unconfirm}>未確定に戻す</Button>}
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={save}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
