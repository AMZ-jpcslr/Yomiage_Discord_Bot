# Railway 8GB High Memory Configuration

## 🚀 高メモリ環境での地震マップ生成

### リソース設定
- **メモリ**: 8GB (8192MB)
- **CPU**: 2vCPU (2000m)
- **Node.js**: 6GB heap (--max-old-space-size=6144)

### 環境変数設定
Railway dashboard で以下を設定：

```bash
# 基本設定
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
VOICEVOX_API_KEY=h4824358C3Q-122
NODE_ENV=production

# 高メモリ地震マップ生成設定
RAILWAY=true
SKIP_MAP_GENERATION=false
FORCE_MAP_GENERATION=true
NODE_OPTIONS=--max-old-space-size=6144
```

### 機能一覧
✅ **VoiceVox音声読み上げ**: ユーザー名 + メッセージ内容
✅ **地震情報取得**: P2P地震情報API
✅ **震度分布マップ**: 高解像度画像生成 (1200x900)
✅ **震度アイコン**: Discord埋め込み表示
✅ **音声チャンネル対応**: Discord voice integration

### メモリ使用量監視
- ビルド時: 最大4GB heap
- 実行時: 最大6GB heap
- 画像生成: メモリ使用量ログ出力
- GC実行: 自動メモリクリーンアップ

### パフォーマンス最適化
- **Canvas**: ネイティブビルド with 完全依存関係
- **Sharp**: 高品質PNG出力 (quality: 95)
- **SVG処理**: D3.js + JSDOM レンダリング
- **メモリ管理**: 段階的GCと使用量監視

### トラブルシューティング

#### メモリ不足の場合
1. Railway settings でメモリを8GBに設定確認
2. `NODE_OPTIONS` 環境変数の確認
3. ビルドログでメモリ使用量確認

#### Canvas ビルドエラー
1. Nixpacks が全依存関係をインストール確認
2. Alpine Linux パッケージの確認
3. Dockerfile フォールバック利用

#### 地震マップが生成されない
```bash
# 環境変数確認
FORCE_MAP_GENERATION=true
SKIP_MAP_GENERATION=false
```

### デプロイ手順
```bash
# 1. 高メモリ設定の確認
git add .
git commit -m "Enable earthquake map generation with 8GB memory"
git push

# 2. Railway で環境変数設定
# 3. リソース設定を8GB/2vCPUに変更
# 4. デプロイ実行
```

### 期待される動作
- 地震発生時の自動マップ生成
- 震度分布の可視化
- 高品質な画像出力
- 安定したメモリ管理
