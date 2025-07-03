/**
 * 新しいWolfix API専用地震処理モジュール
 * 震源地マークと震度エリアの正確な表示を実現
 */

import { EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { generateEarthquakeMap } from './mapGenerator_new'
import * as fs from 'fs'

// Wolfix API データ型定義
export interface WolfixEEWData {
    Title?: string
    CodeType?: string
    Issue?: {
        Source?: string
        Status?: string
    }
    EventID?: string
    Serial?: number
    AnnouncedTime?: string
    OriginTime?: string
    Hypocenter?: string
    Latitude?: number
    Longitude?: number
    Magunitude?: number
    Depth?: number
    MaxIntensity?: string
    Accuracy?: {
        Epicenter?: string
        Depth?: string
        Magnitude?: string
    }
    MaxIntChange?: {
        String?: string
        Reason?: string
    }
    WarnArea?: Array<{
        Chiiki?: string
        Shindo1?: string
        Shindo2?: string
        Time?: string
        Type?: string
        Arrive?: string
    }>
    isSea?: boolean
    isTraining?: boolean
    isAssumption?: boolean
    isWarn?: boolean
    isFinal?: boolean
    isCancel?: boolean
    OriginalText?: string
    Pond?: string
}

// Wolfix EQList API データ型定義（地震情報用）
interface WolfixEQListData {
    Title?: string
    EventID?: string
    Hypocenter?: string
    OriginTime?: string
    Magnitude?: number
    Latitude?: number
    Longitude?: number
    Depth?: number
    MaxIntensity?: string
    P2PArea?: Array<{
        Chiiki?: string
        Shindo?: string
        Class?: string
    }>
}

interface WolfixEQListResponse {
    [key: string]: WolfixEQListData
}

// 地図生成用のデータ構造
interface EarthquakeMapData {
    longitude: number
    latitude: number
    magnitude: number | string
    depth: number | string
    hypocenter: string
    maxScale: string
}

interface AreaInfo {
    epicenter: [number, number]
    areas: {
        [key: string]: [number, number][]
    }
}

/**
 * Wolfix APIから最新の地震データを取得（EEW用）
 */
export async function fetchWolfixEarthquakeData(): Promise<WolfixEEWData | null> {
    try {
        console.log('=== Wolfix EEW API地震データ取得開始 ===')
        
        const response = await fetch('https://api.wolfx.jp/jma_eew.json')
        if (!response.ok) {
            console.error(`Wolfix EEW API エラー: ${response.status} ${response.statusText}`)
            return null
        }
        
        const data = await response.json() as WolfixEEWData
        console.log('✅ Wolfix EEW API地震データ取得成功')
        console.log(`イベントID: ${data.EventID}`)
        console.log(`震源地: ${data.Hypocenter}`)
        console.log(`座標: ${data.Latitude}°N, ${data.Longitude}°E`)
        console.log(`マグニチュード: ${data.Magunitude}`)
        console.log(`最大震度: ${data.MaxIntensity}`)
        console.log(`WarnArea数: ${data.WarnArea?.length || 0}`)
        
        return data
        
    } catch (error) {
        console.error('❌ Wolfix EEW API地震データ取得エラー:', error)
        return null
    }
}

/**
 * Wolfix APIから地震情報リストを取得（通常の地震情報用）
 */
export async function fetchWolfixEarthquakeList(): Promise<WolfixEQListData | null> {
    try {
        console.log('=== Wolfix EQList API地震データ取得開始 ===')
        
        const response = await fetch('https://api.wolfx.jp/jma_eqlist.json')
        if (!response.ok) {
            console.error(`Wolfix EQList API エラー: ${response.status} ${response.statusText}`)
            return null
        }
        
        const data = await response.json() as WolfixEQListResponse
        console.log('✅ Wolfix EQList API地震データ取得成功')
        
        // 最新の地震情報を取得（最初のエントリ）
        const latestKey = Object.keys(data)[0]
        if (!latestKey) {
            console.log('地震情報が見つかりません')
            return null
        }
        
        const latestEarthquake = data[latestKey]
        console.log(`最新地震情報:`)
        console.log(`イベントID: ${latestEarthquake.EventID}`)
        console.log(`震源地: ${latestEarthquake.Hypocenter}`)
        console.log(`座標: ${latestEarthquake.Latitude}°N, ${latestEarthquake.Longitude}°E`)
        console.log(`マグニチュード: ${latestEarthquake.Magnitude}`)
        console.log(`最大震度: ${latestEarthquake.MaxIntensity}`)
        console.log(`P2PArea数: ${latestEarthquake.P2PArea?.length || 0}`)
        
        return latestEarthquake
        
    } catch (error) {
        console.error('❌ Wolfix EQList API地震データ取得エラー:', error)
        return null
    }
}

/**
 * 震度値を標準化された文字列に変換
 */
function normalizeIntensity(intensity: string | number | undefined): string {
    if (!intensity) return '不明'
    
    const intensityStr = String(intensity).trim()
    
    // 数値形式から文字列形式への変換
    const intensityMap: Record<string, string> = {
        '1': '1', '10': '1',
        '2': '2', '20': '2',
        '3': '3', '30': '3', 
        '4': '4', '40': '4',
        '5弱': '5弱', '5-': '5弱', '45': '5弱',
        '5強': '5強', '5+': '5強', '50': '5強',
        '6弱': '6弱', '6-': '6弱', '55': '6弱',
        '6強': '6強', '6+': '6強', '60': '6強',
        '7': '7', '70': '7'
    }
    
    return intensityMap[intensityStr] || intensityStr
}

/**
 * 震度に対応する画像URLを取得
 */
function getIntensityImageUrl(intensity: string): string | undefined {
    const normalizedIntensity = normalizeIntensity(intensity)
    
    const imageUrls: Record<string, string> = {
        '1': 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613/raw',
        '2': 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639/raw',
        '3': 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110/raw',
        '4': 'https://gyazo.com/39351fbdd780e0db5a1b4b24b0dfd025/raw',
        '5弱': 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29/raw',
        '5強': 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988/raw',
        '6弱': 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be/raw',
        '6強': 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb/raw',
        '7': 'https://i.gyazo.com/98e5ea5b1d54f1b17ac24e7e5c7d0b7a/raw'
    }
    
    return imageUrls[normalizedIntensity]
}

/**
 * WarnAreaから地図用のエリア情報を生成
 */
function convertWarnAreaToMapAreas(warnAreas: WolfixEEWData['WarnArea']): { [key: string]: [number, number][] } {
    const areas: { [key: string]: [number, number][] } = {}
    
    if (!warnAreas || !Array.isArray(warnAreas)) {
        console.log('WarnAreaデータなし - 震源地のみ表示')
        return areas
    }
    
    console.log(`=== WarnArea処理開始 (${warnAreas.length}件) ===`)
    
    // 地域名から座標への変換マップ
    const areaCoordinates: Record<string, [number, number]> = {
        // 九州・沖縄
        '鹿児島県十島村': [129.9, 29.2],
        '鹿児島県': [130.6, 31.6],
        'トカラ列島': [129.9, 29.2],
        'トカラ列島近海': [129.9, 29.2],
        '奄美大島': [130.0, 28.5],
        '種子島': [131.0, 30.5],
        '屋久島': [130.5, 30.3],
        '沖縄県': [127.7, 26.2],
        '福岡県': [130.4, 33.6],
        '佐賀県': [130.3, 33.2],
        '長崎県': [129.9, 32.8],
        '熊本県': [130.7, 32.8],
        '大分県': [131.6, 33.2],
        '宮崎県': [131.4, 32.0],
        // 四国
        '愛媛県': [132.8, 33.8],
        '高知県': [133.5, 33.6],
        '徳島県': [134.6, 34.1],
        '香川県': [134.0, 34.3],
        // 中国
        '広島県': [132.5, 34.4],
        '岡山県': [133.9, 34.7],
        '山口県': [131.5, 34.2],
        '鳥取県': [134.2, 35.5],
        '島根県': [132.6, 35.5],
        // 関西
        '大阪府': [135.5, 34.7],
        '京都府': [135.8, 35.0],
        '兵庫県': [135.2, 34.7],
        '奈良県': [135.8, 34.7],
        '和歌山県': [135.2, 34.2],
        '滋賀県': [136.0, 35.0],
        '三重県': [136.5, 34.7],
        // 中部
        '愛知県': [137.0, 35.2],
        '岐阜県': [137.2, 35.4],
        '静岡県': [138.4, 34.9],
        '長野県': [138.2, 36.2],
        '山梨県': [138.6, 35.7],
        '新潟県': [139.0, 37.9],
        '富山県': [137.2, 36.7],
        '石川県': [136.6, 36.6],
        '福井県': [136.2, 36.1],
        // 関東
        '東京都': [139.7, 35.7],
        '神奈川県': [139.6, 35.4],
        '千葉県': [140.1, 35.6],
        '埼玉県': [139.6, 36.0],
        '茨城県': [140.4, 36.3],
        '栃木県': [139.9, 36.6],
        '群馬県': [139.0, 36.4],
        // 東北
        '宮城県': [140.9, 38.3],
        '福島県': [140.5, 37.8],
        '山形県': [140.4, 38.2],
        '岩手県': [141.2, 39.7],
        '青森県': [140.7, 40.8],
        '秋田県': [140.1, 39.7],
        // 北海道
        '北海道': [143.0, 43.1]
    }
    
    for (const warnArea of warnAreas) {
        if (!warnArea.Chiiki || !warnArea.Shindo1) continue
        
        const areaName = warnArea.Chiiki
        const intensity = normalizeIntensity(warnArea.Shindo1)
        
        console.log(`WarnAreaエリア: ${areaName} → 震度${intensity}`)
        
        // 座標を取得（完全一致を優先）
        let coordinates = areaCoordinates[areaName]
        
        // 完全一致しない場合は部分一致で検索
        if (!coordinates) {
            for (const [mapArea, coords] of Object.entries(areaCoordinates)) {
                if (areaName.includes(mapArea) || mapArea.includes(areaName)) {
                    coordinates = coords
                    console.log(`部分一致: ${areaName} ≈ ${mapArea}`)
                    break
                }
            }
        }
        
        if (coordinates) {
            if (!areas[intensity]) {
                areas[intensity] = []
            }
            areas[intensity].push(coordinates)
            console.log(`✅ エリア追加: ${areaName} [${coordinates[0]}, ${coordinates[1]}] 震度${intensity}`)
        } else {
            console.log(`⚠️ 座標不明: ${areaName}`)
        }
    }
    
    console.log('=== WarnArea処理完了 ===')
    Object.entries(areas).forEach(([intensity, coords]) => {
        console.log(`震度${intensity}: ${coords.length}箇所`)
    })
    
    return areas
}

/**
 * EQList P2PAreaから地図用のエリア情報を生成
 */
function convertEQListToMapAreas(p2pAreas: WolfixEQListData['P2PArea']): { [key: string]: [number, number][] } {
    const areas: { [key: string]: [number, number][] } = {}
    
    if (!p2pAreas || !Array.isArray(p2pAreas)) {
        console.log('P2PAreaデータなし - 震源地のみ表示')
        return areas
    }
    
    console.log(`=== P2PArea処理開始 (${p2pAreas.length}件) ===`)
    
    // 地域名から座標への変換マップ（WarnAreaと共通）
    const areaCoordinates: Record<string, [number, number]> = {
        // 九州・沖縄
        '鹿児島県十島村': [129.9, 29.2],
        '鹿児島県': [130.6, 31.6],
        'トカラ列島': [129.9, 29.2],
        'トカラ列島近海': [129.9, 29.2],
        '奄美大島': [130.0, 28.5],
        '種子島': [131.0, 30.5],
        '屋久島': [130.5, 30.3],
        '沖縄県': [127.7, 26.2],
        '福岡県': [130.4, 33.6],
        '佐賀県': [130.3, 33.2],
        '長崎県': [129.9, 32.8],
        '熊本県': [130.7, 32.8],
        '大分県': [131.6, 33.2],
        '宮崎県': [131.4, 32.0],
        // 四国
        '愛媛県': [132.8, 33.8],
        '高知県': [133.5, 33.6],
        '徳島県': [134.6, 34.1],
        '香川県': [134.0, 34.3],
        // 中国
        '広島県': [132.5, 34.4],
        '岡山県': [133.9, 34.7],
        '山口県': [131.5, 34.2],
        '鳥取県': [134.2, 35.5],
        '島根県': [132.6, 35.5],
        // 関西
        '大阪府': [135.5, 34.7],
        '京都府': [135.8, 35.0],
        '兵庫県': [135.2, 34.7],
        '奈良県': [135.8, 34.7],
        '和歌山県': [135.2, 34.2],
        '滋賀県': [136.0, 35.0],
        '三重県': [136.5, 34.7],
        // 中部
        '愛知県': [137.0, 35.2],
        '岐阜県': [137.2, 35.4],
        '静岡県': [138.4, 34.9],
        '長野県': [138.2, 36.2],
        '山梨県': [138.6, 35.7],
        '新潟県': [139.0, 37.9],
        '富山県': [137.2, 36.7],
        '石川県': [136.6, 36.6],
        '福井県': [136.2, 36.1],
        // 関東
        '東京都': [139.7, 35.7],
        '神奈川県': [139.6, 35.4],
        '千葉県': [140.1, 35.6],
        '埼玉県': [139.6, 36.0],
        '茨城県': [140.4, 36.3],
        '栃木県': [139.9, 36.6],
        '群馬県': [139.0, 36.4],
        // 東北
        '宮城県': [140.9, 38.3],
        '福島県': [140.5, 37.8],
        '山形県': [140.4, 38.2],
        '岩手県': [141.2, 39.7],
        '青森県': [140.7, 40.8],
        '秋田県': [140.1, 39.7],
        // 北海道
        '北海道': [143.0, 43.1]
    }
    
    for (const p2pArea of p2pAreas) {
        if (!p2pArea.Chiiki || !p2pArea.Shindo) continue
        
        const areaName = p2pArea.Chiiki
        const intensity = normalizeIntensity(p2pArea.Shindo)
        
        console.log(`P2PAreaエリア: ${areaName} → 震度${intensity}`)
        
        // 座標を取得（完全一致を優先）
        let coordinates = areaCoordinates[areaName]
        
        // 完全一致しない場合は部分一致で検索
        if (!coordinates) {
            for (const [mapArea, coords] of Object.entries(areaCoordinates)) {
                if (areaName.includes(mapArea) || mapArea.includes(areaName)) {
                    coordinates = coords
                    console.log(`部分一致: ${areaName} ≈ ${mapArea}`)
                    break
                }
            }
        }
        
        if (coordinates) {
            if (!areas[intensity]) {
                areas[intensity] = []
            }
            areas[intensity].push(coordinates)
            console.log(`✅ エリア追加: ${areaName} [${coordinates[0]}, ${coordinates[1]}] 震度${intensity}`)
        } else {
            console.log(`⚠️ 座標不明: ${areaName}`)
        }
    }
    
    console.log('=== P2PArea処理完了 ===')
    Object.entries(areas).forEach(([intensity, coords]) => {
        console.log(`震度${intensity}: ${coords.length}箇所`)
    })
    
    return areas
}

/**
 * Wolfix地震データから地図生成用データを作成（改良版：震度表示強化）
 */
export function createMapDataFromWolfixData(wolfixData: WolfixEEWData): { earthquakeData: EarthquakeMapData, areaInfo: AreaInfo } {
    console.log('=== 地図データ作成開始（震度表示強化版） ===')
    
    // 震源地座標（必須）
    const longitude = wolfixData.Longitude || 139.69  // デフォルト: 東京
    const latitude = wolfixData.Latitude || 35.68
    
    console.log(`震源地座標: ${latitude}°N, ${longitude}°E`)
    console.log(`震源地名: ${wolfixData.Hypocenter || '不明'}`)
    
    // 地震基本データ
    const earthquakeData: EarthquakeMapData = {
        longitude: longitude,
        latitude: latitude,
        magnitude: wolfixData.Magunitude || '不明',
        depth: wolfixData.Depth ? `${wolfixData.Depth}km` : '不明',
        hypocenter: wolfixData.Hypocenter || '不明',
        maxScale: normalizeIntensity(wolfixData.MaxIntensity)
    }
    
    // エリア情報
    let areas = convertWarnAreaToMapAreas(wolfixData.WarnArea)
    
    // WarnAreaが空または少ない場合、震源地周辺に疑似震度データを追加
    if (Object.keys(areas).length === 0 && wolfixData.MaxIntensity && wolfixData.MaxIntensity !== '不明') {
        console.log('WarnAreaデータが不足 - 震源地周辺に疑似震度データを追加')
        
        const maxIntensity = normalizeIntensity(wolfixData.MaxIntensity)
        
        // 震源地周辺に疑似的な観測点を配置
        const epicenterAreas = generateEpicenterAreas(longitude, latitude, maxIntensity)
        areas = { ...areas, ...epicenterAreas }
        
        console.log(`疑似震度データ追加: ${Object.keys(epicenterAreas).length}種類の震度`)
    }
    
    const areaInfo: AreaInfo = {
        epicenter: [longitude, latitude],  // 経度, 緯度の順序
        areas: areas
    }
    
    console.log('=== 地図データ作成完了（震度表示強化版） ===')
    console.log(`震源: [${areaInfo.epicenter[0]}, ${areaInfo.epicenter[1]}]`)
    console.log(`エリア種類数: ${Object.keys(areas).length}`)
    Object.entries(areas).forEach(([intensity, coords]) => {
        console.log(`  震度${intensity}: ${coords.length}箇所`)
    })
    
    return { earthquakeData, areaInfo }
}

/**
 * 震源地周辺に疑似的な震度分布を生成
 */
function generateEpicenterAreas(epicenterLon: number, epicenterLat: number, maxIntensity: string): { [key: string]: [number, number][] } {
    console.log('=== 疑似震度分布生成開始 ===')
    
    const areas: { [key: string]: [number, number][] } = {}
    
    // 震度から数値への変換
    const intensityToNumber = (intensity: string): number => {
        const map: Record<string, number> = {
            '7': 7, '6強': 6.5, '6弱': 6, '5強': 5.5, '5弱': 5, '4': 4, '3': 3, '2': 2, '1': 1
        }
        return map[intensity] || 1
    }
    
    const maxIntensityNum = intensityToNumber(maxIntensity)
    
    // 距離と震度の関係を計算（簡易的な減衰式）
    const calculateIntensity = (distance: number): string => {
        // 距離による震度減衰（大まかな計算）
        const attenuatedIntensity = Math.max(1, maxIntensityNum - distance * 0.5)
        
        if (attenuatedIntensity >= 7) return '7'
        if (attenuatedIntensity >= 6.5) return '6強'
        if (attenuatedIntensity >= 6) return '6弱'
        if (attenuatedIntensity >= 5.5) return '5強'
        if (attenuatedIntensity >= 5) return '5弱'
        if (attenuatedIntensity >= 4) return '4'
        if (attenuatedIntensity >= 3) return '3'
        if (attenuatedIntensity >= 2) return '2'
        return '1'
    }
    
    // 震源地周辺の疑似観測点を生成（震源地自体は除外）
    const distances = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0] // 度数での距離（震源地を避けるため0.1を除外）
    const angles = [0, 45, 90, 135, 180, 225, 270, 315] // 8方向
    
    for (const distance of distances) {
        for (const angle of angles) {
            // 距離に応じた震度を計算
            const intensity = calculateIntensity(distance)
            
            // 震度1以下は追加しない
            if (intensityToNumber(intensity) < 2) continue
            
            // 座標計算（簡易的な円形配置）
            const rad = (angle * Math.PI) / 180
            const lon = epicenterLon + distance * Math.cos(rad)
            const lat = epicenterLat + distance * Math.sin(rad)
            
            // 日本の範囲内チェック
            if (lon >= 123 && lon <= 146 && lat >= 24 && lat <= 46) {
                if (!areas[intensity]) {
                    areas[intensity] = []
                }
                areas[intensity].push([lon, lat])
            }
        }
    }
    
    // 注意: 震源地には震度円を配置しない（赤いXマークのみ表示）
    
    console.log('=== 疑似震度分布生成完了 ===')
    Object.entries(areas).forEach(([intensity, coords]) => {
        console.log(`  疑似震度${intensity}: ${coords.length}箇所`)
    })
    
    return areas
}

