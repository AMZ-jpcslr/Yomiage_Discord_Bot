# 地霁E��報ボッチE- Ubuntu版（安定性重視！E
FROM node:18-bullseye-slim

# ビルドツールをインスト�Eル
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピ�E
COPY package*.json ./

# 依存関係をクリーンインスト�Eル�E�Epm ciを使用�E�E
RUN npm ci

# 残りのファイルをコピ�E
COPY . .

# スクリプトに実行権限を付丁E
RUN chmod +x scripts/postbuild.sh

# TypeScriptコンパイル
RUN npm run build

# 忁E��なチE��レクトリを作�E
RUN mkdir -p generated_images generated_maps

# 環墁E��数
ENV NODE_ENV=production
ENV SKIP_MAP_GENERATION=true

# ポ�EチE
EXPOSE 3000

# 起勁E
CMD ["node", "build/main.js"]
