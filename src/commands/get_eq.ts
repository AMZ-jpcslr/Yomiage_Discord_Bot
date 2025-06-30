import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('直近に発表された地震情報を取得します（気象庁データ）')

function maxScaleToString(maxScale: number): string {
    switch (maxScale) {
        case 10: return '1'
        case 20: return '2'
        case 30: return '3'
        case 40: return '4'
        case 45: return '5弱'
        case 50: return '5強'
        case 55: return '6弱'
        case 60: return '6強'
        case 70: return '7'
        default: return String(maxScale)
    }
}

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    try {
        const res = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json')
        const list = await res.json() as { json: string }[]
        if (!list.length) {
            await interaction.editReply('直近の地震情報が見つかりませんでした。')
            return
        }
        const latestId = list[0].json
        const imageUrl = latestId.replace('.json', '.png')
        const jmaImageUrl = `https://www.jma.go.jp/bosai/quake/data/${imageUrl}`

        const detailRes = await fetch(`https://www.jma.go.jp/bosai/quake/data/${latestId}`)
        const detail = await detailRes.json() as any

        const time = detail.Head?.ReportDateTime ?? '不明'
        const hypocenter = detail.Body?.Earthquake?.Hypocenter?.Area?.Name ?? '不明'
        const magnitude = detail.Body?.Earthquake?.Magnitude ?? '不明'
        const maxScale = detail.Body?.Intensity?.Observation?.MaxInt ?? '不明'
        const depth = detail.Body?.Earthquake?.Hypocenter?.Area?.Depth ?? '不明'
        const text = detail.Head?.Text ?? ''
        const maxScaleStr = maxScale !== '不明' ? maxScaleToString(Number(maxScale)) : '不明'

        // 震度画像URL（.png形式を使用）
        let shindoImageUrl: string | undefined = undefined
        switch (maxScale) {
            case 10: shindoImageUrl = 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png'; break
            case 20: shindoImageUrl = 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png'; break
            case 30: shindoImageUrl = 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png'; break
            case 40: shindoImageUrl = 'https://i.gyazo.com/39351fbdd780e0db5a1b4b24b0dfd025.png'; break
            case 45: shindoImageUrl = 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png'; break
            case 50: shindoImageUrl = 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png'; break
            case 55: shindoImageUrl = 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png'; break
            case 60: shindoImageUrl = 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png'; break
            case 70: shindoImageUrl = 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png'; break
            default: shindoImageUrl = undefined
        }

        // 埋め込み作成（テレビ形式）
        const embed = new EmbedBuilder()
            .setTitle('🚨 地震情報')
            .setColor(0xff4444) // 赤色に変更（地震警報らしく）
            .setDescription(
                `**${time.replace(/T/, ' ').replace(/\+09:00/, '')}ごろ、**\n` +
                `**最大震度${maxScaleStr}の地震がありました。**\n` +
                `${text ? text + '\n' : ''}`
            )
            .addFields(
                { name: '震源', value: hypocenter, inline: true },
                { name: '規模', value: `M${magnitude}`, inline: true },
                { name: '深さ', value: `${depth}`, inline: true }
            )

        const attachments: AttachmentBuilder[] = []

        // 震度画像をダウンロードして添付
        if (shindoImageUrl) {
            try {
                const shindoResponse = await fetch(shindoImageUrl)
                if (shindoResponse.ok) {
                    const shindoBuffer = Buffer.from(await shindoResponse.arrayBuffer())
                    const shindoAttachment = new AttachmentBuilder(shindoBuffer, { name: `shindo_${maxScale}.png` })
                    attachments.push(shindoAttachment)
                    embed.setThumbnail(`attachment://shindo_${maxScale}.png`)
                }
            } catch (error) {
                console.log('震度画像の取得に失敗:', error)
            }
        }

        // 震度分布画像をダウンロードして添付
        try {
            const mapResponse = await fetch(jmaImageUrl)
            if (mapResponse.ok) {
                const mapBuffer = Buffer.from(await mapResponse.arrayBuffer())
                const mapAttachment = new AttachmentBuilder(mapBuffer, { name: 'earthquake_map.png' })
                attachments.push(mapAttachment)
                embed.setImage('attachment://earthquake_map.png')
            }
        } catch (error) {
            console.log('地震マップの取得に失敗:', error)
        }

        // フッターに出典と時刻
        embed.setFooter({ 
            text: 'Earthquake Information by JMA', 
            iconURL: 'https://www.jma.go.jp/jma/kishou/favicon.ico' 
        })
        embed.setTimestamp(new Date())

        await interaction.editReply({ embeds: [embed], files: attachments })
    } catch (e) {
        console.error(e)
        await interaction.editReply('地震情報の取得中にエラーが発生しました。')
    }
}