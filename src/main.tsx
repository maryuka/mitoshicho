import { CssBaseline, ThemeProvider, Card, CardContent, Typography, Container } from '@mui/material';
import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { db } from './db/db';
import { DEFAULT_SETTINGS } from './domain/types';
import { useAppTheme } from './theme';

// IndexedDB が使えない環境（プライベートモード等）でも真っ白にしない
class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>データを読み込めませんでした</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              このブラウザではデータの保存（IndexedDB）が使えないようです。プライベートモードを解除するか、別のブラウザで開いてください。
            </Typography>
            <Typography variant="caption" color="text.secondary">{this.state.error.message}</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }
}

function Root() {
  const theme = useAppTheme();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary><App /></ErrorBoundary>
    </ThemeProvider>
  );
}

// 初回起動時に設定を作り、ストレージの永続化を要求する
db.settings.get('app').then((s) => { if (!s) return db.settings.put(DEFAULT_SETTINGS); }).catch(() => {});
try { navigator.storage?.persist?.().catch(() => {}); } catch { /* 使えない環境では何もしない */ }

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
