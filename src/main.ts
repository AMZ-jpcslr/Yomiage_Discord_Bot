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
import { createEarthquakeEmbedFromP2PData } from './utils/earthquake'

dotenv.config()

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
    console.log('Ready!')
    if (client.user) {
        console.log(client.user.tag)
    }
    setBotPresence()

    // 5分ごとにPing値とサーバー数をターミナルに出力
    setInterval(() => {
        const ping = client.ws.ping
        const guildCount = client.guilds.cache.size
        console.log(`Bot起動中！Ping: ${ping}ms / サーバー数: ${guildCount}`)
    }, 5 * 60 * 1000) // 5分ごと（ミリ秒に修正）

    startEqAutoNotify(client)
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
            
            // P2P地震情報データを使用して共通の地震情報埋め込みを作成
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