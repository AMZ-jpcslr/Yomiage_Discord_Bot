/**
 * Discord地震速報ボット メインファイル（新実装）
 * Wolfix API専用で震源地マークを正確に表示
 */

import { Client, GatewayIntentBits, ActivityType } from 'discord.js'
import * as pingCommand from './commands/ping'
import * as lotteryCommand from './commands/lottery'
import * as shiftCommand from './commands/shift'
import * as setEqChannelCommand from './commands/set_eq_channel'
import * as getEqCommand from './commands/get_eq'  // 新しい実装
import dotenv from 'dotenv'
import { monitorP2PEarthquakeAlerts } from './p2p_notify'  // P2P地震情報通知システム
import * as http from 'http'

dotenv.config()

// 環境変数とトークンの確認
console.log('=== Discord地震速報ボット起動開始 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('TOKEN確認:', process.env.TOKEN ? '✅ 設定済み' : '❌ 未設定')
console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION)
console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
})

// ステータスメッセージのバリエーション
const statusMessages = [
    'Wolfix API地震監視',
    '緊急地震速報待機中',
    '震源地マーク正確表示',
    '地震情報配信中',
    'EEW監視システム稼働',
    '地震速報24時間監視',
    'Wolfix APIと連携',
    'リアルタイム地震情報'
]

// 時間帯別メッセージ
const timeBasedMessages = {
    morning: ['おはよう！地震監視中', 'モーニング地震情報'],
    afternoon: ['午後も監視継続', '昼間安全確保'],
    evening: ['夕方チェック中', 'イブニング監視'],
    night: ['夜間24時間監視', 'ナイトモード稼働']
}

// 現在時刻に応じたメッセージを取得
function getTimeBasedMessage(): string {
    const hour = new Date().getHours()
    let timeCategory: keyof typeof timeBasedMessages
    
    if (hour >= 6 && hour < 12) timeCategory = 'morning'
    else if (hour >= 12 && hour < 18) timeCategory = 'afternoon'
    else if (hour >= 18 && hour < 22) timeCategory = 'evening'
    else timeCategory = 'night'
    
    const messages = timeBasedMessages[timeCategory]
    return messages[Math.floor(Math.random() * messages.length)]
}

// Botのプレゼンス（ステータス）を設定
function setBotPresence() {
    if (!client.user) return
    
    const guildCount = client.guilds.cache.size
    const shouldUseTimeBasedMessage = Math.random() < 0.3 // 30%の確率で時間帯メッセージ
    
    let message: string
    if (shouldUseTimeBasedMessage) {
        message = getTimeBasedMessage()
    } else {
        message = statusMessages[Math.floor(Math.random() * statusMessages.length)]
    }
    
    client.user.setPresence({
        activities: [{
            name: `${message} | ${guildCount}サーバー`,
            type: ActivityType.Watching
        }],
        status: 'online'
    })
    
    console.log(`🎮 ステータス更新: "${message} | ${guildCount}サーバー"`)
}

// インタラクション処理
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return

    console.log(`💬 コマンド実行: /${interaction.commandName} by ${interaction.user.tag}`)

    try {
        switch (interaction.commandName) {
            case 'ping':
                await pingCommand.execute(interaction)
                break
            case 'lottery':
                await lotteryCommand.execute(interaction)
                break
            case 'shift':
                await shiftCommand.execute(interaction)
                break
            case 'set_eq_channel':
                await setEqChannelCommand.execute(interaction)
                break
            case 'get_eq':
                await getEqCommand.execute(interaction)
                break
            default:
                await interaction.reply({ content: 'コマンドが見つかりません。', ephemeral: true })
        }
    } catch (error) {
        console.error(`❌ コマンドエラー (/${interaction.commandName}):`, error)
        
        const errorMessage = 'コマンドの実行中にエラーが発生しました。'
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true })
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true })
        }
    }
})

// Bot準備完了
client.once('ready', async () => {
    if (client.user) {
        console.log(`✅ ログイン成功: ${client.user.tag}`)
        console.log(`📊 参加サーバー数: ${client.guilds.cache.size}`)
    }

    // 環境情報表示
    console.log('=== 環境情報 ===')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION)
    console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION)
    console.log('プラットフォーム:', process.platform)
    console.log('Node.js バージョン:', process.version)

    // 初回ステータス設定
    setBotPresence()
    
    // 10秒ごとにBotステータスを更新
    const statusUpdateInterval = setInterval(() => {
        setBotPresence()
        
        const guildCount = client.guilds.cache.size
        const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        console.log(`📊 詳細情報: サーバー数: ${guildCount} | メモリ使用量: ${memoryUsage}MB`)
    }, 10 * 1000)
    
    // プロセス終了時にタイマーをクリア
    process.on('SIGINT', () => {
        console.log('🛑 ボット終了処理中...')
        clearInterval(statusUpdateInterval)
        process.exit(0)
    })

    // P2P地震情報監視システムを開始
    console.log('🚨 P2P地震情報監視システム開始...')
    monitorP2PEarthquakeAlerts(client)
})

// エラーハンドリング
client.on('error', error => {
    console.error('❌ Clientエラー:', error)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未処理のPromise拒否:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
    console.error('❌ 未処理の例外:', error)
    process.exit(1)
})

// ヘルスチェック用のHTTPサーバー
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            botStatus: client.user ? 'online' : 'offline',
            guilds: client.guilds.cache.size,
            uptime: process.uptime(),
            system: 'Wolfix API地震監視システム'
        }))
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Discord 地震速報ボット (Wolfix API) は正常に動作中です！')
    } else {
        res.writeHead(404)
        res.end('Not Found')
    }
})

server.listen(port, () => {
    console.log(`🌐 ヘルスチェックサーバーがポート ${port} で起動しました`)
    console.log(`📡 ヘルスチェックURL: http://localhost:${port}/health`)
})

// Botにログイン
const token = process.env.TOKEN
if (!token) {
    console.error('❌ TOKENが設定されていません')
    process.exit(1)
}

console.log('🚀 Discord Botを起動中...')
client.login(token).catch(error => {
    console.error('❌ ボットのログインに失敗:', error)
    process.exit(1)
})
