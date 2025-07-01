# Railway 緊急地震速報ボット設定（地図生成無効版）

echo "🚀 Railwayに緊急地震速報ボットをデプロイ（地図機能は一時無効）"

# 基本設定
railway variables set NODE_ENV=production
railway variables set NODE_OPTIONS="--max-old-space-size=1024"

# 地図生成を無効化（一時的）
railway variables set SKIP_MAP_GENERATION=true
railway variables set FORCE_MAP_GENERATION=false

# Discord設定（実際のトークンに置き換えてください）
echo "Discord Bot TokenとClient IDを設定してください:"
read -p "DISCORD_TOKEN: " discord_token
read -p "DISCORD_CLIENT_ID: " client_id

railway variables set DISCORD_TOKEN="$discord_token"
railway variables set DISCORD_CLIENT_ID="$client_id"

# デプロイ
echo "デプロイ中..."
railway up

echo "✅ デプロイ完了！"
echo "📱 Discordで /get_eq コマンドをテストしてください（地図なし版）"
echo "🗾 地図機能は後で有効化します"
