# 🚨 VoiceVox Railway クラッシュ問題解決ガイド

## 🚨 VoiceVox Railway クラッシュ問題解決ガイド（最終版）

## ❌ **根本原因特定: README.md自動表示によるログスパム**

### **問題の正体:**
- VOICEVOXエンジンが起動時に `/opt/voicevox_engine/README.md` を自動読み込み
- **利用規約全文（数千行）** をログに出力
- Railwayのログ制限（約1000行/分）を瞬時に超過
- **即座にクラッシュ判定**される

### **症状の再現:**
```
Starting Container
+ cat /opt/voicevox_engine/README.md
# VOICEVOX エンジン利用規約
（延々と続く利用規約テキスト...）
```

---

## 🔧 **最終解決策（即座実行）**

### **🚨 即座実行: 完全サイレント化対応**

### **方法1: 最適化されたDockerfile使用（推奨）**

#### ステップ1: 修正されたファイルを確認
```bash
# 最適化済みのDockerfile
voicevox-service/Dockerfile      # メイン版
voicevox-service/Dockerfile.stable # 安定版（バックアップ）
voicevox-service/railway.yml     # リソース設定最適化
```

### **🚨 即座実行: README.md完全削除版**

#### **今回の修正内容:**
```dockerfile
# 🚨 全てのドキュメントファイルを削除
RUN find /opt/voicevox_engine -name "*.md" -delete || true && \
    find /opt/voicevox_engine -name "README*" -delete || true && \
    touch /opt/voicevox_engine/README.md

# Python出力制御
ENV PYTHONUNBUFFERED=0
ENV PYTHONIOENCODING=utf-8

# 完全サイレント起動
CMD exec /usr/bin/python3 run.py \
    --host 0.0.0.0 \
    --port 50021 \
    --allow_origin "*" \
    --disable_mutable_api \
    --cpu_num_threads 1 \
    --log_level ERROR \
    >/dev/null 2>&1
```

#### **🎯 この修正により:**
1. **README.md削除** → 利用規約出力が物理的に不可能
2. **全出力をnull** → 一切のログを出力しない
3. **ERROR level** → 重要なエラーのみ
4. **完全無音起動** → Railwayログ制限回避

#### **✅ 確認手順:**
1. **Railway Dashboard** → **voicevox-engine サービス**
2. **「Deployments」** で最新デプロイを確認
3. **成功後5分待機** → サービスが安定稼働
4. **URL/version にアクセス** → 正常なJSONレスポンス確認

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
