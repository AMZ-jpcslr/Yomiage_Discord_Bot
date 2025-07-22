import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, VoiceChannel, TextChannel } from 'discord.js'
import { joinVoiceChannelById, leaveVoiceChannel, setVoiceChannelConfig, removeVoiceChannelConfig, updateVoiceSettings, getVoiceSettings, getSpeakerName } from '../voice_tts'

// HTTP クライアントの設定（Node.js バージョン互換性対応）
let fetch: typeof globalThis.fetch

// Node.js 18+ の標準 fetch または undici を使用
if (typeof globalThis.fetch !== 'undefined') {
    fetch = globalThis.fetch
} else {
    // Node.js 18未満の場合はundiciを使用
    const { fetch: undiciFetch } = require('undici')
    fetch = undiciFetch
}

export const data = new SlashCommandBuilder()
    .setName('voice_tts')
    .setDescription('VoiceVoxずんだもん音声読み上げ機能の制御')
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('ボイスチャンネルに接続して読み上げを開始')
            .addChannelOption(option =>
                option
                    .setName('voice_channel')
                    .setDescription('接続するボイスチャンネル')
                    .addChannelTypes(ChannelType.GuildVoice)
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option
                    .setName('text_channel')
                    .setDescription('読み上げ対象のテキストチャンネル（省略時は現在のチャンネル）')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('ボイスチャンネルから切断して読み上げを停止')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('現在の音声読み上げ設定を確認')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('settings')
            .setDescription('音声読み上げの設定を変更')
            .addStringOption(option =>
                option
                    .setName('speaker')
                    .setDescription('音声モデルを選択')
                    .addChoices(
                        { name: 'ずんだもん（ノーマル）', value: '3' },
                        { name: 'ずんだもん（あまあま）', value: '1' },
                        { name: 'ずんだもん（ツンツン）', value: '7' },
                        { name: '四国めたん（ノーマル）', value: '2' },
                        { name: '四国めたん（あまあま）', value: '0' },
                        { name: '四国めたん（ツンツン）', value: '6' },
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
                    .setDescription('読み上げ速度（0.5〜2.0、デフォルト: 1.0）')
                    .setMinValue(0.5)
                    .setMaxValue(2.0)
                    .setRequired(false)
            )
            .addNumberOption(option =>
                option
                    .setName('pitch')
                    .setDescription('音の高さ（-0.15〜0.15、デフォルト: 0.0）')
                    .setMinValue(-0.15)
                    .setMaxValue(0.15)
                    .setRequired(false)
            )
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const subcommand = interaction.options.getSubcommand()
        
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ このコマンドはサーバー内でのみ使用できます。',
                ephemeral: true
            })
            return
        }
        
        switch (subcommand) {
            case 'join':
                await handleJoinCommand(interaction)
                break
            case 'leave':
                await handleLeaveCommand(interaction)
                break
            case 'status':
                await handleStatusCommand(interaction)
                break
            case 'settings':
                await handleSettingsCommand(interaction)
                break
        }
        
    } catch (error) {
        console.error('❌ [voice_tts] コマンド実行エラー:', error)
        await interaction.reply({
            content: '❌ コマンド実行中にエラーが発生しました。',
            ephemeral: true
        })
    }
}

async function handleJoinCommand(interaction: ChatInputCommandInteraction) {
    // VoiceVoxの可用性をチェック
    const VOICEVOX_API_URL = process.env.VOICEVOX_API_URL || 'http://localhost:50021'
    const VOICEVOX_ENABLED = process.env.VOICEVOX_ENABLED !== 'false'
    
    if (!VOICEVOX_ENABLED) {
        await interaction.reply({
            content: '❌ VoiceVox音声読み上げ機能は無効化されています。\n管理者に `VOICEVOX_ENABLED=true` の設定を依頼してください。',
            ephemeral: true
        })
        return
    }
    
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`${VOICEVOX_API_URL}/version`, {
            method: 'GET',
            signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
            await interaction.reply({
                content: `❌ VoiceVoxサーバーに接続できません（${VOICEVOX_API_URL}）\n管理者にVoiceVoxサーバーの設定を確認してもらってください。`,
                ephemeral: true
            })
            return
        }
    } catch (error) {
        await interaction.reply({
            content: `❌ VoiceVoxサーバーに接続できません（${VOICEVOX_API_URL}）\n\n**考えられる原因:**\n• VoiceVoxサーバーが起動していない\n• ネットワーク接続の問題\n• サーバー設定の問題\n\n管理者にご相談ください。`,
            ephemeral: true
        })
        return
    }
    const voiceChannel = interaction.options.getChannel('voice_channel', true) as VoiceChannel
    const textChannel = interaction.options.getChannel('text_channel') as TextChannel || interaction.channel as TextChannel
    
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.reply({
            content: '❌ 有効なボイスチャンネルを指定してください。',
            ephemeral: true
        })
        return
    }
    
    if (!textChannel || textChannel.type !== ChannelType.GuildText) {
        await interaction.reply({
            content: '❌ 有効なテキストチャンネルを指定してください。',
            ephemeral: true
        })
        return
    }
    
    // ボイスチャンネルに接続
    const connection = await joinVoiceChannelById(interaction.client, interaction.guild!.id, voiceChannel.id)
    
    if (!connection) {
        await interaction.reply({
            content: '❌ ボイスチャンネルへの接続に失敗しました。',
            ephemeral: true
        })
        return
    }
    
    // 設定を保存
    setVoiceChannelConfig(interaction.guild!.id, voiceChannel.id, textChannel.id)
    
    await interaction.reply({
        content: `✅ 音声読み上げを開始しました！\n🔊 ボイスチャンネル: <#${voiceChannel.id}>\n📝 テキストチャンネル: <#${textChannel.id}>\n\n**VoiceVoxずんだもん**が<#${textChannel.id}>のメッセージを読み上げます。`,
        ephemeral: false
    })
    
    console.log(`✅ [voice_tts] 読み上げ開始: ${interaction.guild!.name} - VC:${voiceChannel.name} TC:${textChannel.name}`)
}

