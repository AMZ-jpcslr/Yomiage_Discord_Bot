/**
 * 新しい緊急地震速報通知システム（Wolfix API専用）
 */

import { Client, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { WolfixEEWData } from './utils/earthquake_new'
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
 * 重複通知チェック（改良版：より積極的に通知）
 */
function isDuplicateNotification(eventId: string, serial: number): boolean {
    const lastData = loadLastNotificationData()
    
    if (!lastData) {
        console.log('初回通知: 通知を送信します')
        return false  // 初回通知
    }
    
    // 異なるイベントIDの場合は常に通知
    if (lastData.eventId !== eventId) {
        console.log(`新しいイベント検出: ${eventId} (前回: ${lastData.eventId})`)
        return false
    }
    
    // 同じイベントIDで新しいシリアル番号の場合は通知
    if (lastData.eventId === eventId && serial > lastData.serial) {
        console.log(`続報検出: EventID=${eventId}, Serial=${serial} (前回: ${lastData.serial})`)
        return false
    }
    
    // 同じイベントID・同じシリアル番号の場合のみ重複とみなす
    if (lastData.eventId === eventId && lastData.serial === serial) {
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
    
    return false
}

/**
 * 緊急地震速報通知を送信する共通関数
 */
async function sendEarthquakeNotification(client: Client, embed: EmbedBuilder, files: AttachmentBuilder[] | undefined, wolfixData: WolfixEEWData, serial: number): Promise<void> {
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
        eventId: wolfixData.EventID || '',
        serial: serial,
        timestamp: Date.now()
    })
    
    console.log(`✅ 緊急地震速報通知完了: ${notificationsSent}件送信`)
}

/**
 * WebSocketベース緊急地震速報の監視と通知（リアルタイムのみ）
 */
export async function monitorEarthquakeAlerts(client: Client): Promise<void> {
    console.log('=== WebSocketベース緊急地震速報監視開始 ===')
    console.log('📡 リアルタイム通知モード: 周期的ポーリングは行いません')
    
    try {
        // WebSocket接続を試行
        console.log('🔌 WebSocket接続を試行中...')
        await connectEarthquakeWebSocket(client)
        
    } catch (error) {
        console.error('❌ WebSocket緊急地震速報監視エラー:', error)
        console.log('⚠️ WebSocket接続失敗: リアルタイム通知が利用できません')
        // フォールバックのHTTPポーリングは無効化
        // リアルタイム通知のみに限定するため、ポーリングは行わない
    }
}

/**
 * WebSocket接続による緊急地震速報の受信（リアルタイム通知）
 */
