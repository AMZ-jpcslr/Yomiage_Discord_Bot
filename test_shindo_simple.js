/**
 * シンプルな震度数字表示テスト
 */

const fs = require('fs')
const path = require('path')

async function testShindoDisplay() {
    console.log('震度数字表示テストを開始...')
    
    try {
        // モジュールの動的インポート
        const { generateEarthquakeMap } = await import('./build/src/utils/mapGenerator_new.js')
        
        const earthquakeData = {
            longitude: 139.7673068,
            latitude: 35.6809591,
            magnitude: 5.5,
            depth: 60,
            hypocenter: 'テスト震源',
            maxScale: '4'
        }
        
        const areaInfo = {
            epicenter: [139.7673068, 35.6809591],
            areas: {
                '3': [[139.7673068, 35.6809591], [139.8, 35.7]],
                '4': [[139.6, 35.6], [139.9, 35.8]],
                'under_5': [[139.5, 35.5]]
            }
        }
        
        const imagePath = await generateEarthquakeMap(earthquakeData, areaInfo)
        console.log(`テスト成功: 地図が生成されました - ${imagePath}`)
        console.log('震度数字が地図上に表示されているか確認してください')
        
        // ファイルが存在するか確認
        if (fs.existsSync(imagePath)) {
            console.log('✅ 画像ファイルが正常に生成されました')
            console.log(`ファイルサイズ: ${fs.statSync(imagePath).size} bytes`)
        } else {
            console.log('❌ 画像ファイルが見つかりません')
        }
    } catch (error) {
        console.error('テスト失敗:', error)
    }
}

testShindoDisplay()
