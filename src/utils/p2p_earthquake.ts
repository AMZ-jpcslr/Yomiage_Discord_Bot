/**
 * P2P地震情報API用の地震データ処理
 */

import { EmbedBuilder } from 'discord.js'

// マップ生成用データ型
interface EarthquakeMapData {
    longitude: number
    latitude: number
    magnitude: number
    depth: number
    hypocenter: string
    maxScale: string
    originTime: string
}

interface AreaInfo {
    epicenter: [number, number]
    areas: { [key: string]: [number, number][] }
}

// P2P地震情報APIのデータ型定義
export interface P2PQuakeData {
    id: string
    code: number
    time: string
    created_at?: string
    earthquake: {
        time: string
        hypocenter: {
            name: string
            latitude: number
            longitude: number
            depth: number
            magnitude: number
        }
        maxScale: number
        domesticTsunami: string
        foreignTsunami: string
    }
    issue: {
        source: string
        time: string
        type: string
        correct?: string
    }
    points: Array<{
        pref: string
        addr: string
        scale: number
        isArea: boolean
    }>
    comments?: {
        freeFormComment?: string
    }
    user_agent?: string
    ver?: string
}

// 震度コードから震度文字列への変換
function scaleCodeToString(scale: number): string {
    const scaleMap: { [key: number]: string } = {
        10: '1',
        20: '2', 
        30: '3',
        40: '4',
        45: '5弱',
        50: '5強',
        55: '6弱',
        60: '6強',
        70: '7'
    }
    return scaleMap[scale] || '不明'
}

/**
 * P2P地震情報APIから最新の地震データを取得
 */
export async function fetchP2PQuakeData(): Promise<P2PQuakeData[] | null> {
    try {
        console.log('📡 P2P地震情報APIから最新データを取得中...')
        
        const response = await fetch('https://api.p2pquake.net/v2/jma/quake?limit=10&order=-1')
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data || data.length === 0) {
            console.log('⚠️ 地震データが見つかりません')
            return null
        }
        
        console.log(`✅ P2P地震情報データ取得成功: ${data.length}件`)
        
        return data as P2PQuakeData[]
        
    } catch (error) {
        console.error('❌ P2P地震情報API取得エラー:', error)
        return null
    }
}

/**
 * P2P地震情報データをマップ生成用に変換
 */
export function convertP2PDataToMapData(p2pData: P2PQuakeData): { earthquakeData: EarthquakeMapData, areaInfo: AreaInfo } {
    console.log('🔄 P2P地震情報データをマップ用に変換中...')
    
    const earthquakeData = {
        longitude: p2pData.earthquake.hypocenter.longitude,
        latitude: p2pData.earthquake.hypocenter.latitude,
        magnitude: p2pData.earthquake.hypocenter.magnitude,
        depth: p2pData.earthquake.hypocenter.depth,
        hypocenter: p2pData.earthquake.hypocenter.name,
        maxScale: scaleCodeToString(p2pData.earthquake.maxScale),
        originTime: p2pData.earthquake.time
    }
    
    // 震度分布データを変換
    const areas: { [key: string]: [number, number][] } = {}
    
    for (const point of p2pData.points) {
        const intensityKey = scaleCodeToString(point.scale)
        
        if (!areas[intensityKey]) {
            areas[intensityKey] = []
        }
        
        // 座標推定（簡易的）- 実際の座標データがない場合の対応
        const coords = estimateCoordinatesFromAddress(point.pref)
        if (coords) {
            areas[intensityKey].push(coords)
        }
    }
    
    const areaInfo: AreaInfo = { 
        epicenter: [earthquakeData.longitude, earthquakeData.latitude],
        areas 
    }
    
    console.log('✅ P2P地震情報データ変換完了:')
    console.log(`  震源地: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`)
    console.log(`  震度地点数: ${Object.values(areas).reduce((sum, coords) => sum + coords.length, 0)}`)
    
    return { earthquakeData, areaInfo }
}

/**
 * P2P地震情報からDiscord埋め込みを作成
 */
