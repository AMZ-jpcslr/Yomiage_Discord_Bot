#!/bin/bash

# サーバー環境での Discord Bot 起動スクリプト

echo "Discord Bot を起動しています..."

# 環境変数の設定
export NODE_ENV=production

# メモリ制限の設定（必要に応じて調整）
export NODE_OPTIONS="--max-old-space-size=1024"

# フォント関連の問題を回避
unset FONTCONFIG_PATH
unset FONTCONFIG_FILE

# ログディレクトリの作成
mkdir -p logs

# 地震マップ生成ディレクトリの作成
mkdir -p generated_maps

echo "環境設定完了"

# ボットの起動（ログ出力付き）
node build/main.js 2>&1 | tee logs/bot-$(date +%Y%m%d-%H%M%S).log
