import { REST, Routes } from 'discord.js'
import dotenv from 'dotenv'
import { data as pingData } from './commands/ping'
import { data as lotteryData } from './commands/lottery'
import { data as shiftData } from './commands/shift'
import { data as voiceWebData } from './commands/voice_web'
import { data as cleanupData } from './commands/cleanup'
import { data as listChannelsData } from './commands/list_channels'

dotenv.config()

const commands = [
    pingData.toJSON(),
    lotteryData.toJSON(),
    shiftData.toJSON(),
    voiceWebData.toJSON(),
    cleanupData.toJSON(),
    listChannelsData.toJSON(),
]

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN as string)

async function main() {
    try {
        console.log('スラッシュコマンドを登録中...')
        // GUILD_ID が指定されていればギルド単位で登録（テスト用に即時反映）
        if (process.env.GUILD_ID) {
            console.log(`ギルド単位登録モード: ${process.env.GUILD_ID}`)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.GUILD_ID as string),
                { body: commands }
            )
            console.log('ギルドコマンド登録完了！')
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID as string),
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