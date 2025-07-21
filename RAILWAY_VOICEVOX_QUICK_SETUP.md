# Railway環境での簡単VoiceVoxセットアップ（Docker Compose版）

## VoiceVoxサーバー用のDocker Compose設定

```yaml
version: '3.8'
services:
  voicevox:
    image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped
    environment:
      - VOICEVOX_PORT=50021
    command: ["python", "run.py", "--host", "0.0.0.0", "--port", "50021"]
```

## VPSでの簡単セットアップ手順

### 1. VPSにログイン

### 2. Docker & Docker Composeインストール
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Composeインストール
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. VoiceVox起動
```bash
mkdir voicevox-server
cd voicevox-server

# docker-compose.ymlを作成（上記の内容）
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  voicevox:
    image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped
    environment:
      - VOICEVOX_PORT=50021
    command: ["python", "run.py", "--host", "0.0.0.0", "--port", "50021"]
EOF

# 起動
docker-compose up -d

# 動作確認
curl http://localhost:50021/version
```

### 4. ファイアウォール設定
```bash
# UFWの場合
sudo ufw allow 50021
sudo ufw reload

# iptablesの場合
sudo iptables -A INPUT -p tcp --dport 50021 -j ACCEPT
sudo iptables-save
```

### 5. Railway環境変数設定

Railwayダッシュボードで以下を設定：

```env
VOICEVOX_ENABLED=true
VOICEVOX_API_URL=http://YOUR_VPS_IP:50021
```

## よくある問題と解決方法

### Q: VoiceVoxサーバーに接続できない
A: 以下を確認してください：
1. VPSのIPアドレスが正しいか
2. ポート50021が開放されているか
3. VoiceVoxコンテナが起動しているか（`docker ps`で確認）

### Q: 音声が再生されない
A: 以下を確認してください：
1. Discordボットがボイスチャンネルに参加できているか
2. VoiceVoxサーバーが正常に応答しているか（`curl http://ip:50021/version`）
3. Railwayの環境変数が正しく設定されているか

### Q: Railway環境でのログ確認方法
A: Railway CLI または Webダッシュボードの「Logs」タブで確認できます

## セキュリティ向上（オプション）

### nginx reverse proxy設定
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:50021;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL化（Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## パフォーマンスチューニング

### GPU版（高性能VPS用）
```yaml
version: '3.8'
services:
  voicevox:
    image: voicevox/voicevox_engine:nvidia-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```
