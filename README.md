# Discord 地震情報ボット

日本気象庁（JMA）の地震情報を取得し、カスタム地図画像付きでDiscordに通知するボットです。

## 機能

- `/get_eq` コマンドで最新の地震情報を表示
- `/set_eq_channel` で自動通知チャンネルを設定
- `/set_min_intensity` で通知する最低震度を設定（チャンネル別）
- `/show_min_intensity` で現在の最低震度設定を確認
- 震度画像とカスタム地震マップを表示
- 各観測点の震度を地図上にプロット
- P2P地震情報APIを使用したリアルタイム通知
- チャンネルごとの最低震度フィルタリング機能

## コマンド一覧

| コマンド | 説明 | 必要権限 |
|---------|------|---------|
| `/get_eq` | 最新の地震情報を取得・表示 | なし |
| `/set_eq_channel` | 地震通知チャンネルを設定 | 管理者 |
| `/set_min_intensity` | 通知する最低震度を設定 | なし |
| `/show_min_intensity` | 最低震度設定を確認 | なし |
| `/ping` | ボットの応答確認 | なし |
| `/lottery` | 抽選機能 | なし |
| `/shift` | シフト表 | なし |

### 最低震度設定について

`/set_min_intensity` コマンドで、チャンネルごとに通知する最低震度を設定できます：

- **すべての地震（震度1以上）**: すべての地震情報を通知
- **震度2以上**: 震度2以上の地震のみ通知
- **震度3以上**: 震度3以上の地震のみ通知（推奨設定）
- **震度4以上**: 震度4以上の地震のみ通知
- **震度5弱以上**: 震度5弱以上の重要な地震のみ通知
- **震度5強以上**: 震度5強以上の大きな地震のみ通知
- **震度6弱以上**: 震度6弱以上の大地震のみ通知
- **震度6強以上**: 震度6強以上の大地震のみ通知
- **震度7のみ**: 震度7の巨大地震のみ通知

設定例：
```
/set_min_intensity channel:#地震情報 min_intensity:震度3以上
/show_min_intensity channel:#地震情報
```

## セットアップ

### ローカル環境

1. 依存関係のインストール
```bash
npm install
```

2. TypeScriptのコンパイル
```bash
npm run compile
```

3. `.env` ファイルを作成し、Discord Bot トークンを設定
```
DISCORD_TOKEN=your_bot_token_here
```

4. ボットの起動
```bash
npm start
```

### サーバー環境（Docker使用推奨）

#### Docker Compose での起動
```bash
# ビルドと起動
npm run docker:run

# または手動で
docker-compose up -d
```

#### 手動での起動
```bash
# セーフモード（地震マップ生成なし）
npm run start:safe

# 通常モード
npm run start:prod
```

### 環境変数

- `DISCORD_TOKEN`: Discord Bot のトークン（必須）
- `NODE_ENV`: 実行環境（`production` または `development`）
- `SKIP_MAP_GENERATION`: 地震マップ生成をスキップ（`true` または `false`）

## トラブルシューティング

### Fontconfig エラーが発生する場合
地震マップ生成を無効化して起動：
```bash
SKIP_MAP_GENERATION=true npm run start:prod
```

### メモリ不足エラーが発生する場合
Node.js のメモリ制限を調整：
```bash
NODE_OPTIONS="--max-old-space-size=1024" npm run start:prod
```

### Segmentation fault が発生する場合
1. 必要なシステム依存関係をインストール（Alpine Linux）
```bash
apk add vips-dev fontconfig ttf-dejavu
```

2. セーフモードで起動
```bash
npm run start:safe
```

## ディレクトリ構造

```
src/
├── commands/          # Discord スラッシュコマンド
├── utils/
│   ├── earthquake.ts  # 地震情報処理
│   └── mapGenerator.ts # 地震マップ生成
├── main.ts           # メインエントリーポイント
└── eq_notify.ts      # 自動通知処理

config/
└── config.json       # マップ生成設定

data/maps/
└── japan.geojson     # 日本地図データ
```

## ライセンス

MIT License
