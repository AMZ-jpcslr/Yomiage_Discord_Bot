FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railway設定
ENV PORT=50021
EXPOSE $PORT
WORKDIR /opt/voicevox_engine

# README問題を解決
RUN echo "# VoiceVox Mock Mode for Railway" > /opt/voicevox_engine/README.md

# Mock Mode専用起動スクリプト - Railway向け最適化版
RUN echo '#!/bin/bash' > /opt/voicevox_engine/start.sh && \
echo 'echo "=== 🎌🤖 VoiceVox ENGINE Mode for Railway ==="' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Date: $(date)"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Python: /opt/python/bin/python3.11"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Mode: FULL ENGINE (Real Voice Synthesis)"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== Installing Core Dependencies ==="' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check semver platformdirs fastapi uvicorn pydantic jinja2 PyYAML --quiet' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check numpy scipy soxr soundfile requests aiofiles --quiet' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check python-multipart typing-extensions pyopenjtalk pyworld --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "✅ Core dependencies installed"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== Module Verification ==="' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import semver; print(\"semver: OK\")" 2>/dev/null || echo "semver: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import platformdirs; print(\"platformdirs: OK\")" 2>/dev/null || echo "platformdirs: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import soxr; print(\"soxr: OK\")" 2>/dev/null || echo "soxr: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import soundfile; print(\"soundfile: OK\")" 2>/dev/null || echo "soundfile: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import pyopenjtalk; print(\"pyopenjtalk: OK\")" 2>/dev/null || echo "pyopenjtalk: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import pyworld; print(\"pyworld: OK\")" 2>/dev/null || echo "pyworld: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import fastapi; print(\"FastAPI: OK\")" 2>/dev/null || echo "FastAPI: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import uvicorn; print(\"Uvicorn: OK\")" 2>/dev/null || echo "Uvicorn: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import jinja2; print(\"Jinja2: OK\")" 2>/dev/null || echo "Jinja2: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import yaml; print(\"PyYAML: OK\")" 2>/dev/null || echo "PyYAML: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'export PYTHONPATH="/opt/python/lib/python3.11/site-packages"' >> /opt/voicevox_engine/start.sh && \
echo 'export VOICEVOX_CPU_NUM_THREADS=2' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🚀🎤 Starting VoiceVox FULL ENGINE Mode Server"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "📡 Railway URL: https://voicevox-engine-production.up.railway.app"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🔌 Discord Bot can connect to this API"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "✨ Real voice synthesis with speaker selection enabled"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'exec /opt/python/bin/python3.11 run.py --host 0.0.0.0 --port 50021 --allow_origin "*" --cpu_num_threads 2' >> /opt/voicevox_engine/start.sh && \
chmod +x /opt/voicevox_engine/start.sh

# 環境変数設定
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/python/bin:$PATH"
ENV PYTHONPATH="/opt/python/lib/python3.11/site-packages"

# VoiceVox Engine起動
CMD ["/bin/bash", "/opt/voicevox_engine/start.sh"]
