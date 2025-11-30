import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, ChannelType, PermissionsBitField, GuildBasedChannel, TextBasedChannel } from 'discord.js'

export const data = new SlashCommandBuilder()
    .setName('list_channels')
    .setDescription('指定したサーバー（省略時はこのサーバー）の全チャンネルと最終メッセージ時刻を表示します（プライベートチャンネルも含む：BOTが閲覧可能なもの）')
    .addStringOption(option =>
        option
            .setName('guild_id')
            .setDescription('対象のサーバーID（省略するとこのサーバー）')
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const client = interaction.client
    const requestedGuildId = interaction.options.getString('guild_id') ?? interaction.guildId

    if (!requestedGuildId) {
        await interaction.editReply('❌ 対象のサーバーIDが指定されておらず、コマンド実行コンテキストにもサーバー情報がありません。サーバーIDを指定してください。')
        return
    }

    let guild
    try {
        guild = await client.guilds.fetch(requestedGuildId)
    } catch (err) {
        console.error('guild fetch error:', err)
        await interaction.editReply(`❌ サーバーを取得できませんでした: ${requestedGuildId}`)
        return
    }

    // BOTのGuildMember情報
    const me = guild.members.me

    let channels
    try {
        // fetch all channels in the guild
        channels = await guild.channels.fetch()
    } catch (err) {
        console.error('channels fetch error:', err)
        await interaction.editReply('❌ チャンネル一覧の取得に失敗しました（権限不足の可能性があります）。')
        return
    }

    const lines: string[] = []
    lines.push(`# Channels for ${guild.name} (${guild.id})`)
    lines.push('')

    for (const channelRaw of channels.values()) {
        const channel = channelRaw as GuildBasedChannel
        if (!channel) continue
        try {
            // channel.type から分かりやすいラベルを作成
            const typeLabel = ChannelType[channel.type] ?? String(channel.type)

            let lastMsgInfo = 'N/A'

            // テキスト系チャンネルなら最新メッセージを取得し日時を表示する
            const canView = me ? channel.permissionsFor(me)?.has(PermissionsBitField.Flags.ViewChannel) : false

            if (canView && typeof (channel as unknown as TextBasedChannel).isTextBased === 'function' && (channel as unknown as TextBasedChannel).isTextBased()) {
                try {
                    const textCh = channel as unknown as TextBasedChannel
                    // fetch latest message (may fail if no permission to read history)
                    const msgs = await textCh.messages.fetch({ limit: 1 })
                    if (msgs && msgs.size > 0) {
                        const msg = msgs.first()
                        if (msg) lastMsgInfo = new Date(msg.createdTimestamp).toISOString()
                        else lastMsgInfo = 'No messages'
                    } else {
                        lastMsgInfo = 'No messages'
                    }
                } catch (err) {
                    console.error('message fetch error:', err)
                    lastMsgInfo = '権限不足/取得失敗'
                }
            } else {
                // ボイスやカテゴリなど、メッセージ履歴が存在しない場合
                if (typeof (channel as unknown as TextBasedChannel).isTextBased === 'function' && !(channel as unknown as TextBasedChannel).isTextBased()) lastMsgInfo = '-'
                else if (!canView) lastMsgInfo = '権限不足'
                else lastMsgInfo = '-'
            }

            const name = 'name' in channel ? (channel as { name: string }).name : String((channel as unknown as { id: string }).id)
            const cid = (channel as unknown as { id: string }).id
            lines.push(`${name} (${cid}) [${typeLabel}] — ${lastMsgInfo}`)
        } catch (err) {
            // 念のため個別チャンネル処理の失敗はログに残して継続
            console.error('Channel processing error:', err)
        }
    }

    const content = lines.join('\n')

    // Discordのメッセージ長制限を考慮して、長ければファイル添付で返す
    if (content.length > 1900) {
        const buffer = Buffer.from(content, 'utf-8')
        const attachment = new AttachmentBuilder(buffer, { name: `channels_${guild.id}.txt` })
        await interaction.editReply({ content: `📄 チャンネル一覧をファイルで添付します。（${guild.name}）`, files: [attachment] })
    } else {
        await interaction.editReply({ content })
    }
}

export default { data, execute }