/**
 * EQList地震データから地図生成用データを作成
 */
function createMapDataFromEQListData(eqListData: WolfixEQListData): { earthquakeData: EarthquakeMapData, areaInfo: AreaInfo } {
    console.log('=== EQList地図データ作成開始 ===')
    
    // 震源地座標（必須）
    const longitude = eqListData.Longitude || 139.69  // デフォルト: 東京
    const latitude = eqListData.Latitude || 35.68
    
    console.log(`震源地座標: ${latitude}°N, ${longitude}°E`)
    console.log(`震源地名: ${eqListData.Hypocenter || '不明'}`)
    
    // 地震基本データ
    const earthquakeData: EarthquakeMapData = {
        longitude: longitude,
        latitude: latitude,
        magnitude: eqListData.Magnitude || '不明',
        depth: eqListData.Depth ? `${eqListData.Depth}km` : '不明',
        hypocenter: eqListData.Hypocenter || '不明',
        maxScale: normalizeIntensity(eqListData.MaxIntensity)
    }
    
    // エリア情報
    const areas = convertEQListToMapAreas(eqListData.P2PArea)
    const areaInfo: AreaInfo = {
        epicenter: [longitude, latitude],  // 経度, 緯度の順序
        areas: areas
    }
    
    console.log('=== EQList地図データ作成完了 ===')
    console.log(`震源: [${areaInfo.epicenter[0]}, ${areaInfo.epicenter[1]}]`)
    console.log(`エリア種類数: ${Object.keys(areas).length}`)
    
    return { earthquakeData, areaInfo }
}

