# 🎯 Railway VoiceVox 具体的セットアップ手順

## 📸 画面キャプチャ付き実装ガイド

### 🚀 事前準備

**必要なもの:**
- Railwayアカウント（既存）
- GitHubリポジトリ `OWN_Discord_Bot`（既存）
- Discord Bot トークン（既存）

---

## 📖 詳細セットアップ手順

### **ステップ1: VoiceVoxサービスの作成** 🎤

#### 1-1. Railwayダッシュボードにアクセス
1. ブラウザで https://railway.app/dashboard を開く
2. 既存の Discord Bot プロジェクトをクリック

#### 1-2. 新しいサービスを追加
1. プロジェクト画面で **「+ New Service」** ボタンをクリック
2. 表示されるメニューから **「Empty Service」** を選択
3. サービス名入力画面で **「voicevox-engine」** と入力
4. **「Create」** をクリック

#### 1-3. VoiceVoxサービスの設定
1. 作成した **「voicevox-engine」** サービスをクリック
2. **「Settings」** タブを選択
3. 左サイドバーの **「Source」** をクリック

#### 1-4. リポジトリの接続
1. **「Connect Repo」** ボタンをクリック
2. **「OWN_Discord_Bot」** リポジトリを選択
3. **「Root Directory」** フィールドに `voicevox-service` と入力
4. **「Connect」** ボタンをクリック

**⏱️ 待機時間:** 自動デプロイが開始されます（5-10分程度）

---

### **ステップ2: デプロイの確認** ⏰

#### 2-1. デプロイ状況の確認
1. **「Deployments」** タブをクリック
2. 最新のデプロイが **「Success」** になるまで待機
3. ログで以下のメッセージを確認:
   ```
   ✓ Built image
   ✓ Starting deployment
   ✓ Deployment successful
   ```

#### 2-2. VoiceVoxサービスのURL取得
1. **「Settings」** タブに戻る
2. 左サイドバーの **「Networking」** をクリック
3. **「Public Networking」** セクションで生成されたURLをコピー
   ```
   例: https://voicevox-engine-production-abc123.up.railway.app
   ```

#### 2-3. 動作確認
1. コピーしたURLの末尾に `/version` を追加
   ```
   https://voicevox-engine-production.up.railway.app/version
   ```
2. ブラウザでアクセスして、VoiceVoxのバージョン情報が表示されることを確認

**⚠️ 重要: ポート設定について**
- VoiceVoxサービスは **ポート50021** で動作します
- RailwayのURLは **HTTPSで443ポート** を使用します
- **8080ポートは使用しません**
- 正しいアクセス方法: `https://your-url.railway.app/version`（ポート指定なし）

---

### **ステップ3: Discord Botサービスの設定** 🤖

⚠️ **重要: 事前にDiscord Developer Portalでの設定が必要です**

VoiceVox機能を使用するには、特権インテントの有効化が必要です:
1. https://discord.com/developers/applications でBotアプリを開く
2. 「Bot」→「Privileged Gateway Intents」で以下を有効化:
   - ☑️ **MESSAGE CONTENT INTENT** (必須)
   - ☑️ **GUILD VOICE STATES INTENT** (推奨)
3. 「Save Changes」をクリック

*詳細は `DISCORD_INTENTS_FIX.md` を参照してください。*

#### 3-1. Discord Botサービスの選択
1. プロジェクト画面に戻る（上部のプロジェクト名をクリック）
2. **Discord Bot のサービス**（既存）をクリック

#### 3-2. 環境変数の設定
1. **「Variables」** タブをクリック
2. **「New Variable」** ボタンをクリック
3. 以下の環境変数を1つずつ追加:

**追加する環境変数:**
```env
名前: VOICEVOX_ENABLED
値: true

名前: VOICEVOX_API_URL
値: https://voicevox-engine-production-abc123.up.railway.app
```

*⚠️ 注意: URLは ステップ2-2 で取得した実際のURLに置き換えてください*

#### 3-3. 既存環境変数の確認
以下の環境変数が設定されていることを確認（なければ追加）:
```env
DISCORD_TOKEN: （あなたのBotトークン）
NODE_ENV: production
RAILWAY: true
```

---

### **ステップ4: Discord Botの再デプロイ** 🔄

#### 4-1. 自動デプロイの場合
1. **「Deployments」** タブで新しいデプロイが自動開始されるのを確認
2. 環境変数の変更により自動的にトリガーされます

#### 4-2. 手動デプロイの場合（必要に応じて）
1. **「Deployments」** タブをクリック
2. 最新のコミットの横にある **「Deploy」** ボタンをクリック

#### 4-3. デプロイ完了の確認
1. デプロイが **「Success」** になるまで待機
2. ログで以下のメッセージを確認:
   ```
   ✅ VoiceVox接続確認完了: https://your-url/version
   🎵 Discord Bot 起動完了
   ```

---

### **ステップ5: Discordでの動作確認** 🎮

