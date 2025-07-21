# VoiceVox音声読み上げ機能の追加

## 必要な依存関係のインストール

音声読み上げ機能を使用するには、以下のパッケージを追加でインストールしてください：

```bash
npm install @discordjs/voice libsodium-wrappers
```

## VoiceVoxサーバーのセットアップ

### 1. VoiceVoxのダウンロードとインストール

1. [VoiceVox公式サイト](https://voicevox.hiroshiba.jp/)から最新版をダウンロード
2. インストール後、VoiceVoxを起動
3. メニューから「設定」→「オプション」→「エンジン」で「HTTPサーバー機能を有効化」をチェック
4. デフォルトポート `50021` で起動されます

### 2. 環境変数の設定（オプション）

`.env`ファイルに以下を追加（デフォルトのローカルサーバーを使用する場合は不要）：

```env
VOICEVOX_API_URL=http://localhost:50021
```

### 3. Docker環境でのVoiceVox使用

Docker環境でVoiceVoxを使用する場合は、[VoiceVox Engine](https://hub.docker.com/r/voicevox/voicevox_engine)を使用してください：

```bash
# VoiceVox Engineコンテナを起動
docker run --rm -it -p 50021:50021 voicevox/voicevox_engine:latest
```

## 使用方法

### 1. 音声読み上げの開始

```
/voice_tts join voice_channel:[ボイスチャンネル] text_channel:[テキストチャンネル]
```

- `voice_channel`: 読み上げ音声を出力するボイスチャンネル
- `text_channel`: 読み上げ対象のテキストチャンネル（省略時は現在のチャンネル）

### 2. 音声読み上げの停止

```
/voice_tts leave
```

### 3. 設定状況の確認

```
/voice_tts status
```

## 機能詳細

- **音声エンジン**: VoiceVox（ずんだもん）
- **自動読み上げ**: 指定されたテキストチャンネルのメッセージを自動で読み上げ
- **メンション除去**: @ユーザー、@ロール、#チャンネルは読み上げから除外
- **URL変換**: URLは「リンク」として読み上げ
- **文字数制限**: 100文字を超える場合は切り詰めて「以下省略」を追加
- **キュー機能**: 複数のメッセージが同時に送信された場合、順番に読み上げ
- **自動切断**: ボイスチャンネルが空になった場合、自動的に切断

## トラブルシューティング

### VoiceVox APIに接続できない場合

1. VoiceVoxアプリケーションが起動しているか確認
2. HTTPサーバー機能が有効になっているか確認
3. ポート50021が使用可能か確認
4. ファイアウォールの設定を確認

### 音声が再生されない場合

1. Discordボットに「ボイスチャンネルへの接続」権限があるか確認
2. ボイスチャンネルの人数制限に引っかかっていないか確認
3. ボットがミュートされていないか確認

## ファイル構成

- `src/voice_tts.ts` - VoiceVox音声読み上げ機能のメイン処理
- `src/commands/voice_tts.ts` - 音声読み上げ制御コマンド
- `data/voice_channels.json` - 音声チャンネル設定ファイル
- `audio/` - 一時音声ファイル保存ディレクトリ（自動生成・削除）