/**
 * 地震情報のDiscord埋め込みを作成
 */
export async function createEarthquakeEmbed(wolfixData: WolfixEEWData, isEEW: boolean = false): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] }> {
    console.log('=== 埋め込み作成開始 ===')
    
    const embed = new EmbedBuilder()
    
    // タイトルと色の設定
    if (isEEW) {
        embed.setTitle('🚨 緊急地震速報')
        embed.setColor(0xFF0000)  // 赤色
    } else {
        embed.setTitle('📊 最新地震情報')
        embed.setColor(0x0099FF)  // 青色
    }
    
    // 基本情報の構築
    let description = ''
    
    if (wolfixData.Hypocenter) {
        description += `**震源地**: ${wolfixData.Hypocenter}\n`
    }
    
    if (wolfixData.Magunitude) {
        description += `**マグニチュード**: M${wolfixData.Magunitude}\n`
    }
    
    if (wolfixData.Depth) {
        description += `**震源の深さ**: ${wolfixData.Depth}km\n`
    }
    
    if (wolfixData.MaxIntensity && wolfixData.MaxIntensity !== '不明') {
        const intensity = normalizeIntensity(wolfixData.MaxIntensity)
        description += `**最大震度**: ${intensity}\n`
    }
    
    if (wolfixData.OriginTime) {
        description += `**発生時刻**: ${wolfixData.OriginTime}\n`
    }
    
    embed.setDescription(description)
    
    // 震度画像の設定
    if (wolfixData.MaxIntensity && wolfixData.MaxIntensity !== '不明') {
        const imageUrl = getIntensityImageUrl(wolfixData.MaxIntensity)
        if (imageUrl) {
            embed.setThumbnail(imageUrl)
        }
    }
    
    // 追加フィールド
    const fields = []
    
    if (isEEW && wolfixData.Serial) {
        fields.push({
            name: '報番号',
            value: `第${wolfixData.Serial}報`,
            inline: true
        })
    }
    
    if (wolfixData.EventID) {
        fields.push({
            name: 'イベントID',
            value: wolfixData.EventID,
            inline: true
        })
    }
    
    // 状態情報
    const statusInfo = []
    if (wolfixData.isFinal) statusInfo.push('最終報')
    if (wolfixData.isWarn) statusInfo.push('警報')
    if (wolfixData.isCancel) statusInfo.push('キャンセル')
    if (wolfixData.isTraining) statusInfo.push('訓練')
    
    if (statusInfo.length > 0) {
        fields.push({
            name: '状態',
            value: statusInfo.join('・'),
            inline: true
        })
    }
    
    embed.addFields(fields)
    
    // 地図生成
    const files: AttachmentBuilder[] = []
    
    try {
        // 環境変数チェック
        const skipMapGeneration = process.env.SKIP_MAP_GENERATION === 'true'
        const forceMapGeneration = process.env.FORCE_MAP_GENERATION === 'true'
        
        if (!skipMapGeneration && (forceMapGeneration || process.env.NODE_ENV !== 'production')) {
            console.log('地図生成を開始...')
            
            const { earthquakeData, areaInfo } = createMapDataFromWolfixData(wolfixData)
            const mapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
            
            if (mapPath && fs.existsSync(mapPath)) {
                const mapFile = new AttachmentBuilder(mapPath, { name: 'earthquake_map.png' })
                files.push(mapFile)
                embed.setImage('attachment://earthquake_map.png')
                console.log('✅ 地図生成成功')
            } else {
                console.log('⚠️ 地図生成失敗 - ファイルが見つかりません')
            }
        } else {
            console.log('地図生成スキップ（環境変数設定）')
        }
    } catch (mapError) {
        console.error('地図生成エラー:', mapError)
    }
    
    // フッター
    embed.setFooter({
        text: `データ提供: Wolfix API | 発表時刻: ${wolfixData.AnnouncedTime || '不明'}`
    })
    
    embed.setTimestamp()
    
    console.log('=== 埋め込み作成完了 ===')
    
    return { embed, files: files.length > 0 ? files : undefined }
}

