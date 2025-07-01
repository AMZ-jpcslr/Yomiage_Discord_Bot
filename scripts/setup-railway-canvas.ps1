# Railway Canvas 環境変数設定スクリプト（更新版）
# PowerShell用

Write-Host "🔧 Railway Canvas 設定を開始します..." -ForegroundColor Green

# Railway CLIがインストールされているかチェック
try {
    railway --version
    Write-Host "✅ Railway CLI が確認されました" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI がインストールされていません。インストール中..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Discord Bot設定（ユーザー入力が必要）
Write-Host "📝 Discord Bot設定" -ForegroundColor Blue
$discordToken = Read-Host "Discord Bot Token を入力してください（スキップする場合はEnter）"
$discordClientId = Read-Host "Discord Client ID を入力してください（スキップする場合はEnter）"

if ($discordToken -and $discordClientId) {
    railway variables set DISCORD_TOKEN="$discordToken"
    railway variables set DISCORD_CLIENT_ID="$discordClientId"
    Write-Host "✅ Discord設定完了" -ForegroundColor Green
} else {
    Write-Host "⚠️ Discord設定をスキップしました。後で手動で設定してください。" -ForegroundColor Yellow
}

# Canvas/Map生成設定
Write-Host "🎨 Canvas設定中..." -ForegroundColor Blue
railway variables set FORCE_MAP_GENERATION=true
railway variables set SKIP_MAP_GENERATION=false
railway variables set CANVAS_PREBUILT=false

# Node.js設定
Write-Host "🟢 Node.js設定中..." -ForegroundColor Blue
railway variables set NODE_ENV=production
railway variables set "NODE_OPTIONS=--max-old-space-size=2048"

# npm設定（Canvas ビルド用）
Write-Host "📦 npm Canvas設定中..." -ForegroundColor Blue
railway variables set npm_config_build_from_source=true
railway variables set npm_config_canvas_prebuilt=false

# 設定確認
Write-Host "📊 設定確認..." -ForegroundColor Blue
railway variables

# デプロイ確認
Write-Host ""
$deploy = Read-Host "設定完了しました。デプロイしますか？ (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "🚀 デプロイ中..." -ForegroundColor Green
    railway up
    
    Start-Sleep 5
    Write-Host "� ログを確認中..." -ForegroundColor Blue
    railway logs
} else {
    Write-Host "⏸️ 設定のみ完了しました。手動でデプロイしてください: railway up" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 セットアップ完了！" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 トラブルシューティング:" -ForegroundColor Cyan
Write-Host "1. Canvas エラーの場合:" -ForegroundColor White
Write-Host "   railway variables set SKIP_MAP_GENERATION=true" -ForegroundColor Gray
Write-Host "2. メモリエラーの場合:" -ForegroundColor White  
Write-Host "   railway variables set NODE_OPTIONS='--max-old-space-size=4096'" -ForegroundColor Gray
Write-Host "3. Ubuntu Dockerfileを試す:" -ForegroundColor White
Write-Host "   mv Dockerfile Dockerfile.alpine && mv Dockerfile.ubuntu Dockerfile && railway up" -ForegroundColor Gray
