/**
 * Wolfix API使い分けテスト
 */

async function testAPIUsage() {
    console.log('=== Wolfix API使い分けテスト ===\n')
    
    try {
        const {
            fetchWolfixEarthquakeData,     // 緊急地震速報API
            fetchWolfixEarthquakeList,     // 地震情報API
            getLatestEarthquakeInfo,       // コマンド用（地震情報API使用）
            processEarthquakeAlert         // 緊急地震速報監視用（緊急地震速報API使用）
        } = await import('./build/src/utils/earthquake.js')
        
        console.log('1. 緊急地震速報API (jma_eew.json) テスト')
        console.log('   用途: リアルタイム監視、自動通知')
        const eewData = await fetchWolfixEarthquakeData()
        
        if (eewData) {
            console.log('   ✅ 緊急地震速報API 接続成功')
            console.log(`   EventID: ${eewData.EventID}`)
            console.log(`   震源地: ${eewData.Hypocenter}`)
            console.log(`   最大震度: ${eewData.MaxIntensity}`)
            console.log(`   WarnArea数: ${eewData.WarnArea?.length || 0}`)
            console.log(`   isFinal: ${eewData.isFinal}`)
            console.log(`   Serial: ${eewData.Serial}`)
        } else {
            console.log('   ❌ 緊急地震速報API 接続失敗')
        }
        
        console.log('\n2. 地震情報API (jma_eqlist.json) テスト')
        console.log('   用途: コマンド実行時の地震情報取得')
        const eqListData = await fetchWolfixEarthquakeList()
        
        if (eqListData) {
            console.log('   ✅ 地震情報API 接続成功')
            console.log(`   発表時刻: ${eqListData.result?.issue?.time}`)
            console.log(`   震源地: ${eqListData.result?.earthquake?.hypocenter?.name}`)
            console.log(`   最大震度: ${eqListData.result?.earthquake?.maxScale}`)
            console.log(`   観測点数: ${eqListData.result?.points?.length || 0}`)
            console.log(`   座標: ${eqListData.result?.earthquake?.hypocenter?.latitude}°N, ${eqListData.result?.earthquake?.hypocenter?.longitude}°E`)
        } else {
            console.log('   ❌ 地震情報API 接続失敗')
        }
        
        console.log('\n3. /get_eq コマンド処理テスト（地震情報API使用）')
        const commandResult = await getLatestEarthquakeInfo()
        
        if (commandResult) {
            console.log('   ✅ コマンド処理成功')
            console.log('   埋め込みタイトル:', commandResult.embed.data.title)
            console.log('   サムネイル:', commandResult.embed.data.thumbnail?.url ? '設定済み' : 'なし')
            console.log('   添付ファイル数:', commandResult.files?.length || 0)
            console.log('   フッター:', commandResult.embed.data.footer?.text)
        } else {
            console.log('   ❌ コマンド処理失敗')
        }
        
        console.log('\n4. 緊急地震速報監視処理テスト（緊急地震速報API使用）')
        const alertResult = await processEarthquakeAlert()
        
        if (alertResult) {
            console.log('   ✅ 緊急地震速報処理成功')
            console.log('   埋め込みタイトル:', alertResult.embed.data.title)
            console.log('   通知対象イベント:', alertResult.wolfixData?.EventID)
        } else {
            console.log('   ℹ️ 通知対象の緊急地震速報なし（正常）')
        }
        
        console.log('\n=== API使い分け確認完了 ===')
        console.log('✅ 緊急地震速報監視: jma_eew.json')
        console.log('✅ 地震情報コマンド: jma_eqlist.json')
        console.log('✅ 各APIに適した処理ロジック実装完了')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testAPIUsage()
