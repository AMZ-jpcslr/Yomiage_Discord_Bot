@echo off
echo.
echo 🔄 Dockerfile切り替えツール (Windows コマンドプロンプト版)
echo.

REM 現在のDockerfileをチェック
findstr /C:"Ubuntu" Dockerfile >nul
if %errorlevel%==0 (
    set CURRENT_TYPE=Ubuntu
) else (
    findstr /C:"alpine" Dockerfile >nul
    if %errorlevel%==0 (
        set CURRENT_TYPE=Alpine
    ) else (
        set CURRENT_TYPE=不明
    )
)

echo 現在のDockerfile: %CURRENT_TYPE%
echo.
echo 切り替えオプション:
echo 1. Alpine版に切り替え（軽量、Canvas依存関係で問題の可能性）
echo 2. Ubuntu版に切り替え（安定、サイズ大）
echo 3. 設定確認のみ
echo.

set /p choice="選択してください (1/2/3): "

if "%choice%"=="1" goto alpine
if "%choice%"=="2" goto ubuntu
if "%choice%"=="3" goto check
echo 無効な選択です。
goto end

:alpine
echo Alpine版に切り替え中...
copy Dockerfile Dockerfile.ubuntu >nul 2>&1

if exist Dockerfile.alpine (
    copy Dockerfile.alpine Dockerfile >nul
    echo ✅ Alpine版Dockerfileに切り替えました
) else (
    echo ❌ Dockerfile.alpineが見つかりません。
    echo 手動でAlpine版を作成するか、PowerShellスクリプトを使用してください。
    echo PowerShell実行: powershell -ExecutionPolicy Bypass -File scripts\switch-dockerfile.ps1
)
goto deploy

:ubuntu
echo Ubuntu版に切り替え中...
copy Dockerfile Dockerfile.alpine >nul 2>&1

REM Ubuntu版Dockerfileを作成（簡易版）
echo # Alternative Dockerfile using Ubuntu base > Dockerfile
echo FROM node:18-bullseye-slim >> Dockerfile
echo. >> Dockerfile
echo # Update package lists >> Dockerfile
echo RUN apt-get update >> Dockerfile
echo. >> Dockerfile
echo # Install dependencies for Canvas and other libraries >> Dockerfile
echo RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config python3 python3-pip fonts-dejavu-core fontconfig >> Dockerfile
echo. >> Dockerfile
echo # Clean up apt cache >> Dockerfile
echo RUN apt-get clean ^&^& rm -rf /var/lib/apt/lists/* >> Dockerfile
echo. >> Dockerfile
echo WORKDIR /app >> Dockerfile
echo COPY package*.json ./ >> Dockerfile
echo ENV CANVAS_PREBUILT=false >> Dockerfile
echo ENV npm_config_build_from_source=true >> Dockerfile
echo RUN npm install --verbose >> Dockerfile
echo COPY . . >> Dockerfile
echo RUN npm run compile >> Dockerfile
echo RUN mkdir -p /app/generated_images ^&^& mkdir -p /app/generated_maps >> Dockerfile
echo ENV NODE_ENV=production >> Dockerfile
echo ENV FORCE_MAP_GENERATION=true >> Dockerfile
echo ENV SKIP_MAP_GENERATION=false >> Dockerfile
echo EXPOSE 3000 >> Dockerfile
echo CMD ["npm", "run", "start:prod"] >> Dockerfile

echo ✅ Ubuntu版Dockerfileに切り替えました
goto deploy

:check
echo.
echo 現在のDockerfile (最初の5行):
echo.
for /f "skip=0 tokens=* delims=" %%a in ('type Dockerfile 2^>nul ^| findstr /n ".*" ^| findstr /r "^[1-5]:"') do echo %%a
echo.
echo ファイル一覧:
dir Dockerfile* /b
goto end

:deploy
echo.
set /p deploy_choice="🚀 Railwayにデプロイしますか？ (y/n): "
if /i "%deploy_choice%"=="y" (
    echo デプロイ中...
    railway up
    echo.
    echo 📊 ログ確認...
    railway logs
) else (
    echo 手動でデプロイしてください: railway up
)

:end
echo.
echo ✅ 処理完了！
pause
