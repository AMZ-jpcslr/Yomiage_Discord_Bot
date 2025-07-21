# ⚡ Discord Intents クイック解決

## 🚨 エラー: "Used disallowed intents"

### 🎯 1分で解決する手順

#### **ステップ1: Discord設定** (2分)
1. **https://discord.com/developers/applications** を開く
2. あなたのBot → **「Bot」** → **「Privileged Gateway Intents」**
3. ☑️ **MESSAGE CONTENT INTENT** を有効
4. **「Save Changes」** をクリック

#### **ステップ2: Railway再デプロイ** (1分)
1. Railway Dashboard → Discord Botサービス
2. **「Deployments」** → **「Deploy」** 
3. ログで `✅ Discord Bot 起動完了` を確認

### ✅ 動作確認
```
/voice_tts join voice_channel:#通話 text_channel:#雑談
```

---

## 📋 設定箇所まとめ

| 設定場所 | 項目 | 値 | 重要度 |
|---------|------|----|----|
| Discord Portal | MESSAGE CONTENT INTENT | ☑️ ON | 🔥必須 |
| Discord Portal | GUILD VOICE STATES | ☑️ ON | 推奨 |
| Railway | DISCORD_TOKEN | your_token | 🔥必須 |
| Railway | VOICEVOX_ENABLED | true | 必須 |

---

## 🔧 エラーが続く場合

### **追加確認項目:**
- [ ] Bot tokenが正しい
- [ ] Bot がサーバーに招待済み
- [ ] VoiceVoxサービスが起動中

### **完全ガイド:**
- 📖 **詳細**: `DISCORD_INTENTS_FIX.md`
- 📖 **セットアップ**: `RAILWAY_DETAILED_SETUP.md`

**💡 ほとんどの場合、MESSAGE CONTENT INTENT の有効化で解決します！**
