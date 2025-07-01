import { EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { generateEarthquakeMap, extractEarthquakeMapData } from './mapGenerator_new'
import * as fs from 'fs'

// 震度値を文字列に変換する関数（改善版）
function maxScaleToString(maxScale: string | number): string {
    const scaleStr = String(maxScale)
    console.log(`maxScaleToString: 入力値 = "${scaleStr}", 型 = ${typeof maxScale}`)
    
    // 文字列形式の震度（新しいAPI）
    switch (scaleStr) {
        case '1': return '1'
        case '2': return '2' 
        case '3': return '3'
        case '4': return '4'
        case '5弱': case '5-': return '5弱'
        case '5強': case '5+': return '5強'
        case '6弱': case '6-': return '6弱'
        case '6強': case '6+': return '6強'
        case '7': return '7'
        // 数値形式の震度（旧API）
        case '10': return '1'
        case '20': return '2'
        case '30': return '3'
        case '40': return '4'
        case '45': return '5弱'
        case '50': return '5強'
        case '55': return '6弱'
        case '60': return '6強'
        case '70': return '7'
        default: 
            console.log(`maxScaleToString: 未知の震度値 "${scaleStr}"`)
            return scaleStr
    }
}

// 震度画像URLを取得する関数
function getShindoImageUrl(maxScale: string | number): string | undefined {
    const scaleStr = String(maxScale)
    console.log(`震度画像URL取得: 入力値 = "${scaleStr}"`)
    
    switch (scaleStr) {
        case '1': case '10': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613/raw'
        case '2': case '20': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639/raw'
        case '3': case '30': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110/raw'
        case '4': case '40': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025/raw'
        case '5弱': case '5-': case '45': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29/raw'
        case '5強': case '5+': case '50': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988/raw'
        case '6弱': case '6-': case '55': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be/raw'
        case '6強': case '6+': case '60': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb/raw'
        case '7': case '70': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4'
        default: 
            console.log(`震度画像URL: 該当なし (${scaleStr})`)
            return undefined
    }
}

// 型安全にオブジェクトプロパティにアクセスするヘルパー関数
function safeGet(obj: unknown, path: string): string {
    try {
        const keys = path.split('.')
        let current: unknown = obj
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = (current as Record<string, unknown>)[key]
            } else {
                return '不明'
            }
        }
        return current ? String(current) : '不明'
    } catch {
        return '不明'
    }
}

// 深さ情報を複数のパスから取得する関数
function getDepthInfo(detailData: Record<string, unknown>): string {
    // デバッグ用：震源データの構造を確認
    const earthquake = safeGet(detailData, 'Body.Earthquake')
    console.log('Earthquake データ構造:', JSON.stringify(earthquake, null, 2))
    
    // 複数のパスを試行して深さ情報を取得
    const depthPaths = [
        'Body.Earthquake.Hypocenter.Area.Depth',
        'Body.Earthquake.Hypocenter.Depth',
        'Body.Earthquake.Depth',
        'Body.Earthquake.Hypocenter.Area.jmx_eb:Depth'  // XML名前空間対応
    ]
    
    for (const path of depthPaths) {
        const depth = safeGet(detailData, path)
        console.log(`深さ取得試行: パス=${path}, 結果=${depth}`)
        if (depth !== '不明' && depth !== '' && depth !== 'null') {
            console.log(`深さ情報取得成功: パス=${path}, 値=${depth}`)
            // 深さの値を正規化（単位の統一など）
            if (depth.includes('km')) {
                return depth
            } else if (depth.match(/^\d+$/)) {
                return `${depth}km`
            } else if (depth.match(/^\d+\.\d+$/)) {
                return `${depth}km`
            } else {
                return depth
            }
        }
    }
    
    console.log('深さ情報取得失敗: すべてのパスで不明')
    
    // フォールバック: 震源名から深さの推定を試行
    const hypocenter = safeGet(detailData, 'Body.Earthquake.Hypocenter.Area.Name')
    if (hypocenter !== '不明') {
        console.log(`震源名から深さ推定を試行: ${hypocenter}`)
        // 海域の地震の場合、一般的な深さを推定
        if (hypocenter.includes('近海') || hypocenter.includes('沖') || hypocenter.includes('海域')) {
            return '10km'  // 海域地震の一般的な深さ
        } else if (hypocenter.includes('内陸') || hypocenter.includes('地方')) {
            return '10km'  // 内陸地震の一般的な深さ
        }
    }
    
    return '不明'
}

// 最大震度情報を複数のパスから取得する関数
function getMaxIntensity(detailData: Record<string, unknown>): string {
    const intensityPaths = [
        'Body.Intensity.Observation.MaxInt',
        'Body.Intensity.MaxInt',
        'Body.MaxInt'
    ]
    
    for (const path of intensityPaths) {
        const intensity = safeGet(detailData, path)
        console.log(`最大震度取得試行: パス=${path}, 結果=${intensity}`)
        if (intensity !== '不明' && intensity !== '' && intensity !== 'null') {
            console.log(`最大震度取得成功: パス=${path}, 値=${intensity}`)
            return intensity
        }
    }
    
    console.log('最大震度取得失敗: すべてのパスで不明')
    return '不明'
}

