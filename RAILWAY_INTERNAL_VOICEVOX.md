# Railway内部でVoiceVoxを完結させる方法

## 概要

外部VPSを使わずに、Railway上で直接VoiceVoxエンジンを動かす方法です。

## 方法1: マルチサービス構成（推奨）

### 1. 現在のプロジェクト構造を保持

現在のDiscord Botプロジェクトはそのまま維持します。

### 2. 同じRailwayプロジェクト内に新しいサービスを追加

#### 2-1. VoiceVoxサービス用のフォルダを作成
```
voicevox-service/
├── Dockerfile
├── railway.yml
└── README.md
```

#### 2-2. VoiceVoxサービス用のDockerfile作成
```dockerfile
# voicevox-service/Dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railwayの動的ポート対応
ENV PORT=50021
EXPOSE $PORT

# Railway用の起動コマンド
CMD ["python", "run.py", "--host", "0.0.0.0", "--port", "50021", "--allow_origin", "*"]
```

#### 2-3. VoiceVoxサービス用のrailway.yml作成
```yaml
# voicevox-service/railway.yml
build:
  dockerFilePath: Dockerfile

environment:
  PORT: 50021

resources:
  memory: 1024
  cpu: 500
```

### 3. Railwayでの設定手順

#### 3-1. 新しいサービスの追加
1. Railway ダッシュボードで現在のプロジェクトを開く
2. 「+ New Service」をクリック
3. 「Empty Service」を選択
4. サービス名を「voicevox-engine」に設定

#### 3-2. VoiceVoxサービスのデプロイ
1. 新しいサービスの「Settings」→「Source」
2. 「Connect Repo」で同じリポジトリを選択
3. 「Root Directory」を `voicevox-service` に設定
4. 自動デプロイが開始される

#### 3-3. サービス間通信の設定
1. VoiceVoxサービスのURLを取得（例: `https://voicevox-engine-production.up.railway.app`）
2. Discord Botサービスの環境変数を設定：
```env
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=https://voicevox-engine-production.up.railway.app
```

## 方法2: 単一コンテナ構成

### 1. 現在のDockerfileを修正

現在のDiscord BotのDockerfileにVoiceVoxを統合します。

```dockerfile
# 既存のDockerfileを修正
FROM node:18-bullseye-slim

# VoiceVox用の依存関係をインストール
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# VoiceVoxエンジンのダウンロードとインストール
RUN wget https://github.com/VOICEVOX/voicevox_engine/releases/download/0.14.4/voicevox_engine-linux-cpu-0.14.4.tar.gz \
    && tar -xzf voicevox_engine-linux-cpu-0.14.4.tar.gz \
    && mv voicevox_engine /opt/voicevox \
    && rm voicevox_engine-linux-cpu-0.14.4.tar.gz

# VoiceVox用のPython依存関係
RUN pip3 install -r /opt/voicevox/requirements.txt

# 既存のNode.js依存関係
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .
RUN npm run build

# 起動スクリプトの作成
RUN echo '#!/bin/bash\n\
# VoiceVoxエンジンをバックグラウンドで起動\n\
cd /opt/voicevox && python3 run.py --host 0.0.0.0 --port 50021 &\n\
\n\
# Discord Botを起動\n\
cd /app && npm run start:railway' > /start.sh && chmod +x /start.sh

EXPOSE 3000 50021
CMD ["/start.sh"]
```

### 2. 環境変数の設定
```env
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=http://localhost:50021
```

## 方法3: Node.js内蔵VoiceVox（軽量版）

### 1. VoiceVoxのNode.js実装を使用

純粋なJavaScript/Node.js実装を使用してVoiceVoxと同等の機能を実現します。

```bash
npm install @voicevox/voicevox-engine-node
```

### 2. voice_tts.tsの修正

```typescript
// src/voice_tts.ts
import { VoiceVoxEngine } from '@voicevox/voicevox-engine-node';

class VoiceVoxService {
    private engine: VoiceVoxEngine | null = null;
    
    async initialize() {
        try {
            this.engine = new VoiceVoxEngine();
            await this.engine.initialize();
            console.log('VoiceVox Node.js engine initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize VoiceVox engine:', error);
            return false;
        }
    }
    
    async synthesize(text: string, speakerId: number = 3): Promise<Buffer | null> {
        if (!this.engine) {
            console.log('VoiceVox engine not initialized');
            return null;
        }
        
        try {
            const audioBuffer = await this.engine.synthesize(text, speakerId);
            return audioBuffer;
        } catch (error) {
            console.error('VoiceVox synthesis error:', error);
            return null;
        }
    }
}
```

## 推奨方法の比較

| 方法 | メリット | デメリット | 難易度 |
|------|----------|-----------|--------|
| マルチサービス | ・明確な分離<br>・スケーラブル<br>・障害の分離 | ・設定が複雑<br>・コスト増 | 中 |
| 単一コンテナ | ・シンプル<br>・コスト効率 | ・リソース競合<br>・障害の影響大 | 高 |
| Node.js内蔵 | ・最もシンプル<br>・依存関係最小 | ・機能制限<br>・音質劣化の可能性 | 低 |

## 実装手順（マルチサービス構成 - 推奨）

### ステップ1: VoiceVoxサービスフォルダの作成

```bash
mkdir voicevox-service
cd voicevox-service
```

### ステップ2: 必要ファイルの作成

前述のDockerfileとrailway.ymlを作成します。

### ステップ3: Railwayでの設定

1. 新しいサービスを追加
2. 同じリポジトリを接続
3. Root Directoryを設定
4. 環境変数を設定

### ステップ4: 動作確認

VoiceVoxサービスのURLにアクセスして `/version` エンドポイントで動作確認：
```
https://your-voicevox-service.railway.app/version
```

## トラブルシューティング

### サービス間通信エラー
- 両方のサービスが同じプロジェクト内にあることを確認
- URLが正しく設定されているか確認
- ネットワークポリシーの確認

### メモリ不足
- VoiceVoxサービスのメモリ設定を調整
- CPU版を使用（GPU版は不要）

### 起動時間の問題
- ヘルスチェックのタイムアウトを調整
- 起動順序の制御（Discord Bot → VoiceVox）

この方法により、外部VPSを使わずにRailway内でVoiceVox機能を完結させることができます。
