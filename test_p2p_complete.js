// Comprehensive P2P conversion test
const { convertP2PtoJMAFormat, extractEarthquakeMapData } = require('./build/utils/earthquake.js')

console.log('=== P2P地震情報完全テスト ===')

// Mock P2P data with areas (realistic structure)
const mockP2PData = {
    code: 551,
    created_at: '2024-01-01T12:00:00Z',
    earthquake: {
        hypocenter: {
            name: '福島県沖',
            depth: 40
        },
        magnitude: 6.2
    },
    areas: [
        {
            name: '福島県',
            scaleFrom: 40,
            scaleTo: 50
        },
        {
            name: '宮城県', 
            scaleFrom: 30,
            scaleTo: 40
        }
    ],
    maxScale: 50
}

console.log('1. 入力P2Pデータ:')
console.log(JSON.stringify(mockP2PData, null, 2))

try {
    // Step 1: Convert P2P to JMA format
    console.log('\n2. P2P→JMA変換実行...')
    const jmaFormat = convertP2PtoJMAFormat(mockP2PData)
    
    console.log('3. JMA変換結果:')
    console.log(JSON.stringify(jmaFormat, null, 2))
    
    // Step 2: Extract map data from JMA format
    console.log('\n4. 地図データ抽出実行...')
    const { earthquakeData, areaInfo } = extractEarthquakeMapData(jmaFormat)
    
    console.log('5. 抽出された地震データ:')
    console.log(JSON.stringify(earthquakeData, null, 2))
    
    console.log('6. 抽出された地域情報:')
    console.log(JSON.stringify(areaInfo, null, 2))
    
    console.log('\n7. 震度マップ構造:')
    Object.keys(areaInfo.areas).forEach(intensity => {
        console.log(`  震度${intensity}: ${areaInfo.areas[intensity].length}箇所`)
        areaInfo.areas[intensity].forEach(coord => {
            console.log(`    [${coord[0]}, ${coord[1]}]`)
        })
    })
    
} catch (error) {
    console.error('❌ テスト失敗:', error)
    console.error(error.stack)
}
