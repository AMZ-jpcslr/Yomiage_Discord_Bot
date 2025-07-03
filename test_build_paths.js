/**
 * ビルド後のパステスト
 */

const fs = require('fs')
const path = require('path')

// ビルド後のパス（TypeScriptからJavaScript）
console.log('=== ビルド後パステスト ===')
console.log(`現在のディレクトリ: ${__dirname}`)

// 想定される本体のパス
const buildDirs = [
    path.resolve(__dirname, 'build'),
    path.resolve(__dirname, 'build/src'),
    path.resolve(__dirname, 'build/src/utils')
]

buildDirs.forEach(buildDir => {
    console.log(`\n📁 ビルドディレクトリ: ${buildDir}`)
    console.log(`存在: ${fs.existsSync(buildDir)}`)
    
    if (fs.existsSync(buildDir)) {
        // この場所からのdataディレクトリへのパス
        const dataPath = path.resolve(buildDir, '../../data/eq_channels.json')
        console.log(`データパス: ${dataPath}`)
        console.log(`データファイル存在: ${fs.existsSync(dataPath)}`)
    }
})

console.log('\n=== テスト完了 ===')
