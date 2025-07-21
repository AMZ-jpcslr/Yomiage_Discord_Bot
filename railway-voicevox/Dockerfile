# VoiceVox Engine用Dockerfile
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railwayのポート環境変数を使用
ENV PORT=50021
EXPOSE $PORT

# VoiceVoxエンジンを起動
CMD ["python", "run.py", "--host", "0.0.0.0", "--port", "50021"]
