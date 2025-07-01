# Windows用 Railway Canvas 設定コマンド集
# 以下のコマンドをコマンドプロンプトまたはPowerShellで順番に実行してください

# 1. Railway CLI のインストール（未インストールの場合）
npm install -g @railway/cli

# 2. Railway にログイン
railway login

# 3. プロジェクトにリンク（プロジェクトIDを確認してください）
railway link

# 4. 環境変数を設定
railway variables set NODE_ENV=production
railway variables set FORCE_MAP_GENERATION=true
railway variables set CANVAS_PREBUILT=false
railway variables set NODE_OPTIONS="--max-old-space-size=2048"
railway variables set PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"

# 5. Canvas ビルド設定
railway variables set npm_config_build_from_source=true
railway variables set npm_config_canvas_binary_host_mirror="https://registry.npmjs.org/-/binary/canvas/"

# 6. デプロイ
railway up

# 7. ステータス確認
railway status

# 8. ログ確認（Canvas動作確認）
railway logs
