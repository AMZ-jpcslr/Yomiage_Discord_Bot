/**
 * 市町村レベル震度分布テスト
 */

import { fetchP2PQuakeData, convertP2PDataToMapData } from './build/utils/p2p_earthquake.js'

async function testMunicipalLevelMapping() {
    try {
        console.log('=== 市町村レベル震度分布テスト開始 ===')
        
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
            return
        }
        
        console.log('\n📋 使用する地震データ:')
        console.log(`  ID: ${earthquakeWithIntensity.id}`)
        console.log(`  震源地: ${earthquakeWithIntensity.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${earthquakeWithIntensity.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  震度観測点数: ${earthquakeWithIntensity.points?.length || 0}`)
        
        // 生の震度データ表示
        console.log('\n📊 生の震度データ（抜粋）:')
        earthquakeWithIntensity.points?.slice(0, 5).forEach((point, index) => {
            console.log(`  ${index + 1}. ${point.pref} ${point.addr} - 震度${point.scale >= 70 ? '7' :
                point.scale >= 60 ? '6強' :
                point.scale >= 55 ? '6弱' :
                point.scale >= 50 ? '5強' :
                point.scale >= 45 ? '5弱' :
                point.scale >= 40 ? '4' :
                point.scale >= 30 ? '3' :
                point.scale >= 20 ? '2' :
                point.scale >= 10 ? '1' : '不明'}`)
        })
        
        if (earthquakeWithIntensity.points && earthquakeWithIntensity.points.length > 5) {
            console.log(`  ...他${earthquakeWithIntensity.points.length - 5}地点`)
        }
        
        // 市町村レベル地図データ変換テスト
        console.log('\n🗺️ 市町村レベル地図データ変換テスト:')
        const mapData = convertP2PDataToMapData(earthquakeWithIntensity)
        
        if (mapData && mapData.areaInfo.detailedAreas) {
            console.log('✅ 市町村レベル地図データ変換成功')
            console.log(`  震央: [${mapData.earthquakeData.longitude}, ${mapData.earthquakeData.latitude}]`)
            
            console.log('\n📍 市町村別震度分布詳細:')
            Object.entries(mapData.areaInfo.detailedAreas).forEach(([intensity, locations]) => {
                console.log(`  震度${intensity}: ${locations.length}地域`)
                locations.slice(0, 3).forEach(loc => {
                    console.log(`    - ${loc.fullAddress} [${loc.coordinates[0].toFixed(3)}, ${loc.coordinates[1].toFixed(3)}]`)
                })
                if (locations.length > 3) {
                    console.log(`    ...他${locations.length - 3}地域`)
                }
            })
            
            // 座標精度の検証
            console.log('\n🎯 座標精度検証:')
            let detailedCount = 0
            let prefectureCount = 0
            
            Object.values(mapData.areaInfo.detailedAreas).forEach(locations => {
                locations.forEach(loc => {
                    // 市町村レベルの座標かどうかを簡易判定
                    const coordStr = `${loc.coordinates[0]},${loc.coordinates[1]}`
                    if (loc.city && loc.city.trim() !== '') {
                        detailedCount++
                    } else {
                        prefectureCount++
                    }
                })
            })
            
            console.log(`  市町村レベル座標: ${detailedCount}地点`)
            console.log(`  都道府県レベル座標: ${prefectureCount}地点`)
            console.log(`  詳細化率: ${detailedCount > 0 ? ((detailedCount / (detailedCount + prefectureCount)) * 100).toFixed(1) : 0}%`)
            
        } else {
            console.log('❌ 市町村レベル地図データ変換失敗')
        }
        
        console.log('\n=== テスト完了 ===')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

// テスト実行
testMunicipalLevelMapping()
