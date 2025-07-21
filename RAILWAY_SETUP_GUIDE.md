# Railway環境設定手順（詳細版）

## ステップ1: VoiceVoxサービスのデプロイ

### 1-1. 新しいサービスの作成
1. [Railway Dashboard](https://railway.app/dashboard) にログイン
2. 既存のプロジェクト（Discord Bot）を開く
3. 右上の「+ New Service」をクリック
4. 「Empty Service」を選択
5. サービス名を「voicevox-engine」に設定

### 1-2. リポジトリの接続
1. 新しく作成したサービスをクリック
2. 「Settings」タブを選択
3. 「Source」セクションで「Connect Repo」をクリック
4. `OWN_Discord_Bot` リポジトリを選択
5. 「Root Directory」に `voicevox-service` と入力
6. 「Connect」をクリック

### 1-3. 自動デプロイの確認
- デプロイが自動で開始されます
- 「Deployments」タブでプロセスを確認
- 初回デプロイには5-10分程度かかります

### 1-4. サービスURLの取得
1. デプロイ完了後、「Settings」→「Networking」
2. 「Public Networking」で生成されたURLをコピー
   例: `https://voicevox-engine-production-abc123.up.railway.app`

## ステップ2: Discord Botサービスの環境変数設定

### 2-1. Discord Botサービスの選択
1. 同じプロジェクト内のDiscord Botサービスをクリック
2. 「Variables」タブを選択

### 2-2. 環境変数の追加
以下の環境変数を追加/更新：

```env
# VoiceVox設定
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=https://voicevox-engine-production-abc123.up.railway.app

# Railway環境設定
RAILWAY=true
NODE_ENV=production
```

*注意: `VOICEVOX_API_URL` の値は、ステップ1-4で取得した実際のURLに置き換えてください*

### 2-3. 既存の環境変数確認
以下の環境変数が設定されていることを確認：

```env
DISCORD_TOKEN=your_discord_bot_token
NODE_OPTIONS=--max-old-space-size=2048
FORCE_MAP_GENERATION=true
CANVAS_PREBUILT=false
```

## ステップ3: 動作確認

### 3-1. VoiceVoxサービスの動作確認
1. ブラウザで以下のURLにアクセス：
   ```
   https://your-voicevox-service-url.railway.app/version
   ```
2. VoiceVoxのバージョン情報が表示されることを確認

### 3-2. Discord Botの再デプロイ
1. Discord Botサービスの「Deployments」タブ
2. 最新のコミットに対して「Deploy」をクリック
3. または、新しいコミットをプッシュして自動デプロイを実行

### 3-3. Discordでの動作確認
1. Discordサーバーで `/voice_tts join` コマンドを実行
2. ボイスチャンネルに参加後、テキストチャンネルにメッセージを送信
3. 音声が正常に再生されることを確認

## ステップ4: トラブルシューティング

### 4-1. VoiceVoxサービスが起動しない場合

**ログの確認:**
1. VoiceVoxサービスの「Deployments」→最新のデプロイ
2. 「View Logs」でエラーメッセージを確認

**よくある問題:**
- メモリ不足: Resources設定でMemoryを1024MB以上に設定
- タイムアウト: ヘルスチェックの設定を確認

### 4-2. Discord Botから接続できない場合

**環境変数の確認:**
```bash
# Railway CLIを使用してログを確認
railway logs --service discord-bot

# または、ダッシュボードでログを確認
```

**接続テスト:**
Discord Botのログで以下のメッセージを確認：
```
✅ VoiceVox接続確認完了: https://your-url/version
```

### 4-3. 音声が再生されない場合

**Discord Bot権限の確認:**
- Voice permissions: Connect, Speak, Use Voice Activity
- Text permissions: Send Messages, Read Message History

**VoiceVoxサービスの負荷確認:**
- Metricsタブでリソース使用量を確認
- 必要に応じてリソース設定を調整

## ステップ5: パフォーマンス最適化

### 5-1. リソース設定の調整

**VoiceVoxサービス:**
```yaml
# voicevox-service/railway.yml
resources:
  memory: 1024  # 基本: 1GB、高負荷時: 2GB
  cpu: 500     # 基本: 0.5vCPU、高負荷時: 1vCPU
```

**Discord Botサービス:**
```yaml
# railway.yml
resources:
  memory: 2048  # 2GB（地震マップ生成のため）
  cpu: 1000     # 1vCPU
```

### 5-2. 自動スケーリング設定

1. 各サービスの「Settings」→「Scaling」
2. 必要に応じてオートスケーリングを有効化
3. 最小/最大インスタンス数を設定

### 5-3. 監視とアラート

1. 「Observability」タブでメトリクスを確認
2. 必要に応じてアラート設定を追加
3. 定期的なヘルスチェックの設定

## コスト管理

### 月額予想コスト（参考）

**VoiceVoxサービス:**
- Basic (1GB RAM, 0.5vCPU): 約 $5-10/月
- Standard (2GB RAM, 1vCPU): 約 $10-20/月

**Discord Botサービス:**
- Standard (2GB RAM, 1vCPU): 約 $10-20/月

**合計:** 約 $15-40/月（使用量によって変動）

### コスト削減のヒント

1. 使用パターンの分析とリソース最適化
2. 不要な時間帯での自動停止設定
3. ログ保持期間の調整
4. 定期的なメトリクス確認

## セキュリティ考慮事項

### 1. ネットワークセキュリティ
- Railway内部通信は自動的にセキュア
- 外部からのVoiceVoxサービスへの直接アクセスは制限可能

### 2. 環境変数の管理
- 機密情報は環境変数として設定
- Git リポジトリには機密情報を含めない

### 3. 定期的なアップデート
- VoiceVoxエンジンの定期更新
- 依存関係のセキュリティアップデート