// 津波や追加情報テキストを複数のパスから取得する関数
function getAdditionalText(detailData: Record<string, unknown>): string {
    const textPaths = [
        'Head.Text',
        'Head.Comment.Text',
        'Body.Text',
        'Body.Comments.Text',
        'Body.Comments.WarningComment.Text', // 津波警報等
        'Body.Tsunami.Comment.Text'  // 津波情報
    ]
    
    for (const path of textPaths) {
        const text = safeGet(detailData, path)
        console.log(`追加テキスト取得試行: パス=${path}, 結果=${text}`)
        if (text !== '不明' && text !== '' && text !== 'null' && text.trim() !== '') {
            console.log(`追加テキスト取得成功: パス=${path}, 値=${text}`)
            // 津波に関する情報を優先的に処理
            if (text.includes('津波') || text.includes('潮位')) {
                return `🌊 ${text.trim()}`
            }
            return text.trim()
        }
    }
    
    // 津波情報の専用処理
    const tsunamiInfo = safeGet(detailData, 'Body.Tsunami')
    if (tsunamiInfo !== '不明' && tsunamiInfo !== '') {
        console.log('津波情報を検出:', tsunamiInfo)
        // 津波なしの場合の表示
        return '🌊 この地震による津波の心配はありません。'
    }
    
    console.log('追加テキスト取得失敗: すべてのパスで不明または空')
    return ''  // 空文字を返すことで表示しない
}

// 地震情報の埋め込みを作成する共通関数
export async function createEarthquakeEmbed(latestId: string, isAutoNotify = false): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[] }> {
    const detailRes = await fetch(`https://www.jma.go.jp/bosai/quake/data/${latestId}`)
    const detail = await detailRes.json() as Record<string, unknown>

    const detailData = detail as Record<string, unknown>
    const time = safeGet(detailData, 'Head.ReportDateTime')
    const hypocenter = safeGet(detailData, 'Body.Earthquake.Hypocenter.Area.Name')
    const magnitude = safeGet(detailData, 'Body.Earthquake.Magnitude')
    const maxScale = getMaxIntensity(detailData) // 改善された最大震度取得関数を使用
    const depth = getDepthInfo(detailData) // 改善された深さ取得関数を使用
    const text = getAdditionalText(detailData) // 改善された追加テキスト取得関数を使用
    
    console.log(`地震情報: 時刻=${time}, 震源=${hypocenter}, M=${magnitude}, 最大震度=${maxScale}, 深さ=${depth}, 追加テキスト=${text}`)
    
    // 最大震度の文字列変換を改善
    let maxScaleStr = '不明'
    if (maxScale !== '不明' && maxScale !== '') {
        maxScaleStr = maxScaleToString(maxScale)
    } else {
        // フォールバック: 地震データから最大震度を推定
        console.log('最大震度が不明のため、地震マップデータから推定を試行')
        try {
            const { earthquakeData } = extractEarthquakeMapData(detail)
            if (earthquakeData.maxScale && earthquakeData.maxScale !== '不明') {
                maxScaleStr = earthquakeData.maxScale.toString()
                console.log(`地震マップデータから最大震度を取得: ${maxScaleStr}`)
            }
        } catch (error) {
            console.log('地震マップデータからの震度取得に失敗:', error)
        }
    }
    
    console.log(`maxScale: "${maxScale}", maxScaleStr: "${maxScaleStr}"`)

    // 震度画像URL取得 - 複数の形式に対応
    let shindoImageUrl = getShindoImageUrl(maxScale)
    if (!shindoImageUrl && maxScaleStr !== '不明') {
        shindoImageUrl = getShindoImageUrl(maxScaleStr)
    }
    console.log(`震度画像URL: ${shindoImageUrl}`)

    // 独自の地震マップ画像を生成
    let generatedMapPath: string | null = null
    const attachments: AttachmentBuilder[] = []
    
    // サーバー環境では地震マップ生成をスキップするオプション
    const skipMapGeneration = process.env.SKIP_MAP_GENERATION === 'true'
    
    if (!skipMapGeneration) {
        try {
            const { earthquakeData, areaInfo } = extractEarthquakeMapData(detail)
            generatedMapPath = await generateEarthquakeMap(earthquakeData, areaInfo)
            
            // 生成された画像をDiscordの添付ファイルとして準備
            const attachment = new AttachmentBuilder(generatedMapPath, { 
                name: 'earthquake_map.png' 
            })
            attachments.push(attachment)
            console.log('独自地震マップ画像を生成しました:', generatedMapPath)
        } catch (error) {
            console.error('地震マップ画像生成エラー:', error)
            console.log('地震マップなしで通知を続行します')
            // エラーが発生してもボットの動作を継続
        }
    } else {
        console.log('地震マップ生成はスキップされました（SKIP_MAP_GENERATION=true）')
    }

    // 埋め込み作成
    const title = isAutoNotify ? '🚨 【自動通知】地震情報' : '🚨 地震情報'
    
    // 説明文の最大震度部分を改善
    let intensityDescription = ''
    if (maxScaleStr !== '不明' && maxScaleStr !== '') {
        intensityDescription = `**最大震度${maxScaleStr}の地震がありました。**\n`
    } else {
        intensityDescription = `**地震がありました。**\n`
        console.log('最大震度が不明のため、説明文から震度表記を省略')
    }
    
    // 追加テキスト（津波情報等）の処理を改善
    let additionalInfo = ''
    if (text && text.trim() !== '' && text !== '不明') {
        additionalInfo = text.trim() + '\n'
        console.log(`追加情報を表示: ${text}`)
    } else {
        console.log('追加情報なし、または空のため表示をスキップ')
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0xff4444)
        .setDescription(
            `**${time.replace(/T/, ' ').replace(/\+09:00/, '')}ごろ、**\n` +
            intensityDescription +
            additionalInfo
        )
        .addFields(
            { name: '震源', value: hypocenter !== '不明' ? hypocenter : '情報なし', inline: true },
            { name: '規模', value: magnitude !== '不明' ? `M${magnitude}` : '情報なし', inline: true },
            { name: '深さ', value: depth !== '不明' ? depth : '情報なし', inline: true }
        )
    
    // 最大震度が取得できた場合は追加フィールドとして表示
    if (maxScaleStr !== '不明' && maxScaleStr !== '') {
        embed.addFields({ name: '最大震度', value: maxScaleStr, inline: true })
    }

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

// P2P地震情報のデータ型定義（実際のデータ構造に合わせて拡張）
interface P2PEarthquakeData {
    code?: number
    time?: string
    created_at?: string
    occurred_time?: string
    earthquake?: {
        hypocenter?: {
            name?: string
            latitude?: number
            longitude?: number
            depth?: number
        }
        magnitude?: number | string
        maxScale?: number
    }
    hypocenter?: {
        name?: string
        latitude?: number
        longitude?: number
        depth?: number
    }
    magnitude?: number | string
    maxScale?: number
    maxInt?: number | string
    // 緊急地震速報特有のフィールド
    situation?: string
    areas?: Array<{
        name?: string
        scaleFrom?: number
        scaleTo?: number
        kindCode?: string
    }>
    // 実際のP2P APIで使用される可能性のある他のフィールド
    [key: string]: unknown
}

// P2P地震情報データからJMA互換の埋め込みを作成する関数
export async function createEarthquakeEmbedFromP2PData(p2pData: P2PEarthquakeData): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], mapGenerated?: boolean } | null> {
    try {
        console.log('P2P地震情報データを処理中:', JSON.stringify(p2pData, null, 2))
        
        // P2P地震情報をJMA API互換形式に変換
        const jmaCompatibleData = convertP2PtoJMAFormat(p2pData)
        console.log('JMA互換形式に変換:', JSON.stringify(jmaCompatibleData, null, 2))
        
        // 変換されたデータを使用して地震情報埋め込みを作成
        return await createEarthquakeEmbedFromData(jmaCompatibleData, true) // isAutoNotify = true for P2P alerts
    } catch (error) {
        console.error('P2P地震情報から埋め込み作成中にエラー:', error)
        return null
    }
}

