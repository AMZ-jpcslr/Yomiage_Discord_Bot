#!/bin/bash
# Railway Canvas 設定スクリプト

echo "🔧 Railway環境でCanvas設定を適用中..."

# Railway環境変数を設定
railway variables set NODE_ENV=production
railway variables set FORCE_MAP_GENERATION=true  
railway variables set CANVAS_PREBUILT=false
railway variables set NODE_OPTIONS="--max-old-space-size=2048"
railway variables set PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"

# Canvasビルド関連
railway variables set npm_config_build_from_source=true
railway variables set npm_config_canvas_binary_host_mirror="https://registry.npmjs.org/-/binary/canvas/"

echo "✅ Railway環境変数が設定されました"

# デプロイ
echo "🚀 Railwayにデプロイ中..."
railway up

echo "📊 デプロイ状況:"
railway status
