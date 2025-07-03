/**
 * 新しい地震情報取得コマンド（P2P地震情報API専用）
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { fetchP2PQuakeData, convertP2PDataToMapData, createP2PEarthquakeEmbed } from '../utils/p2p_earthquake'
import { generateEarthquakeMap } from '../utils/mapGenerator_new'
import { AttachmentBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('最新の地震情報を取得します（P2P地震情報API）')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    
    try {
        console.log('=== /get_eq コマンド実行開始 ===')
        
        // P2P地震情報APIから最新の地震情報を取得
        const p2pData = await fetchP2PQuakeData()
        
        if (!p2pData || p2pData.length === 0) {
            await interaction.editReply({
                content: '最新の地震情報が見つかりませんでした。しばらく時間をおいてから再度お試しください。'
            })
            return
        }
        
        // 最新の地震情報を取得（震度情報があるもの）
        const latestEarthquake = p2pData.find((data) => 
            data.code === 551 && 
            data.earthquake && 
            data.earthquake.hypocenter && 
            data.points && 
            data.points.length > 0
        )
        
        if (!latestEarthquake) {
            await interaction.editReply({
                content: '震度情報付きの地震データが見つかりませんでした。'
            })
            return
        }
        
        // Discord用埋め込みを作成
        const embed = createP2PEarthquakeEmbed(latestEarthquake)
        
        // 地図生成用データに変換
        const mapData = convertP2PDataToMapData(latestEarthquake)
        
        const files: AttachmentBuilder[] = []
        
        if (mapData) {
            try {
                // 地震マップを生成
                const mapImagePath = await generateEarthquakeMap(mapData.earthquakeData)
                
                if (mapImagePath) {
                    const attachment = new AttachmentBuilder(mapImagePath)
                    files.push(attachment)
                    console.log('✅ 地震マップ生成成功:', mapImagePath)
                } else {
                    console.log('⚠️ 地震マップ生成に失敗しました')
                }
            } catch (mapError) {
                console.error('❌ 地震マップ生成エラー:', mapError)
            }
        }
        
        console.log(`✅ 地震情報取得成功:`)
        console.log(`  震源地: ${latestEarthquake.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${latestEarthquake.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${latestEarthquake.earthquake?.maxScale || '不明'}`)
        console.log(`  データソース: P2P地震情報API`)
        console.log(`  地図ファイル数: ${files.length}`)
        
        await interaction.editReply({
            embeds: [embed],
            files: files
        })
        
        console.log('=== /get_eq コマンド実行完了 ===')
        
    } catch (error) {
        console.error('❌ /get_eq コマンドエラー:', error)
        await interaction.editReply({
            content: '地震情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
        })
    }
}
