FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railwayの動的ポート対応
ENV PORT=50021
EXPOSE $PORT

# VoiceVoxエンジンの作業ディレクトリ設定
WORKDIR /opt/voicevox_engine

# Pythonパスの確認とエンジン起動
# VoiceVoxエンジンの標準起動方法に従う
CMD ["/usr/bin/python3", "run.py", "--host", "0.0.0.0", "--port", "50021", "--allow_origin", "*"]
