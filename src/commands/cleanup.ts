/**
 * BOTメッセージ一括削除コマンド
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js'

export const data = new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('BOTが送信したメッセージを一括削除します')
    .addIntegerOption(option =>
        option.setName('count')
            .setDescription('削除するメッセージ数（1-100）')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
    )
    .addBooleanOption(option =>
        option.setName('confirm')
            .setDescription('削除を実行するかの確認（trueで実行）')
            .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const count = interaction.options.getInteger('count', true)
        const confirm = interaction.options.getBoolean('confirm') ?? false
        const channel = interaction.channel

        // チャンネルがテキストチャンネルかどうか確認
        if (!channel || !channel.isTextBased()) {
            await interaction.reply({
                content: '❌ このコマンドはテキストチャンネルでのみ使用できます。',
                ephemeral: true
            })
            return
        }

        // 確認なしの場合は確認メッセージを表示
        if (!confirm) {
            await interaction.reply({
                content: `⚠️ **BOTメッセージ削除の確認**\n\n` +
                        `📊 削除対象: BOTが送信した最新${count}件のメッセージ\n` +
                        `📍 対象チャンネル: ${channel}\n\n` +
                        `🔄 削除を実行するには、以下のコマンドを実行してください:\n` +
                        `\`/cleanup count:${count} confirm:true\`\n\n` +
                        `⚠️ **注意**: 削除されたメッセージは復元できません。`,
                ephemeral: true
            })
            return
        }

        await interaction.deferReply({ ephemeral: true })

        const textChannel = channel as TextChannel
        const botId = interaction.client.user?.id

        if (!botId) {
            await interaction.editReply({
                content: '❌ BOTの情報を取得できませんでした。'
            })
            return
        }

        console.log(`🗑️ BOTメッセージ削除開始: チャンネル ${textChannel.name}, 最大${count}件`)

        // メッセージを取得（最新から）
        let deletedCount = 0
        let fetchedCount = 0
        const maxFetch = Math.min(count * 5, 500) // 効率的に検索するため、要求数の5倍まで取得

        const messages = await textChannel.messages.fetch({ 
            limit: maxFetch,
            cache: false 
        })

        console.log(`📥 取得したメッセージ数: ${messages.size}件`)

        // BOTが送信したメッセージをフィルタリング
        const botMessages = messages.filter(msg => msg.author.id === botId)
        console.log(`🤖 BOTメッセージ数: ${botMessages.size}件`)

        // 指定された数まで削除
        const messagesToDelete = botMessages.first(count)
        
        if (messagesToDelete.length === 0) {
            await interaction.editReply({
                content: `ℹ️ 削除対象のBOTメッセージが見つかりませんでした。\n` +
                        `最新${maxFetch}件のメッセージ中にBOTのメッセージがありません。`
            })
            return
        }

        // 14日以上古いメッセージは個別削除が必要
        const now = Date.now()
        const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000)
        
        const recentMessages = []
        const oldMessages = []

        for (const message of messagesToDelete) {
            if (message.createdTimestamp > twoWeeksAgo) {
                recentMessages.push(message)
            } else {
                oldMessages.push(message)
            }
        }

        console.log(`📅 最近のメッセージ: ${recentMessages.length}件, 古いメッセージ: ${oldMessages.length}件`)

        // 一括削除（最近のメッセージ）
        if (recentMessages.length > 0) {
            try {
                if (recentMessages.length === 1) {
                    await recentMessages[0].delete()
                    deletedCount += 1
                } else {
                    await textChannel.bulkDelete(recentMessages, true)
                    deletedCount += recentMessages.length
                }
                console.log(`✅ 一括削除完了: ${recentMessages.length}件`)
            } catch (error) {
                console.error('❌ 一括削除エラー:', error)
                await interaction.editReply({
                    content: `❌ メッセージの一括削除中にエラーが発生しました: ${error}`
                })
                return
            }
        }

        // 個別削除（古いメッセージ）
        if (oldMessages.length > 0) {
            console.log(`🕐 古いメッセージを個別削除中: ${oldMessages.length}件`)
            
            for (const message of oldMessages) {
                try {
                    await message.delete()
                    deletedCount += 1
                    
                    // レート制限を避けるため少し待機
                    if (oldMessages.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                } catch (error) {
                    console.error(`❌ メッセージ削除エラー (ID: ${message.id}):`, error)
                    // 個別のエラーは継続
                }
            }
            console.log(`✅ 個別削除完了: ${oldMessages.length}件中${deletedCount - recentMessages.length}件成功`)
        }

        // 結果を報告
        await interaction.editReply({
            content: `✅ **BOTメッセージ削除完了**\n\n` +
                    `🗑️ 削除されたメッセージ数: **${deletedCount}件**\n` +
                    `📊 要求された削除数: ${count}件\n` +
                    `📍 対象チャンネル: ${textChannel}\n\n` +
                    `${oldMessages.length > 0 ? `⏰ ${oldMessages.length}件の古いメッセージを個別削除しました\n` : ''}` +
                    `${deletedCount < count ? `⚠️ 一部のメッセージが削除できませんでした（権限不足または既に削除済み）` : ''}`
        })

        console.log(`✅ BOTメッセージ削除完了: ${deletedCount}件削除`)

    } catch (error) {
        console.error('❌ BOTメッセージ削除コマンドエラー:', error)
        
        const errorMessage = '❌ メッセージの削除中にエラーが発生しました。BOTに適切な権限があることを確認してください。'
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: errorMessage })
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true })
        }
    }
}
