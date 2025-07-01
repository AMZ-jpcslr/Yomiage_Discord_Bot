// シンプルな地図生成テストスクリプト
const dotenv = require('dotenv')
const { createEarthquakeEmbed } = require('./build/utils/earthquake')

dotenv.config()

async function testMapGeneration() {
    console.log('🗾 地図生成テスト開始...')
    
    try {
        // 最新の地震情報を取得
        console.log('📡 気象庁APIから地震情報を取得中...')
        const res = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json')
        const list = await res.json() // { json: string }[]
        
        if (!list.length) {
            console.log('❌ 直近の地震情報が見つかりませんでした。')
            return
        }
        
        const latestId = list[0].json
        console.log(`📍 最新地震ID: ${latestId}`)
        
        // 地震情報の詳細を作成（地図生成有効）
        console.log('🗺️  地震マップ生成中...')
        const result = await createEarthquakeEmbed(latestId, false)
        
        console.log('✅ 地震情報の処理完了')
        console.log(`📋 Embed情報: ${result.embed.data.title}`)
        console.log(`📎 添付ファイル数: ${result.files.length}`)
        
        if (result.files.length > 0) {
            result.files.forEach((file, index) => {
                console.log(`📁 ファイル ${index + 1}: ${file.name || 'unnamed'}`)
            })
            console.log('🎉 地図生成成功！')
        } else {
            console.log('⚠️  地図ファイルが生成されませんでした。')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
        console.error('詳細:', error instanceof Error ? error.stack : String(error))
    }
}

// メイン実行
if (require.main === module) {
    testMapGeneration()
        .then(() => {
            console.log('🏁 テスト完了')
            process.exit(0)
        })
        .catch((error) => {
            console.error('💥 テスト失敗:', error)
            process.exit(1)
        })
}