export function createP2PEarthquakeEmbed(p2pData: P2PQuakeData): EmbedBuilder {
    console.log('📝 P2P地震情報埋め込み作成中...')
    
    const embed = new EmbedBuilder()
        .setTitle('🚨 地震情報 (P2P地震情報)')
        .setColor('#ff0000')
        .setTimestamp(new Date(p2pData.time))
    
    // 震源地情報
    embed.addFields({
        name: '📍 震源地',
        value: p2pData.earthquake.hypocenter.name || '不明',
        inline: true
    })
    
    // マグニチュード
    embed.addFields({
        name: '📊 マグニチュード',
        value: `M${p2pData.earthquake.hypocenter.magnitude}`,
        inline: true
    })
    
    // 最大震度
    embed.addFields({
        name: '🎯 最大震度',
        value: scaleCodeToString(p2pData.earthquake.maxScale),
        inline: true
    })
    
    // 深さ
    embed.addFields({
        name: '📏 深さ',
        value: `約${p2pData.earthquake.hypocenter.depth}km`,
        inline: true
    })
    
    // 発生時刻
    embed.addFields({
        name: '⏰ 発生時刻',
        value: p2pData.earthquake.time,
        inline: true
    })
    
    // 津波情報
    const tsunamiInfo = p2pData.earthquake.domesticTsunami
    if (tsunamiInfo && tsunamiInfo !== 'None') {
        embed.addFields({
            name: '🌊 津波',
            value: tsunamiInfo,
            inline: true
        })
    }
    
    // 震度分布（主要地点）
    const mainPoints = p2pData.points
        .filter(point => point.scale >= 30) // 震度3以上
        .slice(0, 10) // 最大10地点
        .map(point => `${point.pref} ${point.addr}: 震度${scaleCodeToString(point.scale)}`)
        .join('\n')
    
    if (mainPoints) {
        embed.addFields({
            name: '📍 主な震度分布',
            value: mainPoints || '情報なし',
            inline: false
        })
    }
    
    // 情報源
    embed.setFooter({
        text: `${p2pData.issue.source} | P2P地震情報 | ID: ${p2pData.id}`
    })
    
    console.log('✅ P2P地震情報埋め込み作成完了')
    return embed
}

/**
 * 地名から座標を推定（簡易版）
 */
function estimateCoordinatesFromAddress(pref: string): [number, number] | null {
    // 簡易的な都道府県中心座標データベース
    const prefCoords: { [key: string]: [number, number] } = {
        '北海道': [142.7, 43.2],
        '青森県': [140.7, 40.8],
        '岩手県': [141.2, 39.7],
        '宮城県': [140.9, 38.3],
        '秋田県': [140.1, 39.7],
        '山形県': [140.4, 38.2],
        '福島県': [140.5, 37.8],
        '茨城県': [140.4, 36.3],
        '栃木県': [139.9, 36.6],
        '群馬県': [139.1, 36.4],
        '埼玉県': [139.6, 35.9],
        '千葉県': [140.1, 35.6],
        '東京都': [139.7, 35.7],
        '神奈川県': [139.4, 35.4],
        '新潟県': [139.0, 37.5],
        '富山県': [137.2, 36.7],
        '石川県': [136.6, 36.6],
        '福井県': [136.2, 35.9],
        '山梨県': [138.6, 35.7],
        '長野県': [138.2, 36.2],
        '岐阜県': [137.2, 35.4],
        '静岡県': [138.4, 34.9],
        '愛知県': [137.0, 35.2],
        '三重県': [136.5, 34.7],
        '滋賀県': [136.0, 35.0],
        '京都府': [135.8, 35.0],
        '大阪府': [135.5, 34.7],
        '兵庫県': [135.2, 34.7],
        '奈良県': [135.8, 34.4],
        '和歌山県': [135.2, 34.2],
        '鳥取県': [134.2, 35.5],
        '島根県': [132.6, 35.5],
        '岡山県': [133.9, 34.7],
        '広島県': [132.5, 34.4],
        '山口県': [131.5, 34.2],
        '徳島県': [134.6, 34.1],
        '香川県': [134.0, 34.3],
        '愛媛県': [132.8, 33.8],
        '高知県': [133.5, 33.6],
        '福岡県': [130.4, 33.6],
        '佐賀県': [130.3, 33.2],
        '長崎県': [129.9, 32.8],
        '熊本県': [130.7, 32.8],
        '大分県': [131.6, 33.2],
        '宮崎県': [131.4, 31.9],
        '鹿児島県': [130.6, 31.6],
        '沖縄県': [127.7, 26.2]
    }
    
    return prefCoords[pref] || null
}
