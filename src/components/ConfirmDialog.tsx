import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useEffect, useState } from 'react';

// window.confirm() は埋め込み環境で使えないことがあるため、画面内の確認ダイアログを使う
type Request = { message: string; resolve: (ok: boolean) => void };
let push: ((r: Request) => void) | null = null;

export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(false);
    push({ message, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    push = setReq;
    return () => { push = null; };
  }, []);
  const close = (ok: boolean) => { req?.resolve(ok); setReq(null); };
  return (
    <Dialog open={!!req} onClose={() => close(false)}>
      <DialogTitle>確認</DialogTitle>
      <DialogContent><DialogContentText>{req?.message}</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={() => close(false)}>やめる</Button>
        <Button color="error" variant="contained" onClick={() => close(true)} autoFocus>実行する</Button>
      </DialogActions>
    </Dialog>
  );
}
