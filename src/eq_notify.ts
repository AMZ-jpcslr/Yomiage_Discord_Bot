import { Client, TextChannel } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { createEarthquakeEmbed } from './utils/earthquake'

const DATA_PATH = path.join(__dirname, '../../data/eq_channels.json')

// 通知チャンネル設定をロード
function loadChannels(): Record<string, string> {
    if (!fs.existsSync(DATA_PATH)) return {}
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
}

// 直近の地震IDを保存して重複通知を防ぐ
const latestIdPath = path.join(__dirname, '../../data/latest_eq_id.txt')
function loadLatestId(): string | null {
    if (!fs.existsSync(latestIdPath)) return null
    return fs.readFileSync(latestIdPath, 'utf8').trim()
}
function saveLatestId(id: string) {
    fs.mkdirSync(path.dirname(latestIdPath), { recursive: true })
    fs.writeFileSync(latestIdPath, id, 'utf8')
}

// 定期的に気象庁APIを監視して新しい地震があれば通知
export function startEqAutoNotify(client: Client) {
    console.log('地震自動通知システムを開始しました（60秒間隔）')
    
    setInterval(async () => {
        try {
            const res = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json')
            const list = await res.json() as { json: string }[]
            if (!list.length) return

            const latestId = list[0]?.json
            if (
                !latestId ||
                typeof latestId !== 'string' ||
                !latestId.endsWith('.json') ||
                latestId.startsWith('/') || // 先頭が/の場合も不正
                latestId.includes('..')     // パストラバーサル防止
            ) {
                console.warn('不正なlatestId:', latestId)
                return
            }
            
            const previousLatestId = loadLatestId()
            if (latestId === previousLatestId) {
                // すでに通知済み（ログは出力しない）
                return
            }

            console.log('新しい地震情報を検出:', latestId)
            console.log('前回の地震ID:', previousLatestId)

            // 共通関数を使用して地震情報の埋め込みを作成
            const result = await createEarthquakeEmbed(latestId, true)

            // 通知チャンネルへ送信
            const channels = loadChannels()
            let notificationCount = 0
            
            for (const guildId in channels) {
                const channelId = channels[guildId]
                const guild = client.guilds.cache.get(guildId)
                if (!guild) {
                    console.warn(`Guild not found: ${guildId}`)
                    continue
                }
                
                const channel = guild.channels.cache.get(channelId) as TextChannel
                if (channel && channel.isTextBased()) {
                    try {
                        await channel.send({ 
                            embeds: [result.embed], 
                            files: result.files 
                        })
                        notificationCount++
                        console.log(`地震通知送信完了: ${guild.name} (#${channel.name})`)
                    } catch (error) {
                        console.error(`地震通知送信エラー (${guild.name}):`, error)
                    }
                } else {
                    console.warn(`Channel not found or not text-based: Guild=${guild.name}, Channel=${channelId}`)
                }
            }
            
            console.log(`地震自動通知完了: ${notificationCount}チャンネルに送信`)
            saveLatestId(latestId)
        } catch (e) {
            console.error('地震自動通知エラー:', e)
        }
    }, 60 * 1000) // 1分ごとにチェック
}