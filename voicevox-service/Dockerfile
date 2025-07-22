FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railwayの動的ポート対応
ENV PORT=50021
EXPOSE $PORT

# VoiceVoxエンジンの作業ディレクトリ設定
WORKDIR /opt/voicevox_engine

# Railway環境用の最適化設定
# ログ出力を抑制し、安定した起動を実現
CMD ["/usr/bin/python3", "run.py", \
     "--host", "0.0.0.0", \
     "--port", "50021", \
     "--allow_origin", "*", \
     "--disable_mutable_api", \
     "--cpu_num_threads", "1"]
