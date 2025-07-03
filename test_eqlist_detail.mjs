/**
 * EQList API詳細テスト
 */

console.log('=== EQList API詳細テスト ===')

async function testEQListDetail() {
    try {
        const response = await fetch('https://api.wolfx.jp/jma_eqlist.json')
        const data = await response.json()
        
        console.log(`地震情報総数: ${Object.keys(data).length}件`)
        
        // 全ての地震情報をチェックして、データがあるものを探す
        for (const [key, earthquake] of Object.entries(data)) {
            console.log(`\n--- ${key} ---`)
            console.log(`  EventID: ${earthquake.EventID}`)
            console.log(`  Title: ${earthquake.Title}`)
            console.log(`  Hypocenter: ${earthquake.Hypocenter}`)
            console.log(`  OriginTime: ${earthquake.OriginTime}`)
            console.log(`  Magnitude: ${earthquake.Magnitude}`)
            console.log(`  MaxIntensity: ${earthquake.MaxIntensity}`)
            console.log(`  P2PArea数: ${earthquake.P2PArea?.length || 0}`)
            
            // データがある場合は詳細を表示
            if (earthquake.Hypocenter && earthquake.Magnitude) {
                console.log('  ✅ 完全なデータ')
                
                if (earthquake.P2PArea && earthquake.P2PArea.length > 0) {
                    console.log('  P2PArea詳細:')
                    earthquake.P2PArea.slice(0, 5).forEach((area, index) => {
                        console.log(`    ${index + 1}. ${area.Chiiki}: 震度${area.Shindo}`)
                    })
                }
                
                break  // 最初の完全なデータで停止
            } else {
                console.log('  ⚠️ 不完全なデータ')
            }
        }
        
    } catch (error) {
        console.error('エラー:', error)
    }
}

testEQListDetail()
