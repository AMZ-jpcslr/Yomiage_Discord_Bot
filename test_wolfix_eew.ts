// Wolfix EEW統合テスト
import { processEarthquakeAlert } from './src/utils/earthquake'

async function testWolfixEEW() {
    console.log('=== Wolfix EEW統合テスト開始 ===')
    
    try {
        const result = await processEarthquakeAlert()
        
        if (!result) {
            console.log('❌ 結果なし（エラーまたはスキップ条件）')
            return
        }
        
        const { embed, files, wolfixData } = result
        
        console.log('✅ 処理成功!')
        console.log('タイトル:', embed.data.title || '未設定')
        console.log('説明:', embed.data.description || '未設定')
        console.log('地図生成:', files && files.length > 0 ? '成功' : '失敗')
        console.log('ファイル数:', files?.length || 0)
        console.log('イベントID:', wolfixData?.EventID || '不明')
        console.log('震源地:', wolfixData?.Hypocenter || '不明')
        console.log('マグニチュード:', wolfixData?.Magunitude || '不明')
        console.log('最大震度:', wolfixData?.MaxIntensity || '不明')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
    
    console.log('=== Wolfix EEWテスト完了 ===')
}

testWolfixEEW()
