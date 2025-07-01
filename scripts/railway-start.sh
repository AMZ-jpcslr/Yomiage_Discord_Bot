#!/bin/bash
# Railway Canvas 初期化スクリプト

echo "🚀 Railway環境でCanvas初期化を開始..."

# Canvas用環境変数を設定
export CANVAS_PREBUILT=false
export FORCE_MAP_GENERATION=true
export NODE_ENV=production

# Canvas を完全にリビルド
echo "📦 Canvas をソースからリビルド中..."
npm rebuild canvas --build-from-source --verbose

# Canvas のテスト
echo "🧪 Canvas テスト中..."
node -e "
try {
  const Canvas = require('canvas');
  const canvas = Canvas.createCanvas(100, 100);
  console.log('✅ Canvas が正常に動作しています');
  process.exit(0);
} catch (error) {
  console.error('❌ Canvas テスト失敗:', error.message);
  process.exit(1);
}
"

if [ $? -eq 0 ]; then
  echo "✅ Canvas 初期化完了！"
  echo "🎯 Botを開始..."
  npm run start:prod
else
  echo "❌ Canvas 初期化失敗。セーフモードで開始..."
  SKIP_MAP_GENERATION=true npm run start:prod
fi
