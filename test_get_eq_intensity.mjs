/**
 * get_eqコマンドの震度分布地図生成テスト
 */

import { fetchP2PQuakeData, convertP2PDataToMapData } from './build/utils/p2p_earthquake.js'

async function testGetEqIntensityMapping() {
    try {
        console.log('=== get_eq震度分布地図テスト開始 ===')
        
        // P2P地震情報APIから最新データを取得
        const p2pData = await fetchP2PQuakeData()
        
        if (!p2pData || p2pData.length === 0) {
            console.log('❌ 地震データが取得できませんでした')
            return
        }
        
        console.log(`✅ 地震データ取得成功: ${p2pData.length}件`)
        
        // 震度情報があるデータを探す
        const earthquakeWithIntensity = p2pData.find((data) => 
            (data.code === 551 || data.code === 552) && 
            data.earthquake && 
            data.earthquake.hypocenter && 
            data.points && 
            data.points.length > 0
        )
        
        if (!earthquakeWithIntensity) {
            console.log('⚠️ 震度情報付きの地震データが見つかりませんでした')
            console.log('利用可能なデータ:')
            p2pData.slice(0, 3).forEach((data, index) => {
                console.log(`  ${index + 1}. ID: ${data.id}, コード: ${data.code}, 震源地: ${data.earthquake?.hypocenter?.name || 'なし'}`)
            })
            return
        }
        
        console.log('\n📋 震度情報付き地震データ詳細:')
        console.log(`  ID: ${earthquakeWithIntensity.id}`)
        console.log(`  コード: ${earthquakeWithIntensity.code}`)
        console.log(`  震源地: ${earthquakeWithIntensity.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${earthquakeWithIntensity.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${earthquakeWithIntensity.earthquake?.maxScale || '不明'}`)
        console.log(`  震度観測点数: ${earthquakeWithIntensity.points?.length || 0}`)
        
        // 震度分布の詳細分析
        if (earthquakeWithIntensity.points) {
            console.log('\n📊 震度分布詳細:')
            const intensityCount = {}
            earthquakeWithIntensity.points.forEach(point => {
                const scale = point.scale
                const intensityStr = scale >= 70 ? '7' :
                                   scale >= 60 ? '6強' :
                                   scale >= 55 ? '6弱' :
                                   scale >= 50 ? '5強' :
                                   scale >= 45 ? '5弱' :
                                   scale >= 40 ? '4' :
                                   scale >= 30 ? '3' :
                                   scale >= 20 ? '2' :
                                   scale >= 10 ? '1' : '不明'
                
                intensityCount[intensityStr] = (intensityCount[intensityStr] || 0) + 1
            })
            
            Object.entries(intensityCount)
                .sort(([a], [b]) => {
                    const order = ['7', '6強', '6弱', '5強', '5弱', '4', '3', '2', '1']
                    return order.indexOf(a) - order.indexOf(b)
                })
                .forEach(([intensity, count]) => {
                    console.log(`    震度${intensity}: ${count}地域`)
                })
        }
        
        // 地図データ変換テスト
        console.log('\n🗺️ 地図データ変換テスト:')
        const mapData = convertP2PDataToMapData(earthquakeWithIntensity)
        
        if (mapData) {
            console.log('✅ 地図データ変換成功')
            console.log(`  震央: [${mapData.earthquakeData.longitude}, ${mapData.earthquakeData.latitude}]`)
            console.log(`  震度種別数: ${Object.keys(mapData.areaInfo.areas).length}`)
            
            Object.entries(mapData.areaInfo.areas).forEach(([intensity, locations]) => {
                console.log(`    震度${intensity}: ${locations.length}箇所`)
            })
        } else {
            console.log('❌ 地図データ変換失敗')
        }
        
        console.log('\n=== テスト完了 ===')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

// テスト実行
testGetEqIntensityMapping()
