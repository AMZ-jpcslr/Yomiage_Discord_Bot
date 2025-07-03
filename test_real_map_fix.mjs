/**
 * 実際のWolfix APIデータを使用した地震マップ修正テスト
 */

import { fetchWolfixEarthquakeData, createMapDataFromWolfixData } from './build/src/utils/earthquake_new.js'
import { generateEarthquakeMap } from './build/src/utils/mapGenerator_new.js'

console.log('=== 実際のWolfix APIデータを使用したマップ修正テスト ===')

async function testRealDataMap() {
    try {
        console.log('📡 Wolfix APIから最新の地震データを取得中...')
        const wolfixData = await fetchWolfixEarthquakeData()
        
        if (!wolfixData) {
            console.log('⚠️ 地震データが取得できませんでした')
            return
        }
        
        console.log('📊 取得した地震データ:')
        console.log('  EventID:', wolfixData.EventID)
        console.log('  震源地:', wolfixData.Hypocenter)
        console.log('  座標:', `[${wolfixData.Longitude}, ${wolfixData.Latitude}]`)
        console.log('  マグニチュード:', wolfixData.Magunitude)
        console.log('  最大震度:', wolfixData.MaxIntensity)
        
        console.log('🔄 マップデータに変換中...')
        const { earthquakeData, areaInfo } = createMapDataFromWolfixData(wolfixData)
        
        console.log('📍 変換後の震度分布:')
        for (const [intensity, coords] of Object.entries(areaInfo.areas)) {
            if (coords.length > 0) {
                console.log(`  震度${intensity}: ${coords.length}地点`)
                coords.slice(0, 3).forEach((coord, i) => {
                    console.log(`    ${i + 1}. [${coord[0]}, ${coord[1]}]`)
                })
                if (coords.length > 3) {
                    console.log(`    ... 他${coords.length - 3}地点`)
                }
            }
        }
        
        console.log('🗺️ 地震マップ生成中...')
        const mapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
        
        if (mapPath) {
            console.log('✅ 地震マップ生成成功:', mapPath)
            console.log('')
            console.log('🔍 修正確認項目:')
            console.log('  ✓ 震源地: 赤いXマーク1つのみ表示')
            console.log('  ✓ 観測点: 正しい震度値と色で表示')
            console.log('  ✓ 参照マーカー: 緑色の点は表示されない')
            console.log('')
            console.log('生成された地震マップファイルを確認してください。')
        } else {
            console.log('❌ 地震マップ生成失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testRealDataMap()
