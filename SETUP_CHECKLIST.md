# ✅ Railway VoiceVox セットアップ チェックリスト

## 🔍 事前確認（作業開始前）

### **必須確認事項**
- [ ] Railwayアカウントにログイン済み
- [ ] Discord Bot プロジェクトがRailwayで正常稼働中
- [ ] GitHubリポジトリ `OWN_Discord_Bot` にアクセス可能
- [ ] 以下のファイルが存在することを確認:
  ```
  voicevox-service/
  ├── Dockerfile
  ├── railway.yml
  └── README.md
  ```

### **Discord Developer Portal設定（重要）**
- [ ] Discord Developer Portal (https://discord.com/developers/applications) にアクセス
- [ ] あなたのBotアプリケーションを選択
- [ ] 「Bot」→「Privileged Gateway Intents」で以下を有効化:
  - [ ] ☑️ MESSAGE CONTENT INTENT（必須）
  - [ ] ☑️ GUILD VOICE STATES INTENT（推奨）
- [ ] 「Save Changes」をクリック

### **権限確認**
- [ ] Railwayプロジェクトの管理者権限
- [ ] GitHubリポジトリのプッシュ権限
- [ ] Discord サーバーでのBot管理権限

---

## 🚀 実行手順（チェックボックス版）

### **ステップ1: VoiceVoxサービス作成** 🎤
- [ ] **1-1.** Railway ダッシュボードを開く
- [ ] **1-2.** 既存Discord Botプロジェクトをクリック
- [ ] **1-3.** 「+ New Service」をクリック
- [ ] **1-4.** 「Empty Service」を選択
- [ ] **1-5.** サービス名「voicevox-engine」を入力
- [ ] **1-6.** 「Create」をクリック

### **ステップ2: リポジトリ接続** 🔗
- [ ] **2-1.** 作成したサービス「voicevox-engine」をクリック
- [ ] **2-2.** 「Settings」タブを選択
- [ ] **2-3.** 左メニューの「Source」をクリック
- [ ] **2-4.** 「Connect Repo」をクリック
- [ ] **2-5.** 「OWN_Discord_Bot」リポジトリを選択
- [ ] **2-6.** 「Root Directory」に `voicevox-service` を入力
- [ ] **2-7.** 「Connect」をクリック

### **ステップ3: デプロイ確認** ⏰
- [ ] **3-1.** 「Deployments」タブでデプロイ開始を確認
- [ ] **3-2.** デプロイ完了まで待機（5-10分）
- [ ] **3-3.** ステータスが「Success」になることを確認
- [ ] **3-4.** ログで以下を確認:
  ```
  ✓ Built image
  ✓ Starting deployment
  ✓ Deployment successful
  
  ※ VoiceVox利用規約（波音リツ、九州そらなど）の表示は正常です
  ```

### **ステップ4: URL取得** 📋
- [ ] **4-1.** 「Settings」タブに移動
- [ ] **4-2.** 左メニューの「Networking」をクリック
- [ ] **4-3.** 「Public Networking」のURLをコピー
- [ ] **4-4.** メモ帳などにURLを保存
  ```
  例: https://voicevox-engine-production-abc123.up.railway.app
  ```

### **ステップ5: 動作確認** 🧪
- [ ] **5-1.** URLの末尾に `/version` を追加
- [ ] **5-2.** ブラウザでアクセス
- [ ] **5-3.** VoiceVoxバージョン情報が表示されることを確認
  ```
  期待する表示例: "0.14.4" などのバージョン文字列
  ```

### **ステップ6: Discord Bot設定** 🤖
- [ ] **6-1.** プロジェクト画面に戻る
- [ ] **6-2.** Discord Botサービス（既存）をクリック
- [ ] **6-3.** 「Variables」タブを選択
- [ ] **6-4.** 「New Variable」で以下を追加:
  - [ ] 名前: `VOICEVOX_ENABLED` 値: `true`
  - [ ] 名前: `VOICEVOX_API_URL` 値: `（取得したURL）`

### **ステップ7: Bot再デプロイ** 🔄
- [ ] **7-1.** 「Deployments」タブで自動デプロイ開始を確認
- [ ] **7-2.** デプロイ完了まで待機
- [ ] **7-3.** ログで以下のメッセージを確認:
  ```
  ✅ VoiceVox接続確認完了: https://your-url/version
  ```

### **ステップ8: Discord動作確認** 🎮
- [ ] **8-1.** Discordサーバーを開く
- [ ] **8-2.** コマンド実行: `/voice_tts join voice_channel:#通話 text_channel:#雑談`
- [ ] **8-3.** 成功メッセージの確認
- [ ] **8-4.** テキストチャンネルにメッセージ送信
- [ ] **8-5.** ずんだもん音声での読み上げ確認
- [ ] **8-6.** コマンド実行: `/voice_tts leave`

---

## 🛠️ トラブル時の対処法

### **VoiceVoxデプロイに関する注意事項**
```
📋 VoiceVox利用規約の表示について:

ログに以下が表示されるのは正常です:
- 波音リツ
- 九州そら  
- 玄野武宏
- 白上虎太郎
- 青山龍星
- 冥鳴ひまり

これらは各音声ライブラリの利用規約で、
「デプロイ失敗」ではありません。

重要: ステータスが「Success」かどうかで判断してください。
```

### **VoiceVoxサービスクラッシュの場合**
```
症状: "更新が多すぎてクラッシュした" または頻繁な再起動
原因: ログ出力過多、リソース不足、ヘルスチェック失敗
解決: 最適化されたDockerfileとrailway.ymlが適用済み
詳細: VOICEVOX_CRASH_FIX.md を参照

確認手順:
1. 最新のリポジトリをpull
2. Railway → VoiceVoxサービス → 再デプロイ
3. Logsで安定稼働を確認（5分以上）
4. /version エンドポイントで動作確認
```

### **Pythonパスエラーの場合**
```
症状: "python: not found" または "/entrypoint.sh: line 7: exec: python: not found"
原因: VoiceVoxエンジンDockerイメージ内のPythonパス問題
解決: 最新のDockerfileが適用されているか確認
詳細: VOICEVOX_DOCKER_FIX.md を参照

修正手順:
1. git pull origin master （最新のDockerfile取得）
2. Railway → VoiceVoxサービス → 再デプロイ実行
```

### **Discord Intentsエラーの場合**
```
症状: "Error: Used disallowed intents" 
原因: Discord Developer Portalで特権インテントが無効
解決: 事前確認の「Discord Developer Portal設定」を完了してください
詳細: INTENTS_QUICK_FIX.md を参照
```

### **デプロイが失敗する場合**
1. **メモリ設定確認:**
   - [ ] VoiceVoxサービス → Settings → Resources
   - [ ] Memory: 1024MB以上に設定
   - [ ] CPU: 500m以上に設定

2. **ログ確認:**
   - [ ] Deployments → 失敗したデプロイをクリック
   - [ ] エラーメッセージをメモ

### **接続できない場合**
1. **URL確認:**
   - [ ] VOICEVOX_API_URLの値が正しいか
   - [ ] URLの末尾にスラッシュが不要なことを確認

2. **サービス状態確認:**
   - [ ] VoiceVoxサービスが「Running」状態か
   - [ ] Discord Botサービスが「Running」状態か

### **音声が再生されない場合**
1. **Bot権限確認:**
   - [ ] Connect権限
   - [ ] Speak権限
   - [ ] Use Voice Activity権限

2. **リソース確認:**
   - [ ] VoiceVoxサービスのCPU使用率
   - [ ] メモリ使用率

---

## 📊 完了後の確認事項

### **動作確認チェック**
- [ ] `/voice_tts join` が正常実行される
- [ ] ボイスチャンネルにBot参加
- [ ] テキストメッセージが音声で読み上げられる
- [ ] `/voice_tts leave` が正常実行される
- [ ] `/voice_tts status` で設定表示される

### **監視設定（推奨）**
- [ ] Metrics確認方法の理解
- [ ] アラート設定（オプション）
- [ ] コスト監視の設定

### **バックアップ確認**
- [ ] 設定値をメモ保存
- [ ] 重要なURLを記録
- [ ] トラブル時の連絡先確認

---

## 🎉 セットアップ完了！

**✅ すべてのチェックボックスが完了したら、VoiceVox機能の実装が完了です！**

🎊 **おめでとうございます！**
Railway内部でVoiceVox音声読み上げ機能が正常に動作しています。

---

## 📞 サポートが必要な場合

**このチェックリストで問題が解決しない場合:**
1. エラーメッセージをメモ
2. 実行したステップ番号を記録
3. Railwayのログ画面をスクリーンショット
4. サポートまでご連絡ください

**よくある質問:**
- Q: デプロイに30分以上かかる → A: 一度キャンセルして再実行
- Q: 音声が途切れる → A: VoiceVoxサービスのメモリを増加
- Q: コストが心配 → A: Resources設定でCPU/メモリを最小限に調整
