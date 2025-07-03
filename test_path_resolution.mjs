/**
 * パス解決テスト
 */

import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('=== パス解決テスト ===')

// 現在のディレクトリを確認
console.log('Current __dirname:', __dirname)
console.log('Process cwd:', process.cwd())

// プロジェクトルートの正しい計算（現在は既にプロジェクトルート）
const projectRoot = process.cwd()
console.log('Calculated project root:', projectRoot)

// 設定ファイルのパスをテスト
const configPath = path.join(projectRoot, 'config/config.json')
console.log('Config path:', configPath)
console.log('Config exists:', fs.existsSync(configPath))

if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        console.log('Config loaded successfully')
        console.log('Map file:', config.map)
        
        // マップファイルのパスもテスト
        const mapPath = path.join(projectRoot, config.map)
        console.log('Map path:', mapPath)
        console.log('Map exists:', fs.existsSync(mapPath))
        
    } catch (error) {
        console.error('Config parse error:', error.message)
    }
} else {
    console.log('❌ Config file not found')
}

// 代替パスもテスト
const altConfigPath = path.join(__dirname, '../../config/config.json')
console.log('Alternative config path:', altConfigPath)
console.log('Alternative config exists:', fs.existsSync(altConfigPath))
