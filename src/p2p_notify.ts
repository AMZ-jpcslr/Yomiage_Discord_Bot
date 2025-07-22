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

interface EQMinIntensityConfig {
    [channelId: string]: number // P2P震度コード (10=震度1, 20=震度2, 30=震度3, etc.)
}

// 前回の通知データを保存するためのファイル
const DATA_DIR = path.resolve(__dirname, '../data')
const LAST_NOTIFICATION_FILE = path.join(DATA_DIR, 'last_p2p_notification.json')
const EQ_CHANNELS_FILE = path.join(DATA_DIR, 'eq_channels.json')
const EQ_MIN_INTENSITY_FILE = path.join(DATA_DIR, 'eq_min_intensity.json')

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
 * 最低震度設定を読み込み
 */
function loadMinIntensityConfig(): EQMinIntensityConfig {
    try {
        console.log(`📁 最低震度設定ファイルパス: ${EQ_MIN_INTENSITY_FILE}`)
        
        if (fs.existsSync(EQ_MIN_INTENSITY_FILE)) {
            const data = fs.readFileSync(EQ_MIN_INTENSITY_FILE, 'utf8')
            const config = JSON.parse(data)
            console.log(`✅ 最低震度設定読み込み成功: ${Object.keys(config).length}チャンネル設定済み`)
            console.log(`設定内容:`, config)
            return config
        } else {
            console.log('⚠️ 最低震度設定ファイルが存在しません:', EQ_MIN_INTENSITY_FILE)
        }
    } catch (error) {
        console.error('❌ 最低震度設定の読み込みエラー:', error)
    }
    return {}
}

/**
 * 最低震度設定を保存
 */
function saveMinIntensityConfig(config: EQMinIntensityConfig): void {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true })
        }
        
        fs.writeFileSync(EQ_MIN_INTENSITY_FILE, JSON.stringify(config, null, 2))
        console.log('✅ 最低震度設定保存完了')
    } catch (error) {
        console.error('❌ 最低震度設定の保存エラー:', error)
    }
}

/**
 * チャンネルの最低震度設定を取得
 */
export function getChannelMinIntensity(channelId: string): number {
    const config = loadMinIntensityConfig()
    return config[channelId] || 0 // デフォルトは0（すべての震度を通知）
}

/**
 * チャンネルの最低震度設定を更新
 */
