import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { getTranslationStore } from '../translation'

const languages = [
    { name: '英語（米国）', value: 'EN-US' }, { name: '英語（英国）', value: 'EN-GB' },
    { name: '日本語', value: 'JA' }, { name: '韓国語', value: 'KO' },
    { name: '中国語（簡体字）', value: 'ZH-HANS' }, { name: '中国語（繁体字）', value: 'ZH-HANT' },
    { name: 'フランス語', value: 'FR' }, { name: 'ドイツ語', value: 'DE' },
    { name: 'スペイン語', value: 'ES' }, { name: 'ポルトガル語（ブラジル）', value: 'PT-BR' },
    { name: 'イタリア語', value: 'IT' }, { name: 'ロシア語', value: 'RU' },
    { name: 'ウクライナ語', value: 'UK' }, { name: 'インドネシア語', value: 'ID' },
]

export const data = new SlashCommandBuilder()
    .setName('translate').setDescription('指定ユーザー宛てのメンション・返信を自動翻訳')
    .setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('set').setDescription('対象ユーザーと言語を登録・更新')
        .addChannelOption(o => o.setName('channel').setDescription('翻訳するテキストチャンネル').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('メッセージの受信者').setRequired(true))
        .addStringOption(o => o.setName('language').setDescription('翻訳先の言語').setRequired(true).addChoices(...languages)))
    .addSubcommand(s => s.setName('remove').setDescription('対象ユーザーの登録を解除')
        .addChannelOption(o => o.setName('channel').setDescription('対象チャンネル').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('解除するユーザー').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('チャンネルの翻訳設定を表示')
        .addChannelOption(o => o.setName('channel').setDescription('対象チャンネル').addChannelTypes(ChannelType.GuildText).setRequired(true)))

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'サーバー管理権限が必要です。', ephemeral: true }); return
    }
    await interaction.deferReply({ ephemeral: true })
    const channelId = interaction.options.getChannel('channel', true).id
    const channel = await interaction.guild?.channels.fetch(channelId)
    if (!channel || channel.type !== ChannelType.GuildText || !channel.permissionsFor(interaction.user)?.has(PermissionFlagsBits.ViewChannel)) {
        await interaction.editReply('閲覧できるサーバーのテキストチャンネルを指定してください。'); return
    }
    const store = getTranslationStore()
    const command = interaction.options.getSubcommand()
    if (command === 'list') {
        const rules = store.list(interaction.guildId, channelId)
        await interaction.editReply({ content: rules.length ? rules.map(r => `<@${r.userId}> → ${r.language}`).join('\n') : '登録はありません。', allowedMentions: { parse: [] } }); return
    }
    const user = interaction.options.getUser('user', true)
    const key = { guildId: interaction.guildId, channelId, userId: user.id }
    if (command === 'remove') {
        store.remove(key)
        await interaction.editReply('翻訳対象の登録を解除しました。'); return
    }
    if (!process.env.DEEPL_API_KEY) {
        await interaction.editReply('Railway Variables に DEEPL_API_KEY を設定してください。'); return
    }
    const me = interaction.guild?.members.me
    if (!me || !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory])) {
        await interaction.editReply('Botに対象チャンネルの閲覧・メッセージ送信・履歴閲覧権限が必要です。'); return
    }
    if (user.bot || !await interaction.guild?.members.fetch(user.id).catch(() => null)) {
        await interaction.editReply('このサーバーに参加しているBot以外のユーザーを指定してください。'); return
    }
    const current = store.list(interaction.guildId, channelId)
    if (current.length >= 20 && !current.some(r => r.userId === user.id)) {
        await interaction.editReply('登録は1チャンネルにつき20ユーザーまでです。'); return
    }
    const language = interaction.options.getString('language', true)
    store.set({ ...key, language })
    await interaction.editReply({ content: `<#${channelId}> で <@${user.id}> へのメンション・返信を ${language} に翻訳します。対象本文をDeepLに送信し、訳文は同じチャンネルに返信します。`, allowedMentions: { parse: [] } })
}
