# Yomiage Discord Bot

指定したテキストチャンネルの投稿をVOICEVOXで音声化し、Botが参加したボイスチャンネルで読み上げます。指定ユーザー宛てのメンション・返信をDeepLで自動翻訳する機能もあります。翻訳はボイスチャンネルに接続していなくても動作します。

## セットアップ

Node.js **22.12以上**、読み上げには **FFmpeg** が必要です。Dockerイメージには同梱しています。

```sh
npm ci
```

`.env.example` を `.env` にコピーして環境変数を設定します。RailwayではVariablesへ設定してください。

| 変数 | 用途 |
| --- | --- |
| `DISCORD_TOKEN` | 必須。Botトークン。互換名 `TOKEN` |
| `CLIENT_ID` | コマンド登録時に必要なApplication ID。互換名 `DISCORD_CLIENT_ID` |
| `GUILD_ID` | 任意。指定するとそのサーバーにコマンド登録。未指定はグローバル登録 |
| `DEEPL_API_KEY` | 自動翻訳に必要。DeepL API Free / Proのキー。末尾`:fx`でFreeを判別 |
| `VOICEVOX_ENGINE_URL` | VOICEVOX Engineの接続先。例 `http://voicevox.railway.internal:50021`。指定時はこちらを優先 |
| `VOICEVOX_API_KEY` | 既存の外部Web API方式を利用する場合のキー |
| `DATA_DIR` | 設定の保存先。ローカル既定`config`、Docker既定`/data` |
| `PORT` | ヘルスチェック用ポート。Railwayから注入。ローカル既定3000 |

```sh
npm run build
npm run deploy-commands
npm start
```

開発起動は `npm run dev`、外部APIやBotへ接続しない自動テストは `npm test`。
コマンド追加後は再度 `npm run deploy-commands` を実行してください。登録失敗時は終了コード1を返します。

## Discordの設定

Developer PortalのBot設定で **MESSAGE CONTENT INTENT** を有効化します。`GuildVoiceStates` はコードで指定済みの通常Intentで、Portalの特権Intent設定は不要です。

Botを `bot` / `applications.commands` スコープでサーバーに招待し、利用チャンネルで次の権限を付与してください。

- テキスト: チャンネルを見る、メッセージを送信、メッセージ履歴を読む
- ボイス: チャンネルを見る、接続、発言

## 読み上げ

1. 自分が読み上げ先のボイスチャンネルに参加します。
2. 監視したいテキストチャンネルで `/voice_web join` を実行します。
3. そのチャンネルへの投稿を投稿順に読み上げます。
4. `/voice_web leave` で停止します。

`/voice_web settings` で声・速度・音程などを変更できます。`status` で接続設定、`test` でテスト再生ができます。サーバーごとに同時に1つのボイス接続と1つの監視チャンネルを使用します。Botの投稿は読み上げません。1件500文字、待機100件までで、それ以上の文字は省略、満杯時の新規投稿はスキップします。

VOICEVOX Engine方式は `/audio_query` と `/synthesis` を利用します。Engineは別サービスとして起動し、BotからアクセスできるURLを設定してください。既存のWeb API方式は `deprecatedapis.tts.quest` を利用する互換機能として残していますが、その外部サービスの稼働は未検証です。

再起動で音声接続は切れるため `/voice_web join` を再実行してください。音声設定は保存されます。通常のボイスチャンネルを対象にしており、ステージでの発言許可の自動取得は行いません。

## 自動翻訳

設定には **サーバー管理** 権限が必要です。国籍は推測せず、ユーザーが読む言語を明示して登録します。

```text
/translate set channel:#交流 user:@Alice language:英語（米国）
/translate list channel:#交流
/translate remove channel:#交流 user:@Alice
```

登録後、`#交流` で `@Alice 明日は何時に集まりますか？` と投稿するか、Aliceの投稿に返信すると、英訳を元メッセージへの返信として同じチャンネルに投稿します。返信時にユーザー通知をOFFにしていても対象になります。

- 対象は直接のユーザーメンションと返信。ロールメンションや`@everyone`、対象本人の自分宛て投稿、Bot/Webhook、本文のない添付だけの投稿は対象外です。
- 元言語は自動判定。1チャンネル20ユーザーまで登録可能。同じ言語の宛先が複数あってもAPI呼び出しは1回です。
- 本人の通常発言の日本語化、過去の投稿・編集済みメッセージの再翻訳、スレッド内の投稿は対象外です。
- 訳文によるメンション通知は発生させません。長い訳文は分割して送信します。訳文は自動読み上げしません。
- APIタイムアウトは15秒。失敗は元投稿への返信で通知し、読み上げと後続の翻訳を継続します。全体で処理中・待機100投稿までとし、満杯時の新規投稿はスキップしてログに残します。
- 設定は`DATA_DIR/translation.json`へ保存します。解除後は未処理の投稿にも解除を反映しますが、処理中の翻訳は完了する場合があります。

**翻訳対象の本文はDeepLへ送信され、訳文はそのチャンネルの閲覧者に公開されます。** API利用量はDeepLの契約に従います。

## Railwayへのデプロイ

1. このリポジトリをRailwayの常駐サービスとして接続します。`railway.toml` が `Dockerfile.railway` を指定し、Node.js 22・FFmpegを含むイメージをビルドします。以前のBuild/Start Commandの手動上書きは解除してください。旧YAML/Nixpacks設定は本手順では使用しません。
2. Variablesに `DISCORD_TOKEN`、`DEEPL_API_KEY`、音声用の `VOICEVOX_ENGINE_URL` または `VOICEVOX_API_KEY` を設定します。
3. **Volumeを `/data` にマウント**し、`DATA_DIR=/data` とします。Volumeなしでは再デプロイ時に設定が消える可能性があります。ファイル保存のためレプリカは **1** としてください。
4. `CLIENT_ID` と必要なら `GUILD_ID` を設定し、ローカルまたはRailwayの実行環境で `npm run deploy-commands` を一度実行します。Bot起動時の自動登録はしません。
5. `/health` がDiscord接続準備完了時200、未接続時503を返します。Railwayのヘルスチェックに設定済みです。
6. Discordで `/voice_web join`、`/translate set` を実行します。

Railway上の実ボイス再生にはDiscord Voiceへの通信が必要です。接続に失敗した場合はBotの接続・発言権限、API接続先、ログ、実行環境のUDP通信を確認してください。トークンやAPIキーをGitへコミットしないでください。

## その他の既存コマンド

`/ping`、`/lottery`、`/shift`、`/cleanup`、`/list_channels` は継続利用できます。

## 参照

- [DeepL Translate API](https://developers.deepl.com/api-reference/translate/request-translation)
- [discord.js Voice](https://discord.js.org/docs/packages/voice/0.19.2)
- [Railway Config as Code](https://docs.railway.com/config-as-code/reference)
