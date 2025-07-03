import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve(__dirname, '../data/eq_channels.json')

function loadChannels(): Record<string, string> {
    console.log(`📁 [set_eq_channel] チャンネル設定ファイルパス: ${DATA_PATH}`)
    if (!fs.existsSync(DATA_PATH)) {
        console.log('⚠️ [set_eq_channel] チャンネル設定ファイルが存在しません')
        return {}
    }
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    console.log(`✅ [set_eq_channel] チャンネル設定読み込み: ${Object.keys(data).length}サーバー`)
    return data
}

function saveChannels(data: Record<string, string>) {
    const dir = path.dirname(DATA_PATH)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 [set_eq_channel] ディレクトリ作成: ${dir}`)
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
    console.log(`💾 [set_eq_channel] チャンネル設定保存完了: ${DATA_PATH}`)
    console.log(`保存内容:`, data)
}

export const data = new SlashCommandBuilder()
    .setName('set_eq_channel')
    .setDescription('緊急地震速報の通知チャンネルを設定')
    .addChannelOption(opt =>
        opt.setName('channel')
            .setDescription('通知先チャンネル')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel', true)
    const guildId = interaction.guildId
    if (!guildId) {
        await interaction.reply('このコマンドはサーバー内でのみ使用できます。')
        return
    }
    const channels = loadChannels()
    channels[guildId] = channel.id
    saveChannels(channels)
    await interaction.reply(`緊急地震速報の通知チャンネルを <#${channel.id}> に設定しました。`)
}