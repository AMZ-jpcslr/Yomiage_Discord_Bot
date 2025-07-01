# サーバー環境での地震マップ生成設定ガイド

## 問題の概要
サーバー環境（Railway、Heroku、Vercel等）では、地震マップの生成に必要な依存関係やシステムリソースが制限されているため、地震情報の画像が正常に表示されない場合があります。

## 解決方法

### 1. 強制的な地図生成を有効にする
環境変数 `FORCE_MAP_GENERATION=true` を設定してください。

```bash
FORCE_MAP_GENERATION=true
```

### 2. 必要な依存関係の確認
サーバー環境では以下の依存関係が必要です：

#### Canvas ライブラリ
```bash
npm install canvas
```

#### システム依存関係（Ubuntu/Debian）
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

#### システム依存関係（CentOS/RHEL）
```bash
sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel
```

### 3. ファイルシステムの権限設定
`generated_images` ディレクトリに書き込み権限があることを確認してください：

```bash
mkdir -p generated_images
chmod 755 generated_images
```

### 4. 環境変数の設定オプション

| 環境変数 | 説明 | デフォルト値 |
|---------|------|-------------|
| `FORCE_MAP_GENERATION` | サーバー環境でも地図生成を強制実行 | `true` |
| `SKIP_MAP_GENERATION` | 地図生成を完全にスキップ | `false` |
| `NODE_ENV` | 実行環境（production で自動的にサーバー環境と判定） | 未設定 |

### 5. 各サーバー環境での設定例

#### Railway
```bash
# Railway 環境変数設定
railway variables set FORCE_MAP_GENERATION=true
```

#### Heroku
```bash
# Heroku 環境変数設定
heroku config:set FORCE_MAP_GENERATION=true
```

#### Vercel
```javascript
// vercel.json
{
  "env": {
    "FORCE_MAP_GENERATION": "true"
  }
}
```

### 6. デバッグ情報の確認
Botの起動時に以下の情報が出力されます：

```
=== 環境情報 ===
サーバー環境: true/false
地図生成可能: true/false
詳細環境情報: {...}

=== 推奨設定 ===
💡 各種推奨設定...
```

### 7. トラブルシューティング

#### Canvas ライブラリエラー
```
❌ Canvas ライブラリが利用できません
🔧 Canvas ライブラリまたはシステム依存関係の問題です
```
**解決方法**: システム依存関係をインストールし、Canvas ライブラリを再インストールしてください。

#### ファイル権限エラー
```
❌ ファイルシステムの権限問題です
🔧 generated_imagesディレクトリの書き込み権限を確認してください
```
**解決方法**: ディレクトリの書き込み権限を設定してください。

#### メモリ不足エラー
```
❌ メモリ不足です
🔧 サーバーのメモリ容量を増やしてください
```
**解決方法**: サーバーのメモリプランを増強してください。

#### タイムアウトエラー
```
❌ 地図生成がタイムアウトしました (30秒)
🔧 処理時間制限に達しました
```
**解決方法**: サーバーのCPU性能を向上させるか、地図生成をスキップしてください。

## 推奨設定

### 高性能サーバー環境
```bash
FORCE_MAP_GENERATION=true
NODE_ENV=production
```

### 低性能サーバー環境
```bash
SKIP_MAP_GENERATION=true
NODE_ENV=production
```

### 開発環境
```bash
# 特に設定不要（自動的に地図生成が有効になります）
```
