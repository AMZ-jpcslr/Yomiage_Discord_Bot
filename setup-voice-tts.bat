@echo off
REM VoiceVox音声読み上げ機能のための依存関係インストールスクリプト（Windows用）

echo === VoiceVox音声読み上げ機能セットアップ ===

REM 必要なパッケージをインストール
echo 📦 必要なパッケージをインストール中...
call npm install @discordjs/voice libsodium-wrappers

REM インストール結果確認
if %errorlevel% equ 0 (
    echo ✅ パッケージインストール完了
) else (
    echo ❌ パッケージインストールに失敗しました
    pause
    exit /b 1
)

REM VoiceVoxサーバーの確認
echo.
echo 🔍 VoiceVoxサーバーの接続確認中...
curl -s http://localhost:50021/version >nul 2>&1

if %errorlevel% equ 0 (
    echo ✅ VoiceVoxサーバー接続確認完了（localhost:50021）
    echo 🎤 音声読み上げ機能が使用可能です
) else (
    echo ⚠️ VoiceVoxサーバーに接続できませんでした
    echo.
    echo 以下の手順でVoiceVoxを設定してください：
    echo 1. VoiceVoxをダウンロード・インストール: https://voicevox.hiroshiba.jp/
    echo 2. VoiceVoxを起動
    echo 3. メニュー → 設定 → オプション → エンジン
    echo 4. 「HTTPサーバー機能を有効化」をチェック
    echo 5. ポート 50021 で起動されることを確認
    echo.
    echo またはDockerを使用：
    echo docker run --rm -it -p 50021:50021 voicevox/voicevox_engine:latest
)

echo.
echo 📚 詳細なセットアップガイド: 
echo   • ローカルVoiceVox: VOICE_TTS_SETUP.md
echo   • VoiceVox Web API: VOICE_WEB_API_SETUP.md
echo 🎯 使用方法: 
echo   • ローカル版: /voice_tts join コマンドでボイスチャンネルに接続
echo   • Web API版: /voice_web join コマンドでボイスチャンネルに接続
echo.
echo 💡 推奨: VoiceVox Web APIを使用すればサーバー設定不要で高速です！
echo    APIキー取得: https://su-shiki.com/api/
echo    設定済みAPIキー: h4824358C3Q-122 (環境変数VOICEVOX_API_KEYに設定済み)
echo.
echo ✅ テスト方法: node test_voicevox_web_api.js でAPI動作確認
echo 🚀 すぐに使用開始: /voice_web join コマンドでボイスチャンネルに参加
echo.
echo === セットアップ完了 ===
pause
