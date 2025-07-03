/**
 * 新しい緊急地震速報通知システム（Wolfix API専用）
 */

import { Client, TextChannel } from 'discord.js'
import { processEarthquakeAlert } from './utils/earthquake_new'
import * as fs from 'fs'
import * as path from 'path'

interface EQChannelConfig {
    [guildId: string]: string
}

// 前回の通知データを保存するためのファイル
const LAST_NOTIFICATION_FILE = path.join(__dirname, '../../data/last_eew_notification.json')

interface LastNotificationData {
    eventId: string
    serial: number
    timestamp: number
}

/**
 * 前回の通知データを読み込み
 */
function loadLastNotificationData(): LastNotificationData | null {
    try {
        if (fs.existsSync(LAST_NOTIFICATION_FILE)) {
            const data = fs.readFileSync(LAST_NOTIFICATION_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('前回通知データの読み込みエラー:', error)
    }
    return null
}

/**
 * 通知データを保存
 */
function saveLastNotificationData(data: LastNotificationData): void {
    try {
        const dir = path.dirname(LAST_NOTIFICATION_FILE)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(LAST_NOTIFICATION_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('通知データの保存エラー:', error)
    }
}

/**
 * 通知チャンネル設定を読み込み
 */
function loadEQChannels(): EQChannelConfig {
    try {
        const channelsPath = path.join(__dirname, '../../data/eq_channels.json')
        if (fs.existsSync(channelsPath)) {
            const data = fs.readFileSync(channelsPath, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('チャンネル設定の読み込みエラー:', error)
    }
    return {}
}

/**
 * 重複通知チェック
 */
function isDuplicateNotification(eventId: string, serial: number): boolean {
    const lastData = loadLastNotificationData()
    
    if (!lastData) {
        return false  // 初回通知
    }
    
    // 同じイベントIDで同じかより古いシリアル番号の場合は重複
    if (lastData.eventId === eventId && lastData.serial >= serial) {
        console.log(`重複通知検出: EventID=${eventId}, Serial=${serial} (前回: ${lastData.serial})`)
        return true
    }
    
    // 5分以内の通知は重複とみなす（異なるイベントでも）
    const now = Date.now()
    if (now - lastData.timestamp < 5 * 60 * 1000) {
        console.log(`短時間重複通知検出: 前回から${Math.round((now - lastData.timestamp) / 1000)}秒`)
        return true
    }
    
    return false
}

/**
 * 緊急地震速報の監視と通知
 */
export async function monitorEarthquakeAlerts(client: Client): Promise<void> {
    console.log('=== 緊急地震速報監視開始 ===')
    
    const checkInterval = 2000  // 2秒間隔（リアルタイム監視）
    
    setInterval(async () => {
        try {
            const result = await processEarthquakeAlert()
            
            if (!result) {
                return  // 通知対象なし
            }
            
            const { embed, files, wolfixData } = result
            
            if (!wolfixData?.EventID) {
                console.log('EventIDが不明のため通知スキップ')
                return
            }
            
            // 重複チェック
            const serial = wolfixData.Serial || 1
            if (isDuplicateNotification(wolfixData.EventID, serial)) {
                return  // 重複通知はスキップ
            }
            
            console.log('=== 新しい緊急地震速報を検出 ===')
            console.log(`EventID: ${wolfixData.EventID}`)
            console.log(`シリアル: ${serial}`)
            console.log(`震源地: ${wolfixData.Hypocenter}`)
            console.log(`マグニチュード: M${wolfixData.Magunitude}`)
            console.log(`最大震度: ${wolfixData.MaxIntensity}`)
            
            // 通知送信
            const channels = loadEQChannels()
            let notificationsSent = 0
            
            for (const [guildId, channelId] of Object.entries(channels)) {
                try {
                    const guild = client.guilds.cache.get(guildId)
                    if (!guild) {
                        console.log(`ギルドが見つかりません: ${guildId}`)
                        continue
                    }
                    
                    const channel = guild.channels.cache.get(channelId) as TextChannel
                    if (!channel) {
                        console.log(`チャンネルが見つかりません: ${channelId}`)
                        continue
                    }
                    
                    if (channel.type !== 0) {  // TEXT_CHANNEL
                        console.log(`テキストチャンネルではありません: ${channelId}`)
                        continue
                    }
                    
                    await channel.send({
                        embeds: [embed],
                        files: files || []
                    })
                    
                    notificationsSent++
                    console.log(`✅ 通知送信成功: ${guild.name} #${channel.name}`)
                    
                } catch (channelError) {
                    console.error(`チャンネル通知エラー (${guildId}/${channelId}):`, channelError)
                }
            }
            
            // 通知データを保存
            saveLastNotificationData({
                eventId: wolfixData.EventID,
                serial: serial,
                timestamp: Date.now()
            })
            
            console.log(`✅ 緊急地震速報通知完了: ${notificationsSent}件送信`)
            
        } catch (error) {
            console.error('❌ 緊急地震速報監視エラー:', error)
        }
    }, checkInterval)
    
    console.log(`緊急地震速報監視設定完了 (${checkInterval}ms間隔)`)
}

/**
 * WebSocket接続による通知（将来実装用）
 */
export async function connectEarthquakeWebSocket(): Promise<void> {
    console.log('WebSocket接続は将来実装予定')
    // WebSocket API: wss://ws-api.wolfx.jp/jma_eew
    // 現在はHTTP APIのポーリングを使用
}
