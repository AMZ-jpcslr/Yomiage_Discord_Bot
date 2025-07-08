/**
 * 市町村・島レベル震度表示機能テスト
 */

console.log('🚀 スクリプト開始: 市町村・島レベル震度表示機能テスト')

const { fetchP2PQuakeData, convertP2PDataToMapData } = require('./build/utils/p2p_earthquake.js')
const { generateEarthquakeMap } = require('./build/utils/mapGenerator_new.js')

console.log('✅ モジュールインポート完了')
console.log('=== 市町村・島レベル震度表示機能テスト ===')

async function testMunicipalIntensityMapping() {
    try {
        console.log('🔍 P2P地震情報から最新データを取得中...')
        
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
        console.log(`  震源地: ${earthquakeWithIntensity.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${earthquakeWithIntensity.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${earthquakeWithIntensity.earthquake?.maxScale || '不明'}`)
        console.log(`  震度観測点数: ${earthquakeWithIntensity.points?.length || 0}`)
        
        // 島地域の検出テスト
        console.log('\n🏝️ 島地域の検出テスト:')
        let islandPoints = 0
        earthquakeWithIntensity.points?.forEach(point => {
            if (point.addr.includes('島') || 
                point.addr.includes('列島') || 
                point.addr.includes('諸島')) {
                console.log(`  🏝️ 島地域検出: ${point.pref} ${point.addr}`)
                islandPoints++
            }
        })
        console.log(`  検出された島地域: ${islandPoints}地点`)
        
        // 市町村レベル地図データ変換テスト
        console.log('\n🗺️ 市町村レベル地図データ変換テスト:')
        const mapData = convertP2PDataToMapData(earthquakeWithIntensity)
        
        if (mapData && mapData.areaInfo.detailedAreas) {
            console.log('✅ 市町村レベル地図データ変換成功')
            console.log(`  震央: [${mapData.earthquakeData.longitude}, ${mapData.earthquakeData.latitude}]`)
            
            console.log('\n📍 市町村別震度分布詳細:')
            Object.entries(mapData.areaInfo.detailedAreas).forEach(([intensity, locations]) => {
                console.log(`  震度${intensity}: ${locations.length}地域`)
                
                // 島地域の特別表示
                const islandLocations = locations.filter(loc => 
                    loc.fullAddress.includes('島') || 
                    loc.fullAddress.includes('列島') || 
                    loc.fullAddress.includes('諸島')
                )
                
                if (islandLocations.length > 0) {
                    console.log(`    🏝️ 島地域: ${islandLocations.length}箇所`)
                    islandLocations.slice(0, 3).forEach(loc => {
                        console.log(`      - 🏝️ ${loc.fullAddress} [${loc.coordinates[0].toFixed(3)}, ${loc.coordinates[1].toFixed(3)}]`)
                    })
                }
                
                // 通常の市町村表示
                const mainlandLocations = locations.filter(loc => 
                    !loc.fullAddress.includes('島') && 
                    !loc.fullAddress.includes('列島') && 
                    !loc.fullAddress.includes('諸島')
                )
                
                if (mainlandLocations.length > 0) {
                    console.log(`    🏘️ 市町村: ${mainlandLocations.length}箇所`)
                    mainlandLocations.slice(0, 2).forEach(loc => {
                        console.log(`      - ${loc.fullAddress} [${loc.coordinates[0].toFixed(3)}, ${loc.coordinates[1].toFixed(3)}]`)
                    })
                    if (mainlandLocations.length > 2) {
                        console.log(`      ...他${mainlandLocations.length - 2}箇所`)
                    }
                }
            })
            
            // 震度分布地図生成テスト
            console.log('\n🎨 震度分布地図生成テスト:')
            try {
                const mapPath = await generateEarthquakeMap(mapData.earthquakeData, mapData.areaInfo)
                
                if (mapPath) {
                    console.log('✅ 震度分布地図生成成功!')
                    console.log(`📁 保存先: ${mapPath}`)
                    console.log('\n🎯 改善された機能:')
                    console.log('  ✅ 市町村境界の震度に応じた色付け')
                    console.log('  ✅ 震度表示の視認性向上（太字・影付き）')
                    console.log('  ✅ 島地域の特別マーカー表示')
                    console.log('  ✅ 詳細な島・離島座標データベース使用')
                    
                    // 震度分布統計
                    console.log('\n📊 震度分布統計:')
                    Object.entries(mapData.areaInfo.areas).forEach(([intensity, coords]) => {
                        if (coords.length > 0) {
                            console.log(`  震度${intensity}: ${coords.length}地点`)
                        }
                    })
                    
                } else {
                    console.log('❌ 震度分布地図生成失敗')
                }
                
            } catch (mapError) {
                console.error('❌ 地図生成エラー:', mapError)
            }
            
        } else {
            console.log('❌ 市町村レベル地図データ変換失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

// テスト実行
testMunicipalIntensityMapping()
