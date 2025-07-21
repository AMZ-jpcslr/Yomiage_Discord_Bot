import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js'
import { setChannelMinIntensity, getChannelMinIntensity } from '../p2p_notify'

// P2P震度コードと表示用文字列のマッピング
const INTENSITY_CHOICES = [
    { name: 'すべての地震（震度1以上）', value: 10 },
    { name: '震度2以上', value: 20 },
    { name: '震度3以上', value: 30 },
    { name: '震度4以上', value: 40 },
    { name: '震度5弱以上', value: 45 },
    { name: '震度5強以上', value: 50 },
    { name: '震度6弱以上', value: 55 },
    { name: '震度6強以上', value: 60 },
    { name: '震度7のみ', value: 70 }
]

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

export const data = new SlashCommandBuilder()
    .setName('set_min_intensity')
    .setDescription('地震通知の最低震度を設定（この震度未満の地震は通知されません）')
    .addIntegerOption(opt =>
        opt.setName('min_intensity')
            .setDescription('最低震度の設定')
            .setRequired(true)
            .addChoices(...INTENSITY_CHOICES)
    )
    .addChannelOption(opt =>
        opt.setName('channel')
            .setDescription('設定対象のチャンネル（省略時は現在のチャンネル）')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // 対象チャンネルを決定（指定されていない場合は現在のチャンネル）
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel
        const minIntensity = interaction.options.getInteger('min_intensity', true)
        
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            await interaction.reply({
                content: '❌ 有効なテキストチャンネルを指定してください。',
                ephemeral: true
            })
            return
        }
        
        // 権限チェック（管理者権限が必要）
        if (!interaction.memberPermissions?.has('Administrator')) {
            await interaction.reply({
                content: '❌ このコマンドを実行するには管理者権限が必要です。',
                ephemeral: true
            })
            return
        }
        
        // 現在の設定を取得
        const currentMinIntensity = getChannelMinIntensity(targetChannel.id)
        const currentIntensityStr = currentMinIntensity === 0 ? 'すべて' : getIntensityString(currentMinIntensity)
        
        // 新しい設定を保存
        setChannelMinIntensity(targetChannel.id, minIntensity)
        
        const newIntensityStr = minIntensity === 0 ? 'すべて' : getIntensityString(minIntensity)
        
        // 設定完了メッセージ
        const settingMessage = minIntensity === 10 
            ? `<#${targetChannel.id}> での地震通知を **すべての地震（震度1以上）** に設定しました。`
            : `<#${targetChannel.id}> での地震通知の最低震度を **震度${newIntensityStr}以上** に設定しました。`
        
        const changeMessage = currentMinIntensity !== minIntensity 
            ? `\n\n📊 設定変更: 震度${currentIntensityStr}以上 → 震度${newIntensityStr}以上`
            : `\n\n📊 設定確認: 震度${newIntensityStr}以上（変更なし）`
        
        await interaction.reply({
            content: `✅ ${settingMessage}${changeMessage}`,
            ephemeral: false
        })
        
        console.log(`✅ [set_min_intensity] チャンネル ${targetChannel.id} の最低震度を ${minIntensity} (震度${newIntensityStr}以上) に設定`)
        
    } catch (error) {
        console.error('❌ [set_min_intensity] コマンド実行エラー:', error)
        await interaction.reply({
            content: '❌ 設定中にエラーが発生しました。もう一度お試しください。',
            ephemeral: true
        })
    }
}
