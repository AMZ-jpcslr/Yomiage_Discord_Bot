# 地震速報ボット - シンプル版 v5.0
FROM node:18-alpine

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をクリーンインストール（npm ciを使用）
RUN npm ci

# 残りのファイルをコピー
COPY . .

# TypeScriptコンパイル
RUN npm run compile

# 必要なディレクトリを作成
RUN mkdir -p generated_images generated_maps

# 環境変数
ENV NODE_ENV=production
ENV SKIP_MAP_GENERATION=true

# ポート
EXPOSE 3000

# 起動
CMD ["node", "build/main.js"]
