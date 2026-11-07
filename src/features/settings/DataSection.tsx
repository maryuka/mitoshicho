import TableViewIcon from '@mui/icons-material/TableView';
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../../domain/types';
import { db } from '../../db/db';
import { clearAll, downloadBackup, exportJson, importJson } from '../../db/backup';
import { SampleDataDialog } from '../../components/SampleDataDialog';
import { confirmDialog } from '../../components/ConfirmDialog';
import { ImportSheetDialog } from './ImportSheetDialog';

/** part="import": スプレッドシートからの取り込み、part="backup": バックアップ・復元・サンプル・全削除 */
export function DataSection({ data, current, part }: { data: AppData; current: string; part: 'import' | 'backup' }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [textMode, setTextMode] = useState<'export' | 'import' | null>(null);
  const [importing, setImporting] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  useEffect(() => {
    try { navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); } catch { setPersisted(null); }
  }, []);

  const restore = async (text: string) => {
    if (!await confirmDialog('現在のデータをすべて置き換えます。よろしいですか？')) return;
    try {
      await importJson(text);
      setMessage({ text: '読み込みました' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : '読み込みに失敗しました', error: true });
    }
  };

  return (
    <Card>
      <CardContent>
        {part === 'import' ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              元の年間お金計画表から、カテゴリ・項目・月ごとの予算・カードを作ります。スマホではシートのセルをコピーして貼り付け、パソコンでは CSV ファイルを選んで取り込めます。
            </Typography>
            <Box>
              <Button variant="contained" startIcon={<TableViewIcon />} onClick={() => setImporting(true)}>スプレッドシートから取り込む</Button>
            </Box>
          </Stack>
        ) : (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            データはこの端末のブラウザ内（IndexedDB）にだけ保存されます。ブラウザに消される可能性があるため、定期的にバックアップを保存してください。
          </Typography>
          {persisted === true && <Alert severity="success">ストレージの永続化が許可されています</Alert>}
          {persisted === false && <Alert severity="warning">永続化が許可されていません（ホーム画面に追加すると改善することがあります）</Alert>}
          {data.settings.lastBackupAt && (
            <Typography variant="caption" color="text.secondary">最終バックアップ: {new Date(data.settings.lastBackupAt).toLocaleString('ja-JP')}</Typography>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={downloadBackup}>バックアップを保存（JSON）</Button>
            <Button variant="outlined" onClick={() => fileRef.current?.click()}>ファイルから復元</Button>
            <Button variant="outlined" onClick={() => setTextMode('export')}>テキストでコピー</Button>
            <Button variant="outlined" onClick={() => setTextMode('import')}>テキストを貼り付けて復元</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button onClick={() => setSampleOpen(true)}>サンプルデータを読み込む</Button>
            <Button color="error" onClick={async () => {
              if (!await confirmDialog('すべてのデータを削除します。元に戻せません。よろしいですか？')) return;
              await clearAll();
              setMessage({ text: '削除しました' });
            }}>すべて削除</Button>
          </Stack>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restore(await f.text()); }} />
          {message && <Alert severity={message.error ? 'error' : 'success'} onClose={() => setMessage(null)}>{message.text}</Alert>}
        </Stack>
        )}
      </CardContent>
      <SampleDataDialog open={sampleOpen} hasData={data.items.length > 0 || data.accounts.length > 0} onClose={() => setSampleOpen(false)}
        onLoaded={() => setMessage({ text: 'サンプルデータを読み込みました' })} />
      {importing && <ImportSheetDialog current={current} hasData={data.items.length > 0} onClose={() => setImporting(false)} />}
      {textMode && (
        <BackupTextDialog mode={textMode} onClose={() => setTextMode(null)}
          onRestore={async (t) => { setTextMode(null); await restore(t); }} />
      )}
    </Card>
  );
}

/** ファイル保存ができない環境向け: JSON をテキストでコピー／貼り付け */
function BackupTextDialog({ mode, onClose, onRestore }: {
  mode: 'export' | 'import'; onClose: () => void; onRestore: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (mode === 'export') exportJson().then(setText); }, [mode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNote('コピーしました。メモアプリなどに貼り付けて保管してください。');
      await db.settings.update('app', { lastBackupAt: new Date().toISOString() });
    } catch {
      ref.current?.select();
      setNote('選択しました。コピーしてください。');
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm">
      <DialogTitle>{mode === 'export' ? 'バックアップ（テキスト）' : 'テキストから復元'}</DialogTitle>
      <DialogContent>
        <TextField id="backup-text" inputRef={ref} multiline minRows={8} maxRows={14} fullWidth value={text}
          onChange={(e) => setText(e.target.value)} placeholder={mode === 'import' ? 'バックアップの JSON を貼り付けてください' : ''}
          slotProps={{ htmlInput: { readOnly: mode === 'export', style: { fontFamily: 'ui-monospace, monospace', fontSize: 12 } } }}
          sx={{ mt: 1 }} />
        {note && <Alert severity="info" sx={{ mt: 1 }}>{note}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {mode === 'export'
          ? <Button variant="contained" onClick={copy} disabled={!text}>コピー</Button>
          : <Button variant="contained" onClick={() => onRestore(text)} disabled={!text.trim()}>復元する</Button>}
      </DialogActions>
    </Dialog>
  );
}
