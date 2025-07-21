FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railwayの動的ポート対応
ENV PORT=50021
EXPOSE $PORT

# Railway環境での起動設定
WORKDIR /opt/voicevox_engine

# CORS設定とRailway用の起動コマンド
CMD ["python", "run.py", "--host", "0.0.0.0", "--port", "50021", "--allow_origin", "*", "--enable_mock", "--cpu_num_threads", "2"]