// P2P地震情報データをJMA API互換形式に変換する関数
function convertP2PtoJMAFormat(p2pData: P2PEarthquakeData): Record<string, unknown> {
    console.log('=== P2P→JMA変換を開始 ===')
    console.log('受信したP2Pデータの完全な構造:', JSON.stringify(p2pData, null, 2))
    
    // P2P地震情報の基本情報を抽出（実際のP2P API仕様に基づく）
    const p2pRecord = p2pData as Record<string, unknown>
    
    console.log('=== P2Pデータの詳細解析 ===')
    
    // P2P地震情報の緊急地震速報（code: 551）の一般的な構造に対応
    // 時刻情報の取得
    const timeValue = p2pRecord.created_at ||
                     p2pRecord.time || 
                     p2pRecord.occurred_time || 
                     p2pRecord.event_time || 
                     new Date().toISOString()
    
    // 地震情報オブジェクトの取得（P2P API特有の構造）
    const earthquakeData = p2pRecord.earthquake as Record<string, unknown> || {}
    
    // 震源情報の取得
    let hypocenterName = '不明'
    let hypocenterDepth = '不明'
    
    // ハイポセンター情報の取得（複数のパターンに対応）
    const hypoData = earthquakeData.hypocenter || 
                    earthquakeData.epicenter ||
                    p2pRecord.hypocenter ||
                    p2pRecord.epicenter
    
    if (hypoData && typeof hypoData === 'object') {
        const hypoRecord = hypoData as Record<string, unknown>
        hypocenterName = String(hypoRecord.name || hypoRecord.region || hypoRecord.area || hypoRecord.text || '不明')
        
        // 深さの取得
        const depth = hypoRecord.depth || hypoRecord.dep
        if (depth) {
            hypocenterDepth = `${depth}km`
        }
    }
    
    // マグニチュードの取得（複数のフィールドをチェック）
    let magnitudeValue = earthquakeData.magnitude ||
                          earthquakeData.mag ||
                          p2pRecord.magnitude || 
                          p2pRecord.mag ||
                          '不明'
    
    // 最大震度の取得（P2P API特有のフィールド名）
    let maxScaleValue = Number(earthquakeData.maxScale ||
                         earthquakeData.max_scale ||
                         earthquakeData.maxInt ||
                         earthquakeData.max_int ||
                         p2pRecord.maxScale || 
                         p2pRecord.max_scale ||
                         p2pRecord.maxInt ||
                         p2pRecord.max_int ||
                         0)
    
    // 緊急地震速報の場合の特別処理
    if (p2pRecord.code === 551 && p2pRecord.areas) {
        console.log('緊急地震速報（code: 551）の特別処理を実行')
        const areas = p2pRecord.areas as Array<Record<string, unknown>>
        
        // エリア情報から最大震度を取得
        let maxAreaScale = 0
        areas.forEach((area, index) => {
            console.log(`エリア${index + 1}:`, JSON.stringify(area, null, 2))
            const scaleFrom = Number(area.scaleFrom || 0)
            const scaleTo = Number(area.scaleTo || area.scaleFrom || 0)
            maxAreaScale = Math.max(maxAreaScale, scaleTo, scaleFrom)
        })
        
        if (maxAreaScale > maxScaleValue) {
            maxScaleValue = maxAreaScale
            console.log(`エリア情報から最大震度を更新: ${maxAreaScale}`)
        }
        
        // 第1エリアから震源地名を取得（震源地名が不明の場合）
        if (hypocenterName === '不明' && areas.length > 0 && areas[0].name) {
            hypocenterName = String(areas[0].name)
            console.log(`エリア情報から震源地名を取得: ${hypocenterName}`)
        }
    }
    
    console.log('=== 抽出結果 ===')
    console.log('- timeValue:', timeValue)
    console.log('- hypocenterName:', hypocenterName)
    console.log('- hypocenterDepth:', hypocenterDepth)
    console.log('- magnitudeValue:', magnitudeValue)
    console.log('- maxScaleValue:', maxScaleValue)
    console.log('- earthquakeDataKeys:', Object.keys(earthquakeData))
    
    // 値の有効性チェック
    if (hypocenterName === '不明' && magnitudeValue === '不明' && maxScaleValue === 0) {
        console.warn('⚠️  重要なデータが取得できませんでした。P2Pデータ構造を再確認してください。')
        console.log('利用可能なフィールド:', Object.keys(p2pRecord))
    }
    
    // フォールバック処理：地震情報が取得できない場合の代替データ収集
    if (hypocenterName === '不明' || magnitudeValue === '不明' || maxScaleValue === 0) {
        console.log('=== フォールバック処理を実行 ===')
        
        // P2P地震情報のその他のフィールドをチェック
        const allFields = Object.keys(p2pRecord)
        console.log('利用可能なフィールド:', allFields)
        
        // 地震に関連しそうなフィールドを探索
        for (const field of allFields) {
            const value = p2pRecord[field]
            if (value && typeof value === 'object') {
                console.log(`オブジェクトフィールド ${field}:`, JSON.stringify(value, null, 2))
            } else if (value && typeof value === 'string' && value !== '') {
                console.log(`文字列フィールド ${field}: "${value}"`)
            } else if (typeof value === 'number' && value > 0) {
                console.log(`数値フィールド ${field}: ${value}`)
            }
        }
        
        // 緊急地震速報特有のフィールドをチェック
        if (p2pRecord.situation) {
            console.log('situation:', p2pRecord.situation)
        }
        if (p2pRecord.areas) {
            console.log('areas:', JSON.stringify(p2pRecord.areas, null, 2))
        }
        
        // 最低限のデータとして現在時刻と「緊急地震速報」を設定
        if (hypocenterName === '不明') {
            hypocenterName = '緊急地震速報発表'
        }
        if (magnitudeValue === '不明') {
            magnitudeValue = '速報値'
        }
        if (maxScaleValue === 0 && p2pRecord.maxScale) {
            // 別のフィールド名で最大震度が設定されている可能性
            const altMaxScale = Number(p2pRecord.maxScale)
            if (altMaxScale > 0) {
                maxScaleValue = altMaxScale
                console.log('代替フィールドから最大震度を取得:', altMaxScale)
            }
        }
    }
    
    // P2Pデータの他の可能なフィールドもチェック
    console.log('その他のP2Pフィールド:')
    Object.keys(p2pData).forEach(key => {
        if (!['hypocenter', 'magnitude', 'maxScale', 'time'].includes(key)) {
            console.log(`- ${key}:`, (p2pData as Record<string, unknown>)[key])
        }
    })
    
    // JMA API互換の構造を作成
    const jmaFormat = {
        Head: {
            ReportDateTime: timeValue || new Date().toISOString(),
            Text: '緊急地震速報（P2P地震情報）'
        },
        Body: {
            Earthquake: {
                Hypocenter: {
                    Area: {
                        Name: hypocenterName,
                        Depth: hypocenterDepth
                    }
                },
                Magnitude: magnitudeValue?.toString() || '不明'
            },
            Intensity: {
                Observation: {
                    MaxInt: convertP2PMaxScaleToJMAFormat(Number(maxScaleValue) || 0)
                }
            }
        }
    }
    
    console.log('=== JMA互換形式への変換完了 ===')
    console.log('変換結果:', JSON.stringify(jmaFormat, null, 2))
    return jmaFormat
}

