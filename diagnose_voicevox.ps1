# VoiceVox診断スクリプト
Write-Host "🔍 VoiceVox Railway サービス診断開始" -ForegroundColor Green

$voicevoxUrl = "https://voicevox-engine-production.up.railway.app"

Write-Host "`n📡 URL接続テスト..." -ForegroundColor Yellow
Write-Host "対象URL: $voicevoxUrl"

# 基本的な接続テスト
try {
    Write-Host "`n1️⃣ 基本接続テスト (/version)" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri "$voicevoxUrl/version" -TimeoutSec 30 -ErrorAction Stop
    Write-Host "✅ ステータスコード: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ レスポンス: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ /version エンドポイントエラー:" -ForegroundColor Red
    Write-Host "   エラー詳細: $($_.Exception.Message)" -ForegroundColor Red
    
    # より詳細な診断
    try {
        Write-Host "`n2️⃣ ルートURL接続テスト (/)" -ForegroundColor Cyan
        $rootResponse = Invoke-WebRequest -Uri "$voicevoxUrl/" -TimeoutSec 30 -ErrorAction Stop
        Write-Host "✅ ルートアクセス成功: $($rootResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ ルートアクセスも失敗: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    try {
        Write-Host "`n3️⃣ ヘルスチェック (/health)" -ForegroundColor Cyan
        $healthResponse = Invoke-WebRequest -Uri "$voicevoxUrl/health" -TimeoutSec 30 -ErrorAction Stop
        Write-Host "✅ ヘルスチェック成功: $($healthResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ ヘルスチェックも失敗: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n📋 推奨確認事項:" -ForegroundColor Yellow
Write-Host "1. Railway Dashboard → voicevox-engine → Deployments"
Write-Host "2. 最新デプロイが 'Success' になっているか確認"
Write-Host "3. Logs タブでエラーメッセージを確認"
Write-Host "4. Overview タブでサービスが 'Running' 状態か確認"

Write-Host "`n🔧 次のステップ:" -ForegroundColor Magenta
Write-Host "- もしエラーが続く場合、Railwayのログを確認してください"
Write-Host "- サービスが起動していない可能性があります"
