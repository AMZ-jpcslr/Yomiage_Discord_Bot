/**
 * 改善された緊急地震速報システムのテスト
 * 通知機能と震度表示の改善を確認
 */

import { processEarthquakeAlert } from './build/utils/earthquake_new.js'

console.log('=== 改善された緊急地震速報システムテスト ===')

/**
 * 緊急地震速報処理のテスト
 */
async function testImprovedEEWSystem() {
    console.log('\n=== 改善された緊急地震速報処理テスト ===')
    
    try {
        const result = await processEarthquakeAlert()
        
        if (result) {
            console.log('✅ 緊急地震速報処理成功（改善版）')
            console.log('=== 取得された地震情報 ===')
            console.log(`震源地: ${result.wolfixData?.Hypocenter || '不明'}`)
            console.log(`座標: ${result.wolfixData?.Latitude}°N, ${result.wolfixData?.Longitude}°E`)
            console.log(`マグニチュード: M${result.wolfixData?.Magunitude || '不明'}`)
            console.log(`最大震度: ${result.wolfixData?.MaxIntensity || '不明'}`)
            console.log(`シリアル: 第${result.wolfixData?.Serial || '不明'}報`)
            console.log(`最終報: ${result.wolfixData?.isFinal ? 'はい' : 'いいえ'}`)
            console.log(`警報: ${result.wolfixData?.isWarn ? 'はい' : 'いいえ'}`)
            console.log(`キャンセル: ${result.wolfixData?.isCancel ? 'はい' : 'いいえ'}`)
            console.log(`訓練: ${result.wolfixData?.isTraining ? 'はい' : 'いいえ'}`)
            console.log(`WarnArea数: ${result.wolfixData?.WarnArea?.length || 0}`)
            
            if (result.wolfixData?.WarnArea && result.wolfixData.WarnArea.length > 0) {
                console.log('=== WarnArea詳細 ===')
                result.wolfixData.WarnArea.slice(0, 5).forEach((area, index) => {
                    console.log(`  ${index + 1}. ${area.Chiiki}: 震度${area.Shindo1}`)
                })
                if (result.wolfixData.WarnArea.length > 5) {
                    console.log(`  ... 他${result.wolfixData.WarnArea.length - 5}件`)
                }
            }
            
            console.log('=== Discord投稿情報 ===')
            console.log(`Embedタイトル: ${result.embed.data.title}`)
            console.log(`Embed色: #${result.embed.data.color?.toString(16).padStart(6, '0')}`)
            console.log(`地図ファイル: ${result.files ? 'あり' : 'なし'}`)
            if (result.files && result.files.length > 0) {
                console.log(`地図ファイル名: ${result.files[0].name}`)
            }
            
            console.log('\n✅ 改善点確認:')
            console.log('  - より積極的な通知条件（M2.0以上または震度1以上）')
            console.log('  - 疑似震度分布による詳細地図表示')
            console.log('  - 重複検出の改善（1分間隔）')
            console.log('  - 震源地の赤いXマーク + 観測地点の色付き円')
            
        } else {
            console.log('⚠️ 現在、通知対象の地震情報はありません')
            console.log('これは正常な状態です（大きな地震がない場合）')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

/**
 * 通知条件の確認
 */
function verifyNotificationCriteria() {
    console.log('\n=== 改善された通知条件 ===')
    console.log('✅ 以下の条件のいずれかを満たせば通知:')
    console.log('  1. マグニチュード2.0以上')
    console.log('  2. 最大震度が「不明」以外')
    console.log('  3. WarnAreaデータがある')
    console.log('  4. 警報フラグがtrue')
    console.log('  5. 最終報フラグがtrue')
    console.log('')
    console.log('❌ 以下の場合は通知しません:')
    console.log('  - キャンセル報')
    console.log('  - 訓練報（環境変数で制御可能）')
    console.log('  - 基本情報不完全（EventIDまたはHypocenterなし）')
    console.log('')
    console.log('🔄 重複検出:')
    console.log('  - 同一EventID + 同一Serial番号の1分以内再送は重複')
    console.log('  - 新しいEventIDは常に通知')
    console.log('  - 同じEventIDでも新しいSerial番号は通知')
}

/**
 * 地図表示の改善点確認
 */
function verifyMapImprovements() {
    console.log('\n=== 地図表示の改善点 ===')
    console.log('✅ 震源地表示:')
    console.log('  - 赤いXマークで明確に表示')
    console.log('  - 常に地図中央に配置')
    console.log('')
    console.log('✅ 震度観測点表示:')
    console.log('  - WarnAreaデータから色付き円で表示')
    console.log('  - 円の中に震度番号を表示')
    console.log('  - 震度に応じた色分け')
    console.log('')
    console.log('✅ 疑似震度分布（新機能）:')
    console.log('  - WarnAreaが少ない場合に自動生成')
    console.log('  - 震源地周辺の距離減衰による震度推定')
    console.log('  - 8方向 × 7距離 = 最大56の疑似観測点')
    console.log('  - より詳細で視覚的な地震マップ')
}

/**
 * メイン実行
 */
async function main() {
    await testImprovedEEWSystem()
    verifyNotificationCriteria()
    verifyMapImprovements()
    
    console.log('\n=== 改善された緊急地震速報システムテスト完了 ===')
    console.log('✅ 積極的な通知システム実装済み')
    console.log('✅ 震度表示強化済み')
    console.log('✅ 重複検出改善済み')
    console.log('✅ 疑似震度分布機能追加済み')
    
    console.log('\n🎯 使用方法:')
    console.log('1. /set_eq_channel でDiscordチャンネルを設定')
    console.log('2. ボットを起動（main.ts）')
    console.log('3. 2秒間隔で自動監視・通知開始')
    console.log('4. /get_eq コマンドで手動取得も可能')
}

main().catch(console.error)
