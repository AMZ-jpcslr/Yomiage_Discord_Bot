# 地震速報ボット - Ubuntu版（安定性重視）
FROM node:18-bullseye-slim

# ビルドツールをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

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
