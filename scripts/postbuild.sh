#!/bin/bash
# ビルド後の処理: build/src/* を build/ にコピー

if [ -d "build/src" ]; then
    echo "Copying files from build/src to build/"
    cp -r build/src/* build/
    echo "Copy completed"
else
    echo "build/src directory not found"
fi
