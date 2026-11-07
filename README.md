# みとおし帳 (mitoshicho)

給料日ごとに「今月お金が回るか」を確認し、月末に家計簿アプリの集計で予算を振り返る、予算管理アプリ。
静的ファイルとして配布でき、データはブラウザの IndexedDB にだけ保存されます。

設計: [docs/design.md](docs/design.md)

## 開発

```sh
npm install
npm run dev             # 開発サーバー
npm test                # 計算ロジックのテスト
npm run build           # dist/ に静的ファイルを出力
npm run build:artifact  # 1枚の HTML（artifact/mitoshicho.html）にまとめる
```

初回起動時に「サンプルデータで試す」を押すと架空のデータで動きを確認できます。

## 構成

- `src/domain/` 期（月）・予算・カード請求・バッファの計算（純粋関数とテスト）
- `src/db/` Dexie による IndexedDB のスキーマ、操作、バックアップ、サンプルデータ
- `src/features/` 画面（ホーム／計画／ふりかえり／立替／設定）。UI は MUI
- `src/components/` 共通部品（金額入力、月の切り替え、カード請求ダイアログなど）

## 配布

`main` に push すると GitHub Actions で GitHub Pages にデプロイします（リポジトリ設定の Pages で Source を「GitHub Actions」にしてください）。
スマホではホーム画面に追加して使うことを推奨します（ブラウザによるデータ削除を避けるため）。
