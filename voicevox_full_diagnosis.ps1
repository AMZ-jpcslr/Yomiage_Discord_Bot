# VoiceVox 診断と確認スクリプト
Write-Host "🔍 VoiceVox Railway 詳細診断" -ForegroundColor Green

$url = "https://voicevox-engine-production.up.railway.app"
$timeout = 15

Write-Host "`n📊 Railway サービス確認リスト:" -ForegroundColor Yellow
Write-Host "1. Railway Dashboard → voicevox-engine サービス"
Write-Host "2. 'Deployments' タブ → 最新デプロイが 'Success'"
Write-Host "3. 'Overview' タブ → サービスが 'Running'"
Write-Host "4. 'Logs' タブ → エラーがないか確認"

Write-Host "`n🌐 接続テスト実行中..." -ForegroundColor Cyan

# 基本接続テスト
Write-Host "`n1️⃣ /version エンドポイント テスト"
try {
    $response = Invoke-WebRequest -Uri "$url/version" -TimeoutSec $timeout -ErrorAction Stop
    Write-Host "✅ 成功! ステータス: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "レスポンス: $($response.Content)" -ForegroundColor Green
    $success = $true
} catch {
    Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    $success = $false
}

# ルートパステスト
Write-Host "`n2️⃣ ルートパス (/) テスト"
try {
    $rootResponse = Invoke-WebRequest -Uri "$url/" -TimeoutSec $timeout -ErrorAction Stop
    Write-Host "✅ ルート成功: $($rootResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ ルート失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# スピーカー情報テスト
Write-Host "`n3️⃣ /speakers エンドポイント テスト"
try {
    $speakersResponse = Invoke-WebRequest -Uri "$url/speakers" -TimeoutSec $timeout -ErrorAction Stop
    Write-Host "✅ スピーカー情報取得成功: $($speakersResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ スピーカー情報失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔧 次のステップ:" -ForegroundColor Magenta
if ($success) {
    Write-Host "✅ VoiceVox エンジンが正常稼働中!"
    Write-Host "→ Discord Bot 環境変数設定に進んでください"
    Write-Host "   VOICEVOX_ENABLED=true"
    Write-Host "   VOICEVOX_API_URL=$url"
} else {
    Write-Host "⏱️ サービスがまだ起動中の可能性があります"
    Write-Host "→ Railway Dashboard でサービス状態を確認してください:"
    Write-Host "   1. Deployments: 'Success' になっているか"
    Write-Host "   2. Overview: 'Running' 状態か"
    Write-Host "   3. Logs: エラーメッセージがないか"
    Write-Host "   4. 5-10分待機してから再テスト"
}