/**
 * EQList地震情報のDiscord埋め込みを作成
 */
async function createEarthquakeEmbedFromEQList(eqListData: WolfixEQListData): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] }> {
    console.log('=== EQList埋め込み作成開始 ===')
    
    const embed = new EmbedBuilder()
    
    // タイトルと色の設定
    embed.setTitle('📊 最新地震情報')
    embed.setColor(0x0099FF)  // 青色
    
    // 基本情報の構築
    let description = ''
    
    if (eqListData.Hypocenter) {
        description += `**震源地**: ${eqListData.Hypocenter}\n`
    }
    
    if (eqListData.Magnitude) {
        description += `**マグニチュード**: M${eqListData.Magnitude}\n`
    }
    
    if (eqListData.Depth) {
        description += `**震源の深さ**: ${eqListData.Depth}km\n`
    }
    
    if (eqListData.MaxIntensity && eqListData.MaxIntensity !== '不明') {
        const intensity = normalizeIntensity(eqListData.MaxIntensity)
        description += `**最大震度**: ${intensity}\n`
    }
    
    if (eqListData.OriginTime) {
        description += `**発生時刻**: ${eqListData.OriginTime}\n`
    }
    
    embed.setDescription(description)
    
    // 震度画像の設定
    if (eqListData.MaxIntensity && eqListData.MaxIntensity !== '不明') {
        const imageUrl = getIntensityImageUrl(eqListData.MaxIntensity)
        if (imageUrl) {
            embed.setThumbnail(imageUrl)
        }
    }
    
    // 追加フィールド
    const fields = []
    
    if (eqListData.EventID) {
        fields.push({
            name: 'イベントID',
            value: eqListData.EventID,
            inline: true
        })
    }
    
    // 各地の震度情報
    if (eqListData.P2PArea && eqListData.P2PArea.length > 0) {
        const shindoAreas: { [key: string]: string[] } = {}
        
        for (const area of eqListData.P2PArea) {
            if (area.Chiiki && area.Shindo) {
                const intensity = normalizeIntensity(area.Shindo)
                if (!shindoAreas[intensity]) {
                    shindoAreas[intensity] = []
                }
                shindoAreas[intensity].push(area.Chiiki)
            }
        }
        
        // 震度順に並べ替え
        const sortedIntensities = Object.keys(shindoAreas).sort((a, b) => {
            const order = ['7', '6強', '6弱', '5強', '5弱', '4', '3', '2', '1']
            return order.indexOf(a) - order.indexOf(b)
        })
        
        for (const intensity of sortedIntensities) {
            const areas = shindoAreas[intensity]
            if (areas.length > 0) {
                // 地域名が長すぎる場合は省略
                let areaText = areas.join('、')
                if (areaText.length > 1000) {
                    areaText = areaText.substring(0, 997) + '...'
                }
                
                fields.push({
                    name: `震度${intensity}`,
                    value: areaText,
                    inline: false
                })
            }
        }
    }
    
    embed.addFields(fields)
    
    // 地図生成
    const files: AttachmentBuilder[] = []
    
    try {
        // 環境変数チェック
        const skipMapGeneration = process.env.SKIP_MAP_GENERATION === 'true'
        const forceMapGeneration = process.env.FORCE_MAP_GENERATION === 'true'
        
        if (!skipMapGeneration && (forceMapGeneration || process.env.NODE_ENV !== 'production')) {
            console.log('EQList地図生成を開始...')
            
            const { earthquakeData, areaInfo } = createMapDataFromEQListData(eqListData)
            const mapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
            
            if (mapPath && fs.existsSync(mapPath)) {
                const mapFile = new AttachmentBuilder(mapPath, { name: 'earthquake_map.png' })
                files.push(mapFile)
                embed.setImage('attachment://earthquake_map.png')
                console.log('✅ EQList地図生成成功')
            } else {
                console.log('⚠️ EQList地図生成失敗 - ファイルが見つかりません')
            }
        } else {
            console.log('EQList地図生成スキップ（環境変数設定）')
        }
    } catch (mapError) {
        console.error('EQList地図生成エラー:', mapError)
    }
    
    // フッター
    embed.setFooter({
        text: `データ提供: Wolfix API | ${new Date().toLocaleString('ja-JP')}`
    })
    
    embed.setTimestamp()
    
    console.log('=== EQList埋め込み作成完了 ===')
    
    return { embed, files: files.length > 0 ? files : undefined }
}