async function handleLeaveCommand(interaction: ChatInputCommandInteraction) {
    // ボイスチャンネルから切断
    leaveVoiceChannel(interaction.guild!.id)
    
    // 設定を削除
    removeVoiceChannelConfig(interaction.guild!.id)
    
    await interaction.reply({
        content: '✅ ボイスチャンネルから切断し、音声読み上げを停止しました。',
        ephemeral: false
    })
    
    console.log(`✅ [voice_tts] 読み上げ停止: ${interaction.guild!.name}`)
}

async function handleStatusCommand(interaction: ChatInputCommandInteraction) {
    // 現在の設定を確認（voice_tts.tsから設定読み込み関数をエクスポートする必要がある）
    const fs = await import('fs')
    const path = await import('path')
    
    const VOICE_CONFIG_FILE = path.resolve(__dirname, '../data/voice_channels.json')
    
    let config: any = {}
    try {
        if (fs.existsSync(VOICE_CONFIG_FILE)) {
            const data = fs.readFileSync(VOICE_CONFIG_FILE, 'utf8')
            config = JSON.parse(data)
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error)
    }
    
    const guildConfig = config[interaction.guild!.id]
    
    if (!guildConfig) {
        await interaction.reply({
            content: '❌ このサーバーでは音声読み上げが設定されていません。\n`/voice_tts join` で設定してください。',
            ephemeral: true
        })
        return
    }
    
    const voiceChannel = interaction.guild!.channels.cache.get(guildConfig.voiceChannelId)
    const textChannel = interaction.guild!.channels.cache.get(guildConfig.textChannelId)
    const settings = getVoiceSettings(interaction.guild!.id)
    
    await interaction.reply({
        content: `📊 **音声読み上げ設定状況**\n\n🔊 ボイスチャンネル: ${voiceChannel ? `<#${voiceChannel.id}>` : '❌ チャンネルが見つかりません'}\n📝 テキストチャンネル: ${textChannel ? `<#${textChannel.id}>` : '❌ チャンネルが見つかりません'}\n\n� **音声設定**\n🎤 音声モデル: ${getSpeakerName(settings.speakerId)}\n⚡ 読み上げ速度: ${settings.speed}倍\n🎶 音の高さ: ${settings.pitch > 0 ? '+' : ''}${settings.pitch}`,
        ephemeral: true
    })
}

async function handleSettingsCommand(interaction: ChatInputCommandInteraction) {
    const speakerId = interaction.options.getString('speaker')
    const speed = interaction.options.getNumber('speed')
    const pitch = interaction.options.getNumber('pitch')
    
    if (!speakerId && speed === null && pitch === null) {
        await interaction.reply({
            content: '❌ 少なくとも1つの設定項目を指定してください。',
            ephemeral: true
        })
        return
    }
    
    // 設定を更新
    const updates: any = {}
    if (speakerId) updates.speakerId = parseInt(speakerId)
    if (speed !== null) updates.speed = speed
    if (pitch !== null) updates.pitch = pitch
    
    updateVoiceSettings(interaction.guild!.id, updates)
    
    // 更新された設定を取得して表示
    const newSettings = getVoiceSettings(interaction.guild!.id)
    
    let changesText = '🎵 **音声設定を更新しました！**\n\n'
    if (speakerId) changesText += `🎤 音声モデル: ${getSpeakerName(newSettings.speakerId)}\n`
    if (speed !== null) changesText += `⚡ 読み上げ速度: ${newSettings.speed}倍\n`
    if (pitch !== null) changesText += `🎶 音の高さ: ${newSettings.pitch > 0 ? '+' : ''}${newSettings.pitch}\n`
    
    changesText += '\n次回の読み上げから新しい設定が適用されます。'
    
    await interaction.reply({
        content: changesText,
        ephemeral: false
    })
    
    console.log(`✅ [voice_tts] 設定更新: ${interaction.guild!.name}`, updates)
}
