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

// 震度文字列から震度コードへの変換（比較用）
function scaleStringToCode(scale: string): number {
    const scaleMap: { [key: string]: number } = {
        '1': 10,
        '2': 20, 
        '3': 30,
        '4': 40,
        '5弱': 45,
        '5強': 50,
        '6弱': 55,
        '6強': 60,
        '7': 70,
        '不明': 0
    }
    return scaleMap[scale] || 0
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
    
    // 震度分布データを変換（より詳細に）
    const areas: { [key: string]: [number, number][] } = {}
    const prefectureIntensityMap: { [key: string]: string } = {}
    
    for (const point of p2pData.points) {
        const intensityKey = scaleCodeToString(point.scale)
        
        if (!areas[intensityKey]) {
            areas[intensityKey] = []
        }
        
        // 都道府県名を抽出
        const prefName = point.pref
        
        // 座標推定（都道府県レベル）
        const coords = estimateCoordinatesFromAddress(prefName)
        if (coords) {
            areas[intensityKey].push(coords)
            // 都道府県ごとの最大震度を記録
            if (!prefectureIntensityMap[prefName] || 
                scaleStringToCode(intensityKey) > scaleStringToCode(prefectureIntensityMap[prefName])) {
                prefectureIntensityMap[prefName] = intensityKey
            }
        }
    }
    
    const areaInfo: AreaInfo = { 
        epicenter: [earthquakeData.longitude, earthquakeData.latitude],
        areas 
    }
    
    console.log('✅ P2P地震情報データ変換完了:')
    console.log(`  震源地: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`)
    console.log(`  震度地点数: ${Object.values(areas).reduce((sum, coords) => sum + coords.length, 0)}`)
    console.log(`  都道府県震度分布:`, prefectureIntensityMap)
    
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

// 都道府県の中心座標データ（概算）
const PREFECTURE_COORDINATES: { [key: string]: [number, number] } = {
    '北海道': [143.0642, 43.2203],
    '青森県': [140.7402, 40.8244],
    '岩手県': [141.1527, 39.7036],
    '宮城県': [140.8719, 38.2682],
    '秋田県': [140.1024, 39.7186],
    '山形県': [140.3633, 38.2404],
    '福島県': [140.4677, 37.7503],
    '茨城県': [140.4467, 36.3418],
    '栃木県': [139.8836, 36.5657],
    '群馬県': [139.0608, 36.3910],
    '埼玉県': [139.6489, 35.8617],
    '千葉県': [140.1233, 35.6047],
    '東京都': [139.6917, 35.6895],
    '神奈川県': [139.6425, 35.4478],
    '新潟県': [139.0235, 37.9026],
    '富山県': [137.2112, 36.6953],
    '石川県': [136.6256, 36.5944],
    '福井県': [136.2220, 35.9434],
    '山梨県': [138.5683, 35.6636],
    '長野県': [138.1810, 36.6513],
    '岐阜県': [137.2112, 35.3912],
    '静岡県': [138.3829, 34.9769],
    '愛知県': [137.1805, 35.1802],
    '三重県': [136.5086, 34.7303],
    '滋賀県': [135.8686, 35.0045],
    '京都府': [135.7556, 35.0116],
    '大阪府': [135.5200, 34.6937],
    '兵庫県': [134.6900, 34.6913],
    '奈良県': [135.8325, 34.6851],
    '和歌山県': [135.1671, 34.2261],
    '鳥取県': [134.2377, 35.5036],
    '島根県': [133.0505, 35.4722],
    '岡山県': [133.9344, 34.6617],
    '広島県': [132.4596, 34.3963],
    '山口県': [131.4706, 34.3860],
    '徳島県': [134.5594, 34.0658],
    '香川県': [134.0434, 34.3401],
    '愛媛県': [132.7657, 33.8416],
    '高知県': [133.5311, 33.5597],
    '福岡県': [130.4184, 33.6064],
    '佐賀県': [130.2989, 33.2494],
    '長崎県': [129.8737, 32.7445],
    '熊本県': [130.7417, 32.7898],
    '大分県': [131.6127, 33.2382],
    '宮崎県': [131.4214, 31.9110],
    '鹿児島県': [130.5581, 31.5602],
    '沖縄県': [127.6792, 26.2124]
}

/**
 * 住所から座標を推定（都道府県レベル）
 */
function estimateCoordinatesFromAddress(address: string): [number, number] | null {
    // 都道府県名を抽出
    for (const pref in PREFECTURE_COORDINATES) {
        if (address.includes(pref) || address.includes(pref.replace('県', '').replace('府', '').replace('都', '').replace('道', ''))) {
            return PREFECTURE_COORDINATES[pref]
        }
    }
    
    console.log(`⚠️ 座標推定失敗: ${address}`)
    return null
}
