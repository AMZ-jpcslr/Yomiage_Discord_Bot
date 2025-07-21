# 🚀 Railway内部VoiceVox実装：簡単3ステップ

## 📋 概要

外部VPSを使わず、Railway内で完結するVoiceVox音声読み上げ機能の実装方法です。

## ⚡ クイックスタート

### ステップ1: VoiceVoxサービスをデプロイ 🎤

1. **Railway ダッシュボード** で既存プロジェクトを開く
2. **「+ New Service」** → **「Empty Service」**
3. サービス名: **「voicevox-engine」**
4. **「Settings」** → **「Source」** → **「Connect Repo」**
5. リポジトリ: **「OWN_Discord_Bot」**
6. **Root Directory**: **「voicevox-service」**
7. **「Connect」** をクリック → 自動デプロイ開始

### ステップ2: URLを取得してBot側に設定 🔗

1. VoiceVoxサービスのデプロイ完了を待つ（5-10分）
2. **「Settings」** → **「Networking」** でURLをコピー
   ```
   例: https://voicevox-engine-production-abc123.up.railway.app
   ```
3. **Discord Botサービス** → **「Variables」** で環境変数を追加:
   ```env
   VOICEVOX_ENABLED=true
   VOICEVOX_API_URL=https://あなたのvoicevox-url.railway.app
   ```

### ステップ3: 動作確認 ✅

1. **Discord Bot を再デプロイ** (新しいコミットをプッシュまたは手動デプロイ)
2. **Discordで動作テスト:**
   ```
   /voice_tts join voice_channel:#通話 text_channel:#雑談
   ```
3. テキストチャンネルにメッセージを送信
4. **ずんだもんの声で読み上げ開始！** 🎉

---

## 🛠️ 必要な追加ファイル（既に作成済み）

```
voicevox-service/
├── Dockerfile          ← VoiceVoxエンジン用
├── railway.yml         ← Railway設定
└── README.md          ← サービス説明
```

## 💰 コスト見積もり

- **VoiceVoxサービス**: $5-10/月
- **Discord Botサービス**: $10-20/月  
- **合計**: 約 $15-30/月

## 🔧 トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| VoiceVoxサービスが起動しない | メモリを1GB以上に設定 |
| 接続できない | 環境変数のURLを確認 |
| 音声が再生されない | Bot権限とVoiceVox負荷を確認 |
| コストが高い | リソース設定を最適化 |

## 📚 詳細情報

- **詳細セットアップ**: `RAILWAY_SETUP_GUIDE.md`
- **完全説明**: `RAILWAY_INTERNAL_VOICEVOX.md`
- **外部VPS版**: `RAILWAY_VOICEVOX_QUICK_SETUP.md`

---

## 🎯 この方法の利点

✅ **外部VPS不要** - Railway内で完結  
✅ **シンプル設定** - 3ステップで完了  
✅ **自動管理** - Railway が自動スケーリング  
✅ **セキュア** - 内部ネットワーク通信  
✅ **コスト最適化** - 使用量ベース課金  

**今すぐ始めましょう！** 🚀
