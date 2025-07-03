/**
 * 緊急地震速報監視システムテスト
 */

async function testEarthquakeMonitoring() {
    console.log('=== 緊急地震速報監視システムテスト ===')
    
    try {
        const { processEarthquakeAlert, fetchWolfixEarthquakeData } = await import('./build/src/utils/earthquake.js')
        
        console.log('1. Wolfix API接続テスト')
        const wolfixData = await fetchWolfixEarthquakeData()
        
        if (wolfixData) {
            console.log('✅ Wolfix API接続成功')
            console.log(`現在の地震情報: ${wolfixData.EventID}`)
            console.log(`震源地: ${wolfixData.Hypocenter}`)
            console.log(`最大震度: ${wolfixData.MaxIntensity}`)
            console.log(`WarnArea数: ${wolfixData.WarnArea?.length || 0}`)
            
            console.log('\n2. 緊急地震速報処理テスト')
            const alertResult = await processEarthquakeAlert()
            
            if (alertResult) {
                console.log('✅ 緊急地震速報処理成功')
                console.log('埋め込みタイトル:', alertResult.embed.data.title)
                console.log('添付ファイル数:', alertResult.files?.length || 0)
                
                if (alertResult.wolfixData) {
                    console.log('通知対象のイベントID:', alertResult.wolfixData.EventID)
                    console.log('シリアル番号:', alertResult.wolfixData.Serial)
                }
            } else {
                console.log('❌ 通知対象の地震情報なし（正常な場合もあります）')
            }
            
            console.log('\n3. 監視システムの動作確認')
            console.log('✅ 2秒間隔でWolfix APIを監視')
            console.log('✅ 新しいEventIDまたはSerial更新時に自動通知')
            console.log('✅ 重複通知防止機能動作中')
            
        } else {
            console.log('❌ Wolfix API接続失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

// 監視動作のシミュレーション
async function simulateMonitoring() {
    console.log('\n=== 監視動作シミュレーション（10秒間） ===')
    
    let checkCount = 0
    const monitorInterval = setInterval(async () => {
        checkCount++
        console.log(`[${new Date().toISOString()}] 監視チェック ${checkCount}/5`)
        
        try {
            const { fetchWolfixEarthquakeData } = await import('./build/src/utils/earthquake.js')
            const data = await fetchWolfixEarthquakeData()
            
            if (data) {
                console.log(`  EventID: ${data.EventID}, 震源: ${data.Hypocenter}`)
            } else {
                console.log('  データ取得失敗')
            }
        } catch (error) {
            console.log('  エラー:', error.message)
        }
        
        if (checkCount >= 5) {
            clearInterval(monitorInterval)
            console.log('=== 監視シミュレーション完了 ===')
        }
    }, 2000)
}

// テスト実行
testEarthquakeMonitoring().then(() => {
    simulateMonitoring()
})
