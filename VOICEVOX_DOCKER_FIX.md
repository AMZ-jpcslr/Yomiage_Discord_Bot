# VoiceVox Dockerファイル代替案

## 現在の問題
```
/entrypoint.sh: line 7: exec: python: not found
```

## 解決案 1: フルパス指定（現在適用済み）
```dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

ENV PORT=50021
EXPOSE $PORT

WORKDIR /opt/voicevox_engine

CMD ["/usr/bin/python3", "run.py", "--host", "0.0.0.0", "--port", "50021", "--allow_origin", "*"]
```

## 解決案 2: 元のエントリーポイント使用（バックアップ）
```dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

ENV PORT=50021
EXPOSE $PORT

# 元のエントリーポイントを使用
# 環境変数でホストとポートを指定
ENV VOICEVOX_HOST=0.0.0.0
ENV VOICEVOX_PORT=50021

# デフォルトのコマンドを上書き
CMD ["--host", "0.0.0.0", "--port", "50021", "--allow_origin", "*"]
```

## 解決案 3: シェルスクリプト経由（最も確実）
```dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

ENV PORT=50021
EXPOSE $PORT

WORKDIR /opt/voicevox_engine

# 起動スクリプトを作成
RUN echo '#!/bin/bash\n\
cd /opt/voicevox_engine\n\
exec /usr/bin/python3 run.py --host 0.0.0.0 --port 50021 --allow_origin "*"' > /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]
```

## 推奨デプロイ手順

### ステップ1: 修正をコミット
```bash
git add voicevox-service/Dockerfile
git commit -m "fix: Update VoiceVox Dockerfile to use correct python path"
git push origin master
```

### ステップ2: Railway再デプロイ
1. Railway Dashboard → VoiceVoxサービス
2. 「Deployments」→ 自動デプロイ開始を確認
3. ログで正常起動を確認

### ステップ3: 動作確認
- URL + `/version` でアクセステスト
- バージョン番号が表示されることを確認

## トラブルシューティング

### 問題が続く場合
1. **解決案2または3を試す**
2. **VoiceVoxサービスのリソース確認:**
   - Memory: 1024MB以上
   - CPU: 500m以上
3. **ログの詳細確認**
