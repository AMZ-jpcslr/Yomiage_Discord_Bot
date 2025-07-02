/**
 * 新しい地震情報取得コマンド（Wolfix API専用）
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { getLatestEarthquakeInfo } from '../utils/earthquake_new'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('最新の地震情報を取得します（Wolfix API）')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    
    try {
        console.log('=== /get_eq コマンド実行開始 ===')
        
        const result = await getLatestEarthquakeInfo()
        
        if (!result) {
            await interaction.editReply({
                content: '最新の地震情報が見つかりませんでした。しばらく時間をおいてから再度お試しください。'
            })
            return
        }
        
        const { embed, files, wolfixData } = result
        
        console.log(`✅ 地震情報取得成功:`)
        console.log(`  震源地: ${wolfixData?.Hypocenter || '不明'}`)
        console.log(`  マグニチュード: M${wolfixData?.Magunitude || '不明'}`)
        console.log(`  最大震度: ${wolfixData?.MaxIntensity || '不明'}`)
        console.log(`  地図ファイル数: ${files?.length || 0}`)
        
        await interaction.editReply({
            embeds: [embed],
            files: files || []
        })
        
        console.log('=== /get_eq コマンド実行完了 ===')
        
    } catch (error) {
        console.error('❌ /get_eq コマンドエラー:', error)
        await interaction.editReply({
            content: '地震情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
        })
    }
}
