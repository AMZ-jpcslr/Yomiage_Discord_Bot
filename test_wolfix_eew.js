// Wolfix EEW統合テスト
import { processWolfixEEW } from './src/utils/earthquake'

async function testWolfixEEW() {
    console.log('=== Wolfix EEW統合テスト開始 ===')
    
    try {
        const result = await processWolfixEEW()
        
        if (!result) {
            console.log('❌ 結果なし（エラーまたはスキップ条件）')
            return
        }
        
        const { embed, files, mapGenerated, eewData } = result
        
        console.log('✅ 処理成功!')
        console.log('タイトル:', embed.data.title || '未設定')
        console.log('説明:', embed.data.description || '未設定')
        console.log('地図生成:', mapGenerated ? '成功' : '失敗')
        console.log('ファイル数:', files?.length || 0)
        console.log('イベントID:', eewData?.EventID || '不明')
        console.log('震源地:', eewData?.Hypocenter || '不明')
        console.log('マグニチュード:', eewData?.Magunitude || '不明')
        console.log('最大震度:', eewData?.MaxIntensity || '不明')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
    
    console.log('=== Wolfix EEWテスト完了 ===')
}

testWolfixEEW()
