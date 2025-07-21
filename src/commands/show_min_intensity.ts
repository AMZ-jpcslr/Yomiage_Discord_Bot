import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, EmbedBuilder } from 'discord.js'
import { getChannelMinIntensity } from '../p2p_notify'
import fs from 'fs'
import path from 'path'

const EQ_MIN_INTENSITY_FILE = path.resolve(__dirname, '../data/eq_min_intensity.json')

/**
 * P2P震度コードから震度文字列に変換
 */
function getIntensityString(p2pCode: number): string {
    if (p2pCode >= 70) return '7'
    if (p2pCode >= 60) return '6強'
    if (p2pCode >= 55) return '6弱'
    if (p2pCode >= 50) return '5強'
    if (p2pCode >= 45) return '5弱'
    if (p2pCode >= 40) return '4'
    if (p2pCode >= 30) return '3'
    if (p2pCode >= 20) return '2'
    if (p2pCode >= 10) return '1'
    return 'すべて'
}

/**
 * 全チャンネルの最低震度設定を読み込み
 */
function loadAllMinIntensityConfig(): Record<string, number> {
    try {
        if (fs.existsSync(EQ_MIN_INTENSITY_FILE)) {
            const data = fs.readFileSync(EQ_MIN_INTENSITY_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('最低震度設定の読み込みエラー:', error)
    }
    return {}
}

export const data = new SlashCommandBuilder()
    .setName('show_min_intensity')
    .setDescription('地震通知の最低震度設定を確認')
    .addChannelOption(opt =>
        opt.setName('channel')
            .setDescription('確認対象のチャンネル（省略時は現在のチャンネル）')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
    )
    .addBooleanOption(opt =>
        opt.setName('show_all')
            .setDescription('サーバー内全チャンネルの設定を表示')
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const showAll = interaction.options.getBoolean('show_all') || false
        
        // 全チャンネル表示の場合
        if (showAll) {
            // サーバー内全チャンネルの設定を表示
            const allConfig = loadAllMinIntensityConfig()
            const guildChannels = await interaction.guild?.channels.fetch()
            
            if (!guildChannels) {
                await interaction.reply({
                    content: '❌ チャンネル情報の取得に失敗しました。',
                    ephemeral: true
                })
                return
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🌍 サーバー内地震通知最低震度設定')
                .setColor('#0099ff')
                .setTimestamp()
            
            let description = ''
            let hasSettings = false
            
            // テキストチャンネルのみを対象にする
            const textChannels = guildChannels.filter(channel => 
                channel && channel.type === ChannelType.GuildText
            )
            
            for (const [channelId, channel] of textChannels) {
                if (channel && channel.type === ChannelType.GuildText) {
                    const minIntensity = allConfig[channelId] || 0
                    const intensityStr = minIntensity === 0 ? 'すべて' : `震度${getIntensityString(minIntensity)}以上`
                    
                    description += `<#${channelId}>: **${intensityStr}**\n`
                    hasSettings = true
                }
            }
            
            if (!hasSettings) {
                description = '設定されているチャンネルはありません。\n`/set_min_intensity` で設定してください。'
            }
            
            embed.setDescription(description)
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            })
            
        } else {
            // 単一チャンネルの設定を表示
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel
            
            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                await interaction.reply({
                    content: '❌ 有効なテキストチャンネルを指定してください。',
                    ephemeral: true
                })
                return
            }
            
            const minIntensity = getChannelMinIntensity(targetChannel.id)
            const intensityStr = minIntensity === 0 ? 'すべての地震（震度1以上）' : `震度${getIntensityString(minIntensity)}以上`
            
            const embed = new EmbedBuilder()
                .setTitle('📊 地震通知最低震度設定')
                .setColor('#0099ff')
                .addFields(
                    {
                        name: '対象チャンネル',
                        value: `<#${targetChannel.id}>`,
                        inline: true
                    },
                    {
                        name: '最低震度設定',
                        value: `**${intensityStr}**`,
                        inline: true
                    }
                )
                .setFooter({
                    text: '設定を変更するには /set_min_intensity コマンドを使用してください'
                })
                .setTimestamp()
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            })
        }
        
        console.log(`✅ [show_min_intensity] 最低震度設定確認完了`)
        
    } catch (error) {
        console.error('❌ [show_min_intensity] コマンド実行エラー:', error)
        await interaction.reply({
            content: '❌ 設定確認中にエラーが発生しました。もう一度お試しください。',
            ephemeral: true
        })
    }
}
