# Railway セットアップコマンド（更新版）

## 1. 初期設定
```bash
# Railway CLI のインストール（未インストールの場合）
npm install -g @railway/cli

# Railway にログイン
railway login

# プロジェクト作成またはリンク
railway new earthquake-discord-bot
# または既存プロジェクトにリンク
railway link
```

## 2. 必須環境変数設定
```bash
# Discord Bot設定
railway variables set DISCORD_TOKEN="YOUR_DISCORD_TOKEN"
railway variables set DISCORD_CLIENT_ID="YOUR_DISCORD_CLIENT_ID"

# Canvas/Map生成設定
railway variables set FORCE_MAP_GENERATION=true
railway variables set SKIP_MAP_GENERATION=false
railway variables set CANVAS_PREBUILT=false

# Node.js設定
railway variables set NODE_ENV=production
railway variables set NODE_OPTIONS="--max-old-space-size=2048"

# npm設定（Canvas ビルド用）
railway variables set npm_config_build_from_source=true
railway variables set npm_config_canvas_prebuilt=false
```

## 3. デプロイ & 確認
```bash
# デプロイ
railway up

# ログ確認
railway logs

# ステータス確認
railway status

# 環境変数確認
railway variables
```

## トラブルシューティング

### 方法1: Alpine Dockerfileでエラーの場合、Ubuntu版を試す
```bash
# 現在のDockerfileをバックアップ
mv Dockerfile Dockerfile.alpine

# Ubuntu版を使用
mv Dockerfile.ubuntu Dockerfile

# 再デプロイ
railway up
```

### 方法2: マップ生成を無効化してテキストのみで動作確認
```bash
railway variables set SKIP_MAP_GENERATION=true
railway variables set FORCE_MAP_GENERATION=false
railway up
```

### 方法3: メモリ増量
```bash
railway variables set NODE_OPTIONS="--max-old-space-size=4096"
```

### 方法4: ビルドキャッシュクリア
```bash
railway variables set NIXPACKS_NO_CACHE=1
railway up
```

### 方法5: 手動でCanvas関連パッケージを再インストール
```bash
# Railway コンソールで実行
railway shell
npm uninstall canvas
npm install canvas --build-from-source
npm run compile
```

## Windows PowerShellユーザー向け
```powershell
# 自動設定スクリプトを実行
.\scripts\setup-railway-canvas.ps1
```
