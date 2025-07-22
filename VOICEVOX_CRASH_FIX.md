# 🚨 VoiceVox Railway クラッシュ問題解決ガイド

## 🚨 VoiceVox Railway クラッシュ問題解決ガイド（緊急版）

## ❌ 緊急問題: **利用規約の大量出力でクラッシュ**

### 新たな症状:
- VoiceVoxエンジンが起動時に**利用規約を大量出力**
- 「四国めたん」「冥鳴ひまり」「九州そら」等の規約テキストが連続表示
- Railway Logsが制限を超えて **即座にクラッシュ**

### 根本原因:
**VOICEVOXエンジンv0.18以降の仕様変更** - 起動時に全ライブラリの利用規約を出力するように

---

## 🔧 緊急解決方法

### **🚨 即座実行: 完全サイレント化対応**

### **方法1: 最適化されたDockerfile使用（推奨）**

#### ステップ1: 修正されたファイルを確認
```bash
# 最適化済みのDockerfile
voicevox-service/Dockerfile      # メイン版
voicevox-service/Dockerfile.stable # 安定版（バックアップ）
voicevox-service/railway.yml     # リソース設定最適化
```

#### ステップ1: **緊急修正版をデプロイ**
```powershell
# 最新の完全サイレント化版を確認
cd "c:\Users\yomas\Github\OWN_Discord_Bot"
git add voicevox-service/
git commit -m "🚨 EMERGENCY: Complete silent VoiceVox to fix terms-of-use crash"
git push origin master
```

**重要:** この修正版は利用規約出力を**完全に抑制**します

#### ステップ2: **Railway即座確認**
1. **Railway Dashboard** → **VoiceVoxサービス**
2. 新しいDeploymentが開始されることを確認
3. **5分以内に「Success」** になることを確認

### **📋 今回の修正内容:**
```dockerfile
# 🚨 新規追加: 利用規約出力完全抑制
RUN echo '#!/bin/bash
/usr/bin/python3 run.py --host 0.0.0.0 --port 50021 \
  --allow_origin "*" --disable_mutable_api --cpu_num_threads 1 \
  --log_level ERROR 2>/dev/null | \
  grep -v "利用規約\|Terms\|規約\|ライブラリ\|クレジット" || true' \
  > /opt/voicevox_engine/start_silent.sh

# 完全サイレント起動
CMD ["/bin/bash", "/opt/voicevox_engine/start_silent.sh"]
```

### **方法2: より安定なDockerfile使用（問題継続時）**

問題が続く場合、より安定なバージョンに切り替え:

#### ステップ1: 安定版Dockerfileに切り替え
```bash
cd voicevox-service/
cp Dockerfile.stable Dockerfile
```

#### ステップ2: コミット・デプロイ
```bash
git add Dockerfile
git commit -m "fix: Switch to stable VoiceVox Dockerfile"
git push origin master
```

---

## ⚙️ 最適化内容

### **Dockerfile の改善点:**
```dockerfile
# Before（問題のある設定）
CMD ["/usr/bin/python3", "run.py", "--host", "0.0.0.0", "--port", "50021"]

# After（最適化設定）
CMD ["/usr/bin/python3", "run.py", \
     "--host", "0.0.0.0", \
     "--port", "50021", \
     "--allow_origin", "*", \
     "--disable_mutable_api", \      # API制限でログ削減
     "--cpu_num_threads", "1"]        # CPU使用量制限
```

### **railway.yml の改善点:**
```yaml
# リソース増量
resources:
  memory: 1536  # 1024 → 1536MB
  cpu: 1000     # 500 → 1000m

# ヘルスチェック最適化
healthcheck:
  interval: 60   # 30 → 60秒
  timeout: 30    # 10 → 30秒
  retries: 5     # 追加
```

---

## 🔍 デプロイ後の確認手順

### **ステップ1: Railway Dashboardで監視**
1. **VoiceVoxサービス** → **「Deployments」**
2. 新しいデプロイが **「Success」** になることを確認
3. **「Overview」** でサービスが **「Running」** 状態を維持

### **ステップ2: ログ確認**
1. **「Logs」** タブで以下を確認:
   ```
   ✅ 良い例:
   VoiceVox Engine starting...
   Uvicorn running on http://0.0.0.0:50021
   
   ❌ 悪い例:
   too many updates
   service crashed
   restarting...
   ```

### **ステップ3: 動作確認**
1. **「Settings」** → **「Networking」** でURL取得
2. `URL/version` にアクセスしてレスポンス確認
3. 連続アクセスで安定性確認

---

## 🛡️ 追加の安定化対策

### **リソース監視の設定**
1. **Railway Dashboard** → **「Metrics」**
2. CPU/メモリ使用率を監視
3. 80%を超える場合はリソース増量を検討

### **アラート設定**
1. **「Settings」** → **「Notifications」**
2. サービス停止時のアラート設定
3. 異常検知の自動通知

### **ログ管理**
1. ログ出力レベルの調整
2. 不要なデバッグ情報の削除
3. 定期的なログローテーション

---

## 📊 成功指標

### **安定性の確認ポイント:**
- [ ] デプロイが5分以内に「Success」完了
- [ ] サービスが「Running」状態を維持（30分以上）
- [ ] `/version` エンドポイントが安定してレスポンス
- [ ] CPU使用率が80%以下で安定
- [ ] メモリ使用率が80%以下で安定

---

## 🚀 次のステップ

### **安定化完了後:**
1. **Discord Bot環境変数設定:**
   ```env
   VOICEVOX_ENABLED=true
   VOICEVOX_API_URL=https://your-stable-voicevox-url.railway.app
   ```

2. **Discord動作確認:**
   ```
   /voice_tts join voice_channel:#通話 text_channel:#雑談
   ```

3. **長期監視:**
   - 24時間の安定稼働確認
   - 負荷テストの実施

---

## 💡 予防策

### **今後のクラッシュ防止:**
1. **リソース余裕の確保** - 使用量の80%以下を維持
2. **ログ出力の制御** - 必要最小限のログのみ出力
3. **定期的な監視** - Metrics定期確認とアラート設定
4. **段階的デプロイ** - 設定変更は小刻みに実施

**🎯 この最適化でVoiceVoxサービスがRailway環境で安定稼働します！**
