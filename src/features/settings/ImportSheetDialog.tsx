import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, List, ListItem,
  ListItemText, MenuItem, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { parseBudgetSheet, parseTable, splitDefault, type SheetImport } from '../../domain/importSheet';
import { periodLabel } from '../../domain/period';
import { applySheetImport, type ImportResult } from '../../db/importSheet';
import { yen } from '../../lib/money';
import { KIND_LABEL } from './dialogs';

const PASTED = '貼り付けたデータ';

/** 元のスプレッドシート（年間お金計画表）の CSV または貼り付けから、カテゴリ・項目・月ごとの予算・カードを取り込む */
export function ImportSheetDialog({ current, hasData, onClose }: { current: string; hasData: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const thisYear = new Date().getFullYear();
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [year, setYear] = useState(thisYear);
  const [mode, setMode] = useState<'replace' | 'merge'>(hasData ? 'merge' : 'replace');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo((): { plan?: SheetImport; error?: string } => {
    if (!csv) return {};
    try { return { plan: parseBudgetSheet(parseTable(csv.text), year) }; }
    catch (e) { return { error: e instanceof Error ? e.message : 'CSV を読めませんでした' }; }
  }, [csv, year]);
  const plan = parsed.plan;
  const startDay = plan?.startDay ?? 1;

  const run = async () => {
    if (!plan) return;
    setBusy(true);
    try { setResult(await applySheetImport(plan, { replace: mode === 'replace', current })); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm">
      <DialogTitle>スプレッドシートから取り込む</DialogTitle>
      <DialogContent>
        {result ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            取り込みました。カテゴリ {result.categories}・項目 {result.items}・カード {result.cards} を追加し、
            月ごとの予算 {result.monthlyOverrides} 件・カード請求 {result.cardBills} 件を入れました。
            口座と支払い元（どの項目がカード払いか）は設定で登録してください。
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              収入・支出の各行が定期項目に、各月の金額が月ごとの予算に、クレカの行がカードになります。
            </Typography>
            <Box>
              <Typography variant="subtitle2" gutterBottom>セルをコピーして貼り付ける（スマホ向け）</Typography>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                スプレッドシートのアプリで年のシート（例: 2026）を開き、左上の角をタップしてシート全体を選んでコピーし、下の欄に貼り付けてください。
              </Typography>
              <TextField id="import-paste" multiline minRows={3} maxRows={6} fullWidth placeholder="ここに貼り付け"
                value={csv?.name === PASTED ? csv.text : ''}
                onChange={(e) => setCsv(e.target.value.trim() ? { name: PASTED, text: e.target.value } : null)}
                slotProps={{ htmlInput: { style: { fontSize: 12 } } }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>CSV ファイルを選ぶ（パソコン向け）</Typography>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                「ファイル → ダウンロード → カンマ区切り形式（.csv）」で書き出したファイル。
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>CSV を選ぶ</Button>
                {csv && csv.name !== PASTED && <Typography variant="body2" noWrap>{csv.name}</Typography>}
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden
                  onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setCsv({ name: f.name, text: await f.text() }); }} />
              </Stack>
            </Box>
            <TextField id="import-year" select label="最初の月の年" value={year} onChange={(e) => setYear(Number(e.target.value))}
              helperText="シートの見出しには年がないので指定してください（12月の次の1月は翌年になります）" sx={{ maxWidth: 260 }}>
              {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => <MenuItem key={y} value={y}>{y}年</MenuItem>)}
            </TextField>

            {parsed.error && <Alert severity="error">{parsed.error}</Alert>}
            {plan && (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>読み取った内容</Typography>
                  <Typography variant="body2">
                    {periodLabel(plan.periods[0], startDay)} 〜 {periodLabel(plan.periods[plan.periods.length - 1], startDay)}（{plan.periods.length} か月）
                    {plan.startDay && `・月の開始日 ${plan.startDay}日`}
                  </Typography>
                  <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto', mt: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    {plan.categories.map((c) => (
                      <ListItem key={c.name} divider>
                        <ListItemText
                          primary={<>{c.name} <Chip label={KIND_LABEL[c.kind]} size="small" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} /></>}
                          secondary={c.items.map((i) => `${i.name} ${yen(splitDefault(i.amounts).defaultAmount)}`).join('、')} />
                      </ListItem>
                    ))}
                    {plan.cards.length > 0 && (
                      <ListItem>
                        <ListItemText primary="カード" secondary={plan.cards.map((c) => `${c.name}${c.withdrawDay ? `（${c.withdrawDay}日引落）` : ''}`).join('、')} />
                      </ListItem>
                    )}
                  </List>
                  <Typography variant="caption" color="text.secondary">
                    金額は最後の月の値を「いつもの金額」にし、それと違う月はその月だけの予算として入れます。
                  </Typography>
                </Box>
                {plan.warnings.map((w) => <Alert key={w} severity="warning">{w}</Alert>)}
                <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'merge')}>
                  <FormControlLabel value="replace" control={<Radio />}
                    label={<><Typography variant="body2">置き換える</Typography><Typography variant="caption" color="text.secondary">口座・カテゴリ・項目・予算・カード請求・実績を消してから入れます（立替とチェックリストは残ります）</Typography></>} />
                  <FormControlLabel value="merge" control={<Radio />}
                    label={<><Typography variant="body2">追加する</Typography><Typography variant="caption" color="text.secondary">同じ名前のカテゴリ・項目に月ごとの予算を足します（別の年のシートを続けて入れるとき）</Typography></>} />
                </RadioGroup>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{result ? '閉じる' : 'キャンセル'}</Button>
        {!result && <Button variant="contained" disabled={!plan || busy} onClick={run}>{mode === 'replace' ? '置き換えて取り込む' : '取り込む'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
