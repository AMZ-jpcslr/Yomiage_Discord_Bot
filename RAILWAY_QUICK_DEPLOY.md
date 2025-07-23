# Railway Deployment Instructions

## 🚀 Quick Deploy

### Method 1: Nixpacks (Recommended)
Railway will automatically use Nixpacks for building:

1. Push to GitHub
2. Railway detects `nixpacks.toml`
3. Automatic build with optimal memory usage

### Method 2: Dockerfile Fallback
If Nixpacks fails, Railway will use the Dockerfile:

1. Simplified Alpine Linux setup
2. Essential packages only
3. Reduced memory requirements

## 📋 Required Environment Variables

Set these in Railway dashboard:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
VOICEVOX_API_KEY=h4824358C3Q-122
NODE_ENV=production
```

## 🔧 Configuration Files

- `nixpacks.toml` - Primary build configuration
- `railway.yml` - Railway-specific settings
- `Dockerfile` - Fallback build method

## 💡 Troubleshooting

### Build Failures
1. Check Railway build logs
2. Ensure environment variables are set
3. Try redeploying with Dockerfile if Nixpacks fails

### Memory Issues
- Current limit: 2GB RAM
- Node.js optimized for memory efficiency
- Image generation uses optimized settings

## ✅ Features Working
- VoiceVox Web API voice synthesis
- Earthquake map generation
- Discord voice channels
- User name announcement