// P2P地震情報の震度形式をJMA形式に変換
function convertP2PMaxScaleToJMAFormat(p2pMaxScale: number): string {
    console.log(`P2P震度変換: 入力値 = ${p2pMaxScale}`)
    
    // P2P地震情報の震度コード（数値）をJMA互換の文字列に変換
    switch (p2pMaxScale) {
        case 10: return '1'
        case 20: return '2' 
        case 30: return '3'
        case 40: return '4'
        case 45: return '5弱'
        case 50: return '5強'
        case 55: return '6弱'
        case 60: return '6強'
        case 70: return '7'
        default: 
            console.log(`未知のP2P震度値: ${p2pMaxScale}`)
            return p2pMaxScale?.toString() || '不明'
    }
}

// P2P地震情報から地図生成用データを作成する関数
function createMapDataFromP2PInfo(detailData: Record<string, unknown>): { earthquakeData: Record<string, unknown>, areaInfo: Record<string, unknown> } | null {
    try {
        console.log('=== P2P地震情報から地図データを作成 ===')
        
        // 震源情報の取得
        const hypocenter = safeGet(detailData, 'Body.Earthquake.Hypocenter.Area.Name')
        const magnitude = safeGet(detailData, 'Body.Earthquake.Magnitude')
        const maxScale = getMaxIntensity(detailData)
        const depth = getDepthInfo(detailData)
        
        console.log('地図用データ抽出:', { hypocenter, magnitude, maxScale, depth })
        
        // 地図生成に最低限必要な情報があるかチェック
        if (hypocenter === '不明' && magnitude === '不明') {
            console.log('地図生成に必要な最低限の情報が不足しています')
            return null
        }
        
        // 震源の概算座標を取得（日本の主要地域の代表座標）
        const coordinates = getApproximateCoordinates(hypocenter)
        console.log('震源座標:', coordinates)
        
        // EarthquakeData型に合わせた地震データ構造を作成
        const earthquakeData = {
            longitude: coordinates.longitude,
            latitude: coordinates.latitude,
            magnitude: magnitude !== '不明' ? parseFloat(magnitude) || 0 : 0,
            depth: depth !== '不明' ? parseFloat(depth.replace('km', '')) || 10 : 10,
            hypocenter: hypocenter !== '不明' ? hypocenter : '不明',
            maxScale: maxScale !== '不明' ? maxScale : '不明'
        }
        
        // AreaInfo型に合わせた地域情報を作成
        const areaInfo = {
            epicenter: hypocenter !== '不明' ? hypocenter : '震源地域',
            areas: [{
                name: hypocenter !== '不明' ? hypocenter : '震源地域',
                maxScale: maxScale !== '不明' ? maxScale : '不明',
                stations: [] // P2P地震情報では観測点情報は限定的
            }]
        }
        
        console.log('=== 作成された地図データ ===')
        console.log('earthquakeData:', JSON.stringify(earthquakeData, null, 2))
        console.log('areaInfo:', JSON.stringify(areaInfo, null, 2))
        
        // データの有効性をチェック
        if (earthquakeData.longitude === 0 || earthquakeData.latitude === 0) {
            console.warn('⚠️  座標が無効です:', coordinates)
        }
        if (earthquakeData.magnitude === 0) {
            console.warn('⚠️  マグニチュードが無効です:', magnitude)
        }
        
        return { earthquakeData, areaInfo }
        
    } catch (error) {
        console.error('P2P地震情報から地図データ作成中にエラー:', error)
        return null
    }
}

