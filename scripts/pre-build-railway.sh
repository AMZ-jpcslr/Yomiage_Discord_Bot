#!/bin/bash
# Railway 事前ビルドスクリプト

echo "🔧 Railway用事前ビルドを開始..."

# 既存のbuildディレクトリを削除
if [ -d "build" ]; then
    rm -rf build
    echo "✅ 既存のbuildディレクトリを削除"
fi

# TypeScriptビルド実行
echo "📦 TypeScriptビルド中..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド成功"
    echo "📁 buildディレクトリが作成されました"
    ls -la build/
else
    echo "❌ ビルドに失敗しました"
    exit 1
fi

echo "🚀 Railwayにデプロイ可能です"
echo "   1. buildディレクトリが含まれていることを確認"
echo "   2. GitHubにプッシュ"
echo "   3. Railwayが自動でデプロイ開始"
