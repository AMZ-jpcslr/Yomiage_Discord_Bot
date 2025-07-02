import { Client, GatewayIntentBits } from 'discord.js'
import * as pingCommand from './commands/ping'
import * as lotteryCommand from './commands/lottery' // ←追加
import * as shiftCommand from './commands/shift'
import * as setEqChannelCommand from './commands/set_eq_channel'
import * as getEqCommand from './commands/get_eq'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { TextChannel } from 'discord.js'
import WebSocket from 'ws'
import { startEqAutoNotify } from './eq_notify'
import { createEarthquakeEmbedFromP2PData, processWolfixEEW, checkServerEnvironmentSupport, getServerEnvironmentInfo } from './utils/earthquake'
import * as http from 'http'

dotenv.config()

// 環境変数とトークンの確認
console.log('=== Bot起動開始 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('TOKEN確認:', process.env.TOKEN ? '✅ 設定済み' : '❌ 未設定')
console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION)
console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent, 
    ],
})

function setBotPresence() {
    if (client.user) {
        client.user.setPresence({
            activities: [{ name: 'キヴォトスの最新情報', type: 1 }],
            status: 'online',
        })
    }
}

client.once('ready', () => {
    console.log('✅ Discord Bot Ready!')
    if (client.user) {
        console.log(`✅ ログイン成功: ${client.user.tag}`)
    }
    setBotPresence()

    // サーバー環境と地図生成サポート状況を確認
    const envSupport = checkServerEnvironmentSupport()
    const envInfo = getServerEnvironmentInfo()
    
    console.log('=== 環境情報 ===')
    console.log(`サーバー環境: ${envSupport.isServerEnvironment}`)
    console.log(`地図生成可能: ${envSupport.canGenerateMap}`)
    console.log('詳細環境情報:', JSON.stringify(envInfo, null, 2))
    
    if (envSupport.recommendations.length > 0) {
        console.log('=== 推奨設定 ===')
        envSupport.recommendations.forEach(rec => console.log(`💡 ${rec}`))
    }

    // 5分ごとにPing値とサーバー数をターミナルに出力
    setInterval(() => {
        const ping = client.ws.ping
        const guildCount = client.guilds.cache.size
        console.log(`Bot起動中！Ping: ${ping}ms / サーバー数: ${guildCount}`)
    }, 5 * 60 * 1000) // 5分ごと（ミリ秒に修正）

    startEqAutoNotify(client)
    
    // Wolfix EEW API監視を開始
    startWolfixEEWMonitoring(client)
})

// ヘルスチェック用のHTTPサーバー（Railwayの監視用）
const port = process.env.PORT || 3000
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            botReady: client.isReady(),
            uptime: process.uptime(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                hasToken: !!process.env.TOKEN,
                skipMapGeneration: process.env.SKIP_MAP_GENERATION,
                forceMapGeneration: process.env.FORCE_MAP_GENERATION
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(health, null, 2))
    } else {
        res.writeHead(404)
        res.end('Not Found')
    }
})

server.listen(port, () => {
    console.log(`✅ ヘルスチェックサーバー起動: http://localhost:${port}/health`)
})

// 再接続時にもステータスを再設定
client.on('shardResume', () => {
    setBotPresence()
})


//コマンドの登録
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return
    if (interaction.commandName === 'ping') {
        await pingCommand.execute(interaction)
    }
    if (interaction.commandName === 'lottery') {
        await lotteryCommand.execute(interaction)
    }
    if (interaction.commandName === 'shift') {
        await shiftCommand.execute(interaction)
    }
    if (interaction.commandName === 'set_eq_channel') {
        await setEqChannelCommand.execute(interaction)
    }
    if (interaction.commandName === 'get_eq') {
        await getEqCommand.execute(interaction)
    }
})

client.login(process.env.TOKEN)
    .then(() => {
        console.log('✅ Discord login attempt completed')
    })
    .catch((error) => {
        console.error('❌ Discord login failed:', error)
        process.exit(1)
    })

// エラーハンドリング
client.on('error', (error) => {
    console.error('Discord Client Error:', error)
})

client.on('warn', (warning) => {
    console.warn('Discord Client Warning:', warning)
})

// 緊急地震速報の受信（例: P2P地震情報 WebSocket）
const ws = new WebSocket('wss://api.p2pquake.net/v2/ws')

ws.on('open', () => {
    console.log('✅ P2P地震情報WebSocketに接続しました')
})

ws.on('error', (error) => {
    console.error('❌ P2P地震情報WebSocketエラー:', error)
})

ws.on('close', (code, reason) => {
    console.log(`⚠️  P2P地震情報WebSocketが切断されました: コード=${code}, 理由=${reason}`)
    // 自動再接続を検討する場合はここに実装
})

