# 🚨 Discord Bot Intents エラー解決ガイド

## ❌ エラー内容

```
Error: Used disallowed intents
```

このエラーは、Discord BotがVoiceVox音声読み上げ機能で必要な**特権インテント**を使用しようとしているが、Discord Developer Portalで許可されていないことが原因です。

---

## 🔧 解決手順

### **ステップ1: Discord Developer Portalでの設定** ⚙️

#### 1-1. Developer Portalにアクセス
1. ブラウザで https://discord.com/developers/applications を開く
2. ログインしてあなたのBotアプリケーションを選択

#### 1-2. Bot設定画面へ移動
1. 左サイドメニューの **「Bot」** をクリック
2. **「Privileged Gateway Intents」** セクションまでスクロール

#### 1-3. 必要なIntentsを有効化
以下の **すべて** を有効にしてください:

```
☑️ PRESENCE INTENT               # ユーザーステータス（オプション）
☑️ SERVER MEMBERS INTENT         # サーバーメンバー情報（オプション）
☑️ MESSAGE CONTENT INTENT        # メッセージ内容読取（必須）★
```

**⚠️ 重要:** `MESSAGE CONTENT INTENT` は **必須** です。これがないとVoiceVox機能が動作しません。

#### 1-4. 設定を保存
1. **「Save Changes」** ボタンをクリック
2. 設定が保存されることを確認

---

### **ステップ2: Bot権限の確認** 🤖

#### 2-1. OAuth2設定の確認
1. 左サイドメニューの **「OAuth2」** → **「URL Generator」**
2. **「Scopes」** で **「bot」** にチェック
3. **「Bot Permissions」** で以下を有効にする:

```
General Permissions:
☑️ Read Messages/View Channels    # チャンネル閲覧
☑️ Send Messages                  # メッセージ送信
☑️ Read Message History           # 履歴読取

Voice Permissions:
☑️ Connect                        # ボイスチャンネル接続
☑️ Speak                          # 音声再生
☑️ Use Voice Activity             # ボイス検出
```

#### 2-2. 招待URLの更新
1. 新しい招待URLが生成されることを確認
2. 既存のBotがサーバーにいる場合、権限は自動更新される場合があります

---

### **ステップ3: Railway環境変数の確認** 🚂

#### 3-1. Railway Dashboardで確認
1. Railway プロジェクト → Discord Botサービス → **「Variables」**
2. 以下の環境変数が設定されていることを確認:

```env
DISCORD_TOKEN=your_bot_token_here
NODE_ENV=production
RAILWAY=true
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=https://your-voicevox-service.railway.app
```

#### 3-2. トークンの確認
- `DISCORD_TOKEN` または `TOKEN` のどちらかが設定されていることを確認
- トークンが正しく、期限切れでないことを確認

---

### **ステップ4: 再デプロイ** 🔄

#### 4-1. 自動再デプロイ
1. **「Deployments」** タブで新しいデプロイが開始されることを確認
2. 設定変更により自動的にトリガーされる場合があります

#### 4-2. 手動再デプロイ（必要に応じて）
1. **「Deployments」** → 最新コミットの **「Deploy」** をクリック

#### 4-3. ログ確認
デプロイ後、ログで以下のメッセージを確認:
```
✅ Discord Bot 起動完了
✅ VoiceVox接続確認完了
🎵 音声読み上げ監視開始
```

---

## 📋 設定確認チェックリスト

完了したらチェックしてください:

### **Discord Developer Portal**
- [ ] MESSAGE CONTENT INTENT が有効
- [ ] Bot権限でConnect/Speak/Use Voice Activityが有効
- [ ] 設定を保存済み

### **Railway環境変数**
- [ ] DISCORD_TOKEN が設定済み
- [ ] VOICEVOX_ENABLED=true
- [ ] VOICEVOX_API_URL が設定済み

### **動作確認**
- [ ] Botがオンラインになっている
- [ ] `/voice_tts join` コマンドが実行できる
- [ ] エラーログがない

---

## 🔍 トラブルシューティング

### **まだエラーが出る場合**

#### **問題1: トークンエラー**
```
症状: Invalid token エラー
解決: Discord Developer Portal → Bot → Token → Reset Token
```

#### **問題2: Bot権限不足**
```
症状: Missing Permissions エラー
解決: DiscordサーバーでBotの役割権限を確認
```

#### **問題3: VoiceVoxサービス接続エラー**
```
症状: VoiceVoxサーバーに接続できません
解決: VOICEVOX_API_URL の確認、VoiceVoxサービスの起動状況確認
```

---

## 💡 よくある質問

### **Q: MESSAGE CONTENT INTENTとは？**
A: Discord Botがメッセージの内容を読み取るために必要な特権です。VoiceVox音声読み上げ機能では、テキストチャンネルのメッセージを読む必要があるため必須です。

### **Q: すでにサーバーにいるBotの権限は自動更新される？**
A: はい、多くの場合は自動更新されますが、確実にするためには一度Botをキックして再招待することを推奨します。

### **Q: 設定後すぐに動作しない**
A: Discord側の設定反映に数分かかる場合があります。Railwayでの再デプロイも確実に実行してください。

---

## 🎯 次のステップ

設定完了後:

1. **VoiceVox機能テスト:**
   ```
   /voice_tts join voice_channel:#通話 text_channel:#雑談
   ```

2. **音声読み上げテスト:**
   - テキストチャンネルにメッセージ送信
   - ずんだもんの声で読み上げ確認

3. **正常動作確認:**
   ```
   /voice_tts status
   /voice_tts leave
   ```

**🎊 設定完了！Railway内部VoiceVox機能をお楽しみください！**
