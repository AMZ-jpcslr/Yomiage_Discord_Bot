# Windows用 Dockerfile 切り替えスクリプト

Write-Host "🔄 Dockerfile切り替えスクリプト" -ForegroundColor Green

# 現在のDockerfileの種類をチェック
$currentDockerfile = Get-Content "Dockerfile" -First 2
if ($currentDockerfile -match "Ubuntu|bullseye") {
    $currentType = "Ubuntu"
} elseif ($currentDockerfile -match "Alpine|alpine") {
    $currentType = "Alpine"
} else {
    $currentType = "不明"
}

Write-Host "現在のDockerfile: $currentType" -ForegroundColor Blue

# 切り替えメニューを表示
Write-Host "切り替えオプション:" -ForegroundColor Yellow
Write-Host "1. Alpine版に切り替え（軽量、ただしCanvas依存関係で問題が起こる可能性）" -ForegroundColor White
Write-Host "2. Ubuntu版に切り替え（安定、ただしサイズが大きい）" -ForegroundColor White
Write-Host "3. 現在の設定を確認のみ" -ForegroundColor White

$choice = Read-Host "選択してください (1/2/3)"

switch ($choice) {
    "1" {
        # Alpine版に切り替え
        Write-Host "Alpine版に切り替え中..." -ForegroundColor Yellow
        
        # 現在のファイルをバックアップ
        Copy-Item "Dockerfile" "Dockerfile.ubuntu" -Force
        
        # Alpine版があるかチェック
        if (Test-Path "Dockerfile.alpine") {
            Copy-Item "Dockerfile.alpine" "Dockerfile" -Force
            Write-Host "✅ Alpine版Dockerfileに切り替えました" -ForegroundColor Green
        } else {
            Write-Host "❌ Dockerfile.alpineが見つかりません。作成します..." -ForegroundColor Red
            # Alpine版を作成
            @"
# Use Node.js LTS version with minimal dependencies
FROM node:18-alpine

# Update package index and upgrade packages
RUN apk update && apk upgrade

# Install all dependencies in one layer to avoid conflicts
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    g++ \
    pkg-config \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    fontconfig \
    ttf-dejavu \
    freetype-dev \
    harfbuzz-dev \
    fribidi-dev \
    glib-dev

# Try to install optional packages (ignore if not available)
RUN apk add --no-cache librsvg-dev || true
RUN apk add --no-cache vips-dev || true

# Clean up package cache
RUN rm -rf /var/cache/apk/* /tmp/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm configuration for Canvas
ENV CANVAS_PREBUILT=false
ENV npm_config_build_from_source=true
ENV npm_config_canvas_prebuilt=false

# Install dependencies with verbose logging
RUN npm install --verbose

# Rebuild Canvas specifically to ensure it's properly built
RUN npm rebuild canvas --build-from-source --verbose

# Copy source code and build files
COPY . .

# Compile TypeScript
RUN npm run compile

# Create directories for generated images
RUN mkdir -p /app/generated_images && \
    mkdir -p /app/generated_maps

# Set environment variables for production
ENV NODE_ENV=production
# Enable Canvas map generation for Railway
ENV FORCE_MAP_GENERATION=true
ENV SKIP_MAP_GENERATION=false

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "run", "start:prod"]
"@ | Out-File -FilePath "Dockerfile" -Encoding UTF8
            Write-Host "✅ Alpine版Dockerfileを作成しました" -ForegroundColor Green
        }
    }
    "2" {
        # Ubuntu版に切り替え
        Write-Host "Ubuntu版に切り替え中..." -ForegroundColor Yellow
        
        # Alpine版があればバックアップ
        if (Test-Path "Dockerfile.alpine") {
            # 既存のAlpine版はそのまま
        } else {
            Copy-Item "Dockerfile" "Dockerfile.alpine" -Force
        }
        
        # Ubuntu版を作成
        @"
# Alternative Dockerfile using Ubuntu base (if Alpine has issues)
FROM node:18-bullseye-slim

# Update package lists
RUN apt-get update

# Install dependencies for Canvas and other libraries
RUN apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    python3 \
    python3-pip \
    fonts-dejavu-core \
    fontconfig

# Clean up apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm configuration for Canvas
ENV CANVAS_PREBUILT=false
ENV npm_config_build_from_source=true
ENV npm_config_canvas_prebuilt=false

# Install dependencies
RUN npm install --verbose

# Copy source code and build files
COPY . .

# Compile TypeScript
RUN npm run compile

# Create directories for generated images
RUN mkdir -p /app/generated_images && \
    mkdir -p /app/generated_maps

# Set environment variables for production
ENV NODE_ENV=production
# Enable Canvas map generation for Railway
ENV FORCE_MAP_GENERATION=true
ENV SKIP_MAP_GENERATION=false

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "run", "start:prod"]
"@ | Out-File -FilePath "Dockerfile" -Encoding UTF8
        Write-Host "✅ Ubuntu版Dockerfileに切り替えました" -ForegroundColor Green
    }
    "3" {
        Write-Host "現在の設定を表示..." -ForegroundColor Blue
        Write-Host "Dockerfile (最初の10行):" -ForegroundColor White
        Get-Content "Dockerfile" -First 10
        
        Write-Host "`nファイル一覧:" -ForegroundColor White
        Get-ChildItem "Dockerfile*" | Format-Table Name, Length, LastWriteTime
    }
    default {
        Write-Host "無効な選択です。終了します。" -ForegroundColor Red
        exit 1
    }
}

# デプロイするか確認
$deploy = Read-Host "`n🚀 Railwayにデプロイしますか？ (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "デプロイ中..." -ForegroundColor Green
    railway up
    
    Write-Host "`n📊 ログを確認..." -ForegroundColor Blue
    railway logs
} else {
    Write-Host "手動でデプロイしてください: railway up" -ForegroundColor Yellow
}

Write-Host "`n✅ 処理完了！" -ForegroundColor Green
