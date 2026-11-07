/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' にしておくと GitHub Pages のサブパスでもそのまま動く
export default defineConfig({
  base: './',
  plugins: [react()],
  // MUI を含めて1ファイルにまとめるため、警告の閾値を上げる。狐の画像も JS に埋め込む（Artifact 版が1ファイルのため）
  build: { chunkSizeWarningLimit: 1000, assetsInlineLimit: 64 * 1024 },
  test: { environment: 'node' },
});