export function setChannelMinIntensity(channelId: string, minIntensity: number): void {
    const config = loadMinIntensityConfig()
    config[channelId] = minIntensity
    saveMinIntensityConfig(config)
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
        // 注意: 現在は不完全データは通知しないため、この分岐は基本的に実行されない
        if (lastData.isIncomplete && !isIncomplete) {
            console.log(`更新情報: ${id} - 不完全→完全情報への更新（現在は不完全データは通知されません）`)
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
 * 地震情報かどうかを判定
 */
function isEarthquakeInformation(code: number): boolean {
    // 551: 震度速報, 552: 震源・震度情報, 554-556: 緊急地震速報
    return code === 551 || code === 552 || (code >= 554 && code <= 556)
}

/**
 * データが不完全かどうかを判定（地震情報のみ）
 */
function isIncompleteEarthquakeData(p2pData: P2PQuakeData): boolean {
    // 地震情報以外は対象外
    if (!isEarthquakeInformation(p2pData.code)) {
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
                
                // 地震情報のみをフィルタリング
                if (!isEarthquakeInformation(p2pData.code)) {
                    console.log(`⏭️ 地震情報以外のため通知をスキップ: コード${p2pData.code} - ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知の情報'}`)
                    return
                }
                
                console.log(`✅ 地震情報を検出: コード${p2pData.code} - ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES]}`)
                
                // 不完全データかどうかを判定
                const isIncomplete = isIncompleteEarthquakeData(p2pData)
                
                // 不完全データの場合は通知をスキップ
                if (isIncomplete) {
                    console.log(`⏭️ 不完全な地震情報のため通知をスキップ: ID ${p2pData.id}`)
                    console.log(`- 震源地: ${p2pData.earthquake?.hypocenter?.name || '不明'}`)
                    console.log(`- マグニチュード: M${p2pData.earthquake?.hypocenter?.magnitude || '不明'}`)
                    console.log(`- 座標: ${p2pData.earthquake?.hypocenter?.longitude || '不明'}, ${p2pData.earthquake?.hypocenter?.latitude || '不明'}`)
                    console.log(`- 震度分布: ${p2pData.points?.length || 0}地点`)
                    return
                }
                
                // 通知すべきかチェック（重複確認）
                if (!shouldSendNotification(p2pData.id, isIncomplete)) {
                    return
                }
                
                console.log('🚨 完全な地震情報を検出（WebSocket）!')
                console.log(`ID: ${p2pData.id}`)
                console.log(`コード: ${p2pData.code}`)
                console.log(`種別: ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知'}`)
                console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
                
                if (p2pData.earthquake?.hypocenter) {
                    console.log(`震源地: ${p2pData.earthquake.hypocenter.name || '不明'}`)
                    console.log(`マグニチュード: M${p2pData.earthquake.hypocenter.magnitude || '不明'}`)
                    console.log(`最大震度: ${p2pData.earthquake.maxScale || '不明'}`)
                }
                
                // 完全な地震情報の処理とDiscord通知
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
 * フォールバック用HTTPポーリング（地震情報のみ）
 */
async function fallbackP2PHttpPolling(client: Client): Promise<void> {
    console.log('=== P2P地震情報HTTPポーリング開始 ===')
    
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
                // 地震情報のみをフィルタリング
                if (!isEarthquakeInformation(p2pData.code)) {
                    console.log(`⏭️ 地震情報以外のため通知をスキップ（HTTP）: コード${p2pData.code} - ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知の情報'}`)
                    continue
                }
                
                console.log(`✅ 地震情報を検出（HTTP）: コード${p2pData.code} - ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES]}`)
                
                // 不完全データかどうかを判定
                const isIncomplete = isIncompleteEarthquakeData(p2pData)
                
                // 不完全データの場合は通知をスキップ
                if (isIncomplete) {
                    console.log(`⏭️ 不完全な地震情報のため通知をスキップ（HTTP）: ID ${p2pData.id}`)
                    console.log(`- 震源地: ${p2pData.earthquake?.hypocenter?.name || '不明'}`)
                    console.log(`- マグニチュード: M${p2pData.earthquake?.hypocenter?.magnitude || '不明'}`)
                    console.log(`- 座標: ${p2pData.earthquake?.hypocenter?.longitude || '不明'}, ${p2pData.earthquake?.hypocenter?.latitude || '不明'}`)
                    console.log(`- 震度分布: ${p2pData.points?.length || 0}地点`)
                    continue
                }
                
                // 重複チェック
                if (!shouldSendNotification(p2pData.id, isIncomplete)) {
                    continue
                }
                
                console.log('=== 完全な地震情報を検出（HTTPポーリング） ===')
                console.log(`ID: ${p2pData.id}`)
                console.log(`コード: ${p2pData.code}`)
                console.log(`種別: ${P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || '未知'}`)
                console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
                
                if (p2pData.earthquake?.hypocenter) {
                    console.log(`震源地: ${p2pData.earthquake.hypocenter.name || '不明'}`)
                    console.log(`マグニチュード: M${p2pData.earthquake.hypocenter.magnitude || '不明'}`)
                }
                
                // 完全な地震情報の処理とDiscord通知
                await sendP2PNotification(client, p2pData, isIncomplete)
            }
            
        } catch (error) {
            console.error('❌ P2P HTTPポーリング情報監視エラー:', error)
        }
    }, checkInterval)
    
    console.log(`P2P地震情報HTTPポーリング設定完了 (${checkInterval}ms間隔)`)
}

/**
 * P2P震度コードから震度文字列に変換
 */
function getIntensityString(p2pCode: number): string {
    if (p2pCode >= 70) return '7'
    if (p2pCode >= 60) return '6+'
    if (p2pCode >= 55) return '6-'
    if (p2pCode >= 50) return '5+'
    if (p2pCode >= 45) return '5-'
    if (p2pCode >= 40) return '4'
    if (p2pCode >= 30) return '3'
    if (p2pCode >= 20) return '2'
    if (p2pCode >= 10) return '1'
    return '0'
}

