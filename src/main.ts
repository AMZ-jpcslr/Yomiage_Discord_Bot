/**
 * Discord Bot メインファイル
 */

import { Client, GatewayIntentBits, ActivityType } from 'discord.js'
import * as pingCommand from './commands/ping'
import * as lotteryCommand from './commands/lottery'
import * as shiftCommand from './commands/shift'
import * as voiceWebCommand from './commands/voice_web'  // VoiceVox Web API読み上げ
import * as cleanupCommand from './commands/cleanup'    // BOTメッセージ削除
import * as listChannelsCommand from './commands/list_channels'
import { loadEnv } from './utils/loadEnv'
import { startMessageMonitoring as startWebMessageMonitoring } from './voice_web_api'  // Web API音声読み上げ
import * as http from 'http'

loadEnv()

// 環境変数とトークンの確認
console.log('=== Discord Bot起動開始 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('TOKEN確認:', (process.env.DISCORD_TOKEN || process.env.TOKEN) ? '✅ 設定済み' : '❌ 未設定')
console.log('VOICEVOX_API_KEY確認:', process.env.VOICEVOX_API_KEY ? '✅ 設定済み' : '❌ 未設定')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,  // メッセージ内容の取得（特権インテント）
        GatewayIntentBits.GuildVoiceStates,  // ボイス状態の監視（特権インテント）
    ],
})

// ステータスメッセージのバリエーション
const statusMessages = [
    'キヴォトスで業務中',
    'voicevox使用読み上げ',
    'あなたのテキスト読み上げます',
]

// 時間帯別メッセージ
const timeBasedMessages = {
    morning: ['おはようございます！', '省電力モードから復帰済み'],
    afternoon: ['少し休憩しましょう！', '通常通り起動中'],
    evening: ['今日もお疲れ様でした！', '省電力モード移行'],
    night: ['おやすみなさい、先生', '夜間も稼働中']
}

// 日本標準時間（JST）を取得するヘルパー関数
function getJSTTime(): Date {
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    return new Date(utc + (9 * 3600000)) // UTC+9時間
}

// 現在時刻に応じたメッセージを取得（日本標準時間基準）
function getTimeBasedMessage(): string {
    // 日本標準時間（JST）を取得
    const jstTime = getJSTTime()
    const jstHour = jstTime.getHours()
    
    let timeCategory: keyof typeof timeBasedMessages
    
    if (jstHour >= 6 && jstHour < 12) timeCategory = 'morning'
    else if (jstHour >= 12 && jstHour < 18) timeCategory = 'afternoon'
    else if (jstHour >= 18 && jstHour < 22) timeCategory = 'evening'
    else timeCategory = 'night'
    
    const messages = timeBasedMessages[timeCategory]
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)]
    
    console.log(`🕐 JST時間: ${jstTime.toLocaleString('ja-JP')} (${jstHour}時) → ${timeCategory} → "${selectedMessage}"`)
    
    return selectedMessage
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
            case 'voice_web':
                await voiceWebCommand.execute(interaction)
                break
            case 'cleanup':
                await cleanupCommand.execute(interaction)
                break
            case 'list_channels':
                await listChannelsCommand.execute(interaction)
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

    // VoiceVox Web API音声読み上げ監視を開始  
    console.log('🌐 VoiceVox Web API音声読み上げ監視開始...')
    startWebMessageMonitoring(client)
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
        const jstTime = getJSTTime()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            jstTimestamp: jstTime.toLocaleString('ja-JP'),
            botStatus: client.user ? 'online' : 'offline',
            guilds: client.guilds.cache.size,
            uptime: process.uptime(),
            system: 'Discord Bot システム'
        }))
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Discord Bot は正常に動作中です！')
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
const token = process.env.DISCORD_TOKEN || process.env.TOKEN
if (!token) {
    console.error('❌ DISCORD_TOKEN または TOKEN が設定されていません')
    console.error('環境変数を確認してください:')
    console.error('- DISCORD_TOKEN: Discord Bot のトークン')
    console.error('- TOKEN: 旧形式のトークン（互換性用）')
    process.exit(1)
}

console.log('🚀 Discord Botを起動中...')
console.log('使用Intents:', [
    'Guilds',
    'GuildMessages', 
    'MessageContent（特権）',
    'GuildVoiceStates（特権）'
])

client.login(token).catch(error => {
    console.error('❌ ボットのログインに失敗:', error)
    if (error.message.includes('disallowed intents')) {
        console.error('')
        console.error('🔧 解決方法:')
        console.error('1. Discord Developer Portal (https://discord.com/developers/applications) にアクセス')
        console.error('2. あなたのBotアプリケーションを選択')
        console.error('3. 「Bot」設定で以下の特権インテントを有効化:')
        console.error('   ☑️ MESSAGE CONTENT INTENT')
        console.error('   ☑️ GUILD VOICE STATES INTENT (ボイス機能用)')
        console.error('4. 「Save Changes」をクリック')
        console.error('')
    }
    process.exit(1)
})
