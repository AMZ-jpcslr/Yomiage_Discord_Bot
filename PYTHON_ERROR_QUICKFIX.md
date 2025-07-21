# 🚨 VoiceVox Pythonエラー即修復ガイド

## ❌ エラー内容
```
/entrypoint.sh: line 7: exec: python: not found
```

## ⚡ 1分で修復する手順

### **ステップ1: 修正されたファイルをコミット** (30秒)
```powershell
cd "c:\Users\yomas\Github\OWN_Discord_Bot"
powershell -ExecutionPolicy Bypass -Command "git add voicevox-service/Dockerfile"
powershell -ExecutionPolicy Bypass -Command "git commit -m 'fix: Update VoiceVox Dockerfile python path'"
powershell -ExecutionPolicy Bypass -Command "git push origin master"
```

### **ステップ2: Railway再デプロイ** (30秒)
1. **Railway Dashboard** → **VoiceVoxサービス**
2. **「Deployments」** タブ
3. 新しいデプロイが自動開始されることを確認
4. **「Success」** になるまで待機（3-5分）

---

## ✅ 修正内容

### **Before (エラー版):**
```dockerfile
CMD ["python", "run.py", ...]
```

### **After (修正版):**
```dockerfile
CMD ["/usr/bin/python3", "run.py", ...]
```

**変更点:** `python` → `/usr/bin/python3` (フルパス指定)

---

## 🔍 動作確認

### **デプロイ成功後の確認:**
1. **Railway** → **VoiceVoxサービス** → **「Settings」** → **「Networking」**
2. URLをコピー: `https://voicevox-engine-production-abc123.up.railway.app`
3. ブラウザで `URL/version` にアクセス
4. **期待結果:** `"0.14.4"` などのバージョン番号表示

---

## 🚀 次のステップ

### **修復完了後:**
1. `SETUP_CHECKLIST.md` の **ステップ4** から続行
2. VoiceVoxサービスURLを取得
3. Discord Bot環境変数を設定

---

## 🛠️ まだエラーが出る場合

### **追加修正オプション:**

#### **オプション1: より確実なDockerfile**
```dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

ENV PORT=50021
EXPOSE $PORT

WORKDIR /opt/voicevox_engine

# シェルスクリプト経由で起動
RUN echo '#!/bin/bash\ncd /opt/voicevox_engine\nexec /usr/bin/python3 run.py --host 0.0.0.0 --port 50021 --allow_origin "*"' > /start.sh && chmod +x /start.sh

CMD ["/start.sh"]
```

#### **適用方法:**
1. 上記内容で `voicevox-service/Dockerfile` を置き換え
2. コミット・プッシュ
3. Railway再デプロイ

---

## 💡 トラブル予防

### **今後のエラー防止:**
- ✅ Docker CMDは常にフルパス指定
- ✅ Railway Logs でエラー詳細を確認
- ✅ デプロイステータスを確認してから次へ進む

**🎯 この修正でVoiceVoxサービスが正常に起動します！**
