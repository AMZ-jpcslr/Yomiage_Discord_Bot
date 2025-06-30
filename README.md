# Discord 地震情報ボット

日本気象庁（JMA）の地震情報を取得し、カスタム地図画像付きでDiscordに通知するボットです。

## 機能

- `/get_eq` コマンドで最新の地震情報を表示
- `/set_eq_channel` で自動通知チャンネルを設定
- 震度画像とカスタム地震マップを表示
- 各観測点の震度を地図上にプロット

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