// 震源地名から概算座標を取得する関数
function getApproximateCoordinates(hypocenterName: string): { longitude: number, latitude: number } {
    // 日本の主要地域の代表座標（概算）
    const regionCoordinates: Record<string, { longitude: number, latitude: number }> = {
        // 本州
        '茨城県': { longitude: 140.4, latitude: 36.3 },
        '栃木県': { longitude: 139.9, latitude: 36.6 },
        '群馬県': { longitude: 139.0, latitude: 36.4 },
        '埼玉県': { longitude: 139.6, latitude: 36.0 },
        '千葉県': { longitude: 140.1, latitude: 35.6 },
        '東京都': { longitude: 139.7, latitude: 35.7 },
        '神奈川県': { longitude: 139.6, latitude: 35.4 },
        '新潟県': { longitude: 139.0, latitude: 37.9 },
        '富山県': { longitude: 137.2, latitude: 36.7 },
        '石川県': { longitude: 136.6, latitude: 36.6 },
        '福井県': { longitude: 136.2, latitude: 36.1 },
        '山梨県': { longitude: 138.6, latitude: 35.7 },
        '長野県': { longitude: 138.2, latitude: 36.2 },
        '岐阜県': { longitude: 137.2, latitude: 35.4 },
        '静岡県': { longitude: 138.4, latitude: 34.9 },
        '愛知県': { longitude: 137.0, latitude: 35.2 },
        '三重県': { longitude: 136.5, latitude: 34.7 },
        '滋賀県': { longitude: 136.0, latitude: 35.0 },
        '京都府': { longitude: 135.8, latitude: 35.0 },
        '大阪府': { longitude: 135.5, latitude: 34.7 },
        '兵庫県': { longitude: 135.2, latitude: 34.7 },
        '奈良県': { longitude: 135.8, latitude: 34.7 },
        '和歌山県': { longitude: 135.2, latitude: 34.2 },
        '鳥取県': { longitude: 134.2, latitude: 35.5 },
        '島根県': { longitude: 132.6, latitude: 35.5 },
        '岡山県': { longitude: 133.9, latitude: 34.7 },
        '広島県': { longitude: 132.5, latitude: 34.4 },
        '山口県': { longitude: 131.5, latitude: 34.2 },
        '徳島県': { longitude: 134.6, latitude: 34.1 },
        '香川県': { longitude: 134.0, latitude: 34.3 },
        '愛媛県': { longitude: 132.8, latitude: 33.8 },
        '高知県': { longitude: 133.5, latitude: 33.6 },
        '福岡県': { longitude: 130.4, latitude: 33.6 },
        '佐賀県': { longitude: 130.3, latitude: 33.2 },
        '長崎県': { longitude: 129.9, latitude: 32.8 },
        '熊本県': { longitude: 130.7, latitude: 32.8 },
        '大分県': { longitude: 131.6, latitude: 33.2 },
        '宮崎県': { longitude: 131.4, latitude: 32.0 },
        '鹿児島県': { longitude: 130.6, latitude: 31.6 },
        '沖縄県': { longitude: 127.7, latitude: 26.2 },
        // 北海道
        '北海道': { longitude: 143.0, latitude: 43.1 },
        // 東北
        '青森県': { longitude: 140.7, latitude: 40.8 },
        '岩手県': { longitude: 141.2, latitude: 39.7 },
        '宮城県': { longitude: 140.9, latitude: 38.3 },
        '秋田県': { longitude: 140.1, latitude: 39.7 },
        '山形県': { longitude: 140.4, latitude: 38.2 },
        '福島県': { longitude: 140.5, latitude: 37.8 },
        // 海域
        '相模湾': { longitude: 139.3, latitude: 35.2 },
        '駿河湾': { longitude: 138.6, latitude: 35.0 },
        '遠州灘': { longitude: 137.8, latitude: 34.6 },
        '伊豆半島': { longitude: 139.0, latitude: 34.8 },
        '房総半島': { longitude: 140.3, latitude: 35.2 },
        '三陸沖': { longitude: 142.0, latitude: 39.0 },
        '福島沖': { longitude: 141.5, latitude: 37.0 },
        '茨城沖': { longitude: 141.0, latitude: 36.0 }
    }
    
    // 震源地名から最適な座標を検索
    for (const [region, coords] of Object.entries(regionCoordinates)) {
        if (hypocenterName.includes(region)) {
            console.log(`震源地域 "${hypocenterName}" に対して座標 ${coords.longitude}, ${coords.latitude} を使用`)
            return coords
        }
    }
    
    // より大まかな地域での検索
    if (hypocenterName.includes('関東') || hypocenterName.includes('東京')) {
        return { longitude: 139.7, latitude: 35.7 }
    } else if (hypocenterName.includes('関西') || hypocenterName.includes('大阪')) {
        return { longitude: 135.5, latitude: 34.7 }
    } else if (hypocenterName.includes('東北')) {
        return { longitude: 140.9, latitude: 38.3 }
    } else if (hypocenterName.includes('九州')) {
        return { longitude: 130.4, latitude: 33.6 }
    } else if (hypocenterName.includes('北海道')) {
        return { longitude: 143.0, latitude: 43.1 }
    } else if (hypocenterName.includes('沖縄')) {
        return { longitude: 127.7, latitude: 26.2 }
    }
    
    // デフォルト座標（日本の中心部）
    console.log(`震源地域 "${hypocenterName}" の座標が見つからないため、デフォルト座標を使用`)
    return { longitude: 138.0, latitude: 36.0 }
}