/**
 * 緊急地震速報の処理（リアルタイム用） - 改良版：積極的通知
 */
export async function processEarthquakeAlert(): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], wolfixData?: WolfixEEWData } | null> {
    try {
        console.log('=== 緊急地震速報処理開始 ===')
        
        const wolfixData = await fetchWolfixEarthquakeData()
        if (!wolfixData) {
            console.log('❌ 地震データが取得できませんでした')
            return null
        }
        
        // 基本的な地震情報の存在チェック
        if (!wolfixData.EventID || !wolfixData.Hypocenter) {
            console.log('⚠️ 基本地震情報が不完全のため通知スキップ')
            console.log(`EventID: ${wolfixData.EventID}, Hypocenter: ${wolfixData.Hypocenter}`)
            return null
        }
        
        // キャンセル報のスキップ（より緩い条件）
        if (wolfixData.isCancel) {
            console.log('⚠️ キャンセル報のためスキップ')
            return null
        }
        
        // 訓練報の処理（環境変数で制御、デフォルトは通知）
        if (wolfixData.isTraining && process.env.SKIP_TRAINING_EEW === 'true') {
            console.log('⚠️ 訓練報のためスキップ（環境変数設定）')
            return null
        }
        
        // 積極的通知：マグニチュード2.0以上、または震度1以上、またはWarnAreaがある場合に通知
        const magnitude = wolfixData.Magunitude || 0
        const maxIntensity = wolfixData.MaxIntensity || '不明'
        const hasWarnArea = wolfixData.WarnArea && wolfixData.WarnArea.length > 0
        
        const shouldNotify = magnitude >= 2.0 || 
                           maxIntensity !== '不明' || 
                           hasWarnArea ||
                           wolfixData.isWarn ||
                           wolfixData.isFinal
        
        if (!shouldNotify) {
            console.log('⚠️ 通知条件を満たさないためスキップ')
            console.log(`マグニチュード: ${magnitude}, 最大震度: ${maxIntensity}, WarnArea: ${hasWarnArea}`)
            return null
        }
        
        console.log('✅ 緊急地震速報通知条件を満たしています')
        console.log(`マグニチュード: M${magnitude}, 最大震度: ${maxIntensity}`)
        console.log(`WarnArea数: ${wolfixData.WarnArea?.length || 0}`)
        console.log(`警報: ${wolfixData.isWarn}, 最終報: ${wolfixData.isFinal}`)
        
        const result = await createEarthquakeEmbed(wolfixData, true)
        
        console.log('✅ 緊急地震速報処理完了')
        return {
            ...result,
            wolfixData
        }
        
    } catch (error) {
        console.error('❌ 緊急地震速報処理エラー:', error)
        return null
    }
}

