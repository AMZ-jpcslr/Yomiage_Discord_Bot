# Discord地震速報ボット - Ubuntu版（安定性重視）
FROM node:18-bullseye-slim

# ビルドツールとFFmpegをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をクリーンインストール（npm ciを使用）
RUN npm ci

# 残りのファイルをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 用量削減のため開発依存関係を削除
RUN npm prune --production

# デバッグ情報の出力
RUN echo "=== ビルド完了 ===" && \
    echo "Node.js version: $(node --version)" && \
    echo "npm version: $(npm --version)" && \
    echo "FFmpeg version: $(ffmpeg -version | head -1)" && \
    echo "Working directory: $(pwd)" && \
    ls -la

# 非特権ユーザーとして実行
USER node

# ポート公開
EXPOSE 3000

# アプリケーション起動
CMD ["npm", "start"]