export async function connectEarthquakeWebSocket(client: Client): Promise<void> {
    console.log('=== WebSocket緊急地震速報接続開始 ===')
    
    try {
        // WebSocket APIへの接続
        const WebSocket = await import('ws')
        const ws = new WebSocket.default('wss://ws-api.wolfx.jp/jma_eew')
        
        ws.on('open', () => {
            console.log('✅ WebSocket接続成功: wss://ws-api.wolfx.jp/jma_eew')
            console.log('📡 リアルタイム緊急地震速報の受信を開始しました')
        })
        
        ws.on('message', async (data: Buffer) => {
            try {
                const message = data.toString()
                console.log('📨 WebSocketメッセージ受信:', message.substring(0, 100) + '...')
                
                // JSON形式のデータを解析
                const wolfixData = JSON.parse(message) as WolfixEEWData
                
                if (!wolfixData.EventID || !wolfixData.Hypocenter) {
                    console.log('⚠️ 不完全な地震データを受信 - スキップ')
                    return
                }
                
                console.log('🚨 新しい緊急地震速報をWebSocketで受信!')
                console.log(`EventID: ${wolfixData.EventID}`)
                console.log(`震源地: ${wolfixData.Hypocenter}`)
                console.log(`マグニチュード: M${wolfixData.Magunitude}`)
                console.log(`最大震度: ${wolfixData.MaxIntensity}`)
                
                // 重複チェック
                const serial = wolfixData.Serial || 1
                if (isDuplicateNotification(wolfixData.EventID || '', serial)) {
                    console.log('重複通知のためスキップ')
                    return
                }
                
                // 地震情報の処理とDiscord通知
                const result = await processEarthquakeDataForNotification(wolfixData)
                if (result) {
                    const { embed, files } = result
                    await sendEarthquakeNotification(client, embed, files, wolfixData, serial)
                }
                
            } catch (parseError) {
                console.error('❌ WebSocketメッセージ解析エラー:', parseError)
            }
        })
        
        ws.on('error', (error: Error) => {
            console.error('❌ WebSocketエラー:', error)
            console.log('� WebSocket接続を再試行します...')
            ws.close()
            // リアルタイム通知のみのため、再接続を試行
            setTimeout(() => {
                connectEarthquakeWebSocket(client).catch(err => {
                    console.error('❌ WebSocket再接続失敗:', err)
                    console.log('⚠️ リアルタイム通知が利用できません')
                })
            }, 5000) // 5秒後に再接続
        })
        
        ws.on('close', (code: number, reason: Buffer) => {
            console.log(`🔌 WebSocket接続終了: code=${code}, reason=${reason.toString()}`)
            console.log('� WebSocket接続を再試行します...')
            // リアルタイム通知のみのため、再接続を試行
            setTimeout(() => {
                connectEarthquakeWebSocket(client).catch(err => {
                    console.error('❌ WebSocket再接続失敗:', err)
                    console.log('⚠️ リアルタイム通知が利用できません')
                })
            }, 5000) // 5秒後に再接続
        })
        
        // 接続維持のためのpingを送信
        setInterval(() => {
            if (ws.readyState === WebSocket.default.OPEN) {
                ws.ping()
            }
        }, 30000) // 30秒ごと
        
    } catch (error) {
        console.error('❌ WebSocket接続エラー:', error)
        console.log('WebSocket APIが利用できません - HTTPポーリングにフォールバック')
        throw error
    }
}

/**
 * WebSocket受信データから通知用データを生成
 */
async function processEarthquakeDataForNotification(wolfixData: WolfixEEWData): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] } | null> {
    try {
        // 通知条件のチェック
        const magnitude = wolfixData.Magunitude || 0
        const maxIntensity = wolfixData.MaxIntensity || '不明'
        
        const shouldNotify = magnitude >= 2.0 || 
                           maxIntensity !== '不明' || 
                           wolfixData.isWarn ||
                           wolfixData.isFinal
        
        if (!shouldNotify) {
            console.log('⚠️ WebSocketデータが通知条件を満たさない')
            return null
        }
        
        // キャンセル報の場合はスキップ
        if (wolfixData.isCancel) {
            console.log('⚠️ キャンセル報のためスキップ')
            return null
        }
        
        // 訓練報の処理
        if (wolfixData.isTraining && process.env.SKIP_TRAINING_EEW === 'true') {
            console.log('⚠️ 訓練報のためスキップ（環境変数設定）')
            return null
        }
        
        console.log('✅ WebSocketデータが通知条件を満たします')
        
        // WebSocketで受信したデータを直接使用してembed生成
        const { createEarthquakeEmbed, createMapDataFromWolfixData } = await import('./utils/earthquake_new')
        const { generateEarthquakeMap } = await import('./utils/mapGenerator_new')
        
        let files: AttachmentBuilder[] | undefined
        
        // 地図生成（環境変数に応じて）
        if (process.env.SKIP_MAP_GENERATION !== 'true') {
            try {
                console.log('🗺️ WebSocketデータから地震マップ生成中...')
                
                // WolfixEEWDataをEarthquakeDataに変換
                const { earthquakeData, areaInfo } = createMapDataFromWolfixData(wolfixData)
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
        
        // Embedを生成（WebSocketデータは常にEEWとして扱う）
        const result = await createEarthquakeEmbed(wolfixData, true)
        
        return {
            embed: result.embed,
            files: files || result.files
        }
        
    } catch (error) {
        console.error('❌ WebSocket地震データ処理エラー:', error)
        return null
    }
}
