# Windows用 Dockerfile 切り替えコマンド

## コマンドプロンプト用
```cmd
REM 現在のDockerfileをバックアップ（Ubuntu版）
copy Dockerfile Dockerfile.ubuntu

REM Alpine版があるかチェックして、なければ作成
if exist Dockerfile.alpine (
    copy Dockerfile.alpine Dockerfile
) else (
    echo Alpine版Dockerfileが見つかりません。新しく作成します...
    copy con Dockerfile
    REM ここで Ctrl+Z を押してファイル作成を終了
)

REM デプロイ
railway up
```

## PowerShell用
```powershell
# 現在のDockerfileをバックアップ（Ubuntu版）
Copy-Item Dockerfile Dockerfile.ubuntu

# Alpine版があるかチェックして、なければ作成
if (Test-Path "Dockerfile.alpine") {
    Copy-Item Dockerfile.alpine Dockerfile
    Write-Host "Alpine版Dockerfileに切り替えました" -ForegroundColor Green
} else {
    Write-Host "Alpine版Dockerfileが見つかりません。新しく作成します..." -ForegroundColor Yellow
    # Alpine版のDockerfileを作成
}

# デプロイ
railway up
```

## 手動でのファイル操作（推奨）
1. エクスプローラーでプロジェクトフォルダを開く
2. `Dockerfile` を `Dockerfile.ubuntu` にリネーム
3. `Dockerfile.alpine` を `Dockerfile` にリネーム
4. コマンドプロンプトで `railway up` を実行

## 簡単な切り替えスクリプト実行
```cmd
cd c:\Users\yomas\github\OWN_Discord_Bot
powershell -ExecutionPolicy Bypass -File scripts\switch-dockerfile.ps1
```
