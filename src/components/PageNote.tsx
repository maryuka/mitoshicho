import { Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** ページの説明。どのページでもカードの外（上）に、同じ見た目で置く */
export function PageNote({ children }: { children: ReactNode }) {
  return <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, lineHeight: 1.8 }}>{children}</Typography>;
}
