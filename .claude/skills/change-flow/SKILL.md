---
name: change-flow
description: みとおし帳の画面・デザイン・機能を変えるときの進め方。POC や試用版を Artifact で見せ、ユーザーの OK をもらってから main に反映する。「〜にしたい」「〜を変えて」「デザインを変えたい」など、アプリに変更を入れる依頼のときに使う。
---

# みとおし帳の変更の進め方

ユーザーは見てから決めたい。**見せる → OK をもらう → 次へ**を守り、OK の前に main へは入れない。

## 0. はじめに

- `docs/HANDOFF.md` を読む（仕様・配色・作業上の注意・コードの地図）
- `npm ci` がまだなら入れる
- 作業はセッションで指定されたブランチで行う

## 1. 見た目が大きく変わるときは、まず POC

デザインの変更・新しい画面など、言葉だけでは伝わりにくいものは**アプリを変える前に**静的なモックを作って Artifact で見せる。

- scratchpad に HTML を書き、Artifact で公開する（リポジトリには入れない）
- 中身はいまのアプリの画面と同じ項目にし、金額・名前はサンプル（架空）
- ライト／ダークの両方を見せる（切り替えボタンを付ける）
- 画像はページに埋め込む（data URI）
- 決めてほしいことは、返事の最後に番号付きの質問で示す

小さな修正（文言・ボタン1つ・バグ修正）なら POC は省いて 2 へ進む。

## 2. 実装

- `src/theme.ts` のトークンを使い、色を直書きしない（ダークは黒に近い無彩色の背景。茶色っぽくしない）
- 個人情報をコード・コメント・テスト・コミットに入れない（リポジトリは public）
- `npm run typecheck`、`npm test`、`npm run build` を通す
- 画面を確認する: `npm run build && npx vite preview --port 4173` を裏で動かし、
  `node .claude/skills/change-flow/screens.cjs <出力先> [ハッシュ...]` でライト／ダークのスクリーンショットを撮る。
  見て直すのは1回まで。撮った画像は SendUserFile で見せる
- コミットして作業ブランチに push（main にはまだ入れない）

## 3. 試用版（Artifact）を更新して見せる

```sh
npm run build:artifact
cp artifact/mitoshicho.html <scratchpad>/mitoshicho-walkthrough.html
```

- 試用版は https://claude.ai/artifact/Y62abpUC1fKm2Y8RvzVpcK （タイトル「みとおし帳」）。
  別の会話からは Artifact の `read` で読んでから、`url` を指定して同じ URL に公開し直す
- Artifact はブラウザごとにデータが別。最初はデータが空なのでウォークスルーから始まる。
  ダウンロード（バックアップ保存）は Artifact では動かない旨の警告が出るが、いつものこと
- 返事には、何を変えたか・どこで確認できるか・確認したこと（テスト件数など）を短く書く

## 4. OK をもらったら main へ

ユーザーが「おけ」「main へ」などと言ったら:

```sh
git fetch origin main
git merge-base --is-ancestor origin/main HEAD   # fast-forward できることを確認
git push origin HEAD:main HEAD:app HEAD:<作業ブランチ>
```

- main への push で GitHub Pages に自動デプロイされる（https://maryuka.github.io/mitoshicho/）。
  このコンテナからは github.io に届かないので、結果は Actions で見てもらうよう伝える
- 決まった仕様は `docs/HANDOFF.md` の「決まっている仕様」に追記し、同じ push に含める

## 返事の書き方

- 日本語で短く。変えたことは箇条書き、決めてほしいことは質問にする
- 確認していないこと（デプロイ結果など）は、確認していないと書く
