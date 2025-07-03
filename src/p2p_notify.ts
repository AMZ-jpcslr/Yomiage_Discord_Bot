/**
 * P2P地震情報APIベースの地震通知システム
 */

import { Client, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { fetchP2PQuakeData, convertP2PDataToMapData, createP2PEarthquakeEmbed, P2PQuakeData } from './utils/p2p_earthquake'
import { generateEarthquakeMap } from './utils/mapGenerator_new'
import * as fs from 'fs'
import * as path from 'path'

interface EQChannelConfig {
    [guildId: string]: string
}

// 前回の通知データを保存するためのファイル
const LAST_NOTIFICATION_FILE = path.join(__dirname, '../../data/last_p2p_notification.json')

interface LastNotificationData {
    id: string
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
function isDuplicateNotification(id: string): boolean {
    const lastData = loadLastNotificationData()
    
    if (!lastData) {
        console.log('初回通知: 通知を送信します')
        return false
    }
    
    // 異なるIDの場合は常に通知
    if (lastData.id !== id) {
        console.log(`新しい地震情報検出: ${id} (前回: ${lastData.id})`)
        return false
    }
    
    // 同じIDの場合は重複
    const now = Date.now()
    const timeDiff = now - lastData.timestamp
    
    // 1分以内の同一通知は重複
    if (timeDiff < 60 * 1000) {
        console.log(`重複通知検出: 同一データを${Math.round(timeDiff / 1000)}秒前に送信済み`)
        return true
    } else {
        // 1分以上経過していれば再通知
        console.log(`時間経過により再通知: ${Math.round(timeDiff / 1000)}秒経過`)
        return false
    }
}

/**
 * P2P地震情報通知を送信する共通関数
 */
async function sendP2PEarthquakeNotification(client: Client, embed: EmbedBuilder, files: AttachmentBuilder[] | undefined, p2pData: P2PQuakeData): Promise<void> {
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
        id: p2pData.id,
        timestamp: Date.now()
    })
    
    console.log(`✅ P2P地震情報通知完了: ${notificationsSent}件送信`)
}

/**
 * P2P地震情報WebSocketベースの監視と通知
 */
export async function monitorP2PEarthquakeAlerts(client: Client): Promise<void> {
    console.log('=== P2P地震情報WebSocket監視開始 ===')
    console.log('📡 リアルタイム通知モード: P2P地震情報API使用')
    
    try {
        // WebSocket接続を試行
        console.log('🔌 P2P地震情報WebSocket接続を試行中...')
        await connectP2PEarthquakeWebSocket(client)
        
    } catch (error) {
        console.error('❌ P2P地震情報WebSocket監視エラー:', error)
        console.log('⚠️ WebSocket接続失敗: HTTPポーリングにフォールバック')
        await fallbackP2PHttpPolling(client)
    }
}

/**
 * P2P地震情報WebSocket接続
 */
async function connectP2PEarthquakeWebSocket(client: Client): Promise<void> {
    console.log('=== P2P地震情報WebSocket接続開始 ===')
    
    try {
        const WebSocket = await import('ws')
        const ws = new WebSocket.default('wss://api.p2pquake.net/v2/ws')
        
        ws.on('open', () => {
            console.log('✅ P2P地震情報WebSocket接続成功: wss://api.p2pquake.net/v2/ws')
            console.log('📡 リアルタイム地震情報の受信を開始しました')
        })
        
        ws.on('message', async (data: Buffer) => {
            try {
                const message = data.toString()
                console.log('📨 P2PWebSocketメッセージ受信:', message.substring(0, 100) + '...')
                
                const earthquakeData = JSON.parse(message) as P2PQuakeData
                
                // 地震情報のコードチェック (551: 震度速報, 552: 震源・震度情報)
                if (earthquakeData.code !== 551 && earthquakeData.code !== 552) {
                    console.log('⚠️ 地震情報以外のデータを受信 - スキップ')
                    return
                }
                
                if (!earthquakeData.id || !earthquakeData.earthquake) {
                    console.log('⚠️ 不完全な地震データを受信 - スキップ')
                    return
                }
                
                console.log('🚨 新しい地震情報をP2PWebSocketで受信!')
                console.log(`ID: ${earthquakeData.id}`)
                console.log(`震源地: ${earthquakeData.earthquake.hypocenter.name}`)
                console.log(`マグニチュード: M${earthquakeData.earthquake.hypocenter.magnitude}`)
                console.log(`最大震度: ${earthquakeData.earthquake.maxScale}`)
                
                // 重複チェック
                if (isDuplicateNotification(earthquakeData.id)) {
                    console.log('重複通知のためスキップ')
                    return
                }
                
                // 地震情報の処理とDiscord通知
                const result = await processP2PEarthquakeDataForNotification(earthquakeData)
                if (result) {
                    const { embed, files } = result
                    await sendP2PEarthquakeNotification(client, embed, files, earthquakeData)
                }
                
            } catch (parseError) {
                console.error('❌ P2PWebSocketメッセージ解析エラー:', parseError)
            }
        })
        
        ws.on('error', (error: Error) => {
            console.error('❌ P2PWebSocketエラー:', error)
            console.log('🔌 P2PWebSocket接続を再試行します...')
            ws.close()
            setTimeout(() => {
                connectP2PEarthquakeWebSocket(client).catch(err => {
                    console.error('❌ P2PWebSocket再接続失敗:', err)
                    console.log('⚠️ HTTPポーリングにフォールバック')
                    fallbackP2PHttpPolling(client)
                })
            }, 5000)
        })
        
        ws.on('close', (code: number, reason: Buffer) => {
            console.log(`🔌 P2PWebSocket接続終了: code=${code}, reason=${reason.toString()}`)
            console.log('🔌 P2PWebSocket接続を再試行します...')
            setTimeout(() => {
                connectP2PEarthquakeWebSocket(client).catch(err => {
                    console.error('❌ P2PWebSocket再接続失敗:', err)
                    console.log('⚠️ HTTPポーリングにフォールバック')
                    fallbackP2PHttpPolling(client)
                })
            }, 5000)
        })
        
        // 接続維持のためのpingを送信
        setInterval(() => {
            if (ws.readyState === WebSocket.default.OPEN) {
                ws.ping()
            }
        }, 30000)
        
    } catch (error) {
        console.error('❌ P2PWebSocket接続エラー:', error)
        throw error
    }
}

