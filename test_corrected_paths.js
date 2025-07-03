/**
 * 修正後のパステスト
 */

const fs = require('fs')
const path = require('path')

console.log('=== 修正後パステスト ===')

// ビルド後のp2p_notify.jsの位置をシミュレート
const buildScriptPath = path.resolve(__dirname, 'build')
console.log(`ビルドスクリプト位置: ${buildScriptPath}`)

// 修正後のパス: build/ から ../data へ
const correctedDataPath = path.resolve(buildScriptPath, '../data/eq_channels.json')
console.log(`修正後データパス: ${correctedDataPath}`)
console.log(`ファイル存在: ${fs.existsSync(correctedDataPath)}`)

if (fs.existsSync(correctedDataPath)) {
    const data = JSON.parse(fs.readFileSync(correctedDataPath, 'utf8'))
    console.log(`✅ 読み込み成功: ${Object.keys(data).length}サーバー設定済み`)
    console.log(`設定内容:`, data)
} else {
    console.log('❌ ファイルが見つかりません')
}

console.log('=== テスト完了 ===')
