# Railway環境でのVoiceVox設定ガイド

## 概要

RailwayでVoiceVox音声読み上げ機能を使用するには、外部のVoiceVoxサーバーを設定する必要があります。

## 設定方法

### 方法1: 外部VPSでVoiceVoxサーバーを運用（推奨）

#### 1. VPSでVoiceVoxを起動
```bash
# VPSにSSHでログイン後
docker run -d \
  --name voicevox \
  -p 50021:50021 \
  --restart unless-stopped \
  voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# ファイアウォール設定（必要に応じて）
sudo ufw allow 50021
```

#### 2. Railway環境変数を設定
Railway管理画面の「Variables」タブで以下を設定：

```env
VOICEVOX_API_URL=http://your-vps-ip:50021
VOICEVOX_ENABLED=true
```

### 方法2: 別のRailwayサービスとしてVoiceVoxをデプロイ

#### 1. 新しいRailwayプロジェクトを作成
1. Railwayダッシュボードで「New Project」
2. 「Deploy from GitHub repo」を選択
3. VoiceVox用のリポジトリを作成・選択

#### 2. VoiceVox用のDockerfileを作成
```dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

ENV PORT=50021
EXPOSE $PORT

CMD ["python", "run.py", "--host", "0.0.0.0", "--port", "50021"]
```

#### 3. Railwayにプッシュしてデプロイ

#### 4. カスタムドメインまたは生成されたURLを取得

#### 5. メインボットの環境変数を設定
```env
VOICEVOX_API_URL=https://your-voicevox-service.railway.app
VOICEVOX_ENABLED=true
```

### 方法3: 音声読み上げ機能を無効化

VoiceVoxサーバーを用意できない場合は、機能を無効化できます：

```env
VOICEVOX_ENABLED=false
```

## トラブルシューティング

### VoiceVoxサーバーに接続できない場合

1. **サーバーの状態確認**
   ```bash
   curl http://your-server:50021/version
   ```

2. **ファイアウォール設定確認**
   - ポート50021が開放されているか確認
   - VPSのセキュリティグループ設定を確認

3. **Railway環境変数確認**
   - `VOICEVOX_API_URL`が正しく設定されているか
   - `VOICEVOX_ENABLED=true`になっているか

### パフォーマンス最適化

#### GPU版の使用（高性能VPSの場合）
```bash
docker run -d \
  --name voicevox \
  --gpus all \
  -p 50021:50021 \
  --restart unless-stopped \
  voicevox/voicevox_engine:nvidia-ubuntu20.04-latest
```

#### 複数インスタンス（高負荷対応）
```bash
# ロードバランサーを使用して複数のVoiceVoxインスタンスを起動
docker run -d --name voicevox-1 -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest
docker run -d --name voicevox-2 -p 50022:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest
```

## 推奨VPSプロバイダー

- **DigitalOcean**: 月$5〜、簡単セットアップ
- **Vultr**: 月$3.50〜、高性能
- **AWS EC2**: 従量課金、スケーラブル
- **Google Cloud Platform**: 無料枠あり

## コスト見積もり

- **基本VPS（1CPU/1GB RAM）**: 月額$3-5
- **中性能VPS（2CPU/2GB RAM）**: 月額$10-15
- **高性能VPS（4CPU/8GB RAM）**: 月額$30-50

## セキュリティ考慮事項

1. **APIキー認証の追加**（オプション）
2. **HTTPS化**（Let's Encryptなど）
3. **IP制限**（Railwayからのアクセスのみ許可）
4. **定期的なアップデート**

## 環境変数一覧

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `VOICEVOX_API_URL` | VoiceVoxサーバーのURL | `http://localhost:50021` | はい* |
| `VOICEVOX_ENABLED` | 機能の有効/無効 | `true` | いいえ |

*外部サーバーを使用する場合は必須
