# Railway 緊急地震速報ボット設定（地図生成無効版）- Windows PowerShell

Write-Host "🚀 Railwayに緊急地震速報ボットをデプロイ（地図機能は一時無効）" -ForegroundColor Green

# 基本設定
Write-Host "基本環境変数を設定中..." -ForegroundColor Yellow
railway variables set NODE_ENV=production
railway variables set NODE_OPTIONS="--max-old-space-size=1024"

# 地図生成を無効化（一時的）
Write-Host "地図生成を一時的に無効化..." -ForegroundColor Yellow
railway variables set SKIP_MAP_GENERATION=true
railway variables set FORCE_MAP_GENERATION=false

# Discord設定
Write-Host "Discord設定を行います..." -ForegroundColor Blue
$discordToken = Read-Host "DISCORD_TOKEN を入力してください"
$clientId = Read-Host "DISCORD_CLIENT_ID を入力してください"

if ($discordToken -and $clientId) {
    railway variables set DISCORD_TOKEN="$discordToken"
    railway variables set DISCORD_CLIENT_ID="$clientId"
    Write-Host "✅ Discord設定完了" -ForegroundColor Green
} else {
    Write-Host "❌ Discord設定をスキップしました" -ForegroundColor Red
}

# 設定確認
Write-Host "現在の設定:" -ForegroundColor Cyan
railway variables

# デプロイ確認
$deploy = Read-Host "デプロイしますか？ (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "デプロイ中..." -ForegroundColor Green
    railway up
    
    Write-Host "✅ デプロイ完了！" -ForegroundColor Green
    Write-Host "📱 Discordで /get_eq コマンドをテストしてください（地図なし版）" -ForegroundColor Blue
    Write-Host "🗾 地図機能は後で有効化します" -ForegroundColor Yellow
    
    # ログ確認
    Write-Host "ログを確認しますか？ (y/n)" -ForegroundColor Cyan
    $viewLogs = Read-Host
    if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
        railway logs
    }
} else {
    Write-Host "手動でデプロイしてください: railway up" -ForegroundColor Yellow
}

Write-Host "`n次のステップ:" -ForegroundColor Green
Write-Host "1. Discordで /get_eq コマンドをテスト" -ForegroundColor White
Write-Host "2. 基本機能が動作したら地図機能を有効化" -ForegroundColor White
Write-Host "3. railway variables set SKIP_MAP_GENERATION=false" -ForegroundColor White
