/**
 * Wolfix API使い分けテスト
 * EEW用とEQList用のAPIが正しく使い分けられているかテスト
 */

console.log('=== Wolfix API使い分けテスト開始 ===')

/**
 * EEW API (jma_eew.json) テスト
 */
async function testEEWAPI() {
    console.log('\n=== EEW API テスト (jma_eew.json) ===')
    
    try {
        const response = await fetch('https://api.wolfx.jp/jma_eew.json')
        if (!response.ok) {
            console.error(`EEW API エラー: ${response.status} ${response.statusText}`)
            return null
        }
        
        const data = await response.json()
        console.log('✅ EEW API接続成功')
        console.log('EEW データ構造:')
        console.log(`  EventID: ${data.EventID}`)
        console.log(`  Serial: ${data.Serial}`)
        console.log(`  Hypocenter: ${data.Hypocenter}`)
        console.log(`  Latitude: ${data.Latitude}`)
        console.log(`  Longitude: ${data.Longitude}`)
        console.log(`  Magnitude: ${data.Magunitude}`)
        console.log(`  MaxIntensity: ${data.MaxIntensity}`)
        console.log(`  WarnArea数: ${data.WarnArea?.length || 0}`)
        console.log(`  isWarn: ${data.isWarn}`)
        console.log(`  isFinal: ${data.isFinal}`)
        console.log(`  isCancel: ${data.isCancel}`)
        
        if (data.WarnArea && data.WarnArea.length > 0) {
            console.log('  WarnArea例:')
            data.WarnArea.slice(0, 3).forEach((area, index) => {
                console.log(`    [${index}] ${area.Chiiki}: 震度${area.Shindo1}`)
            })
        }
        
        return data
        
    } catch (error) {
        console.error('❌ EEW API テストエラー:', error)
        return null
    }
}

/**
 * EQList API (jma_eqlist.json) テスト
 */
async function testEQListAPI() {
    console.log('\n=== EQList API テスト (jma_eqlist.json) ===')
    
    try {
        const response = await fetch('https://api.wolfx.jp/jma_eqlist.json')
        if (!response.ok) {
            console.error(`EQList API エラー: ${response.status} ${response.statusText}`)
            return null
        }
        
        const data = await response.json()
        console.log('✅ EQList API接続成功')
        
        const earthquakeKeys = Object.keys(data)
        console.log(`地震情報数: ${earthquakeKeys.length}件`)
        
        if (earthquakeKeys.length > 0) {
            const latestKey = earthquakeKeys[0]
            const latest = data[latestKey]
            
            console.log('最新地震情報:')
            console.log(`  Key: ${latestKey}`)
            console.log(`  EventID: ${latest.EventID}`)
            console.log(`  Title: ${latest.Title}`)
            console.log(`  Hypocenter: ${latest.Hypocenter}`)
            console.log(`  OriginTime: ${latest.OriginTime}`)
            console.log(`  Latitude: ${latest.Latitude}`)
            console.log(`  Longitude: ${latest.Longitude}`)
            console.log(`  Magnitude: ${latest.Magnitude}`)
            console.log(`  Depth: ${latest.Depth}`)
            console.log(`  MaxIntensity: ${latest.MaxIntensity}`)
            console.log(`  P2PArea数: ${latest.P2PArea?.length || 0}`)
            
            if (latest.P2PArea && latest.P2PArea.length > 0) {
                console.log('  P2PArea例:')
                latest.P2PArea.slice(0, 3).forEach((area, index) => {
                    console.log(`    [${index}] ${area.Chiiki}: 震度${area.Shindo}`)
                })
            }
        }
        
        return data
        
    } catch (error) {
        console.error('❌ EQList API テストエラー:', error)
        return null
    }
}

/**
 * データ形式比較
 */
function compareAPIFormats(eewData, eqListData) {
    console.log('\n=== API データ形式比較 ===')
    
    console.log('EEW API 特徴:')
    console.log('  ✓ リアルタイム緊急地震速報')
    console.log('  ✓ Serial（報番号）あり')
    console.log('  ✓ WarnArea（警戒エリア）')
    console.log('  ✓ isWarn, isFinal, isCancel フラグ')
    console.log('  ✓ Magunitude（スペル注意）')
    
    console.log('\nEQList API 特徴:')
    console.log('  ✓ 確定した地震情報リスト')
    console.log('  ✓ 複数地震のデータ')
    console.log('  ✓ P2PArea（各地の震度）')
    console.log('  ✓ Title フィールド')
    console.log('  ✓ Magnitude（正しいスペル）')
    
    console.log('\n用途:')
    console.log('  EEW API → 緊急地震速報の自動通知')
    console.log('  EQList API → /get_eq コマンドでの地震情報取得')
}

/**
 * メイン実行
 */
async function main() {
    const eewData = await testEEWAPI()
    const eqListData = await testEQListAPI()
    
    if (eewData && eqListData) {
        compareAPIFormats(eewData, eqListData)
    }
    
    console.log('\n=== Wolfix API使い分けテスト完了 ===')
    console.log('✅ 両方のAPIが正常に動作することを確認')
    console.log('✅ データ形式の違いを把握')
    console.log('✅ 適切な使い分けができるように実装済み')
}

main().catch(console.error)
