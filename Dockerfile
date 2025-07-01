# ビルド済みファイル専用Dockerfile（最も安全）
FROM node:18-alpine

WORKDIR /app

# package.jsonをコピー（本番依存関係のみ）
COPY package*.json ./

# 本番依存関係のみインストール
RUN npm install --omit=dev

# ビルド済みファイルのみコピー
COPY build/ ./build/
COPY config/ ./config/
COPY data/ ./data/

# 必要なディレクトリを作成
RUN mkdir -p generated_images generated_maps

# 環境変数
ENV NODE_ENV=production
ENV SKIP_MAP_GENERATION=true

# ポート
EXPOSE 3000

# 起動
CMD ["node", "build/main.js"]
