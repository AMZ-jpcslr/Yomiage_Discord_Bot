# Yomiage Discord Bot

Discord のスラッシュコマンドと、VoiceVox Web API を使った読み上げ機能を提供する Bot です。

> Railway でデプロイする場合は、`.env` に Token を直書きせず **Railway の Variables（Key）** を使って設定します。

## 主な機能

- スラッシュコマンド
  - `/ping` : Bot の Ping を表示
  - `/lottery` : 抽選（カンマ区切りの候補から 1 つ選ぶ）
  - `/shift` : シフト管理（追加・表示・編集・削除・詳細表示）
  - `/voice_web` : VoiceVox Web API 読み上げ（join/leave/settings/status）
  - `/cleanup` : Bot が送信したメッセージを一括削除（要権限）
  - `/list_channels` : サーバー内のチャンネル一覧と最終メッセージ時刻を出力（権限の範囲内）
- ヘルスチェック HTTP サーバー
  - `/health` : JSON で稼働状況を返す
  - `/` : プレーンテキストで稼働中メッセージ

## 動作要件

- Node.js 18 以上（Dockerfile も Node 18 を使用）
- Discord Bot（Discord Developer Portal で作成）
- VoiceVox Web API を使う場合：`VOICEVOX_API_KEY`

### Discord 側の設定（重要）

本 Bot は以下の Intent を利用します。

- `MESSAGE CONTENT INTENT`（メッセージ読み上げ等で必要）
- `GUILD VOICE STATES INTENT`（ボイス関連で必要）

Discord Developer Portal → Applications → Bot の設定画面で有効化してください。

## 環境変数

この Bot は **実行環境の環境変数（`process.env`）** から設定を読み込みます。

### 必須

- `DISCORD_TOKEN` : Discord Bot Token
  - 互換キー：`TOKEN`（どちらでも動作しますが、`DISCORD_TOKEN` 推奨）

### 任意（機能に応じて）

- `VOICEVOX_API_KEY` : VoiceVox Web API キー
- `PORT` : ヘルスチェックサーバーのポート（未設定の場合 3000）
- `NODE_ENV` : 実行モード（例：`development` / `production`）

### スラッシュコマンド登録用（`deploy-commands` を使う場合）

- `CLIENT_ID` : Discord Application ID（= Client ID）
  - 互換キー：`DISCORD_CLIENT_ID`
- `GUILD_ID` : ギルド（サーバー）単位でコマンド登録したい場合のみ指定

> `CLIENT_ID` は秘密情報ではありません。Discord Developer Portal → Applications → General Information の `APPLICATION ID` が該当します。

## ローカルセットアップ

1) 依存関係をインストール

```bash
npm ci
```

2) `.env` を用意（ローカル用）

`.env.example` をコピーして `.env` を作成し、必要な値を入れてください。

```bash
# macOS/Linux
cp .env.example .env

# Windows(PowerShell)
Copy-Item .env.example .env
```

3) ビルド

```bash
npm run build
```

4) 起動

```bash
npm start
```

開発中に TypeScript を直接実行したい場合は以下も使えます。

```bash
npm run test
```

## スラッシュコマンドの登録

Bot にスラッシュコマンドを表示させるには「登録」が必要です。

1) 環境変数を用意

- `DISCORD_TOKEN`（または `TOKEN`）
- `CLIENT_ID`（または `DISCORD_CLIENT_ID`）
- 任意：`GUILD_ID`（テスト用。ギルド登録は反映が速い）

2) ビルド

```bash
npm run build
```

3) 登録実行

```bash
node build/deploy-commands.js
```

- `GUILD_ID` を設定した場合：ギルドコマンドとして登録（即時反映）
- 未設定の場合：グローバルコマンドとして登録（反映まで時間がかかる場合があります）

## VoiceVox Web API 読み上げ

- `/voice_web join` を実行したサーバーのボイスチャンネルに参加し、同じテキストチャンネルのメッセージを読み上げます。
- API キーの状態は `/voice_web status` で確認できます。

## Railway でのデプロイ

### 1) Railway Variables（Key）を設定

Railway のプロジェクト設定で、以下を Variables として登録します。

- `DISCORD_TOKEN`（または `TOKEN`）
- `VOICEVOX_API_KEY`（読み上げを使う場合）
- `PORT`（任意）

スラッシュコマンド登録を Railway 上で行う場合は、追加で以下も設定してください。

- `CLIENT_ID`
- `GUILD_ID`（任意）

> `.env` は Git 管理しないでください（このリポジトリでは `.gitignore` 対象です）。

### 2) ビルド／起動

このリポジトリには Railway 用の設定と Dockerfile が含まれています。

- `Dockerfile.railway` : Railway 向けに依存関係とビルドを最適化
- `railway.yml` / `railway.toml` : Railway 設定

Railway 側で `npm start` が実行される構成で、`build/main.js` を起動します。

## トラブルシューティング

### Token が見つからない

起動ログで `DISCORD_TOKEN`/`TOKEN` が未設定と出る場合：

- ローカル：`.env` に `DISCORD_TOKEN` を設定しているか確認
- Railway：Variables（Key）に `DISCORD_TOKEN`（または `TOKEN`）を設定しているか確認

### "disallowed intents" が出る

Discord Developer Portal の Bot 設定で以下を有効化してください。

- `MESSAGE CONTENT INTENT`
- `GUILD VOICE STATES INTENT`

### コマンドが表示されない

- まず `node build/deploy-commands.js` でコマンド登録を実行してください
- グローバル登録の場合、反映まで時間がかかることがあります（テストは `GUILD_ID` を設定してギルド登録推奨）

## セキュリティ注意

- Bot Token は漏洩すると乗っ取られます。Git にコミットしないでください。
- Token を一度でも公開リポジトリ等に入れてしまった場合は、Discord Developer Portal で再発行（ローテーション）してください。
