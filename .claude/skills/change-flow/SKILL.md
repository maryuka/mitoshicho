---
name: change-flow
description: みとおし帳の画面・デザイン・機能を変えるときの進め方。実装してスクリーンショットと試用版（Artifact）で見せ、ユーザーの OK をもらってから main に反映する。「〜にしたい」「〜を変えて」「デザインを変えたい」など、アプリに変更を入れる依頼のときに使う。
---

# みとおし帳の変更の進め方

ユーザーは見てから決めたい。**見せる → OK をもらう → 次へ**を守り、OK の前に main へは入れない。

## 0. はじめに

- `npm ci` がまだなら入れる
- 作業はセッションで指定されたブランチで行う

## 1. 実装

モックは作らない。アプリを直接変えて、スクリーンショットで見せる。

- `src/theme.ts` のトークンを使い、色を直書きしない（ダークは黒に近い無彩色の背景。茶色っぽくしない）
- 個人情報をコード・コメント・テスト・コミットに入れない（リポジトリは public）。サンプルデータ・テストは架空の値
- `npm run typecheck`、`npm test`、`npm run build` を通す
- コミットして作業ブランチに push（main にはまだ入れない）

## 2. スクリーンショットを撮って送る

```sh
npm run build && npx vite preview --port 4173   # 裏で動かす
node .claude/skills/change-flow/screens.cjs <scratchpad の出力先> [ハッシュ...]   # 例: home budget prefs-accounts
```

- ライト／ダークの両方を撮る。ウォークスルーの1枚目を撮ってからサンプルデータを入れ、指定した画面を撮る
- ダイアログなど操作が要る画面は、同じ要領で Playwright を書いて撮る
- 自分で見て直すのは1回まで。必要な画像を1枚にまとめて SendUserFile で送る
- 決めてほしいことは、返事の最後に番号付きの質問で示す

## 3. 試用版（Artifact）を更新する

```sh
npm run build:artifact
cp artifact/mitoshicho.html <scratchpad>/mitoshicho-walkthrough.html
```

- 試用版は https://claude.ai/artifact/Y62abpUC1fKm2Y8RvzVpcK （タイトル「家計の見通し帳」）。
  別の会話からは Artifact の `read` で読んでから、`url` を指定して同じ URL に公開し直す
- Artifact はブラウザごとにデータが別。最初はデータが空なのでウォークスルーから始まる。
  ダウンロード（バックアップ保存）は Artifact では動かない旨の警告が出るが、いつものこと
- 返事には、何を変えたか・確認したこと（テスト件数など）・試用版の URL を短く書く

## 4. OK をもらったら main へ

main へは直接 push できない（リポジトリのルールで拒否される）。PR を作って squash でマージする。
ユーザーが「おけ」「main へ」などと言ったら:

```sh
git fetch origin main
git merge origin/main      # main に別の変更が入っていたら取り込む。衝突は解いて、typecheck・test・build を通し直す
git push origin HEAD       # 作業ブランチへ
```

- GitHub の MCP ツールで、作業ブランチ → main の PR を作る（`create_pull_request`）。
  本文には変えたことと確認したこと（テスト件数など）を書く
- `merge_pull_request` で `merge_method: "squash"` を指定してマージする（マージコミットは許可されていない）。
  `expectedHeadSha` に push したコミットを渡す
- マージ後、`git fetch origin main` して `git diff HEAD origin/main` が空なことを確かめる
- squash なので、作業ブランチの履歴は main と分かれたままになる。強制 push は許可されていないので、
  次の変更は作業ブランチのまま続け、PR の前に上の `git merge origin/main` で main を取り込む
- main への反映で GitHub Pages に自動デプロイされる（https://maryuka.github.io/mitoshicho/）。
  このコンテナからは github.io に届かないので、結果は Actions で見てもらうよう伝える
- リモートブランチは消せない（クラウドのセッションのプロキシが `403 branch deletion is not allowed` で拒否する。設定では変えられない）。不要なブランチは GitHub の画面で消してもらう

## 返事の書き方

- 日本語で短く。変えたことは箇条書き、決めてほしいことは質問にする
- 確認していないこと（デプロイ結果など）は、確認していないと書く
