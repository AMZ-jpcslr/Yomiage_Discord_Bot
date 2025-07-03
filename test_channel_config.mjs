/**
 * チャンネル設定読み込みテスト
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES Moduleでの__dirname代替
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// パス設定（本体と同じ）
const DATA_DIR = path.resolve(__dirname, 'data')
const EQ_CHANNELS_FILE = path.join(DATA_DIR, 'eq_channels.json')

console.log('=== チャンネル設定読み込みテスト ===')

// 1. パス確認
console.log(`📁 現在のディレクトリ: ${__dirname}`)
console.log(`📁 DATA_DIR: ${DATA_DIR}`)
console.log(`📄 EQ_CHANNELS_FILE: ${EQ_CHANNELS_FILE}`)

// 2. 存在確認
console.log(`📊 DATA_DIR存在: ${fs.existsSync(DATA_DIR)}`)
console.log(`📊 EQ_CHANNELS_FILE存在: ${fs.existsSync(EQ_CHANNELS_FILE)}`)

// 3. 内容読み込みテスト
if (fs.existsSync(EQ_CHANNELS_FILE)) {
    try {
        const data = fs.readFileSync(EQ_CHANNELS_FILE, 'utf8')
        const channels = JSON.parse(data)
        
        console.log(`✅ ファイル読み込み成功`)
        console.log(`📊 設定済みサーバー数: ${Object.keys(channels).length}`)
        console.log(`設定内容:`, channels)
        
        // 各サーバーの設定確認
        for (const [guildId, channelId] of Object.entries(channels)) {
            console.log(`  サーバーID: ${guildId} → チャンネルID: ${channelId}`)
        }
        
    } catch (error) {
        console.error('❌ ファイル読み込みエラー:', error)
    }
} else {
    console.log('⚠️ チャンネル設定ファイルが見つかりません')
    
    // 代替ファイルパスの検索
    const alternatives = [
        path.join(__dirname, '../data/eq_channels.json'),
        path.join(__dirname, '../../data/eq_channels.json'),
        path.join(__dirname, '../../../data/eq_channels.json'),
        path.join(process.cwd(), 'data/eq_channels.json'),
        './data/eq_channels.json'
    ]
    
    console.log('🔍 代替パスを検索中...')
    for (const altPath of alternatives) {
        const resolved = path.resolve(altPath)
        console.log(`  ${resolved} → ${fs.existsSync(resolved) ? '✅ 存在' : '❌ なし'}`)
    }
}

console.log('=== テスト完了 ===')
