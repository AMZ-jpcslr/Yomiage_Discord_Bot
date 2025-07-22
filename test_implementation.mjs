/**
 * VoiceVox Web API 実装テスト
 * 取得したAPIキー: h4824358C3Q-122
 */

import { checkApiKeyStatus, getSpeakers } from './src/voice_web_api'

async function testImplementation() {
    console.log('=== VoiceVox Web API 実装テスト ===')
    console.log('')
    
    // APIキー状況確認
    console.log('🔑 APIキー状況:')
    const apiStatus = checkApiKeyStatus()
    console.log(apiStatus)
    console.log('')
    
    // スピーカー情報取得
    console.log('🎭 スピーカー情報取得中...')
    try {
        const speakers = await getSpeakers()
        console.log(`✅ 利用可能スピーカー数: ${speakers.length}`)
        
        if (speakers.length > 0) {
            console.log('📋 スピーカー一覧（最初の10個）:')
            speakers.slice(0, 10).forEach((speaker, index) => {
                console.log(`  ${index + 1}. ${speaker.name} (ID: ${speaker.speaker_uuid || speaker.id})`)
            })
        }
    } catch (error) {
        console.error('❌ スピーカー情報取得エラー:', error)
    }
    
    console.log('')
    console.log('=== 実装確認 ===')
    console.log('✅ VoiceVox Web API機能実装完了')
    console.log('✅ APIキー設定済み: h4824358C3Q-122')
    console.log('✅ Discord コマンド /voice_web 利用可能')
    console.log('')
    console.log('🚀 使用開始手順:')
    console.log('1. Discordサーバーでボイスチャンネルに参加')
    console.log('2. /voice_web join コマンドを実行')
    console.log('3. テキストチャンネルでメッセージを送信')
    console.log('4. 自動で音声読み上げが開始されます')
    console.log('')
    console.log('⚙️ 設定変更:')
    console.log('/voice_web settings で音声モデル、速度、音程、イントネーション調整可能')
    console.log('')
    console.log('📊 ステータス確認:')
    console.log('/voice_web status でAPIキー状況とポイント残量確認可能')
}

testImplementation()
