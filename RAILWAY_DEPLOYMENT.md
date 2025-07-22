# Railway Deployment Guide

## 🚀 Railway でのデプロイメント手順

### 1. Railway プロジェクト作成
1. [Railway](https://railway.app) にログイン
2. "New Project" → "Deploy from GitHub repo" を選択
3. このリポジトリを選択

### 2. 環境変数設定
Railway のプロジェクト設定で以下の環境変数を設定：

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
VOICEVOX_API_KEY=h4824358C3Q-122
NODE_ENV=production
```

### 3. デプロイメント設定
- **Build Command**: `npm run build` (自動検出)
- **Start Command**: `npm run start:railway` (自動検出)
- **Port**: 自動設定 (Discordボットなので不要)

### 4. リソース設定
- **Memory**: 2GB推奨
- **CPU**: 1vCPU推奨
- **Disk**: 1GB (ログ・画像保存用)

### 5. デプロイメント確認
1. Railway コンソールでビルドログを確認
2. アプリケーションログで起動確認
3. Discord サーバーでボットの動作確認

## 📁 ファイル構成

### 必要なファイル
- `Dockerfile` - コンテナ設定
- `railway.yml` - Railway設定
- `package.json` - 依存関係・スクリプト
- `src/` - TypeScriptソースコード
- `config/` - 設定ファイル
- `data/` - データファイル

### ビルド時に生成されるファイル
- `build/` - コンパイル済みJavaScript
- `generated_images/` - 地震マップ画像

## 🔧 トラブルシューティング

### ビルドエラー
- Canvas 依存関係エラー → Dockerfile のパッケージ確認
- TypeScript コンパイルエラー → ソースコード確認
- メモリ不足 → リソース設定増量

### 実行時エラー
- 環境変数未設定 → Railway設定確認
- API エラー → ログでレスポンス確認
- Discord 接続エラー → トークン・権限確認

## 🎵 VoiceVox Web API 設定
- APIキー: `h4824358C3Q-122` (既設定済み)
- エンドポイント: `https://deprecatedapis.tts.quest/v2/voicevox/`
- 音声読み上げ機能が自動で有効化されます

## 📝 更新手順
1. ローカルでコード変更・テスト
2. GitHub にプッシュ
3. Railway が自動でデプロイメント実行
4. デプロイメントログで確認

## 💡 最適化のポイント
- Docker レイヤーキャッシュ活用
- 不要ファイルの除外 (.dockerignore)
- メモリ使用量の監視
- ログレベルの調整
