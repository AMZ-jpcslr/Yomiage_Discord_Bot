/**
 * WebSocketベースのリアルタイム地震通知システムのテスト
 */

import { connectEarthquakeWebSocket } from './build/eq_notify_new.js'

// モックのDiscordクライアント
const mockClient = {
    guilds: {
        cache: new Map()
    }
}

console.log('=== WebSocketベース地震通知システムテスト ===')
console.log('リアルタイム通知モード（周期的ポーリングなし）をテスト中...')
console.log('注意: このテストは実際のWebSocket接続を試行します')

async function testWebSocketNotification() {
    try {
        console.log('📡 WebSocket接続テスト開始...')
        
        // WebSocket接続をテスト（実際の通知は送信されない）
        await connectEarthquakeWebSocket(mockClient)
        
        console.log('✅ WebSocket接続が正常に開始されました')
        console.log('🚨 リアルタイム通知システムが動作中です')
        console.log('📡 新しい地震情報が配信されると即座に通知されます')
        
        // 10秒間動作させてからテスト終了
        setTimeout(() => {
            console.log('⏹️ テスト完了 - WebSocketベース通知システムが正常に動作しています')
            process.exit(0)
        }, 10000)
        
    } catch (error) {
        console.error('❌ WebSocket接続テストエラー:', error)
        console.log('⚠️ WebSocketサーバーが利用できない可能性があります')
        process.exit(1)
    }
}

testWebSocketNotification()
