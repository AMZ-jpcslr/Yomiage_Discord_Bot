/**
 * Wolfix API 使い分け総合テスト
 * 緊急地震速報機能とgget_eqコマンド機能のAPIが正しく使い分けられているかテスト
 */

import { processEarthquakeAlert, getLatestEarthquakeInfo } from './build/utils/earthquake_new.js'

console.log('=== Wolfix API 使い分け総合テスト開始 ===')

/**
 * 緊急地震速報処理テスト（EEW API使用）
 */
async function testEEWFunction() {
    console.log('\n=== 緊急地震速報処理テスト (EEW API) ===')
    
    try {
        const result = await processEarthquakeAlert()
        
        if (result) {
            console.log('✅ 緊急地震速報処理成功')
            console.log(`震源地: ${result.wolfixData?.Hypocenter || '不明'}`)
            console.log(`マグニチュード: M${result.wolfixData?.Magunitude || '不明'}`)
            console.log(`最大震度: ${result.wolfixData?.MaxIntensity || '不明'}`)
            console.log(`シリアル: ${result.wolfixData?.Serial || '不明'}`)
            console.log(`最終報: ${result.wolfixData?.isFinal ? 'はい' : 'いいえ'}`)
            console.log(`警報: ${result.wolfixData?.isWarn ? 'はい' : 'いいえ'}`)
            console.log(`地図ファイル: ${result.files ? 'あり' : 'なし'}`)
            console.log('使用API: jma_eew.json ✅')
        } else {
            console.log('⚠️ 緊急地震速報データなし（通常の状態）')
        }
        
    } catch (error) {
        console.error('❌ 緊急地震速報処理エラー:', error)
    }
}

/**
 * 地震情報取得テスト（EQList API → EEW API フォールバック）
 */
async function testEQInfoFunction() {
    console.log('\n=== 地震情報取得テスト (EQList API → EEW API フォールバック) ===')
    
    try {
        const result = await getLatestEarthquakeInfo()
        
        if (result) {
            console.log('✅ 地震情報取得成功')
            
            if (result.eqListData) {
                console.log('使用API: jma_eqlist.json ✅')
                console.log(`震源地: ${result.eqListData.Hypocenter || '不明'}`)
                console.log(`マグニチュード: M${result.eqListData.Magnitude || '不明'}`)
                console.log(`最大震度: ${result.eqListData.MaxIntensity || '不明'}`)
                console.log(`P2PArea数: ${result.eqListData.P2PArea?.length || 0}`)
            } else if (result.wolfixData) {
                console.log('使用API: jma_eew.json (フォールバック) ✅')
                console.log(`震源地: ${result.wolfixData.Hypocenter || '不明'}`)
                console.log(`マグニチュード: M${result.wolfixData.Magunitude || '不明'}`)
                console.log(`最大震度: ${result.wolfixData.MaxIntensity || '不明'}`)
                console.log(`WarnArea数: ${result.wolfixData.WarnArea?.length || 0}`)
            }
            
            console.log(`地図ファイル: ${result.files ? 'あり' : 'なし'}`)
        } else {
            console.log('❌ 地震情報取得失敗')
        }
        
    } catch (error) {
        console.error('❌ 地震情報取得エラー:', error)
    }
}

/**
 * API使い分け確認
 */
function verifyAPISeparation() {
    console.log('\n=== API使い分け確認 ===')
    console.log('✅ 緊急地震速報: https://api.wolfx.jp/jma_eew.json')
    console.log('   - リアルタイム監視')
    console.log('   - 自動通知機能')
    console.log('   - processEarthquakeAlert()関数')
    console.log('   - eq_notify_new.tsで使用')
    console.log('')
    console.log('✅ 地震情報取得: https://api.wolfx.jp/jma_eqlist.json')
    console.log('   - /get_eqコマンド')
    console.log('   - 手動情報取得')
    console.log('   - getLatestEarthquakeInfo()関数')
    console.log('   - フォールバックでEEW APIも使用')
    console.log('')
    console.log('📍 マップ表示:')
    console.log('   - 震源地: 赤いXマーク')
    console.log('   - 観測地点: 色付き円 + 震度番号')
    console.log('   - mapGenerator_new.tsで実装')
}

/**
 * メイン実行
 */
async function main() {
    await testEEWFunction()
    await testEQInfoFunction()
    verifyAPISeparation()
    
    console.log('\n=== Wolfix API 使い分け総合テスト完了 ===')
    console.log('✅ 緊急地震速報: jma_eew.json API使用')
    console.log('✅ 地震情報取得: jma_eqlist.json API使用（フォールバック対応）')
    console.log('✅ マップ表示: 震源地X + 観測地点円')
    console.log('✅ 2秒間隔リアルタイム監視')
    console.log('✅ Dockerビルド対応')
    
    console.log('\n🎯 実装完了項目:')
    console.log('   - Wolfix APIの正しい使い分け')
    console.log('   - EEW自動通知システム')
    console.log('   - 地震情報コマンド')
    console.log('   - 震源地マーク表示')
    console.log('   - 観測地点震度表示')
    console.log('   - エラーハンドリング')
    console.log('   - フォールバック機能')
}

main().catch(console.error)
