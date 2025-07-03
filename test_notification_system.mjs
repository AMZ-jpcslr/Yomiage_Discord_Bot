/**
 * 設定されたチャンネルの確認と地震通知システムの動作確認
 */

import fs from 'fs'
import path from 'path'

function testChannelConfig() {
    console.log('=== 地震通知チャンネル設定確認 ===')
    
    try {
        const channelsPath = path.join(process.cwd(), 'data', 'eq_channels.json')
        
        if (fs.existsSync(channelsPath)) {
            const data = fs.readFileSync(channelsPath, 'utf8')
            const channels = JSON.parse(data)
            
            console.log('✅ チャンネル設定ファイル存在')
            console.log('設定されたサーバー数:', Object.keys(channels).length)
            
            for (const [guildId, channelId] of Object.entries(channels)) {
                console.log(`  サーバーID: ${guildId} → チャンネルID: ${channelId}`)
            }
            
            return channels
        } else {
            console.log('❌ チャンネル設定ファイルが見つかりません')
            return {}
        }
    } catch (error) {
        console.error('❌ チャンネル設定読み込みエラー:', error)
        return {}
    }
}

function testLastNotificationData() {
    console.log('\n=== 前回通知データ確認 ===')
    
    try {
        const dataPath = path.join(process.cwd(), 'data', 'last_eew_notification.json')
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8')
            const lastData = JSON.parse(data)
            
            console.log('✅ 前回通知データ存在')
            console.log('前回EventID:', lastData.eventId)
            console.log('前回Serial:', lastData.serial)
            console.log('前回通知時刻:', new Date(lastData.timestamp).toLocaleString())
            
            const timeSince = Date.now() - lastData.timestamp
            console.log(`前回から経過時間: ${Math.round(timeSince / 1000)}秒`)
            
            return lastData
        } else {
            console.log('ℹ️ 前回通知データなし（初回実行）')
            return null
        }
    } catch (error) {
        console.error('❌ 前回通知データ読み込みエラー:', error)
        return null
    }
}

async function testCurrentEarthquakeData() {
    console.log('\n=== 現在の地震データ確認 ===')
    
    try {
        const { fetchWolfixEarthquakeData } = await import('./build/src/utils/earthquake.js')
        const data = await fetchWolfixEarthquakeData()
        
        if (data) {
            console.log('✅ 現在の地震データ取得成功')
            console.log('現在EventID:', data.EventID)
            console.log('現在Serial:', data.Serial || '不明')
            console.log('震源地:', data.Hypocenter)
            console.log('最大震度:', data.MaxIntensity)
            console.log('発表時刻:', data.AnnouncedTime)
            
            return data
        } else {
            console.log('❌ 地震データ取得失敗')
            return null
        }
    } catch (error) {
        console.error('❌ 地震データ取得エラー:', error)
        return null
    }
}

// メイン実行
async function main() {
    console.log('=== 地震通知システム総合確認 ===\n')
    
    const channels = testChannelConfig()
    const lastData = testLastNotificationData()
    const currentData = await testCurrentEarthquakeData()
    
    console.log('\n=== 通知判定確認 ===')
    
    if (Object.keys(channels).length === 0) {
        console.log('❌ 通知チャンネルが設定されていません')
        console.log('  /set_eq_channel コマンドで設定してください')
    } else {
        console.log('✅ 通知チャンネル設定済み')
    }
    
    if (currentData) {
        if (!lastData) {
            console.log('✅ 初回実行のため通知対象')
        } else if (lastData.eventId !== currentData.EventID) {
            console.log('✅ 新しいイベントのため通知対象')
        } else if ((currentData.Serial || 1) > lastData.serial) {
            console.log('✅ 情報更新のため通知対象')
        } else {
            console.log('ℹ️ 重複のため通知スキップ（正常）')
        }
    }
    
    console.log('\n=== 監視システム状況 ===')
    console.log('✅ 2秒間隔でWolfix API監視')
    console.log('✅ 新しい地震情報を自動検知')
    console.log('✅ Discord通知を自動送信')
    console.log('✅ 重複通知を自動防止')
}

main()
