import AddIcon from '@mui/icons-material/Add';
import { Box, Fab } from '@mui/material';

/** 一覧のページの右下に固定する「追加」ボタン。下のリストが隠れないよう、同じ高さの余白も入れる */
export function AddFab({ onClick, label = '追加' }: { onClick: () => void; label?: string }) {
  return (
    <>
      <Box aria-hidden sx={{ height: 72 }} />
      <Fab variant="extended" color="primary" onClick={onClick} sx={{
        position: 'fixed', zIndex: 10, fontWeight: 700,
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}>
        <AddIcon sx={{ mr: 0.5 }} />{label}
      </Fab>
    </>
  );
}
