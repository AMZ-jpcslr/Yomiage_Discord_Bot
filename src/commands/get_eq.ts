import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { createEarthquakeEmbed } from '../utils/earthquake'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('直近に発表された地震情報を取得します（気象庁データ）')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    try {
        const res = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json')
        const list = await res.json() as { json: string }[]
        if (!list.length) {
            await interaction.editReply('直近の地震情報が見つかりませんでした。')
            return
        }
        
        const latestId = list[0].json
        console.log('最新地震ID:', latestId)

        // 共通関数を使用して地震情報を取得
        const result = await createEarthquakeEmbed(latestId, false)
        
        // ファイル添付付きで返信
        await interaction.editReply({ 
            embeds: [result.embed], 
            files: result.files 
        })
    } catch (e) {
        console.error(e)
        await interaction.editReply('地震情報の取得中にエラーが発生しました。')
    }
}