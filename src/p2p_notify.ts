/**
 * P2P地震情報APIベースの地震通知システム
 */

import { Client, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { fetchAllP2PData, convertP2PDataToMapData, createP2PEarthquakeEmbed, P2PQuakeData, P2P_CODES } from './utils/p2p_earthquake'
import { generateEarthquakeMap } from './utils/mapGenerator_new'
import { getIntensityIconPath } from './utils/intensityIcon'
import * as fs from 'fs'
import * as path from 'path'

interface EQChannelConfig {
    [guildId: string]: string
}

// 前回の通知データを保存するためのファイル
const DATA_DIR = path.resolve(__dirname, '../data')
const LAST_NOTIFICATION_FILE = path.join(DATA_DIR, 'last_p2p_notification.json')
const EQ_CHANNELS_FILE = path.join(DATA_DIR, 'eq_channels.json')

interface LastNotificationData {
    [key: string]: {
        id: string
        timestamp: number
        isIncomplete: boolean  // 不完全データかどうか
    }
}

/**
 * 前回の通知データを読み込み
 */
function loadLastNotificationData(): LastNotificationData {
    try {
        if (fs.existsSync(LAST_NOTIFICATION_FILE)) {
            const data = fs.readFileSync(LAST_NOTIFICATION_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('前回通知データの読み込みエラー:', error)
    }
    return {}
}

/**
 * 通知データを保存
 */
function saveLastNotificationData(id: string, isIncomplete: boolean = false): void {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true })
        }
        
        const allData = loadLastNotificationData()
        allData[id] = {
            id,
            timestamp: Date.now(),
            isIncomplete
        }
        
        fs.writeFileSync(LAST_NOTIFICATION_FILE, JSON.stringify(allData, null, 2))
    } catch (error) {
        console.error('通知データの保存エラー:', error)
    }
}

/**
 * 通知チャンネル設定を読み込み
 */
function loadEQChannels(): EQChannelConfig {
    try {
        console.log(`📁 チャンネル設定ファイルパス: ${EQ_CHANNELS_FILE}`)
        
        if (fs.existsSync(EQ_CHANNELS_FILE)) {
            const data = fs.readFileSync(EQ_CHANNELS_FILE, 'utf8')
            const channels = JSON.parse(data)
            console.log(`✅ チャンネル設定読み込み成功: ${Object.keys(channels).length}サーバー設定済み`)
            console.log(`設定内容:`, channels)
            return channels
        } else {
            console.log('⚠️ チャンネル設定ファイルが存在しません:', EQ_CHANNELS_FILE)
        }
    } catch (error) {
        console.error('❌ チャンネル設定の読み込みエラー:', error)
    }
    return {}
}

/**
 * 重複通知チェック（更新情報対応）
 */
function shouldSendNotification(id: string, isIncomplete: boolean = false): boolean {
    const allLastData = loadLastNotificationData()
    const lastData = allLastData[id]
    
    if (!lastData) {
        console.log(`初回通知: ${id} を送信します`)
        return true
    }
    
    const now = Date.now()
    const timeDiff = now - lastData.timestamp
    
    // 1分以内の重複チェック
    if (timeDiff < 60 * 1000) {
        // 前回が不完全で今回が完全情報の場合は更新として送信
        if (lastData.isIncomplete && !isIncomplete) {
            console.log(`更新情報: ${id} - 不完全→完全情報への更新`)
            return true
        }
        
        console.log(`重複通知スキップ: ${id} (${Math.round(timeDiff / 1000)}秒前に送信済み)`)
        return false
    }
    
    // 1分以上経過していれば再通知
    console.log(`時間経過により再通知: ${id} (${Math.round(timeDiff / 1000)}秒経過)`)
    return true
}

/**
 * データが不完全かどうかを判定（全種別対応）
 */
