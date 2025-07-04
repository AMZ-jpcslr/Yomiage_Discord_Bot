/**
 * P2P地震情報APIから実際のデータを取得して震度分布マップを生成
 */

import { fetchP2PQuakeData, convertP2PDataToMapData } from './build/utils/p2p_earthquake.js'
import { generateEarthquakeMap } from './build/utils/mapGenerator_new.js'

console.log('=== P2P地震情報 震度分布マップテスト ===')

async function testRealP2PIntensityMap() {
    try {
        console.log('📡 P2P地震情報APIから実データを取得中...')
        
        const p2pDataArray = await fetchP2PQuakeData()
        
        if (!p2pDataArray || p2pDataArray.length === 0) {
            console.log('❌ P2P地震情報が取得できませんでした')
            return
        }
        
        // 震度情報がある地震を探す
        const earthquakeData = p2pDataArray.find(data => 
            data.code === 551 && 
            data.earthquake && 
            data.earthquake.hypocenter && 
            data.points && 
            data.points.length > 0
        )
        
        if (!earthquakeData) {
            console.log('❌ 震度情報付きの地震データが見つかりませんでした')
            return
        }
        
        console.log('✅ 震度情報付き地震データを発見:')
        console.log(`  震源地: ${earthquakeData.earthquake.hypocenter.name}`)
        console.log(`  マグニチュード: M${earthquakeData.earthquake.hypocenter.magnitude}`)
        console.log(`  最大震度: ${earthquakeData.earthquake.maxScale}`)
        console.log(`  震度観測点数: ${earthquakeData.points.length}`)
        
        // マップ生成用データに変換
        const { earthquakeData: mapData, areaInfo } = convertP2PDataToMapData(earthquakeData)
        
        console.log('🗾 震度分布マップ生成開始...')
        
        const mapPath = await generateEarthquakeMap(mapData, areaInfo)
        
        if (mapPath) {
            console.log('✅ 震度分布マップ生成成功!')
            console.log(`📁 保存先: ${mapPath}`)
            console.log('🎨 以下の震度分布が表示されているはずです:')
            
            // 震度分布の詳細を表示
            for (const [intensity, coords] of Object.entries(areaInfo.areas)) {
                console.log(`  - 震度${intensity}: ${coords.length}地点`)
            }
        } else {
            console.log('❌ 震度分布マップ生成失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testRealP2PIntensityMap()
