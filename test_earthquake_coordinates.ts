// 地震座標テスト
import { processWolfixEEW } from './src/utils/earthquake'

async function testEarthquakeCoordinates() {
    console.log('=== 地震座標テスト開始 ===')
    
    try {
        const result = await processWolfixEEW()
        
        if (!result) {
            console.log('❌ 結果なし（エラーまたはスキップ条件）')
            return
        }
        
        const { eewData } = result
        
        if (eewData) {
            console.log('=== Wolfix EEW座標情報 ===')
            console.log('震源地:', eewData.Hypocenter)
            console.log('緯度:', eewData.Latitude)
            console.log('経度:', eewData.Longitude)
            console.log('深さ:', eewData.Depth)
            console.log('マグニチュード:', eewData.Magunitude)
            
            if (eewData.Latitude && eewData.Longitude) {
                console.log(`✅ 座標データ取得成功: ${eewData.Latitude}°N, ${eewData.Longitude}°E`)
                console.log(`Google Maps: https://www.google.com/maps?q=${eewData.Latitude},${eewData.Longitude}`)
            } else {
                console.log('⚠️ 座標データが不完全です')
            }
        } else {
            console.log('⚠️ EEWデータが取得できませんでした')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
    
    console.log('=== 地震座標テスト完了 ===')
}

testEarthquakeCoordinates()
