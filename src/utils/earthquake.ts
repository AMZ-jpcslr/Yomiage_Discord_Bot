/**
 * 新しいWolfix API専用地震処理モジュール
 * 震源地マークと震度エリアの正確な表示を実現
 */

import { EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { generateEarthquakeMap } from './mapGenerator_new'
import * as fs from 'fs'

// Wolfix API データ型定義
interface WolfixEEWData {
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
 * Wolfix APIから最新の地震データを取得
 */
export async function fetchWolfixEarthquakeData(): Promise<WolfixEEWData | null> {
    try {
        console.log('=== Wolfix API地震データ取得開始 ===')
        
        const response = await fetch('https://api.wolfx.jp/jma_eew.json')
        if (!response.ok) {
            console.error(`Wolfix API エラー: ${response.status} ${response.statusText}`)
            return null
        }
        
        const data = await response.json() as WolfixEEWData
        console.log('✅ Wolfix API地震データ取得成功')
        console.log(`イベントID: ${data.EventID}`)
        console.log(`震源地: ${data.Hypocenter}`)
        console.log(`座標: ${data.Latitude}°N, ${data.Longitude}°E`)
        console.log(`マグニチュード: ${data.Magunitude}`)
        console.log(`最大震度: ${data.MaxIntensity}`)
        console.log(`WarnArea数: ${data.WarnArea?.length || 0}`)
        
        // WarnAreaの詳細をデバッグ出力
        if (data.WarnArea && data.WarnArea.length > 0) {
            console.log('=== WarnArea詳細 ===')
            data.WarnArea.forEach((area, index) => {
                console.log(`[${index}] 地域: ${area.Chiiki}, 震度1: ${area.Shindo1}, 震度2: ${area.Shindo2}`)
            })
        } else {
            console.log('⚠️ WarnAreaデータが空または存在しません')
        }
        
        return data
        
    } catch (error) {
        console.error('❌ Wolfix API地震データ取得エラー:', error)
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
        console.log('⚠️ WarnAreaデータなし - 震源地のみ表示')
        return areas
    }
    
    console.log(`=== WarnArea処理開始 (${warnAreas.length}件) ===`)
    
    // 地域名から座標への変換マップ（より詳細に）
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
        '沖縄本島': [127.7, 26.2],
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
        '東京': [139.7, 35.7],
        '神奈川県': [139.6, 35.4],
        '神奈川': [139.6, 35.4],
        '千葉県': [140.1, 35.6],
        '千葉': [140.1, 35.6],
        '埼玉県': [139.6, 36.0],
        '埼玉': [139.6, 36.0],
        '茨城県': [140.4, 36.3],
        '茨城': [140.4, 36.3],
        '栃木県': [139.9, 36.6],
        '栃木': [139.9, 36.6],
        '群馬県': [139.0, 36.4],
        '群馬': [139.0, 36.4],
        // 東北
        '宮城県': [140.9, 38.3],
        '宮城': [140.9, 38.3],
        '福島県': [140.5, 37.8],
        '福島': [140.5, 37.8],
        '山形県': [140.4, 38.2],
        '山形': [140.4, 38.2],
        '岩手県': [141.2, 39.7],
        '岩手': [141.2, 39.7],
        '青森県': [140.7, 40.8],
        '青森': [140.7, 40.8],
        '秋田県': [140.1, 39.7],
        '秋田': [140.1, 39.7],
        // 北海道
        '北海道': [143.0, 43.1],
        // より具体的な地域
        '東京都23区': [139.7, 35.7],
        '東京都多摩東部': [139.5, 35.6],
        '東京都多摩西部': [139.3, 35.7]
    }
    
    for (const warnArea of warnAreas) {
        console.log(`WarnArea項目詳細:`, JSON.stringify(warnArea, null, 2))
        
        if (!warnArea.Chiiki) {
            console.log('⚠️ Chiikiフィールドが存在しません')
            continue
        }
        
        // Shindo1とShindo2の両方をチェック
        const intensity = warnArea.Shindo1 || warnArea.Shindo2
        if (!intensity) {
            console.log(`⚠️ 震度データなし: ${warnArea.Chiiki}`)
            continue
        }
        
        const areaName = warnArea.Chiiki.trim()
        const normalizedIntensity = normalizeIntensity(intensity)
        
        console.log(`処理中: 地域="${areaName}", 元震度="${intensity}", 正規化震度="${normalizedIntensity}"`)
        
        // 座標を取得（完全一致を優先）
        let coordinates = areaCoordinates[areaName]
        
        // 完全一致しない場合は部分一致で検索
        if (!coordinates) {
            for (const [mapArea, coords] of Object.entries(areaCoordinates)) {
                if (areaName.includes(mapArea) || mapArea.includes(areaName)) {
                    coordinates = coords
                    console.log(`部分一致発見: "${areaName}" ≈ "${mapArea}"`)
                    break
                }
            }
        }
        
        if (coordinates) {
            if (!areas[normalizedIntensity]) {
                areas[normalizedIntensity] = []
            }
            areas[normalizedIntensity].push(coordinates)
            console.log(`✅ エリア追加成功: ${areaName} [${coordinates[0]}, ${coordinates[1]}] 震度${normalizedIntensity}`)
        } else {
            console.log(`❌ 座標マッピング失敗: "${areaName}" (座標データベースに未登録)`)
        }
    }
    
    console.log('=== WarnArea処理完了 ===')
    Object.entries(areas).forEach(([intensity, coords]) => {
        console.log(`震度${intensity}: ${coords.length}箇所`)
    })
    
    // デバッグ: 結果の詳細を出力
    console.log('最終areas構造:', JSON.stringify(areas, null, 2))
    
    return areas
}

/**
 * Wolfix地震データから地図生成用データを作成
 */
function createMapDataFromWolfixData(wolfixData: WolfixEEWData): { earthquakeData: EarthquakeMapData, areaInfo: AreaInfo } {
    console.log('=== 地図データ作成開始 ===')
    
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
    const areas = convertWarnAreaToMapAreas(wolfixData.WarnArea)
    const areaInfo: AreaInfo = {
        epicenter: [longitude, latitude],  // 経度, 緯度の順序
        areas: areas
    }
    
    console.log('=== 地図データ作成完了 ===')
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
    
    if (wolfixData.MaxIntensity && wolfixData.MaxIntensity !== '不明' && wolfixData.MaxIntensity !== '') {
        const intensity = normalizeIntensity(wolfixData.MaxIntensity)
        description += `**最大震度**: ${intensity}\n`
        console.log(`最大震度表示: 元データ="${wolfixData.MaxIntensity}" → 正規化後="${intensity}"`)
    } else {
        console.log(`最大震度表示スキップ: MaxIntensity="${wolfixData.MaxIntensity}"`)
        // WarnAreaから最大震度を推定する
        if (wolfixData.WarnArea && wolfixData.WarnArea.length > 0) {
            const intensities = wolfixData.WarnArea
                .map(area => area.Shindo1 || area.Shindo2)
                .filter(shindo => shindo && shindo !== '不明')
                .map(shindo => normalizeIntensity(shindo))
            
            if (intensities.length > 0) {
                // 最大震度を推定
                const maxEstimated = intensities.reduce((max, current) => {
                    const numMax = parseFloat(max.replace(/[-+弱強]/, ''))
                    const numCurrent = parseFloat(current.replace(/[-+弱強]/, ''))
                    return numCurrent > numMax ? current : max
                })
                description += `**最大震度**: ${maxEstimated} (推定)\n`
                console.log(`最大震度をWarnAreaから推定: ${maxEstimated}`)
            }
        }
    }
    
    // WarnAreaからの詳細震度情報を追加
    if (wolfixData.WarnArea && wolfixData.WarnArea.length > 0) {
        const intensityInfo = new Map<string, string[]>()
        
        for (const area of wolfixData.WarnArea) {
            if (area.Shindo1) {
                const intensity = normalizeIntensity(area.Shindo1)
                if (!intensityInfo.has(intensity)) {
                    intensityInfo.set(intensity, [])
                }
                if (area.Chiiki) {
                    intensityInfo.get(intensity)!.push(area.Chiiki)
                }
            }
        }
        
        // 震度の高い順にソート
        const sortedIntensities = Array.from(intensityInfo.keys()).sort((a, b) => {
            const numA = parseFloat(a.replace(/[-+弱強]/, ''))
            const numB = parseFloat(b.replace(/[-+弱強]/, ''))
            return numB - numA
        })
        
        if (sortedIntensities.length > 0) {
            description += `\n**各地の震度**:\n`
            for (const intensity of sortedIntensities.slice(0, 5)) { // 上位5つまで表示
                const areas = intensityInfo.get(intensity)!
                const areaText = areas.slice(0, 3).join('、') + (areas.length > 3 ? ` など${areas.length}地点` : '')
                description += `震度${intensity}: ${areaText}\n`
            }
        }
    }
    
    if (wolfixData.OriginTime) {
        description += `**発生時刻**: ${wolfixData.OriginTime}\n`
    }
    
    embed.setDescription(description)
    
    // 震度画像の設定
    let thumbnailSet = false
    if (wolfixData.MaxIntensity && wolfixData.MaxIntensity !== '不明' && wolfixData.MaxIntensity !== '') {
        const imageUrl = getIntensityImageUrl(wolfixData.MaxIntensity)
        if (imageUrl) {
            embed.setThumbnail(imageUrl)
            thumbnailSet = true
            console.log(`サムネイル設定: 震度${normalizeIntensity(wolfixData.MaxIntensity)} → ${imageUrl}`)
        }
    }
    
    // MaxIntensityがない場合、WarnAreaから最大震度を取得してサムネイルを設定
    if (!thumbnailSet && wolfixData.WarnArea && wolfixData.WarnArea.length > 0) {
        const intensities = wolfixData.WarnArea
            .map(area => area.Shindo1 || area.Shindo2)
            .filter(shindo => shindo && shindo !== '不明')
            .map(shindo => normalizeIntensity(shindo))
        
        if (intensities.length > 0) {
            const maxEstimated = intensities.reduce((max, current) => {
                const numMax = parseFloat(max.replace(/[-+弱強]/, ''))
                const numCurrent = parseFloat(current.replace(/[-+弱強]/, ''))
                return numCurrent > numMax ? current : max
            })
            
            const imageUrl = getIntensityImageUrl(maxEstimated)
            if (imageUrl) {
                embed.setThumbnail(imageUrl)
                console.log(`サムネイル設定（WarnAreaから推定）: 震度${maxEstimated} → ${imageUrl}`)
            }
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
 * 緊急地震速報の処理（リアルタイム用）
 */
export async function processEarthquakeAlert(): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], wolfixData?: WolfixEEWData } | null> {
    try {
        console.log('=== 緊急地震速報処理開始 ===')
        
        const wolfixData = await fetchWolfixEarthquakeData()
        if (!wolfixData) {
            console.log('❌ 地震データが取得できませんでした')
            return null
        }
        
        // キャンセル報や訓練報のスキップ判定
        if (wolfixData.isCancel) {
            console.log('⚠️ キャンセル報のためスキップ')
            return null
        }
        
        if (wolfixData.isTraining && process.env.SKIP_TRAINING_EEW !== 'false') {
            console.log('⚠️ 訓練報のためスキップ')
            return null
        }
        
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
 * 最新地震情報の取得（コマンド用）
 */
export async function getLatestEarthquakeInfo(): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], wolfixData?: WolfixEEWData } | null> {
    try {
        console.log('=== 最新地震情報取得開始 ===')
        
        const wolfixData = await fetchWolfixEarthquakeData()
        if (!wolfixData) {
            console.log('❌ 地震データが取得できませんでした')
            return null
        }
        
        const result = await createEarthquakeEmbed(wolfixData, false)
        
        console.log('✅ 最新地震情報取得完了')
        return {
            ...result,
            wolfixData
        }
        
    } catch (error) {
        console.error('❌ 最新地震情報取得エラー:', error)
        return null
    }
}
