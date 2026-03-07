import { REST, Routes } from 'discord.js'
import { loadEnv } from './utils/loadEnv'
import { data as pingData } from './commands/ping'
import { data as lotteryData } from './commands/lottery'
import { data as shiftData } from './commands/shift'
import { data as voiceWebData } from './commands/voice_web'
import { data as cleanupData } from './commands/cleanup'
import { data as listChannelsData } from './commands/list_channels'

loadEnv()

const commands = [
    pingData.toJSON(),
    lotteryData.toJSON(),
    shiftData.toJSON(),
    voiceWebData.toJSON(),
    cleanupData.toJSON(),
    listChannelsData.toJSON(),
]

function requireEnv(label: string, value: string | undefined): string {
    if (value) return value
    console.error(`❌ ${label} が設定されていません（コマンド登録用）`)
    process.exit(1)
    throw new Error('unreachable')
}

const token = requireEnv('DISCORD_TOKEN または TOKEN', process.env.DISCORD_TOKEN || process.env.TOKEN)
const clientId = requireEnv('CLIENT_ID または DISCORD_CLIENT_ID', process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID)

const rest = new REST({ version: '10' }).setToken(token)

async function main() {
    try {
        console.log('スラッシュコマンドを登録中...')
        // GUILD_ID が指定されていればギルド単位で登録（テスト用に即時反映）
        if (process.env.GUILD_ID) {
            console.log(`ギルド単位登録モード: ${process.env.GUILD_ID}`)
            await rest.put(
                Routes.applicationGuildCommands(clientId, process.env.GUILD_ID as string),
                { body: commands }
            )
            console.log('ギルドコマンド登録完了！')
        } else {
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            )
            console.log('グローバルコマンド登録完了！')
            console.log('注意: グローバル登録は反映まで最大1時間程度かかることがあります。テストはギルド登録を推奨します。')
        }
    } catch (error) {
        console.error(error)
    }
}

main()