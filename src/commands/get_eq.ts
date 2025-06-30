import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'

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

        // 震度画像URL
        let shindoImageUrl: string | undefined = undefined
        switch (maxScale) {
            case 10: shindoImageUrl = 'https://gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613'; break
            case 20: shindoImageUrl = 'https://gyazo.com/32a63f749d9a95b1bd4c610ac54c3639'; break
            case 30: shindoImageUrl = 'https://gyazo.com/af3a39eebdc321ae76eab731e60eb110'; break
            case 40: shindoImageUrl = 'https://gyazo.com/39351fbdd780e0db5a1b4b24b0dfd025'; break
            case 45: shindoImageUrl = 'https://gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29'; break
            case 50: shindoImageUrl = 'https://gyazo.com/3cd7bab33cf0682e57ece10df2189988'; break
            case 55: shindoImageUrl = 'https://gyazo.com/77c3a1e02e8fcb0239afa5e4388146be'; break
            case 60: shindoImageUrl = 'https://gyazo.com/8ca22b91e82cc578dffed126f3987fbb'; break
            case 70: shindoImageUrl = 'https://gyazo.com/74b556e4e716116e546e0638ab9e5db4'; break
            default: shindoImageUrl = undefined
        }

        // 埋め込み作成
        const embed = new EmbedBuilder()
            .setTitle('**地震速報**') // 最大サイズの太字
            .setColor(0x2d3be7)
            .setDescription(
                `${text ? text + '\n' : ''}` +
                `\n` +
                `**震源**　${hypocenter}\n` +
                `**規模**　M${magnitude}\n` +
                `**深さ**　${depth}\n` +
                `**発生時刻**　${time}\n`
            )

        // 震度画像を右上サムネイルに
        if (shindoImageUrl) {
            embed.setThumbnail(shindoImageUrl)
        }

        // 震度分布画像（気象庁公式）を埋め込み画像に
        const response = await fetch(jmaImageUrl)
        if (response.ok) {
            embed.setImage(jmaImageUrl)
        }

        // フッターに出典
        embed.setFooter({ text: 'Earthquake Information by JMA ・ ' + (time || '') })

        await interaction.editReply({ embeds: [embed] })
    } catch (e) {
        console.error(e)
        await interaction.editReply('地震情報の取得中にエラーが発生しました。')
    }
}