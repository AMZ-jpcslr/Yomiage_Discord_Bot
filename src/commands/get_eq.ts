import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { processWolfixEEW } from '../utils/earthquake'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('最新の地震情報を取得します（Wolfix API）')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    try {
        console.log('=== /get_eq コマンド実行（Wolfix API使用） ===')
        
        // Wolfix APIから最新の地震情報を取得
        const result = await processWolfixEEW()
        
        if (!result) {
            await interaction.editReply('最新の地震情報が見つかりませんでした。しばらく時間をおいてから再度お試しください。')
            return
        }
        
        const { embed, files, mapGenerated, eewData } = result
        
        // コマンド実行用にタイトルを変更
        embed.setTitle('【最新地震情報】(Wolfix)')
        embed.setColor(0x0099ff) // 青色（コマンド用）
        
        console.log(`地震情報取得成功: ${eewData?.Hypocenter} M${eewData?.Magunitude} 最大震度${eewData?.MaxIntensity}`)
        console.log(`地図生成: ${mapGenerated ? '成功' : '失敗'}`)
        
        // ファイル添付付きで返信
        await interaction.editReply({ 
            embeds: [embed], 
            files: files || []
        })
        
    } catch (error) {
        console.error('get_eq コマンドエラー:', error)
        await interaction.editReply('地震情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。')
    }
}