function isIncompleteEarthquakeData(p2pData: P2PQuakeData): boolean {
    // 地震情報以外（津波、気象警報等）は基本的に完全とみなす
    if (p2pData.code !== 551 && p2pData.code !== 552) {
        // ただし、titleやtextが空の場合は不完全と判定
        if (!p2pData.title && !p2pData.text && !p2pData.areas) {
            return true
        }
        return false
    }
    
    // 地震情報が存在しない
    if (!p2pData.earthquake) {
        return true
    }
    
    // 震源地情報が不完全
    if (!p2pData.earthquake.hypocenter) {
        return true
    }
    
    // 基本的な地震情報（名前、マグニチュード、座標）のいずれかが不明
    if (!p2pData.earthquake.hypocenter.name || 
        !p2pData.earthquake.hypocenter.magnitude ||
        !p2pData.earthquake.hypocenter.longitude || 
        !p2pData.earthquake.hypocenter.latitude) {
        return true
    }
    
    // 震度3以上で震度分布が不完全な場合
    if (p2pData.earthquake.maxScale && p2pData.earthquake.maxScale >= 30) {
        if (!p2pData.points || p2pData.points.length === 0) {
            return true
        }
    }
    
    return false
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
                
                const p2pData = JSON.parse(message) as P2PQuakeData
                
                console.log(`📋 受信データ: コード${p2pData.code} - ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知の情報'}`)
                
                // 不完全データかどうかを判定
                const isIncomplete = isIncompleteEarthquakeData(p2pData)
                
                // 通知すべきかチェック（更新情報も考慮）
                if (!shouldSendNotification(p2pData.id, isIncomplete)) {
                    return
                }
                
                console.log('🚨 新しいP2P情報を検出（WebSocket）!')
                console.log(`ID: ${p2pData.id}`)
                console.log(`コード: ${p2pData.code}`)
                console.log(`種別: ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知'}`)
                console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
                
                if (p2pData.earthquake?.hypocenter) {
                    console.log(`震源地: ${p2pData.earthquake.hypocenter.name || '不明'}`)
                    console.log(`マグニチュード: M${p2pData.earthquake.hypocenter.magnitude || '不明'}`)
                    console.log(`最大震度: ${p2pData.earthquake.maxScale || '不明'}`)
                }
                
                // 全種別のP2P情報の処理とDiscord通知
                await sendP2PNotification(client, p2pData, isIncomplete)
                
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
 * フォールバック用HTTPポーリング（全種別対応）
 */
async function fallbackP2PHttpPolling(client: Client): Promise<void> {
    console.log('=== P2P全種別情報HTTPポーリング開始 ===')
    
    const checkInterval = 30000  // 30秒間隔
    
    setInterval(async () => {
        try {
            // 全種別の情報を取得
            const p2pDataArray = await fetchAllP2PData()
            
            if (!p2pDataArray || p2pDataArray.length === 0) {
                return
            }
            
            // 最新のP2P情報を処理（複数件チェック）
            for (const p2pData of p2pDataArray.slice(0, 5)) { // 最新5件をチェック
                // 不完全データかどうかを判定
                const isIncomplete = isIncompleteEarthquakeData(p2pData)
                
                // 重複チェック
                if (!shouldSendNotification(p2pData.id, isIncomplete)) {
                    continue
                }
                
                console.log('=== 新しいP2P情報を検出（HTTPポーリング） ===')
                console.log(`ID: ${p2pData.id}`)
                console.log(`コード: ${p2pData.code}`)
                console.log(`種別: ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知'}`)
                console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
                
                if (p2pData.earthquake?.hypocenter) {
                    console.log(`震源地: ${p2pData.earthquake.hypocenter.name || '不明'}`)
                    console.log(`マグニチュード: M${p2pData.earthquake.hypocenter.magnitude || '不明'}`)
                }
                
                // P2P情報の処理とDiscord通知
                await sendP2PNotification(client, p2pData, isIncomplete)
            }
            
        } catch (error) {
            console.error('❌ P2P HTTPポーリング情報監視エラー:', error)
        }
    }, checkInterval)
    
    console.log(`P2P全種別HTTPポーリング設定完了 (${checkInterval}ms間隔)`)
}

/**
 * P2P情報の通知を送信（全種別対応）
 */
async function sendP2PNotification(client: Client, p2pData: P2PQuakeData, isIncomplete: boolean = false): Promise<void> {
    console.log('📤 P2P情報の通知送信開始...')
    console.log(`種別: ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知'} (コード: ${p2pData.code})`)
    console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
    
    const eqChannels = loadEQChannels()
    
    console.log(`🔍 読み込んだチャンネル設定:`, eqChannels)
    console.log(`📊 設定済みサーバー数: ${Object.keys(eqChannels).length}`)
    
    if (Object.keys(eqChannels).length === 0) {
        console.log('⚠️ 通知チャンネルが設定されていません')
        console.log('💡 /set_eq_channel コマンドでチャンネルを設定してください')
        return
    }
    
    // Discord埋め込みを作成
    const embed = createP2PEarthquakeEmbed(p2pData)
    
    // 不完全データの場合は警告を追加
    if (isIncomplete) {
        const currentDesc = embed.data.description || ''
        const warning = '⚠️ **速報（不完全情報）** - 詳細情報が判明次第、更新をお送りします\n\n'
        embed.setDescription(warning + currentDesc)
        embed.setColor('#ff9900') // オレンジ色で警告
    }
    
    const files: AttachmentBuilder[] = []
    
    // 震度アイコンをembedに追加（地震情報の場合のみ）
    if ((p2pData.code === 551 || p2pData.code === 552) && 
        p2pData.earthquake?.maxScale && 
        p2pData.earthquake.maxScale > 0 && 
        !isIncomplete) {
        
        // P2P震度コードから震度文字列に変換
        const maxScale = p2pData.earthquake.maxScale
        const scaleStr = maxScale >= 70 ? '7' :
                       maxScale >= 60 ? '6+' :
                       maxScale >= 55 ? '6-' :
                       maxScale >= 50 ? '5+' :
                       maxScale >= 45 ? '5-' :
                       maxScale >= 40 ? '4' :
                       maxScale >= 30 ? '3' :
                       maxScale >= 20 ? '2' :
                       maxScale >= 10 ? '1' : null
        
        if (scaleStr) {
            const intensityIconPath = getIntensityIconPath(scaleStr)
            if (intensityIconPath) {
                const iconAttachment = new AttachmentBuilder(intensityIconPath, { name: 'intensity_icon.png' })
                files.push(iconAttachment)
                embed.setThumbnail('attachment://intensity_icon.png')
                console.log(`✅ 震度アイコン追加: 震度${scaleStr}`)
            }
        }
    }
    
    // 地震情報で震源地がある場合は地図を生成
    if ((p2pData.code === 551 || p2pData.code === 552) && 
        p2pData.earthquake?.hypocenter?.longitude && 
        p2pData.earthquake?.hypocenter?.latitude) {
        
        console.log(`🗾 地図生成条件チェック:`)
        console.log(`  - コード: ${p2pData.code} (551または552)`)
        console.log(`  - 震源地経度: ${p2pData.earthquake?.hypocenter?.longitude}`)
        console.log(`  - 震源地緯度: ${p2pData.earthquake?.hypocenter?.latitude}`)
        console.log(`  - 不完全データ: ${isIncomplete}`)
        console.log(`  - 震度データ数: ${p2pData.points?.length || 0}`)
        
        if (isIncomplete) {
            console.log('⚠️ 不完全データのため地図生成をスキップ')
        } else {
            try {
                console.log('🔄 地図データ変換開始...')
                const mapData = convertP2PDataToMapData(p2pData)
                if (mapData) {
                    console.log('✅ 地図データ変換成功')
                    console.log(`  - 震度エリア数: ${Object.keys(mapData.areaInfo.areas).length}`)
                    console.log(`  - 詳細エリア数: ${Object.keys(mapData.areaInfo.detailedAreas || {}).length}`)
                    
                    const mapImagePath = await generateEarthquakeMap(mapData.earthquakeData, mapData.areaInfo)
                    if (mapImagePath) {
                        const attachment = new AttachmentBuilder(mapImagePath, { name: 'earthquake_map.png' })
                        files.push(attachment)
                        
                        // 地図画像を埋め込みの画像として設定
                        embed.setImage('attachment://earthquake_map.png')
                        console.log('🗾 地震マップ生成成功（埋め込み画像として設定）')
                    } else {
                        console.log('⚠️ 地震マップ生成失敗: 画像パスがnull')
                    }
                } else {
                    console.log('⚠️ 地震マップ生成失敗: mapDataがnull')
                }
            } catch (mapError) {
                console.error('❌ 地震マップ生成エラー:', mapError)
            }
        }
    } else {
        console.log('⚠️ 地図生成条件未満足のためスキップ')
        console.log(`  - コード: ${p2pData.code} (551または552以外)`)
        console.log(`  - 震源地経度: ${p2pData.earthquake?.hypocenter?.longitude || 'なし'}`)
        console.log(`  - 震源地緯度: ${p2pData.earthquake?.hypocenter?.latitude || 'なし'}`)
    }
    
    let successCount = 0
    
    // 各設定済みチャンネルに送信
    for (const [, channelId] of Object.entries(eqChannels)) {
        try {
            const channel = await client.channels.fetch(channelId) as TextChannel
            
            if (channel && channel.isTextBased()) {
                await channel.send({
                    embeds: [embed],
                    files: files
                })
                successCount++
                console.log(`✅ P2P情報通知送信完了: ${channel.guild.name} #${channel.name}`)
            }
        } catch (channelError) {
            console.error(`❌ チャンネル ${channelId} への送信エラー:`, channelError)
        }
    }
    
    // 通知履歴を保存
    saveLastNotificationData(p2pData.id, isIncomplete)
    console.log(`📝 通知履歴保存完了 (${successCount}チャンネルに送信済み)`)
}
