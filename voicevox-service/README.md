# VoiceVox Engine Service for Railway

このサービスは、Discord BotでVoiceVox音声合成機能を使用するための専用VoiceVoxエンジンサービスです。

## 概要

- **イメージ**: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
- **ポート**: 50021
- **エンドポイント**: `/version`, `/audio_query`, `/synthesis` など

## デプロイ手順

### 1. Railwayでの新しいサービス作成

1. Railway ダッシュボードで現在のプロジェクトを開く
2. 「+ New Service」をクリック
3. 「Empty Service」を選択
4. サービス名を「voicevox-engine」に設定

### 2. ソース設定

1. 新しいサービスの「Settings」→「Source」
2. 「Connect Repo」で同じリポジトリ（OWN_Discord_Bot）を選択
3. 「Root Directory」を `voicevox-service` に設定
4. 「Deploy」をクリック

### 3. 環境変数設定（Discord Botサービス側）

Discord Botサービスで以下の環境変数を設定：

```env
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=https://voicevox-engine-production.up.railway.app
```

*注意: URLは実際にデプロイ後に生成されるものに置き換えてください*

## API エンドポイント

- `GET /version` - VoiceVoxエンジンのバージョン情報
- `POST /audio_query` - 音声クエリの生成
- `POST /synthesis` - 音声合成
- `GET /speakers` - 利用可能な話者一覧

## 利用可能な話者

- **ID 0**: 四国めたん（ノーマル）
- **ID 1**: 四国めたん（あまあま）
- **ID 2**: 四国めたん（ツンツン）
- **ID 3**: ずんだもん（ノーマル） ← **デフォルト使用**
- **ID 4**: ずんだもん（あまあま）
- **ID 5**: ずんだもん（ツンツン）

## トラブルシューティング

### デプロイが失敗する場合

1. Docker イメージのプル確認
2. メモリ設定の調整（1GB以上推奨）
3. タイムアウト設定の確認

### 接続できない場合

1. サービスが正常に起動しているか確認
2. URLが正しく設定されているか確認
3. CORS設定の確認

### パフォーマンス問題

1. CPU設定を調整（500m以上推奨）
2. 必要に応じてGPU版への変更を検討
3. 複数インスタンスでの負荷分散

## 監視

Railway ダッシュボードの「Metrics」タブで以下を監視：

- CPU使用率
- メモリ使用率
- ネットワーク I/O
- レスポンス時間

## コスト最適化

- 使用量に応じてリソース設定を調整
- 不要な時間帯での自動停止設定
- モニタリングによる使用パターンの分析
