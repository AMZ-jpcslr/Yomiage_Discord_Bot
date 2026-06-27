/**
 * VoiceVox Web API音声読み上げコマンド
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js'
import { 
    joinVoiceChannelWeb, 
    leaveVoiceChannelWeb, 
    speakTextWeb,
    updateVoiceSettingsWeb, 
    getSpeakerNameWeb,
    checkApiKeyStatus
} from '../voice_web_api'

export const data = new SlashCommandBuilder()
    .setName('voice_web')
    .setDescription('VoiceVox Web API音声読み上げ機能')
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('ボイスチャンネルに参加して読み上げを開始')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('ボイスチャンネルから退出')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('settings')
            .setDescription('音声設定を変更')
            .addStringOption(option =>
                option
                    .setName('speaker')
                    .setDescription('音声モデルを選択')
                    .addChoices(
                        { name: '四国めたん（ノーマル）', value: '2' },
                        { name: '四国めたん（あまあま）', value: '0' },
                        { name: '四国めたん（ツンツン）', value: '6' },
                        { name: '四国めたん（セクシー）', value: '4' },
                        { name: 'ずんだもん（ノーマル）', value: '3' },
                        { name: 'ずんだもん（あまあま）', value: '1' },
                        { name: 'ずんだもん（ツンツン）', value: '7' },
                        { name: 'ずんだもん（セクシー）', value: '5' },
                        { name: '春日部つむぎ（ノーマル）', value: '8' },
                        { name: '波音リツ（ノーマル）', value: '9' },
                        { name: '雨晴はう（ノーマル）', value: '10' },
                        { name: '玄野武宏（ノーマル）', value: '11' }
                    )
                    .setRequired(false)
            )
            .addNumberOption(option =>
                option
                    .setName('speed')
                    .setDescription('読み上げ速度（0.5〜2.0、デフォルト: 0.9）')
                    .setMinValue(0.5)
                    .setMaxValue(2.0)
                    .setRequired(false)
            )
            .addNumberOption(option =>
                option
                    .setName('pitch')
                    .setDescription('音程（-0.15〜0.15、デフォルト: 0.02）')
                    .setMinValue(-0.15)
                    .setMaxValue(0.15)
                    .setRequired(false)
            )
            .addNumberOption(option =>
                option
                    .setName('intonation')
                    .setDescription('イントネーション（0.5〜2.0、デフォルト: 1.1）')
                    .setMinValue(0.5)
                    .setMaxValue(2.0)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('APIキーの設定状況とスピーカー情報を確認')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('test')
            .setDescription('読み上げテスト音声を再生')
    )

export async function execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand()

        try {
            switch (subcommand) {
                case 'join':
                    await handleJoin(interaction)
                    break
                case 'leave':
                    await handleLeave(interaction)
                    break
                case 'settings':
                    await handleSettings(interaction)
                    break
                case 'status':
                    await handleStatus(interaction)
                    break
                case 'test':
                    await handleTest(interaction)
                    break
                default:
                    await interaction.reply({
                        content: '❌ 不明なサブコマンドです。',
                        ephemeral: true
                    })
            }
        } catch (error) {
            console.error('❌ voice_web コマンドエラー:', error)
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ コマンドの実行中にエラーが発生しました。',
                    ephemeral: true
                })
            }
        }
    }

/**
 * join サブコマンド処理
 */
async function handleJoin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const member = interaction.member
    if (!member || !('voice' in member)) {
        await interaction.editReply('❌ ボイスチャンネルに参加してからコマンドを実行してください。')
        return
    }

    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
        await interaction.editReply('❌ ボイスチャンネルに参加してからコマンドを実行してください。')
        return
    }

    const textChannel = interaction.channel
    if (!textChannel || !textChannel.isTextBased() || textChannel.isDMBased()) {
        await interaction.editReply('❌ サーバーのテキストチャンネルでコマンドを実行してください。')
        return
    }

    console.log(`🎤 VoiceVox Web API接続試行: ${voiceChannel.name} (Guild: ${interaction.guildId})`)

    const success = await joinVoiceChannelWeb(voiceChannel, textChannel as TextChannel)
    
    if (success) {
        const statusMessage = checkApiKeyStatus()
        await interaction.editReply(
            `🎤 **ボイスチャンネルに参加しました！**\n` +
            `📻 接続先: ${voiceChannel.name}\n` +
            `📝 読み上げチャンネル: ${'name' in textChannel ? textChannel.name : 'このチャンネル'}\n\n` +
            `${statusMessage}\n\n` +
            `🎯 このチャンネルでメッセージを送信すると読み上げられます。\n` +
            `⚙️ 音声設定を変更するには \`/voice_web settings\` を使用してください。`
        )
    } else {
        await interaction.editReply('❌ ボイスチャンネルへの参加に失敗しました。')
    }
}

