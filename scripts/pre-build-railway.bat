@echo off
echo 🔧 Railway用事前ビルドを開始...

REM 既存のbuildディレクトリを削除
if exist "build" (
    rmdir /s /q "build"
    echo ✅ 既存のbuildディレクトリを削除
)

REM TypeScriptビルド実行
echo 📦 TypeScriptビルド中...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo ✅ ビルド成功
    echo 📁 buildディレクトリが作成されました
    dir build
) else (
    echo ❌ ビルドに失敗しました
    exit /b 1
)

echo 🚀 Railwayにデプロイ可能です
echo    1. buildディレクトリが含まれていることを確認
echo    2. GitHubにプッシュ
echo    3. Railwayが自動でデプロイ開始
pause