/**
 * フォールバック用HTTPポーリング
 */
async function fallbackP2PHttpPolling(client: Client): Promise<void> {
    console.log('=== P2P地震情報HTTPポーリング開始 ===')
    
    const checkInterval = 30000  // 30秒間隔
    
    setInterval(async () => {
        try {
            const p2pDataArray = await fetchP2PQuakeData()
            
            if (!p2pDataArray || p2pDataArray.length === 0) {
                return
            }
            
            // 最新の地震情報を取得
            const p2pData = p2pDataArray[0]
            
            // 重複チェック
            if (isDuplicateNotification(p2pData.id)) {
                return
            }
            
            console.log('=== 新しい地震情報を検出（P2P HTTPポーリング） ===')
            console.log(`ID: ${p2pData.id}`)
            console.log(`震源地: ${p2pData.earthquake.hypocenter.name}`)
            console.log(`マグニチュード: M${p2pData.earthquake.hypocenter.magnitude}`)
            
            // 通知送信
            const result = await processP2PEarthquakeDataForNotification(p2pData)
            if (result) {
                const { embed, files } = result
                await sendP2PEarthquakeNotification(client, embed, files, p2pData)
            }
            
        } catch (error) {
            console.error('❌ P2P HTTPポーリング地震情報監視エラー:', error)
        }
    }, checkInterval)
    
    console.log(`P2P HTTPポーリング設定完了 (${checkInterval}ms間隔)`)
}

/**
 * P2PWebSocket受信データから通知用データを生成
 */
async function processP2PEarthquakeDataForNotification(p2pData: P2PQuakeData): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] } | null> {
    try {
        // 通知条件のチェック
        const magnitude = p2pData.earthquake.hypocenter.magnitude || 0
        const maxScale = p2pData.earthquake.maxScale || 0
        
        const shouldNotify = magnitude >= 3.0 || maxScale >= 30 // M3.0以上または震度3以上
        
        if (!shouldNotify) {
            console.log('⚠️ P2Pデータが通知条件を満たさない')
            return null
        }
        
        console.log('✅ P2Pデータが通知条件を満たします')
        
        // P2Pで受信したデータを直接使用してembed生成
        const embed = createP2PEarthquakeEmbed(p2pData)
        
        let files: AttachmentBuilder[] | undefined
        
        // 地図生成（環境変数に応じて）
        if (process.env.SKIP_MAP_GENERATION !== 'true') {
            try {
                console.log('🗺️ P2Pデータから地震マップ生成中...')
                
                // P2Pデータをマップデータに変換
                const { earthquakeData, areaInfo } = convertP2PDataToMapData(p2pData)
                const mapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
                
                if (mapPath) {
                    files = [new AttachmentBuilder(mapPath, { name: 'earthquake_map.png' })]
                    console.log('✅ 地震マップ生成成功:', mapPath)
                } else {
                    console.log('⚠️ 地震マップ生成失敗')
                }
            } catch (mapError) {
                console.error('❌ 地震マップ生成エラー:', mapError)
            }
        } else {
            console.log('🚫 地図生成をスキップ（環境変数設定）')
        }
        
        return {
            embed,
            files
        }
        
    } catch (error) {
        console.error('❌ P2P地震データ処理エラー:', error)
        return null
    }
}