/**
 * 震度がチャンネルの最低震度を満たしているかチェック
 */
function meetsMinIntensityThreshold(p2pData: P2PQuakeData, channelId: string): boolean {
    // 地震情報以外は常に通知
    if (p2pData.code !== 551 && p2pData.code !== 552) {
        console.log(`📢 地震情報以外（コード${p2pData.code}）のため最低震度チェックをスキップ`)
        return true
    }
    
    // 地震情報がない場合は通知
    if (!p2pData.earthquake?.maxScale) {
        console.log(`📢 地震情報が不完全のため最低震度チェックをスキップ`)
        return true
    }
    
    const channelMinIntensity = getChannelMinIntensity(channelId)
    
    // 最低震度が設定されていない場合はすべて通知
    if (channelMinIntensity === 0) {
        console.log(`📢 チャンネル${channelId}: 最低震度未設定のためすべて通知`)
        return true
    }
    
    const earthquakeMaxScale = p2pData.earthquake.maxScale
    const meetsThreshold = earthquakeMaxScale >= channelMinIntensity
    
    const currentIntensityStr = getIntensityString(earthquakeMaxScale)
    const minIntensityStr = getIntensityString(channelMinIntensity)
    
    if (!meetsThreshold) {
        console.log(`🔇 最低震度フィルター: チャンネル${channelId} - 現在震度${currentIntensityStr} < 最低震度${minIntensityStr} のため通知スキップ`)
    } else {
        console.log(`✅ 最低震度チェック通過: チャンネル${channelId} - 現在震度${currentIntensityStr} >= 最低震度${minIntensityStr}`)
    }
    
    return meetsThreshold
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
    
    // 地震情報の場合は最大震度をログ出力
    if ((p2pData.code === 551 || p2pData.code === 552) && p2pData.earthquake?.maxScale) {
        const intensityStr = getIntensityString(p2pData.earthquake.maxScale)
        console.log(`🌪️ 地震最大震度: ${intensityStr} (P2Pコード: ${p2pData.earthquake.maxScale})`)
    }
    
    // Discord埋め込みを作成
    let embed: EmbedBuilder
    try {
        embed = createP2PEarthquakeEmbed(p2pData)
        console.log('✅ P2P埋め込み作成成功')
    } catch (error) {
        console.error('❌ P2P埋め込み作成エラー:', error)
        console.error('📊 問題のあるP2Pデータ:', JSON.stringify(p2pData, null, 2))
        
        // フォールバック埋め込みを作成
        embed = new EmbedBuilder()
            .setTitle('🚨 P2P地震情報（データ不完全）')
            .setDescription('地震情報を受信しましたが、データの一部が不完全です。')
            .addFields({
                name: 'データ形式エラー',
                value: `コード: ${p2pData.code || '不明'}\nID: ${p2pData.id || '不明'}`,
                inline: false
            })
            .setColor('#ff0000')
            .setTimestamp()
            .setFooter({ text: 'P2P地震情報 - データエラー' })
    }
    
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
        const scaleStr = getIntensityString(maxScale)
        
        if (scaleStr !== '0') {
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
    let filteredCount = 0
    
    // 各設定済みチャンネルに送信
    for (const [, channelId] of Object.entries(eqChannels)) {
        try {
            // 最低震度チェック
            if (!meetsMinIntensityThreshold(p2pData, channelId)) {
                filteredCount++
                continue
            }
            
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
    
    const totalChannels = Object.keys(eqChannels).length
    console.log(`📝 通知履歴保存完了`)
    console.log(`📊 通知統計: ${successCount}/${totalChannels}チャンネルに送信済み`)
    console.log(`🔇 フィルター統計: ${filteredCount}チャンネルで最低震度フィルターにより非通知`)
    
    if (successCount === 0) {
        console.log(`⚠️ 注意: どのチャンネルにも通知されませんでした`)
        if (filteredCount > 0) {
            console.log(`💡 理由: すべてのチャンネルで最低震度設定により除外されました`)
        }
    }
}
