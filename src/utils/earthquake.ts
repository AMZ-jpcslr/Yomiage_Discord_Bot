import { EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { generateEarthquakeMap, extractEarthquakeMapData } from './mapGenerator'
import * as path from 'path'

// 震度値を文字列に変換する関数
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

// 震度画像URLを取得する関数
function getShindoImageUrl(maxScale: any): string | undefined {
    switch (String(maxScale)) {
        case '1': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png'
        case '2': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png'
        case '3': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png'
        case '4': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png'
        case '5-': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png'
        case '5+': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png'
        case '6-': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png'
        case '6+': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png'
        case '7': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png'
        // 数値形式の場合も対応（旧形式）
        case '10': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png'
        case '20': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png'
        case '30': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png'
        case '40': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png'
        case '45': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png'
        case '50': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png'
        case '55': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png'
        case '60': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png'
        case '70': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png'
        default: return undefined
    }
}

// 地震情報の埋め込みを作成する共通関数
export async function createEarthquakeEmbed(latestId: string, isAutoNotify = false): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] }> {
    const detailRes = await fetch(`https://www.jma.go.jp/bosai/quake/data/${latestId}`)
    const detail = await detailRes.json() as any

    const time = detail.Head?.ReportDateTime ?? '不明'
    const hypocenter = detail.Body?.Earthquake?.Hypocenter?.Area?.Name ?? '不明'
    const magnitude = detail.Body?.Earthquake?.Magnitude ?? '不明'
    const maxScale = detail.Body?.Intensity?.Observation?.MaxInt ?? '不明'
    const depth = detail.Body?.Earthquake?.Hypocenter?.Area?.Depth ?? '不明'
    const text = detail.Head?.Text ?? ''
    const maxScaleStr = maxScale !== '不明' ? maxScaleToString(Number(maxScale)) : '不明'

    // 震度画像URL取得
    const shindoImageUrl = getShindoImageUrl(maxScale)

    // 独自の地震マップ画像を生成
    let generatedMapPath: string | null = null
    let attachments: AttachmentBuilder[] = []
    
    try {
        const earthquakeMapData = extractEarthquakeMapData(detail)
        generatedMapPath = await generateEarthquakeMap(earthquakeMapData)
        
        // 生成された画像をDiscordの添付ファイルとして準備
        const attachment = new AttachmentBuilder(generatedMapPath, { 
            name: 'earthquake_map.png' 
        })
        attachments.push(attachment)
        console.log('独自地震マップ画像を生成しました:', generatedMapPath)
    } catch (error) {
        console.error('地震マップ画像生成エラー:', error)
    }

    // 埋め込み作成
    const title = isAutoNotify ? '🚨 【自動通知】地震情報' : '🚨 地震情報'
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0xff4444)
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

    // 震度画像を右上サムネイルに設定
    if (shindoImageUrl) {
        embed.setThumbnail(shindoImageUrl)
    }

    // 生成された地震マップ画像をメイン画像として設定
    if (generatedMapPath) {
        embed.setImage('attachment://earthquake_map.png')
        console.log('生成された地震マップをメイン画像に設定')
    }

    // フッター設定
    embed.setFooter({ 
        text: 'Earthquake Information by JMA', 
        iconURL: 'https://www.jma.go.jp/jma/kishou/favicon.ico' 
    })
    embed.setTimestamp(new Date())

    return { embed, files: attachments.length > 0 ? attachments : undefined }
}