#### 5-1. Discord サーバーに移動
1. DiscordでBotがいるサーバーを開く
2. ボイスチャンネルとテキストチャンネルがあることを確認

#### 5-2. VoiceVox機能のテスト
1. **ボイスチャンネルに参加:**
   ```
   /voice_tts join voice_channel:#通話 text_channel:#雑談
   ```

2. **メッセージ送信テスト:**
   - テキストチャンネル（#雑談）にメッセージを入力
   ```
   こんにちは、テストです
   ```

3. **音声再生確認:**
   - ずんだもんの声で読み上げが開始されることを確認

#### 5-3. 切断テスト
```
/voice_tts leave
```

---

## 🛠️ トラブルシューティング

### ❌ よくある問題と解決方法

#### **問題0: Discord Bot Intentsエラー**
```
症状: "Error: Used disallowed intents" でBot起動失敗
原因: Discord Developer Portalで特権インテントが無効
解決方法:
1. https://discord.com/developers/applications でBotアプリを開く
2. 「Bot」→「Privileged Gateway Intents」を確認
3. MESSAGE CONTENT INTENT を有効化（必須）
4. GUILD VOICE STATES INTENT を有効化（推奨）
5. 「Save Changes」→ Railway で再デプロイ

詳細ガイド: DISCORD_INTENTS_FIX.md を参照
```

#### **問題1: VoiceVoxサービスのデプロイが失敗する**
```
原因: メモリ不足またはタイムアウト
解決方法:
1. voicevox-engine サービス → Settings → Resources
2. Memory を 1024MB 以上に設定
3. CPU を 500m 以上に設定
4. 再デプロイを実行
```

#### **問題1.1: /version エンドポイントが応答しない**
```
症状: URLは取得できるが、/version にアクセスすると "アプリケーションが返答に失敗" エラー
原因: VoiceVoxエンジンが正常に起動していない

🔍 即座確認事項:
1. Railway Dashboard → voicevox-engine → "Logs" タブ
2. 以下のメッセージがあるか確認:
   ✅ "=== VoiceVox Engine Debug Start ==="
   ✅ "Current directory: /opt/voicevox_engine"
   ✅ "=== Starting VoiceVox Engine ==="
   ✅ "Uvicorn running on http://0.0.0.0:50021"

❌ エラーメッセージがある場合:
- "No such file or directory" → Dockerイメージ問題
- "Permission denied" → 権限問題
- "Port already in use" → ポート競合
- メモリ不足系エラー → リソース不足

🔧 解決手順:
1. Logsで具体的なエラーメッセージを確認
2. エラー内容に応じて以下を実行:
   - リソース不足 → Memory 1536MB, CPU 1000m に増量
   - 起動失敗 → Dockerfile.stable に切り替え
   - 完全に起動しない → Redeploy実行
```

#### **問題2: Discord Botが VoiceVox に接続できない**
```
症状: "VoiceVoxサーバーに接続できません" エラー
確認ポイント:
1. VOICEVOX_API_URL が正しく設定されているか
2. VoiceVoxサービスが起動しているか（Deployments確認）
3. URLの末尾に/versionでアクセスできるか
```

#### **問題3: 音声が再生されない**
```
確認ポイント:
1. Botがボイスチャンネルに参加できているか
2. Bot権限: Connect, Speak, Use Voice Activity
3. VoiceVoxサービスの負荷状況（Metrics確認）
```

#### **問題4: コストが予想より高い**
```
最適化方法:
1. Resources設定を使用量に合わせて調整
2. 不要な時間帯での自動停止設定
3. Metrics監視によるリソース使用パターン分析
```

---

## 📊 監視とメンテナンス

### **毎日の確認事項**
- [ ] 両サービスが正常に稼働中
- [ ] リソース使用量が正常範囲内
- [ ] エラーログがないか確認

### **週次の確認事項**
- [ ] コスト使用量の確認
- [ ] パフォーマンスメトリクスの確認
- [ ] 必要に応じてリソース調整

### **月次の確認事項**
- [ ] VoiceVoxエンジンのアップデート確認
- [ ] セキュリティアップデートの適用
- [ ] 使用パターンに基づくコスト最適化

---

## 🎉 完了チェックリスト

設定完了の最終確認:

- [ ] VoiceVoxサービスがデプロイ済み
- [ ] VoiceVoxサービスのURLが取得済み
- [ ] Discord Botの環境変数設定完了
- [ ] Discord Botが再デプロイ済み
- [ ] `/voice_tts join` コマンドが成功
- [ ] テキスト読み上げが動作確認済み
- [ ] `/voice_tts leave` コマンドが成功

**🎊 おめでとうございます！**
Railway内部VoiceVox機能が正常に動作しています！

---

## 💡 今後の拡張案

1. **複数話者対応** - ずんだもん以外のキャラクター追加
2. **音声設定カスタマイズ** - 速度、ピッチの調整機能
3. **自動監視** - ヘルスチェックとアラート設定
4. **ロードバランシング** - 高負荷時の複数インスタンス対応
