# 地震速報ボット - シンプル版 v5.0
FROM node:18-alpine

WORKDIR /app

# package.jsonをコピー
COPY package*.json ./

# すべての依存関係をインストール（TypeScriptコンパイルのため）
RUN npm install

# 残りのファイルをコピー
COPY . .

# TypeScriptコンパイル
RUN npm run compile

# 本番に不要なdevDependenciesを削除してサイズ削減
RUN npm prune --production

# 必要なディレクトリを作成
RUN mkdir -p generated_images generated_maps

# 環境変数
ENV NODE_ENV=production
ENV SKIP_MAP_GENERATION=true

# ポート
EXPOSE 3000

# 起動
CMD ["node", "build/main.js"]