/**
 * 最新地震情報の取得（コマンド用） - EQList API不具合時のフォールバック対応
 */
export async function getLatestEarthquakeInfo(): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], eqListData?: WolfixEQListData, wolfixData?: WolfixEEWData } | null> {
    try {
        console.log('=== 最新地震情報取得開始（EQList API → EEW APIフォールバック） ===')
        
        // まずEQList APIを試行
        const eqListData = await fetchWolfixEarthquakeList()
        
        // EQList APIのデータが不完全の場合、EEW APIをフォールバックとして使用
        if (!eqListData || !eqListData.Hypocenter) {
            console.log('⚠️ EQList APIデータが不完全 - EEW APIをフォールバックとして使用')
            
            const wolfixData = await fetchWolfixEarthquakeData()
            if (!wolfixData) {
                console.log('❌ 両方のAPIから地震データが取得できませんでした')
                return null
            }
            
            const result = await createEarthquakeEmbed(wolfixData, false)
            
            console.log('✅ 最新地震情報取得完了（EEW APIフォールバック）')
            return {
                ...result,
                wolfixData  // EEW APIデータを返す
            }
        }
        
        // EQList APIデータが正常な場合
        const result = await createEarthquakeEmbedFromEQList(eqListData)
        
        console.log('✅ 最新地震情報取得完了（EQList API）')
        return {
            ...result,
            eqListData
        }
        
    } catch (error) {
        console.error('❌ 最新地震情報取得エラー:', error)
        return null
    }
}
