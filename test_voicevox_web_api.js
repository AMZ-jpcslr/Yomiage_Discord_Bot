/**
 * VoiceVox Web API テストスクリプト
 */

const VOICEVOX_WEB_API_URL = 'https://deprecatedapis.tts.quest/v2/voicevox/audio/'
const VOICEVOX_API_KEY = 'h4824358C3Q-122'

async function testVoiceVoxWebAPI() {
    try {
        console.log('🧪 VoiceVox Web API テスト開始...')
        
        // テスト用パラメータ
        const params = new URLSearchParams({
            text: 'こんにちは、VoiceVox Web APIのテストです。',
            speaker: '2', // 四国めたん（ノーマル）
            speed: '0.9',
            pitch: '0.02',
            intonationScale: '1.1',
            key: VOICEVOX_API_KEY
        })

        const url = `${VOICEVOX_WEB_API_URL}?${params.toString()}`
        console.log('📡 リクエストURL:', url.replace(VOICEVOX_API_KEY, '[API_KEY]'))
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Discord Bot VoiceVox Test'
            }
        })

        console.log('📊 レスポンス状況:', response.status, response.statusText)
        console.log('📋 レスポンスヘッダー:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ エラーレスポンス:', errorText)
            
            if (errorText.includes('invalidApiKey')) {
                console.error('🔑 無効なAPIキーです')
            } else if (errorText.includes('notEnoughPoints')) {
                console.error('📊 APIポイントが不足しています')
            } else if (errorText.includes('failed')) {
                console.error('🔧 音声合成に失敗しました')
            }
            
            return false
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer())
        console.log(`✅ 音声合成成功: ${audioBuffer.length}bytes`)
        
        // ファイルに保存してテスト
        const fs = require('fs')
        const testAudioPath = './test_voicevox_web_api.wav'
        fs.writeFileSync(testAudioPath, audioBuffer)
        console.log(`💾 テスト音声ファイル保存: ${testAudioPath}`)
        
        return true
        
    } catch (error) {
        console.error('❌ テスト中にエラー:', error)
        return false
    }
}

// スピーカー情報取得テスト
async function testSpeakersAPI() {
    try {
        console.log('🎭 スピーカー情報テスト開始...')
        
        const url = `https://deprecatedapis.tts.quest/v2/voicevox/speakers/?key=${VOICEVOX_API_KEY}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
            console.error('❌ スピーカー情報取得失敗:', response.status)
            return false
        }

        const speakers = await response.json()
        console.log('✅ スピーカー情報取得成功:')
        console.log(`📊 利用可能スピーカー数: ${speakers.length}`)
        
        // 最初の5個のスピーカーを表示
        speakers.slice(0, 5).forEach((speaker, index) => {
            console.log(`  ${index + 1}. ID: ${speaker.speaker_uuid || speaker.id}, Name: ${speaker.name}`)
        })
        
        return true
        
    } catch (error) {
        console.error('❌ スピーカー情報テスト中にエラー:', error)
        return false
    }
}

// メイン実行
async function runTests() {
    console.log('=== VoiceVox Web API テスト ===')
    console.log(`🔑 APIキー: ${VOICEVOX_API_KEY.substring(0, 8)}...`)
    console.log('')
    
    // スピーカー情報テスト
    const speakersResult = await testSpeakersAPI()
    console.log('')
    
    // 音声合成テスト
    const synthesisResult = await testVoiceVoxWebAPI()
    console.log('')
    
    console.log('=== テスト結果 ===')
    console.log(`🎭 スピーカー情報: ${speakersResult ? '✅ 成功' : '❌ 失敗'}`)
    console.log(`🎤 音声合成: ${synthesisResult ? '✅ 成功' : '❌ 失敗'}`)
    
    if (speakersResult && synthesisResult) {
        console.log('')
        console.log('🎉 すべてのテストが成功しました！')
        console.log('💡 VoiceVox Web API機能が正常に動作します。')
        console.log('🚀 /voice_web join コマンドで音声読み上げを開始できます。')
    } else {
        console.log('')
        console.log('⚠️ 一部またはすべてのテストが失敗しました。')
        console.log('🔧 APIキーや設定を確認してください。')
    }
}

runTests()
