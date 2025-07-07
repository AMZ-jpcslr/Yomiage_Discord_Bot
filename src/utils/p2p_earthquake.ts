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
    // 市町村レベルの詳細情報を追加
    detailedAreas?: { 
        [intensity: string]: Array<{
            prefecture: string
            city: string
            coordinates: [number, number]
            fullAddress: string
        }>
    }
}

// P2P地震情報APIのデータ型定義
export interface P2PQuakeData {
    id: string
    code: number
    time: string
    created_at?: string
    earthquake?: {
        time: string
        hypocenter?: {
            name: string
            latitude?: number
            longitude?: number
            depth?: number
            magnitude?: number
        }
        maxScale?: number
        domesticTsunami?: string
        foreignTsunami?: string
    }
    issue: {
        source: string
        time: string
        type: string
        correct?: string
    }
    points?: Array<{
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
    // 津波情報用
    areas?: Array<{
        grade?: string
        immediate?: boolean
        name?: string
    }>
    // 緊急地震速報用
    cancelled?: boolean
    // その他の情報用
    title?: string
    text?: string
}

// P2P地震情報コード定義
export const P2P_CODES = {
    551: '震度速報',
    552: '震源・震度情報', 
    554: '緊急地震速報（警報）',
    555: '緊急地震速報（予報）',
    556: '緊急地震速報（キャンセル）',
    561: '津波注意報・警報',
    562: '津波予報',
    571: '気象警報・注意報',
    581: '火山情報',
    611: 'その他の防災気象情報'
} as const

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
 * P2P APIから全種別の情報を取得（地震以外も含む）
 */
export async function fetchAllP2PData(): Promise<P2PQuakeData[] | null> {
    try {
        console.log('📡 P2P APIから全種別の最新データを取得中...')
        
        // まず地震情報を取得
        let response = await fetch('https://api.p2pquake.net/v2/jma/quake?limit=10&order=-1')
        
        if (!response.ok) {
            // 地震情報APIが失敗した場合、全般情報APIを試行
            console.log('地震情報API失敗、全般情報APIを試行中...')
            response = await fetch('https://api.p2pquake.net/v2/history?limit=20&order=-1')
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data || data.length === 0) {
            console.log('⚠️ P2P全種別データが見つかりません')
            return null
        }
        
        console.log(`✅ P2P全種別データ取得成功: ${data.length}件`)
        console.log(`取得したコード: ${[...new Set(data.map((item: P2PQuakeData) => item.code))].join(', ')}`)
        
        return data as P2PQuakeData[]
        
    } catch (error) {
        console.error('❌ P2P全種別API取得エラー:', error)
        return null
    }
}

/**
 * P2P地震情報データをマップ生成用に変換（不完全データ対応）
 */
export function convertP2PDataToMapData(p2pData: P2PQuakeData): { earthquakeData: EarthquakeMapData, areaInfo: AreaInfo } | null {
    console.log('🔄 P2P地震情報データをマップ用に変換中...')
    
    // 地震情報が存在しない場合はnullを返す
    if (!p2pData.earthquake || !p2pData.earthquake.hypocenter) {
        console.log('⚠️ 地震情報が不完全なため、マップ生成をスキップ')
        return null
    }
    
    const earthquakeData = {
        longitude: p2pData.earthquake.hypocenter.longitude || 0,
        latitude: p2pData.earthquake.hypocenter.latitude || 0,
        magnitude: p2pData.earthquake.hypocenter.magnitude || 0,
        depth: p2pData.earthquake.hypocenter.depth || 0,
        hypocenter: p2pData.earthquake.hypocenter.name || '不明',
        maxScale: scaleCodeToString(p2pData.earthquake.maxScale || 0),
        originTime: p2pData.earthquake.time || p2pData.time
    }
    
    // 震度分布データを変換（市町村レベル詳細対応）
    const areas: { [key: string]: [number, number][] } = {}
    const detailedAreas: { [intensity: string]: Array<{
        prefecture: string
        city: string
        coordinates: [number, number]
        fullAddress: string
    }> } = {}
    const prefectureIntensityMap: { [key: string]: string } = {}
    
    if (p2pData.points) {
        console.log(`📍 処理する震度観測点数: ${p2pData.points.length}`)
        console.log(`📍 サンプル観測点データ:`)
        p2pData.points.slice(0, 3).forEach((point, idx) => {
            console.log(`  ${idx + 1}. ${point.pref} ${point.addr} - 震度コード${point.scale} → ${scaleCodeToString(point.scale)}`)
        })
        
        for (const point of p2pData.points) {
            const intensityKey = scaleCodeToString(point.scale)
            
            if (!areas[intensityKey]) {
                areas[intensityKey] = []
            }
            if (!detailedAreas[intensityKey]) {
                detailedAreas[intensityKey] = []
            }
            
            // 都道府県名と市町村名を抽出
            const prefName = point.pref
            const fullAddress = point.addr || ''
            
            // 市町村レベルの詳細座標を推定
            const detailedCoords = estimateDetailedCoordinatesFromAddress(prefName, fullAddress)
            if (detailedCoords) {
                areas[intensityKey].push(detailedCoords)
                
                // 詳細情報も保存
                detailedAreas[intensityKey].push({
                    prefecture: prefName,
                    city: fullAddress,
                    coordinates: detailedCoords,
                    fullAddress: `${prefName} ${fullAddress}`
                })
                
                console.log(`  震度${intensityKey}: ${prefName} ${fullAddress} → [${detailedCoords[0].toFixed(3)}, ${detailedCoords[1].toFixed(3)}]`)
            } else {
                // フォールバック: 都道府県レベルの座標
                const coords = estimateCoordinatesFromAddress(prefName)
                if (coords) {
                    areas[intensityKey].push(coords)
                    detailedAreas[intensityKey].push({
                        prefecture: prefName,
                        city: fullAddress,
                        coordinates: coords,
                        fullAddress: `${prefName} ${fullAddress}`
                    })
                    
                    console.log(`  震度${intensityKey}: ${prefName} ${fullAddress} → [${coords[0].toFixed(3)}, ${coords[1].toFixed(3)}] (都道府県レベル)`)
                } else {
                    console.warn(`  ⚠️ 座標推定失敗: ${prefName} ${fullAddress}`)
                }
            }
            
            // 都道府県ごとの最大震度を記録
            if (!prefectureIntensityMap[prefName] || 
                scaleStringToCode(intensityKey) > scaleStringToCode(prefectureIntensityMap[prefName])) {
                prefectureIntensityMap[prefName] = intensityKey
            }
        }
    } else {
        console.warn('⚠️ P2P地震情報に震度観測点データがありません')
    }
    
    const areaInfo: AreaInfo = { 
        epicenter: [earthquakeData.longitude, earthquakeData.latitude],
        areas,
        detailedAreas
    }
    
    console.log('✅ P2P地震情報データ変換完了:')
    console.log(`  震源地: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`)
    console.log(`  震度地点数: ${Object.values(areas).reduce((sum, coords) => sum + coords.length, 0)}`)
    console.log(`  市町村別震度分布:`)
    Object.entries(detailedAreas).forEach(([intensity, locations]) => {
        console.log(`    震度${intensity}: ${locations.length}地域`)
        locations.slice(0, 3).forEach(loc => {
            console.log(`      - ${loc.fullAddress}`)
        })
        if (locations.length > 3) {
            console.log(`      ...他${locations.length - 3}地域`)
        }
    })
    console.log(`  都道府県最大震度分布:`, prefectureIntensityMap)
    
    return { earthquakeData, areaInfo }
}

/**
 * P2P地震情報からDiscord埋め込みを作成（不完全データ対応）
 */
export function createP2PEarthquakeEmbed(p2pData: P2PQuakeData): EmbedBuilder {
    console.log('📝 P2P情報埋め込み作成中...')
    
    const codeDescription = P2P_CODES[p2pData.code as keyof typeof P2P_CODES] || `コード${p2pData.code}`
    
    const embed = new EmbedBuilder()
        .setTitle(`🚨 ${codeDescription} (P2P地震情報)`)
        .setTimestamp(new Date(p2pData.time))
    
    // 情報種別に応じて色を設定
    if (p2pData.code === 551 || p2pData.code === 552) {
        embed.setColor('#ff0000') // 地震情報は赤
    } else if (p2pData.code === 561 || p2pData.code === 562) {
        embed.setColor('#0099ff') // 津波情報は青
    } else if (p2pData.code === 571) {
        embed.setColor('#ff9900') // 気象警報は橙
    } else if (p2pData.code === 581) {
        embed.setColor('#9900ff') // 火山情報は紫
    } else if (p2pData.code >= 554 && p2pData.code <= 556) {
        embed.setColor('#ffff00') // 緊急地震速報は黄
    } else {
        embed.setColor('#666666') // その他は灰色
    }

    // 地震情報の場合
    if (p2pData.earthquake) {
        // 震源地情報
        embed.addFields({
            name: '📍 震源地',
            value: p2pData.earthquake.hypocenter?.name || '不明',
            inline: true
        })
        
        // マグニチュード
        embed.addFields({
            name: '📊 マグニチュード',
            value: p2pData.earthquake.hypocenter?.magnitude ? `M${p2pData.earthquake.hypocenter.magnitude}` : '不明',
            inline: true
        })
        
        // 最大震度
        embed.addFields({
            name: '🎯 最大震度',
            value: p2pData.earthquake.maxScale ? scaleCodeToString(p2pData.earthquake.maxScale) : '不明',
            inline: true
        })
        
        // 深さ
        embed.addFields({
            name: '📏 深さ',
            value: p2pData.earthquake.hypocenter?.depth ? `約${p2pData.earthquake.hypocenter.depth}km` : '不明',
            inline: true
        })
        
        // 発生時刻
        embed.addFields({
            name: '⏰ 発生時刻',
            value: p2pData.earthquake.time || '不明',
            inline: true
        })
        
        // 津波情報
        if (p2pData.earthquake.domesticTsunami && p2pData.earthquake.domesticTsunami !== 'None') {
            embed.addFields({
                name: '🌊 津波',
                value: p2pData.earthquake.domesticTsunami,
                inline: true
            })
        }
        
        // 震度分布（市町村別詳細表示）
        if (p2pData.points && p2pData.points.length > 0) {
            // 震度別にグループ化
            const intensityGroups: { [key: string]: string[] } = {}
            
            p2pData.points.forEach(point => {
                const intensity = scaleCodeToString(point.scale)
                if (!intensityGroups[intensity]) {
                    intensityGroups[intensity] = []
                }
                intensityGroups[intensity].push(`${point.pref} ${point.addr}`)
            })
            
            // 震度の高い順にソート
            const sortedIntensities = Object.keys(intensityGroups).sort((a, b) => {
                return scaleStringToCode(b) - scaleStringToCode(a)
            })
            
            // 主要な震度分布を表示（震度3以上）
            const significantIntensities = sortedIntensities.filter(intensity => 
                scaleStringToCode(intensity) >= 30
            )
            
            if (significantIntensities.length > 0) {
                let distributionText = ''
                
                significantIntensities.forEach(intensity => {
                    const locations = intensityGroups[intensity]
                    if (locations.length > 0) {
                        distributionText += `**震度${intensity}** (${locations.length}地点)\n`
                        
                        // 最大5地点まで表示
                        const displayLocations = locations.slice(0, 5)
                        distributionText += displayLocations.map(loc => `  ・${loc}`).join('\n')
                        
                        if (locations.length > 5) {
                            distributionText += `\n  ...他${locations.length - 5}地点`
                        }
                        distributionText += '\n\n'
                    }
                })
                
                if (distributionText.length > 1000) {
                    distributionText = distributionText.substring(0, 997) + '...'
                }
                
                embed.addFields({
                    name: '📍 震度分布 (市町村別)',
                    value: distributionText || '情報なし',
                    inline: false
                })
            }
            
            // 統計情報
            embed.addFields({
                name: '📊 観測点統計',
                value: `総観測点数: ${p2pData.points.length}点\n最大震度: ${scaleCodeToString(Math.max(...p2pData.points.map(p => p.scale)))}`,
                inline: true
            })
        }
    }
    
    // 緊急地震速報の場合のキャンセル表示
    if (p2pData.cancelled) {
        embed.addFields({
            name: '❌ 状態',
            value: 'キャンセル',
            inline: false
        })
    }
    
    // その他の情報（津波、気象警報等）
    if (p2pData.title) {
        embed.addFields({
            name: '📋 タイトル',
            value: p2pData.title,
            inline: false
        })
    }
    
    if (p2pData.text) {
        embed.addFields({
            name: '📄 詳細',
            value: p2pData.text.length > 1000 ? p2pData.text.substring(0, 1000) + '...' : p2pData.text,
            inline: false
        })
    }
    
    // 津波情報の対象地域
    if (p2pData.areas && p2pData.areas.length > 0) {
        const areasText = p2pData.areas
            .map(area => `${area.name}: ${area.grade}${area.immediate ? ' (直ちに)' : ''}`)
            .join('\n')
        
        embed.addFields({
            name: '🌊 対象地域',
            value: areasText.length > 1000 ? areasText.substring(0, 1000) + '...' : areasText,
            inline: false
        })
    }
    
    // コメント情報
    if (p2pData.comments?.freeFormComment) {
        embed.addFields({
            name: '💬 コメント',
            value: p2pData.comments.freeFormComment,
            inline: false
        })
    }
    
    // 情報源
    embed.setFooter({
        text: `${p2pData.issue.source} | P2P地震情報 | ID: ${p2pData.id}`
    })
    
    console.log('✅ P2P情報埋め込み作成完了')
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

/**
 * 市町村レベルの座標推定（詳細版）
 */
function estimateDetailedCoordinatesFromAddress(prefecture: string, address: string): [number, number] | null {
    // まず都道府県の基本座標を取得
    const baseCoords = estimateCoordinatesFromAddress(prefecture)
    if (!baseCoords) {
        return null
    }
    
    // 市町村名から座標の微調整を行う（簡易版）
    const cityOffsets = getCityOffsets(prefecture, address)
    
    if (cityOffsets) {
        return [
            baseCoords[0] + cityOffsets[0],
            baseCoords[1] + cityOffsets[1]
        ]
    }
    
    // 市町村が見つからない場合は都道府県の座標を返す
    return baseCoords
}

/**
 * 市町村名に基づく座標オフセットを取得（拡張版）
 */
function getCityOffsets(prefecture: string, address: string): [number, number] | null {
    // 主要都市の座標オフセット（都道府県中心からの相対位置）
    const cityOffsetMap: { [key: string]: { [city: string]: [number, number] } } = {
        '北海道': {
            '札幌': [0.3, 0.0], '函館': [-0.2, -1.0], '旭川': [0.1, 1.2], '釧路': [1.8, -0.5],
            '帯広': [1.0, -0.8], '北見': [1.0, 1.0], '小樽': [0.2, 0.1], '室蘭': [0.4, -0.6],
            '苫小牧': [0.5, -0.4], '江別': [0.35, 0.05], '千歳': [0.4, -0.2], '恵庭': [0.35, -0.1]
        },
        '青森県': {
            '青森': [0.0, 0.3], '弘前': [-0.2, 0.1], '八戸': [0.3, -0.2], '五所川原': [-0.1, 0.2],
            'むつ': [0.4, 0.6], '十和田': [0.1, 0.0], '三沢': [0.25, -0.1]
        },
        '岩手県': {
            '盛岡': [0.0, 0.2], '一関': [-0.1, -0.3], '奥州': [-0.05, -0.2], '花巻': [-0.05, 0.0],
            '北上': [-0.1, -0.1], '久慈': [0.3, 0.4], '宮古': [0.5, 0.3], '釜石': [0.4, 0.0]
        },
        '宮城県': {
            '仙台': [0.0, 0.0], '石巻': [0.3, 0.1], '塩竈': [0.1, 0.05], '気仙沼': [0.4, 0.3],
            '白石': [-0.2, -0.2], '名取': [-0.05, -0.1], '多賀城': [0.08, 0.02], '岩沼': [-0.08, -0.15]
        },
        '秋田県': {
            '秋田': [0.0, 0.1], '横手': [-0.1, -0.2], '大館': [0.0, 0.4], '男鹿': [-0.2, 0.2],
            '湯沢': [-0.15, -0.3], '鹿角': [0.1, 0.5], '由利本荘': [-0.3, -0.1]
        },
        '山形県': {
            '山形': [0.0, 0.0], '米沢': [0.0, -0.3], '鶴岡': [-0.3, 0.1], '酒田': [-0.3, 0.2],
            '新庄': [-0.1, 0.3], '寒河江': [-0.05, 0.05], '上山': [0.05, -0.1], '村山': [-0.05, 0.1]
        },
        '福島県': {
            '福島': [0.0, 0.2], '会津若松': [-0.4, 0.1], 'いわき': [0.4, -0.3], '郡山': [0.0, -0.1],
            '白河': [0.0, -0.4], '須賀川': [0.05, -0.2], '喜多方': [-0.35, 0.15], '相馬': [0.3, 0.2]
        },
        '茨城県': {
            '水戸': [0.0, 0.1], 'つくば': [-0.1, -0.2], '日立': [0.2, 0.2], '土浦': [-0.05, -0.15],
            '古河': [-0.3, 0.0], '石岡': [0.0, -0.1], '結城': [-0.2, -0.05], '龍ケ崎': [-0.15, -0.25]
        },
        '栃木県': {
            '宇都宮': [0.0, 0.0], '足利': [-0.2, -0.3], '栃木': [-0.1, -0.1], '佐野': [-0.15, -0.25],
            '鹿沼': [-0.05, 0.1], '日光': [0.1, 0.3], '小山': [-0.1, -0.2], '真岡': [0.05, -0.1]
        },
        '群馬県': {
            '前橋': [0.0, 0.0], '高崎': [-0.1, -0.1], '桐生': [0.2, 0.1], '伊勢崎': [0.05, -0.05],
            '太田': [0.1, -0.1], '沼田': [0.0, 0.3], '館林': [0.15, -0.15], '渋川': [-0.05, 0.15]
        },
        '埼玉県': {
            'さいたま': [0.0, 0.0], '川越': [-0.1, 0.0], '熊谷': [0.1, 0.2], '川口': [0.05, -0.05],
            '行田': [0.05, 0.15], '秩父': [-0.3, 0.2], '所沢': [-0.05, 0.05], '飯能': [-0.15, 0.1],
            '加須': [0.1, 0.1], '本庄': [0.0, 0.25], '東松山': [-0.05, 0.1], '春日部': [0.1, -0.05]
        },
        '千葉県': {
            '千葉': [0.0, 0.0], '銚子': [0.4, 0.2], '市川': [-0.1, 0.0], '船橋': [-0.05, 0.05],
            '館山': [0.0, -0.4], '木更津': [-0.1, -0.2], '松戸': [-0.08, 0.02], '野田': [-0.15, 0.15],
            '茂原': [0.1, -0.1], '成田': [0.1, 0.1], '佐倉': [0.05, 0.05], '東金': [0.15, -0.05]
        },
        '東京都': {
            '新宿': [0.0, 0.0], '渋谷': [-0.05, -0.02], '品川': [0.05, -0.05], '足立': [0.1, 0.1],
            '八王子': [-0.3, -0.2], '立川': [-0.2, -0.1], '町田': [-0.2, -0.3], '府中': [-0.15, -0.05],
            '調布': [-0.1, -0.05], '三鷹': [-0.1, 0.0], '青梅': [-0.25, 0.05], '昭島': [-0.18, -0.08]
        },
        '神奈川県': {
            '横浜': [0.0, 0.0], '川崎': [0.1, 0.05], '相模原': [-0.2, -0.1], '藤沢': [-0.1, -0.1],
            '横須賀': [0.1, -0.2], '平塚': [-0.2, 0.0], '茅ヶ崎': [-0.15, -0.05], '厚木': [-0.15, -0.05],
            '大和': [-0.1, -0.05], '海老名': [-0.12, -0.03], '座間': [-0.13, -0.06], '小田原': [-0.3, -0.15]
        },
        '大阪府': {
            '大阪': [0.0, 0.0], '堺': [-0.1, -0.1], '東大阪': [0.1, 0.0], '枚方': [0.05, 0.1],
            '豊中': [0.0, 0.05], '吹田': [-0.05, 0.05], '高槻': [-0.1, 0.1], '茨木': [-0.08, 0.08],
            '八尾': [0.05, -0.05], '寝屋川': [0.08, 0.08], '岸和田': [-0.05, -0.15], '和泉': [-0.08, -0.12]
        },
        '愛知県': {
            '名古屋': [0.0, 0.0], '豊田': [-0.1, -0.1], '岡崎': [-0.2, -0.1], '一宮': [-0.1, 0.1],
            '豊橋': [0.3, -0.2], '春日井': [0.05, 0.05], '安城': [-0.15, -0.05], '西尾': [-0.25, -0.15],
            '刈谷': [-0.12, -0.08], '豊川': [0.2, -0.15], '津島': [-0.15, 0.05], '碧南': [-0.2, -0.12]
        },
        '福岡県': {
            '福岡': [0.0, 0.0], '北九州': [0.2, 0.1], '久留米': [-0.1, -0.1], '大牟田': [-0.2, -0.2],
            '飯塚': [0.1, 0.0], '直方': [0.05, 0.05], '田川': [0.15, 0.05], '柳川': [-0.15, -0.15],
            '八女': [-0.12, -0.08], '筑後': [-0.08, -0.12], '大川': [-0.18, -0.12], '行橋': [0.25, 0.08]
        }
    }
    
    const prefOffsets = cityOffsetMap[prefecture]
    if (!prefOffsets) {
        // より広範囲な検索（市区町村名の部分マッチング）
        const commonCityPatterns = [
            '市', '町', '村', '区', '郡', '郷', '浦', '島', '山', '川', '野', '田', '原', '沢', '谷'
        ]
        
        // 住所から主要な地名要素を抽出
        for (const pattern of commonCityPatterns) {
            const index = address.indexOf(pattern)
            if (index > 0) {
                const cityPart = address.substring(0, index + 1)
                if (cityPart.length >= 2) {
                    // 簡易的なランダムオフセットを生成（実際の地理的位置に基づく改善の余地あり）
                    const hash = cityPart.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0)
                        return a & a
                    }, 0)
                    const offsetX = ((hash % 200) - 100) / 1000 // -0.1 to 0.1
                    const offsetY = (((hash >> 8) % 200) - 100) / 1000
                    console.log(`  簡易オフセット生成: ${cityPart} → [${offsetX.toFixed(3)}, ${offsetY.toFixed(3)}]`)
                    return [offsetX, offsetY]
                }
            }
        }
        return null
    }
    
    // 部分マッチングで市町村名を検索（改良版）
    for (const [cityName, offset] of Object.entries(prefOffsets)) {
        if (address.includes(cityName)) {
            console.log(`  市町村マッチング: ${cityName} in ${address} → [${offset[0]}, ${offset[1]}]`)
            return offset
        }
    }
    
    // より柔軟なマッチング（区や市を除いた名前での検索）
    for (const [cityName, offset] of Object.entries(prefOffsets)) {
        const baseCityName = cityName.replace(/[市区町村]/g, '')
        if (baseCityName.length >= 2 && address.includes(baseCityName)) {
            console.log(`  部分マッチング: ${baseCityName} in ${address} → [${offset[0]}, ${offset[1]}]`)
            return offset
        }
    }
    
    return null
}