/**
 * leave サブコマンド処理
 */
async function handleLeave(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const guildId = interaction.guildId
    if (!guildId) {
        await interaction.editReply('❌ サーバー情報を取得できませんでした。')
        return
    }

    leaveVoiceChannelWeb(guildId)
    await interaction.editReply('👋 ボイスチャンネルから退出しました。')
}

/**
 * settings サブコマンド処理
 */
async function handleSettings(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const guildId = interaction.guildId
    if (!guildId) {
        await interaction.editReply('❌ サーバー情報を取得できませんでした。')
        return
    }

    const speaker = interaction.options.getString('speaker')
    const speed = interaction.options.getNumber('speed')
    const pitch = interaction.options.getNumber('pitch')
    const intonation = interaction.options.getNumber('intonation')

    // 設定を更新
    const newSettings: {
        speakerId?: number
        speed?: number
        pitch?: number
        intonationScale?: number
    } = {}
    
    if (speaker !== null) {
        newSettings.speakerId = parseInt(speaker)
    }
    if (speed !== null) {
        newSettings.speed = speed
    }
    if (pitch !== null) {
        newSettings.pitch = pitch
    }
    if (intonation !== null) {
        newSettings.intonationScale = intonation
    }

    if (Object.keys(newSettings).length === 0) {
        await interaction.editReply('❌ 変更する設定を指定してください。')
        return
    }

    updateVoiceSettingsWeb(guildId, newSettings)

    let response = '✅ **音声設定を更新しました！**\n\n'
    
    if (newSettings.speakerId !== undefined) {
        response += `🎭 音声モデル: ${getSpeakerNameWeb(newSettings.speakerId)}\n`
    }
    if (newSettings.speed !== undefined) {
        response += `⚡ 読み上げ速度: ${newSettings.speed}\n`
    }
    if (newSettings.pitch !== undefined) {
        response += `🎵 音程: ${newSettings.pitch}\n`
    }
    if (newSettings.intonationScale !== undefined) {
        response += `🎭 イントネーション: ${newSettings.intonationScale}\n`
    }

    await interaction.editReply(response)
}

/**
 * status サブコマンド処理
 */
async function handleStatus(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const apiKeyStatus = checkApiKeyStatus()
    
    const response = 
        `📊 **VoiceVox Web API ステータス**\n\n` +
        `${apiKeyStatus}\n\n` +
        `🌐 **API情報:**\n` +
        `• エンドポイント: https://deprecatedapis.tts.quest/v2/voicevox/\n` +
        `• 音声合成: 高速クラウド処理\n` +
        `• 必要なポイント: 1500 + 100 × 文字数\n\n` +
        `🎭 **利用可能音声モデル:**\n` +
        `• 四国めたん（ノーマル/あまあま/ツンツン/セクシー）\n` +
        `• ずんだもん（ノーマル/あまあま/ツンツン/セクシー）\n` +
        `• 春日部つむぎ、波音リツ、雨晴はう、玄野武宏\n\n` +
        `⚙️ **設定可能項目:**\n` +
        `• 読み上げ速度: 0.5〜2.0\n` +
        `• 音程: -0.15〜0.15\n` +
        `• イントネーション: 0.5〜2.0\n\n` +
        `📝 APIキーの取得: https://su-shiki.com/api/`

    await interaction.editReply(response)
}

/**
 * test サブコマンド処理
 */
async function handleTest(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guildId = interaction.guildId
    if (!guildId) {
        await interaction.editReply('❌ サーバー情報を取得できませんでした。')
        return
    }

    await speakTextWeb('読み上げテストです。音声が聞こえれば、音声再生経路は正常です。', guildId)
    await interaction.editReply('✅ 読み上げテスト音声をキューに追加しました。')
}
