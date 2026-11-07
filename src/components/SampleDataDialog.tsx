import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { loadSampleData } from '../db/sample';
import { HIYOKO } from './Hiyoko';

// sample.ts の中身と合わせておく
const CONTENTS: [string, string][] = [
  ['口座・カード', '銀行口座 4つと、確定日・引落日つきのカード 2枚'],
  ['定期項目', '給料（月28万円）、家賃・光熱費・食費・サブスク・返済・貯金など 21件'],
  ['実績', '過去3か月ぶんのカテゴリ合計（Zaim で集計して入れた想定）'],
  ['そのほか', '立替・経費精算 2件と、給料日のチェックリスト'],
];

/** サンプルデータを入れる前に、何が入るかを見せるダイアログ */
export function SampleDataDialog({ open, hasData, onClose, onLoaded }: {
  open: boolean; hasData: boolean; onClose: () => void; onLoaded?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try { await loadSampleData(); onLoaded?.(); onClose(); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose}>
      <DialogTitle fontWeight={900}>サンプルデータで試す</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'soft', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Box component="img" src={HIYOKO.counting} alt="" sx={{ width: 48 }} />
            </Box>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.7 }}>
              ひとり暮らしの会社員を想定した、架空のお金のデータが入るよ。
            </Typography>
          </Box>
          <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.25 }}>
            {CONTENTS.map(([term, desc]) => (
              <Box key={term}>
                <Typography component="dt" variant="caption" color="primary" fontWeight={900}>{term}</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>{desc}</Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            名前も金額もすべて架空です。あとでメニューの「バックアップと復元」→「すべて削除」で消せます。
          </Typography>
          {hasData && <Alert severity="warning">いまのデータは消えて、サンプルデータに置き換わります。</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>やめる</Button>
        <Button variant="contained" color={hasData ? 'error' : 'primary'} onClick={load} disabled={busy}>
          サンプルデータを入れる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
