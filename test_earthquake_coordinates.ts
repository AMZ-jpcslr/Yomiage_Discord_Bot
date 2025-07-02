// 地震座標テスト
import { processEarthquakeAlert } from './src/utils/earthquake'

async function testEarthquakeCoordinates() {
    console.log('=== 地震座標テスト開始 ===')
    
    try {
        const result = await processEarthquakeAlert()
        
        if (!result) {
            console.log('❌ 結果なし（エラーまたはスキップ条件）')
            return
        }
        
        const { wolfixData } = result
        
        if (wolfixData) {
            console.log('=== Wolfix EEW座標情報 ===')
            console.log('震源地:', wolfixData.Hypocenter)
            console.log('緯度:', wolfixData.Latitude)
            console.log('経度:', wolfixData.Longitude)
            console.log('深さ:', wolfixData.Depth)
            console.log('マグニチュード:', wolfixData.Magunitude)
            
            if (wolfixData.Latitude && wolfixData.Longitude) {
                console.log(`✅ 座標データ取得成功: ${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`)
                console.log(`Google Maps: https://www.google.com/maps?q=${wolfixData.Latitude},${wolfixData.Longitude}`)
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