ws.on('message', async (data) => {
    try {
        const json = JSON.parse(data.toString())
        console.log('=== P2P WebSocket受信データ ===')
        console.log('コード:', json.code)
        console.log('完全なデータ:', JSON.stringify(json, null, 2))
        
        if (json.code === 551) { // 緊急地震速報
            console.log('=== 緊急地震速報を受信 ===')
            console.log('受信時刻:', new Date().toISOString())
            
            // P2P地震情報データを統一された処理関数で処理
            console.log('地震情報埋め込みの作成を開始...')
            const result = await createEarthquakeEmbedFromP2PData(json)
            if (!result) {
                console.error('❌ P2P地震情報から埋め込み作成に失敗')
                return
            }

            const { embed, files, mapGenerated } = result
            console.log(`📊 埋め込み作成完了 - 地図生成: ${mapGenerated ? '成功' : '失敗'}, ファイル数: ${files?.length || 0}`)

            // 緊急地震速報用にタイトルを変更
            embed.setTitle('【緊急地震速報】')
            embed.setColor(0xff0000) // 赤色に変更
            
            // 地図生成の結果に応じてメッセージを調整
            if (!mapGenerated) {
                console.warn('⚠️  地図が生成されませんでした。震源地の地図なしで通知を送信します。')
                // 必要に応じて、地図なしの旨を説明に追加することも可能
                // embed.setDescription(embed.data.description + '\n*震源地の地図は生成できませんでした*')
            }

            // 通知チャンネル取得
            const channelsPath = path.join(__dirname, '../data/eq_channels.json')
            if (!fs.existsSync(channelsPath)) {
                console.log('地震通知チャンネル設定ファイルが見つかりません')
                return
            }
            const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'))
            console.log('通知対象チャンネル数:', Object.keys(channels).length)
            
            for (const guildId in channels) {
                const channelId = channels[guildId]
                const guild = client.guilds.cache.get(guildId)
                if (!guild) {
                    console.log(`ギルド ${guildId} が見つかりません`)
                    continue
                }
                const channel = guild.channels.cache.get(channelId) as TextChannel
                if (channel && channel.isTextBased()) {
                    await channel.send({ 
                        embeds: [embed], 
                        files: files || [] 
                    })
                    console.log(`緊急地震速報を送信: ${guild.name} - ${channel.name}`)
                } else {
                    console.log(`チャンネル ${channelId} が見つからないか、テキストチャンネルではありません`)
                }
            }
        }
    } catch (e) {
        console.error('地震速報通知エラー:', e)
    }
})

// Wolfix EEW API監視機能
let lastWolfixEEWId: string | null = null

async function startWolfixEEWMonitoring(client: Client) {
    console.log('✅ Wolfix EEW API監視を開始')
    
    // 初回実行（既存の警報を取得してIDを設定、通知はしない）
    try {
        const initialData = await processWolfixEEW()
        if (initialData && initialData.eewData) {
            // 最初の警報IDを記録（通知は送信しない）
            const eventId = initialData.eewData.EventID || new Date().getTime().toString()
            lastWolfixEEWId = eventId
            console.log(`初期化: 最新のWolfix EEW ID: ${lastWolfixEEWId}`)
        }
    } catch (error) {
        console.error('Wolfix EEW初期化エラー:', error)
    }
    
    // 30秒ごとにポーリング
    setInterval(async () => {
        try {
            console.log('[Wolfix EEW] ポーリング実行中...')
            const result = await processWolfixEEW()
            
            if (!result) {
                console.log('[Wolfix EEW] データなし、またはエラー')
                return
            }
            
            const { embed, files, mapGenerated, eewData } = result
            
            if (!eewData) {
                console.warn('[Wolfix EEW] EEWデータが不完全です')
                return
            }
            
            const currentEventId = eewData.EventID || new Date().getTime().toString()
            
            // 新しい警報かチェック
            if (lastWolfixEEWId === currentEventId) {
                console.log(`[Wolfix EEW] 同一イベント (ID: ${currentEventId})、スキップ`)
                return
            }
            
            console.log(`[Wolfix EEW] 新しい警報を検出! ID: ${currentEventId}`)
            lastWolfixEEWId = currentEventId
            
            // 緊急地震速報用にタイトルと色を設定
            embed.setTitle('【緊急地震速報】(Wolfix)')
            embed.setColor(0xff4500) // オレンジレッド（P2Pと区別）
            
            console.log(`[Wolfix EEW] 埋め込み作成完了 - 地図生成: ${mapGenerated ? '成功' : '失敗'}, ファイル数: ${files?.length || 0}`)
            
            // 地図生成失敗時の警告
            if (!mapGenerated) {
                console.warn('[Wolfix EEW] ⚠️  地図が生成されませんでした')
            }
            
            // 通知チャンネル取得
            const channelsPath = path.join(__dirname, '../data/eq_channels.json')
            if (!fs.existsSync(channelsPath)) {
                console.log('[Wolfix EEW] 地震通知チャンネル設定ファイルが見つかりません')
                return
            }
            
            const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'))
            console.log(`[Wolfix EEW] 通知対象チャンネル数: ${Object.keys(channels).length}`)
            
            // 各チャンネルに通知送信
            for (const guildId in channels) {
                const channelId = channels[guildId]
                const guild = client.guilds.cache.get(guildId)
                if (!guild) {
                    console.log(`[Wolfix EEW] ギルド ${guildId} が見つかりません`)
                    continue
                }
                const channel = guild.channels.cache.get(channelId) as TextChannel
                if (channel && channel.isTextBased()) {
                    await channel.send({ 
                        embeds: [embed], 
                        files: files || [] 
                    })
                    console.log(`[Wolfix EEW] 緊急地震速報を送信: ${guild.name} - ${channel.name}`)
                } else {
                    console.log(`[Wolfix EEW] チャンネル ${channelId} が見つからないか、テキストチャンネルではありません`)
                }
            }
            
        } catch (error) {
            console.error('[Wolfix EEW] 監視エラー:', error)
        }
    }, 30000) // 30秒間隔
}