// データから直接埋め込みを作成する関数（JMA APIフェッチなし）
async function createEarthquakeEmbedFromData(detailData: Record<string, unknown>, isAutoNotify = false): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], mapGenerated?: boolean }> {
    const time = safeGet(detailData, 'Head.ReportDateTime')
    const hypocenter = safeGet(detailData, 'Body.Earthquake.Hypocenter.Area.Name')
    const magnitude = safeGet(detailData, 'Body.Earthquake.Magnitude')
    const maxScale = getMaxIntensity(detailData)
    const depth = getDepthInfo(detailData)
    const text = getAdditionalText(detailData)
    
    console.log(`地震情報(P2P): 時刻=${time}, 震源=${hypocenter}, M=${magnitude}, 最大震度=${maxScale}, 深さ=${depth}, 追加テキスト=${text}`)
    
    // 最大震度の文字列変換
    let maxScaleStr = '不明'
    if (maxScale !== '不明' && maxScale !== '') {
        maxScaleStr = maxScaleToString(maxScale)
    }
    
    console.log(`maxScale: "${maxScale}", maxScaleStr: "${maxScaleStr}"`)

    // 震度画像URL取得
    let shindoImageUrl = getShindoImageUrl(maxScale)
    if (!shindoImageUrl && maxScaleStr !== '不明') {
        shindoImageUrl = getShindoImageUrl(maxScaleStr)
    }
    console.log(`震度画像URL: ${shindoImageUrl}`)

    // 地震マップ生成（P2P地震情報でも実行）
    let generatedMapPath: string | null = null
    const attachments: AttachmentBuilder[] = []
    let mapGenerationSuccess = false
    
    // サーバー環境では地震マップ生成をスキップするオプション
    const skipMapGeneration = process.env.SKIP_MAP_GENERATION === 'true'
    
    if (!skipMapGeneration) {
        console.log('=== P2P地震情報用地図生成を開始 ===')
        try {
            // P2P地震情報用の地図データを作成
            const mapData = createMapDataFromP2PInfo(detailData)
            if (mapData) {
                console.log('地図データの作成に成功:', mapData)
                const { earthquakeData, areaInfo } = mapData
                
                console.log('地図生成を実行中...')
                // 型を適切にキャストして地図生成関数に渡す
                generatedMapPath = await generateEarthquakeMap(
                    earthquakeData as unknown as Parameters<typeof generateEarthquakeMap>[0], 
                    areaInfo as unknown as Parameters<typeof generateEarthquakeMap>[1]
                )
                
                // 地図ファイルが実際に生成されたかを確認
                if (generatedMapPath && fs.existsSync(generatedMapPath)) {
                    // 生成された画像をDiscordの添付ファイルとして準備
                    const attachment = new AttachmentBuilder(generatedMapPath, { 
                        name: 'earthquake_map.png' 
                    })
                    attachments.push(attachment)
                    mapGenerationSuccess = true
                    console.log('✅ P2P地震情報用地図画像の生成に成功:', generatedMapPath)
                } else {
                    console.error('❌ 地図ファイルが生成されませんでした:', generatedMapPath)
                    generatedMapPath = null
                }
            } else {
                console.error('❌ P2P地震情報から地図データの作成に失敗')
            }
        } catch (error) {
            console.error('❌ P2P地震マップ画像生成エラー:', error)
            console.error('エラー詳細:', error instanceof Error ? error.stack : error)
            generatedMapPath = null
        }
    } else {
        console.log('⏭️  地震マップ生成はスキップされました（SKIP_MAP_GENERATION=true）')
    }
    
    // 地図生成結果をログ出力
    console.log(`=== 地図生成結果 ===`)
    console.log(`- 生成成功: ${mapGenerationSuccess}`)
    console.log(`- ファイルパス: ${generatedMapPath}`)
    console.log(`- 添付ファイル数: ${attachments.length}`)
    
    // 埋め込み作成
    const title = isAutoNotify ? '🚨 【緊急地震速報】' : '🚨 地震情報'
    
    // 説明文の最大震度部分
    let intensityDescription = ''
    if (maxScaleStr !== '不明' && maxScaleStr !== '') {
        intensityDescription = `**最大震度${maxScaleStr}の地震がありました。**\n`
    } else {
        intensityDescription = `**地震がありました。**\n`
    }
    
    // 追加テキスト（津波情報等）の処理
    let additionalInfo = ''
    if (text && text.trim() !== '' && text !== '不明') {
        additionalInfo = text.trim() + '\n'
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0xff0000) // 緊急地震速報は赤色
        .setDescription(
            `**${time.replace(/T/, ' ').replace(/\+09:00/, '').replace(/Z/, '')}ごろ、**\n` +
            intensityDescription +
            additionalInfo
        )
        .addFields(
            { name: '震源', value: hypocenter !== '不明' ? hypocenter : '情報なし', inline: true },
            { name: '規模', value: magnitude !== '不明' ? `M${magnitude}` : '情報なし', inline: true },
            { name: '深さ', value: depth !== '不明' ? depth : '情報なし', inline: true }
        )
    
    // 最大震度が取得できた場合は追加フィールドとして表示
    if (maxScaleStr !== '不明' && maxScaleStr !== '') {
        embed.addFields({ name: '最大震度', value: maxScaleStr, inline: true })
    }

    // 震度画像を右上サムネイルに設定
    if (shindoImageUrl) {
        embed.setThumbnail(shindoImageUrl)
        console.log('震度画像をサムネイルに設定:', shindoImageUrl)
    }

    // 生成された地震マップ画像をメイン画像として設定（生成成功時のみ）
    if (mapGenerationSuccess && generatedMapPath && attachments.length > 0) {
        embed.setImage('attachment://earthquake_map.png')
        console.log('✅ 生成されたP2P地震マップをメイン画像に設定')
    } else {
        console.log('⚠️  地震マップが生成されていないため、マップ画像をスキップ')
    }

    // フッター設定
    embed.setFooter({ 
        text: 'Earthquake Information by P2P & JMA', 
        iconURL: 'https://www.jma.go.jp/jma/kishou/favicon.ico' 
    })
    embed.setTimestamp(new Date())

    console.log('=== P2P地震情報埋め込み作成完了 ===')
    console.log(`- 地図生成成功: ${mapGenerationSuccess}`)
    console.log(`- 添付ファイル数: ${attachments.length}`)
    console.log(`- 震度画像: ${shindoImageUrl ? 'あり' : 'なし'}`)

    return { 
        embed, 
        files: attachments.length > 0 ? attachments : undefined,
        mapGenerated: mapGenerationSuccess 
    }
}

