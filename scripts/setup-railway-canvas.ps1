# Railway Canvas 設定スクリプト (Windows PowerShell版)

Write-Host "🔧 Railway環境でCanvas設定を適用中..." -ForegroundColor Green

# Railway CLI がインストールされているか確認
try {
    railway --version
    Write-Host "✅ Railway CLI が確認されました" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI がインストールされていません" -ForegroundColor Red
    Write-Host "インストール方法: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Railway環境変数を設定
Write-Host "📝 環境変数を設定中..." -ForegroundColor Blue

railway variables set NODE_ENV=production
railway variables set FORCE_MAP_GENERATION=true  
railway variables set CANVAS_PREBUILT=false
railway variables set "NODE_OPTIONS=--max-old-space-size=2048"
railway variables set "PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"

# Canvasビルド関連
railway variables set npm_config_build_from_source=true
railway variables set "npm_config_canvas_binary_host_mirror=https://registry.npmjs.org/-/binary/canvas/"

Write-Host "✅ Railway環境変数が設定されました" -ForegroundColor Green

# デプロイ
Write-Host "🚀 Railwayにデプロイ中..." -ForegroundColor Blue
railway up

Write-Host "📊 デプロイ状況:" -ForegroundColor Blue
railway status

Write-Host "🎉 設定完了！ログを確認してCanvas動作を確認してください。" -ForegroundColor Green
