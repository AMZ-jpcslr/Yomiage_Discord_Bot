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
        
        console.log('最新地震ID:', latestId)
        console.log('生成された画像URL:', jmaImageUrl)

        const detailRes = await fetch(`https://www.jma.go.jp/bosai/quake/data/${latestId}`)
        const detail = await detailRes.json() as any
        
        console.log('地震詳細データ構造:', JSON.stringify(detail, null, 2).substring(0, 500) + '...')

        const time = detail.Head?.ReportDateTime ?? '不明'
        const hypocenter = detail.Body?.Earthquake?.Hypocenter?.Area?.Name ?? '不明'
        const magnitude = detail.Body?.Earthquake?.Magnitude ?? '不明'
        const maxScale = detail.Body?.Intensity?.Observation?.MaxInt ?? '不明'
        const depth = detail.Body?.Earthquake?.Hypocenter?.Area?.Depth ?? '不明'
        const text = detail.Head?.Text ?? ''
        const maxScaleStr = maxScale !== '不明' ? maxScaleToString(Number(maxScale)) : '不明'

        // 震度画像URL（文字列形式に対応）
        let shindoImageUrl: string | undefined = undefined
        console.log('生の震度値:', maxScale, '型:', typeof maxScale)
        
        // 震度値の変換（文字列の場合も対応）
        switch (String(maxScale)) {
            case '1': shindoImageUrl = 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png'; break
            case '2': shindoImageUrl = 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png'; break
            case '3': shindoImageUrl = 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png'; break
            case '4': shindoImageUrl = 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png'; break
            case '5-': shindoImageUrl = 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png'; break
            case '5+': shindoImageUrl = 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png'; break
            case '6-': shindoImageUrl = 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png'; break
            case '6+': shindoImageUrl = 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png'; break
            case '7': shindoImageUrl = 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png'; break
            // 数値形式の場合も対応（旧形式）
            case '10': shindoImageUrl = 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png'; break
            case '20': shindoImageUrl = 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png'; break
            case '30': shindoImageUrl = 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png'; break
            case '40': shindoImageUrl = 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png'; break
            case '45': shindoImageUrl = 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png'; break
            case '50': shindoImageUrl = 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png'; break
            case '55': shindoImageUrl = 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png'; break
            case '60': shindoImageUrl = 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png'; break
            case '70': shindoImageUrl = 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png'; break
            default: 
                console.log('対応していない震度値:', maxScale)
                shindoImageUrl = undefined
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

        console.log('震度値:', maxScale, '型:', typeof maxScale)
        console.log('震度画像URL:', shindoImageUrl)
        console.log('気象庁画像URL:', jmaImageUrl)

        // 震度画像を右上サムネイルに設定
        if (shindoImageUrl) {
            embed.setThumbnail(shindoImageUrl)
            console.log('サムネイル設定完了:', shindoImageUrl)
        } else {
            console.log('震度画像URLが設定されていません')
        }

        // 気象庁の震度分布画像をメイン画像に設定
        console.log('気象庁画像URL確認中:', jmaImageUrl)
        
        // 画像URLの存在確認
        try {
            const imageCheckResponse = await fetch(jmaImageUrl, { method: 'HEAD' })
            console.log('画像URL確認結果:', imageCheckResponse.status)
            
            if (imageCheckResponse.ok) {
                embed.setImage(jmaImageUrl)
                console.log('メイン画像設定完了:', jmaImageUrl)
            } else {
                console.log('気象庁画像が見つかりません。代替手段を試行中...')
                
                // 代替として震度分布図のリンクを表示
                embed.addFields({ 
                    name: '震度分布図', 
                    value: `[気象庁の震度分布図を確認](https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=011000)`, 
                    inline: false 
                })
            }
        } catch (error) {
            console.log('画像URL確認エラー:', error)
            embed.addFields({ 
                name: '震度分布図', 
                value: `[気象庁の震度分布図を確認](https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=011000)`, 
                inline: false 
            })
        }

        // フッターに出典と時刻
        embed.setFooter({ 
            text: 'Earthquake Information by JMA', 
            iconURL: 'https://www.jma.go.jp/jma/kishou/favicon.ico' 
        })
        embed.setTimestamp(new Date())

        await interaction.editReply({ embeds: [embed] })
    } catch (e) {
        console.error(e)
        await interaction.editReply('地震情報の取得中にエラーが発生しました。')
    }
}