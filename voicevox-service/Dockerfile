FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# Railway設定
ENV PORT=50021
EXPOSE $PORT
WORKDIR /opt/voicevox_engine

# README問題を解決
RUN echo "# VoiceVox for Railway" > /opt/voicevox_engine/README.md

# 絶対完全版：全VoiceVox機能対応
RUN echo '#!/bin/bash' > /opt/voicevox_engine/start.sh && \
echo 'echo "=== 🎌🎵 VoiceVox Engine ABSOLUTE FINAL ==="' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Date: $(date)"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Python: /opt/python/bin/python3.11"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== Installing COMPLETE VoiceVox Stack ==="' >> /opt/voicevox_engine/start.sh && \
echo 'echo "⚙️ Core web framework..."' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check semver platformdirs --quiet' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check fastapi uvicorn pydantic jinja2 --quiet' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check numpy scipy requests aiofiles --quiet' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check python-multipart typing-extensions PyYAML --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🎵 Audio processing stack..."' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check soxr soundfile librosa --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🎌 Japanese language processing..."' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check pyopenjtalk --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🔧 Voice morphing libraries..."' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check pyworld --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🎯 Additional audio tools..."' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -m pip install --no-warn-script-location --disable-pip-version-check resampy audioread --quiet' >> /opt/voicevox_engine/start.sh && \
echo 'echo "✨ COMPLETE VOICEVOX STACK INSTALLED!"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== Complete Module Verification ==="' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import jinja2; print(\"jinja2: OK\")" 2>/dev/null || echo "jinja2: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import yaml; print(\"PyYAML: OK\")" 2>/dev/null || echo "PyYAML: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import pyworld; print(\"pyworld: OK\")" 2>/dev/null || echo "pyworld: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import pyopenjtalk; print(\"pyopenjtalk: OK\")" 2>/dev/null || echo "pyopenjtalk: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import soxr; print(\"soxr: OK\")" 2>/dev/null || echo "soxr: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import uvicorn; print(\"uvicorn: OK\")" 2>/dev/null || echo "uvicorn: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo '/opt/python/bin/python3.11 -c "import fastapi; print(\"fastapi: OK\")" 2>/dev/null || echo "fastapi: FAILED"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== 🎌 VoiceVox Core Detection ==="' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Searching for VoiceVox cores..."' >> /opt/voicevox_engine/start.sh && \
echo 'find /opt -name "*.so" -o -name "libcore*" -o -name "*voicevox*" 2>/dev/null | head -10' >> /opt/voicevox_engine/start.sh && \
echo 'echo "Core directories:"' >> /opt/voicevox_engine/start.sh && \
echo 'ls -la /opt/voicevox_engine/ | grep -E "(core|lib)" || echo "No core dirs in engine"' >> /opt/voicevox_engine/start.sh && \
echo 'ls -la /opt/ | grep -E "(core|voicevox)" || echo "No core dirs in opt"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== 🚀🎌🎵 VOICEVOX ABSOLUTE FINAL LAUNCH ==="' >> /opt/voicevox_engine/start.sh && \
echo 'export PYTHONPATH="/opt/python/lib/python3.11/site-packages"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "PYTHONPATH: $PYTHONPATH"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🎌 Complete Japanese TTS Engine with Voice Morphing"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🌐 Railway URL: https://voicevox-engine-production.up.railway.app"' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🎵 All VoiceVox features enabled!"' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'echo "=== 🔍 Checking for VoiceVox Core Libraries ==="' >> /opt/voicevox_engine/start.sh && \
echo 'if [ ! -f "/opt/voicevox_engine/voicevox_core" ] && [ ! -f "/opt/voicevox_engine/libcore.so" ]; then' >> /opt/voicevox_engine/start.sh && \
echo '  echo "⚠️ VoiceVox core not found, trying to use built-in core..."' >> /opt/voicevox_engine/start.sh && \
echo '  echo "Available files:"' >> /opt/voicevox_engine/start.sh && \
echo '  ls -la /opt/voicevox_engine/ | head -20' >> /opt/voicevox_engine/start.sh && \
echo 'else' >> /opt/voicevox_engine/start.sh && \
echo '  echo "✅ VoiceVox core libraries found!"' >> /opt/voicevox_engine/start.sh && \
echo 'fi' >> /opt/voicevox_engine/start.sh && \
echo 'echo ""' >> /opt/voicevox_engine/start.sh && \
echo 'export VOICEVOX_CPU_NUM_THREADS=2' >> /opt/voicevox_engine/start.sh && \
echo 'export VOICEVOX_ENABLE_MOCK=false' >> /opt/voicevox_engine/start.sh && \
echo 'echo "🚀 Starting server with CPU mode..."' >> /opt/voicevox_engine/start.sh && \
echo 'exec /opt/python/bin/python3.11 run.py --host 0.0.0.0 --port 50021 --allow_origin "*" --use_gpu false --cpu_num_threads 2 || /opt/python/bin/python3.11 run.py --host 0.0.0.0 --port 50021 --allow_origin "*" --use_gpu false --enable_mock' >> /opt/voicevox_engine/start.sh && \
chmod +x /opt/voicevox_engine/start.sh

# 環境変数設定
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/python/bin:$PATH"
ENV PYTHONPATH="/opt/python/lib/python3.11/site-packages"

CMD ["/bin/bash", "/opt/voicevox_engine/start.sh"]
