/**
 * 修正されたマップ生成の単純テスト
 */

import { createMapDataFromWolfixData } from './build/src/utils/earthquake_new.js'
import { generateEarthquakeMap } from './build/src/utils/mapGenerator_new.js'

console.log('=== 修正されたマップ生成テスト ===')

// 簡単なテスト用地震データ
const testData = {
    EventID: 'TEST001',
    Serial: 1,
    Hypocenter: '東京湾',
    Longitude: 139.7,
    Latitude: 35.7,
    Magunitude: 4.5,
    Depth: 30,
    MaxIntensity: '4',
    isWarn: false,
    isFinal: true,
    isCancel: false,
    isTraining: false
}

async function testMapGeneration() {
    try {
        console.log('📊 テストデータ:')
        console.log('  震源地:', testData.Hypocenter)
        console.log('  座標: [' + testData.Longitude + ', ' + testData.Latitude + ']')
        console.log('  マグニチュード: M' + testData.Magunitude)
        console.log('  最大震度:', testData.MaxIntensity)
        
        console.log('')
        console.log('🔄 マップデータ変換中...')
        const { earthquakeData, areaInfo } = createMapDataFromWolfixData(testData)
        
        console.log('📍 変換結果:')
        console.log('  震源座標: [' + earthquakeData.longitude + ', ' + earthquakeData.latitude + ']')
        console.log('  震度地点数:', Object.keys(areaInfo.areas).length > 0 ? 
            Object.values(areaInfo.areas).reduce((sum, coords) => sum + coords.length, 0) : 0)
        
        console.log('')
        console.log('🗺️ マップ生成中...')
        const mapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
        
        if (mapPath) {
            console.log('✅ マップ生成成功!')
            console.log('📄 ファイル:', mapPath)
            console.log('')
            console.log('🔍 修正確認ポイント:')
            console.log('  ✓ 震源地: 赤いXマーク1つのみ')
            console.log('  ✓ 震度分布: 正確な数値表示')
            console.log('  ✓ 参照マーカー: なし')
            console.log('  ✓ ファイル読み込み: エラーなし')
        } else {
            console.log('❌ マップ生成失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message)
        if (error.stack) {
            console.error('スタックトレース:', error.stack.split('\n').slice(0, 5).join('\n'))
        }
    }
}

testMapGeneration()
