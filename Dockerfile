# 地震速報ボット - 最小限 Dockerfile
FROM node:18-alpine

WORKDIR /app

# すべてのファイルをコピー（Railwayが依存関係とビルドを処理）
COPY . .

# 必要なディレクトリを作成
RUN mkdir -p generated_images generated_maps

# 環境変数
ENV NODE_ENV=production
ENV SKIP_MAP_GENERATION=true

# ポート
EXPOSE 3000

# 起動（build/main.jsがRailwayによって生成されることを期待）
CMD ["node", "build/main.js"]
