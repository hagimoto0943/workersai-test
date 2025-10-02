# Workers AI Playground

Cloudflare Workers AIを使って触れる簡易プレイグラウンドです。ブラウザ上でモデルを選択して推論を実行できます。

## 前提条件
- Node.js 18 以上（推奨: LTS）
- npm 9 以上
- Cloudflare アカウントと `wrangler` CLI へのログイン (`npx wrangler login`)

## セットアップ
```bash
npm install
npx wrangler login   # 初回のみ。ブラウザで認証します。
```

## 開発サーバーの起動方法
```bash
npm run dev
```
`wrangler dev` が起動し、Workers AI バインディングを利用するためにリモート環境に接続します。起動後は `http://127.0.0.1:8787/` をブラウザで開くとプレイグラウンドにアクセスできます。

## デプロイ
```bash
npm run deploy
```

## テスト
```bash
npm test
```