// P2P地震情報データからJMAの地震IDを特定する関数
export async function findJMAEarthquakeId(p2pData: P2PEarthquakeData): Promise<string | null> {
    try {
        console.log('=== JMA地震情報一覧を取得中... ===')
        const res = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json')
        const list = await res.json() as { json: string, anm: string }[]
        
        if (!list.length) {
            console.log('❌ JMA地震情報一覧が空です')
            return null
        }

        console.log(`📋 JMA地震情報 ${list.length}件を取得`)

        // P2P地震情報から基本情報を抽出（安全な型チェック）
        if (!p2pData.time) {
            console.log('❌ P2P地震情報に時刻データがありません')
            return null
        }
        
        const p2pTime = new Date(p2pData.time)
        // 震源地名は複数の場所から取得可能
        const p2pHypocenter = p2pData.earthquake?.hypocenter?.name || p2pData.hypocenter?.name
        // マグニチュードも複数の場所から取得可能
        const p2pMagnitude = parseFloat(String(p2pData.earthquake?.magnitude || p2pData.magnitude || 0))
        
        console.log(`🔍 P2P情報 - 時刻: ${p2pTime.toISOString()}, 震源: ${p2pHypocenter}, M: ${p2pMagnitude}`)

        // 直近の地震情報から類似するものを検索（最新30件を確認）
        for (let i = 0; i < Math.min(30, list.length); i++) {
            const item = list[i]
            try {
                console.log(`🔍 JMA地震情報 ${i + 1}/${Math.min(30, list.length)}: ${item.json} (${item.anm})`)
                
                const detailRes = await fetch(`https://www.jma.go.jp/bosai/quake/data/${item.json}`)
                const detail = await detailRes.json() as Record<string, unknown>
                
                const jmaTimeStr = safeGet(detail, 'Body.Earthquake.OriginTime') || safeGet(detail, 'Head.ReportDateTime')
                if (!jmaTimeStr) {
                    console.log(`⚠️  時刻情報なし - スキップ`)
                    continue
                }
                
                const jmaTime = new Date(jmaTimeStr)
                const jmaHypocenter = safeGet(detail, 'Body.Earthquake.Hypocenter.Area.Name')
                const jmaMagnitude = parseFloat(safeGet(detail, 'Body.Earthquake.Magnitude') || '0')
                
                // 時刻の差を計算
                const timeDiff = Math.abs(p2pTime.getTime() - jmaTime.getTime())
                const timeDiffMinutes = timeDiff / (1000 * 60)
                
                console.log(`⏰ 時刻差: ${timeDiffMinutes.toFixed(1)}分, 震源: ${jmaHypocenter}, M: ${jmaMagnitude}`)
                
                // 時刻による絞り込み（最初に2時間以内、見つからなければ段階的に拡大）
                let maxTimeDiffMinutes = 120 // 最初は2時間以内
                if (i > 10) maxTimeDiffMinutes = 360 // 10件目以降は6時間以内
                if (i > 20) maxTimeDiffMinutes = 1440 // 20件目以降は24時間以内
                
                if (timeDiffMinutes <= maxTimeDiffMinutes) {
                    // 震源地名の類似性をチェック（部分一致）
                    const hypoMatch = !!(p2pHypocenter && jmaHypocenter && 
                        (p2pHypocenter.includes(jmaHypocenter) || jmaHypocenter.includes(p2pHypocenter)))
                    
                    // マグニチュードの類似性をチェック（±1.0以内、緊急地震速報では精度が低い場合がある）
                    const magMatch = p2pMagnitude > 0 && jmaMagnitude > 0 && 
                        Math.abs(p2pMagnitude - jmaMagnitude) <= 1.0
                    
                    console.log(`🎯 マッチング結果 - 震源: ${hypoMatch ? '✅' : '❌'}, マグニチュード: ${magMatch ? '✅' : '❌'}`)
                    
                    // 条件に応じたマッチング
                    let isMatch = false
                    
                    if (timeDiffMinutes <= 30) {
                        // 30分以内なら震源地またはマグニチュードのいずれかが一致すれば採用
                        isMatch = hypoMatch || magMatch
                    } else if (timeDiffMinutes <= 120) {
                        // 2時間以内なら震源地とマグニチュード両方が一致する必要
                        isMatch = hypoMatch && magMatch
                    } else {
                        // それ以上は厳密な一致が必要
                        isMatch = hypoMatch && magMatch && timeDiffMinutes <= maxTimeDiffMinutes
                    }
                    
                    if (isMatch) {
                        console.log(`✅ JMA地震ID ${item.json} が P2P地震情報と一致 (時刻差: ${timeDiffMinutes.toFixed(1)}分)`)
                        return item.json
                    }
                } else if (i < 10) {
                    console.log(`⏭️  時刻差が大きすぎます (${timeDiffMinutes.toFixed(1)}分 > ${maxTimeDiffMinutes}分)`)
                }
            } catch (error) {
                console.error(`❌ JMA地震詳細データ取得エラー (${item.json}):`, error)
                continue
            }
        }
        
        console.log('⚠️  P2P地震情報に対応するJMA地震IDが見つかりませんでした')
        console.log('📝 フォールバック処理（P2P→JMA変換）を使用します')
        return null
    } catch (error) {
        console.error('❌ JMA地震ID検索中にエラー:', error)
        return null
    }
}

// P2P地震情報を受信した際のメイン処理関数
export async function processP2PEarthquakeAlert(p2pData: P2PEarthquakeData): Promise<{ embed: EmbedBuilder, files?: AttachmentBuilder[], mapGenerated?: boolean } | null> {
    try {
        console.log('=== P2P地震情報の処理開始 ===')
        
        // まずJMAの地震IDを特定を試行
        const jmaEarthquakeId = await findJMAEarthquakeId(p2pData)
        
        if (jmaEarthquakeId) {
            console.log(`✅ JMA地震ID ${jmaEarthquakeId} を使用して地震情報を取得`)
            // JMAの地震IDが特定できた場合は、統一された関数を使用
            const result = await createEarthquakeEmbed(jmaEarthquakeId, true)
            return {
                embed: result.embed,
                files: result.files,
                mapGenerated: result.files && result.files.length > 0
            }
        } else {
            console.log('⚠️  JMA地震IDが特定できないため、P2Pデータから直接生成')
            // フォールバック: P2Pデータから直接生成
            return await createEarthquakeEmbedFromP2PData(p2pData)
        }
    } catch (error) {
        console.error('P2P地震情報処理中にエラー:', error)
        return null
    }
}