/*
* Earthquake Map Generator - SVG Version
* Based on earthquake-alert/map-draw
* Copyright (c) 2020 Earthquake alert (MIT License)
* Modified to output SVG files directly (no Sharp processing)
*/

import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import { scaleStringToCode } from './p2p_earthquake'

// simplify-geojson can be imported normally (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const simplify = require('simplify-geojson')

// 地震マップの設定
interface MapConfig {
    width: number
    height: number
    backgroundColor: string
    oceanColor: string
    landColor: string
    strokeColor: string
    strokeWidth: number
}

// P2P地震情報のLocation型
interface Location {
    name: string
    fullAddress: string
    lat: number
    lng: number
    intensityLevel: string
}

// 地震マップSVG生成関数
export async function generateEarthquakeMapSVG(
    locations: Location[],
    outputDir: string,
    config?: Partial<MapConfig>
): Promise<string> {
    try {
        console.log('🗾 地震マップSVG生成を開始...')
        
        // デフォルト設定
        const mapConfig: MapConfig = {
            width: 1200,
            height: 800,
            backgroundColor: '#1a1a1a',
            oceanColor: '#2c3e50',
            landColor: '#34495e',
            strokeColor: '#7f8c8d',
            strokeWidth: 0.5,
            ...config
        }
        
        console.log(`マップサイズ: ${mapConfig.width}x${mapConfig.height}`)
        
        // 出力ディレクトリの確認・作成
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
            console.log(`📁 出力ディレクトリを作成: ${outputDir}`)
        }
        
        // 地理データの読み込み
        const projectRoot = path.resolve(__dirname, '../../')
        const japanGeoJsonPath = path.join(projectRoot, 'data', 'maps', 'japan.geojson')
        const prefecturesGeoJsonPath = path.join(projectRoot, 'data', 'maps', 'prefectures.geojson')
        
        if (!fs.existsSync(japanGeoJsonPath)) {
            throw new Error(`Japan GeoJSON file not found: ${japanGeoJsonPath}`)
        }
        
        if (!fs.existsSync(prefecturesGeoJsonPath)) {
            throw new Error(`Prefectures GeoJSON file not found: ${prefecturesGeoJsonPath}`)
        }
        
        console.log('📍 地理データを読み込み中...')
        const japanData = JSON.parse(fs.readFileSync(japanGeoJsonPath, 'utf8'))
        const prefecturesData = JSON.parse(fs.readFileSync(prefecturesGeoJsonPath, 'utf8'))
        
        // JSDOMを使用してSVGを生成
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
        const document = dom.window.document
        
        // SVG要素を作成
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', mapConfig.width.toString())
        svg.setAttribute('height', mapConfig.height.toString())
        svg.setAttribute('viewBox', `0 0 ${mapConfig.width} ${mapConfig.height}`)
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        
        // 背景を追加
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        background.setAttribute('width', '100%')
        background.setAttribute('height', '100%')
        background.setAttribute('fill', mapConfig.backgroundColor)
        svg.appendChild(background)
        
        // 日本の地理的境界を計算
        const bounds = {
            minLng: 122,
            maxLng: 148,
            minLat: 24,
            maxLat: 46
        }
        
        // 投影関数（経緯度からSVG座標へ）
        const projection = (coordinates: [number, number]): [number, number] => {
            const [lng, lat] = coordinates
            const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * mapConfig.width
            const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * mapConfig.height
            return [x, y]
        }
        
        // 日本本土の描画
        console.log('🗾 日本本土を描画中...')
        if (japanData.features) {
            japanData.features.forEach((feature: any) => {
                if (feature.geometry) {
                    drawGeometry(svg, document, feature.geometry, mapConfig, projection)
                }
            })
        }
        
        // 都道府県境界の描画
        console.log('🏛️ 都道府県境界を描画中...')
        if (prefecturesData.features) {
            prefecturesData.features.forEach((feature: any) => {
                if (feature.geometry) {
                    drawGeometry(svg, document, feature.geometry, mapConfig, projection, true)
                }
            })
        }
        
        // 震度情報の描画
        console.log(`📍 震度情報を描画中... (${locations.length}地点)`)
        locations.forEach((location, index) => {
            const coordinates: [number, number] = [location.lng, location.lat]
            
            // 座標の有効性チェック
            if (!coordinates || coordinates.length !== 2 || 
                isNaN(coordinates[0]) || isNaN(coordinates[1]) ||
                coordinates[0] < bounds.minLng || coordinates[0] > bounds.maxLng ||
                coordinates[1] < bounds.minLat || coordinates[1] > bounds.maxLat) {
                console.warn(`無効な座標データ: ${location.fullAddress}`, coordinates)
                return
            }
            
            const projectedCoord = projection(coordinates)
            console.log(`投影テスト[${index}]: 元座標[${coordinates[0]}, ${coordinates[1]}] → 投影座標[${projectedCoord[0].toFixed(1)}, ${projectedCoord[1].toFixed(1)}]`)
            
            if (projectedCoord && projectedCoord.length === 2) {
                const [x, y] = projectedCoord
                
                // 描画範囲内チェック
                if (x >= 0 && x <= mapConfig.width && y >= 0 && y <= mapConfig.height) {
                    // 震度レベルに応じた円のサイズを計算
                    const intensityNum = parseInt(location.intensityLevel.charAt(0)) || 1
                    const baseRadius = 15
                    const circleRadius = Math.max(8, Math.min(25, baseRadius + intensityNum * 1.5))
                    
                    // 震度色を取得
                    const intensityColor = getIntensityColor(location.intensityLevel)
                    
                    // 市町村地点に震度色の円を描画（視認性向上版）
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    circle.setAttribute('cx', x.toString())
                    circle.setAttribute('cy', y.toString())
                    circle.setAttribute('r', circleRadius.toString())
                    circle.setAttribute('fill', intensityColor)
                    circle.setAttribute('stroke', '#ffffff')
                    circle.setAttribute('stroke-width', '2')
                    circle.setAttribute('opacity', '0.9')
                    svg.appendChild(circle)
                    
                    // 震度テキストを追加
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                    text.setAttribute('x', x.toString())
                    text.setAttribute('y', (y + 5).toString())
                    text.setAttribute('text-anchor', 'middle')
                    text.setAttribute('font-family', 'Arial, sans-serif')
                    text.setAttribute('font-size', '12')
                    text.setAttribute('font-weight', 'bold')
                    text.setAttribute('fill', '#ffffff')
                    text.setAttribute('stroke', '#000000')
                    text.setAttribute('stroke-width', '0.5')
                    text.textContent = location.intensityLevel
                    svg.appendChild(text)
                    
                    console.log(`✅ 震度${location.intensityLevel}を描画: ${location.name} [${x.toFixed(1)}, ${y.toFixed(1)}]`)
                } else {
                    console.warn(`描画範囲外: ${location.name} [${x}, ${y}]`)
                }
            }
        })
        
        // ファイル名を生成
        const timestamp = Date.now()
        const filename = `earthquake_map_${timestamp}.svg`
        const filepath = path.join(outputDir, filename)
        
        // SVGファイルとして保存
        console.log('💾 SVGファイルとして直接保存中...')
        const svgContent = svg.outerHTML
        fs.writeFileSync(filepath, svgContent, 'utf8')
        
        // メモリクリーンアップ
        if (global.gc) {
            console.log('🧹 GC実行')
            global.gc()
            const memAfterGC = process.memoryUsage()
            console.log(`Memory after GC: ${Math.round(memAfterGC.heapUsed / 1024 / 1024)}MB / ${Math.round(memAfterGC.rss / 1024 / 1024)}MB RSS`)
        }
        
        console.log('✅ 地震マップ(SVG)を生成しました:', filename)
        console.log('📁 保存パス:', filepath)
        
        // 生成後のファイル数を確認
        const finalFileCount = fs.readdirSync(outputDir).filter(f => (f.endsWith('.png') || f.endsWith('.svg')) && f.startsWith('earthquake_map_')).length
        console.log(`📊 現在の地震マップファイル数: ${finalFileCount}個`)
        
        return filepath
        
    } catch (error) {
        console.error('Error generating earthquake map SVG:', error)
        throw error
    }
}

// ジオメトリを描画する関数
function drawGeometry(
    svg: SVGElement,
    document: Document,
    geometry: any,
    config: MapConfig,
    projection: (coords: [number, number]) => [number, number],
    isStroke: boolean = false
): void {
    if (geometry.type === 'Polygon') {
        drawPolygon(svg, document, geometry.coordinates, config, projection, isStroke)
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
            drawPolygon(svg, document, polygon, config, projection, isStroke)
        })
    }
}

// ポリゴンを描画する関数
function drawPolygon(
    svg: SVGElement,
    document: Document,
    coordinates: any[],
    config: MapConfig,
    projection: (coords: [number, number]) => [number, number],
    isStroke: boolean = false
): void {
    coordinates.forEach((ring: any[]) => {
        if (ring.length < 3) return
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        let pathData = ''
        
        ring.forEach((coord, index) => {
            const [x, y] = projection([coord[0], coord[1]])
            if (index === 0) {
                pathData += `M ${x} ${y} `
            } else {
                pathData += `L ${x} ${y} `
            }
        })
        pathData += 'Z'
        
        path.setAttribute('d', pathData)
        
        if (isStroke) {
            path.setAttribute('fill', 'none')
            path.setAttribute('stroke', config.strokeColor)
            path.setAttribute('stroke-width', config.strokeWidth.toString())
            path.setAttribute('opacity', '0.7')
        } else {
            path.setAttribute('fill', config.landColor)
            path.setAttribute('stroke', config.strokeColor)
            path.setAttribute('stroke-width', '0.3')
        }
        
        svg.appendChild(path)
    })
}

// 震度に応じた色を取得する関数
function getIntensityColor(intensityLevel: string): string {
    const scaleCode = scaleStringToCode(intensityLevel)
    
    switch (scaleCode) {
        case 10: return '#003d99'  // 震度1: 濃い青
        case 20: return '#0066ff'  // 震度2: 青
        case 30: return '#009900'  // 震度3: 緑
        case 40: return '#ffcc00'  // 震度4: 黄色
        case 45: return '#ff9900'  // 震度5弱: オレンジ
        case 50: return '#ff6600'  // 震度5強: 濃いオレンジ
        case 55: return '#ff0000'  // 震度6弱: 赤
        case 60: return '#cc0000'  // 震度6強: 濃い赤
        case 70: return '#990000'  // 震度7: 深紅
        default: return '#666666'  // 不明: グレー
    }
}

// 古い地震マップファイルを削除して最新N個を保持する関数（PNG/SVG対応）
function manageImageFiles(outputDir: string, maxImages: number = 10): void {
    try {
        if (!fs.existsSync(outputDir)) {
            return
        }
        
        // generated_imagesディレクトリ内の.pngや.svgファイルを取得
        const files = fs.readdirSync(outputDir)
            .filter(file => (file.endsWith('.png') || file.endsWith('.svg')) && file.startsWith('earthquake_map_'))
            .map(file => {
                const filepath = path.join(outputDir, file)
                const stats = fs.statSync(filepath)
                return {
                    name: file,
                    path: filepath,
                    mtime: stats.mtime.getTime()
                }
            })
            .sort((a, b) => b.mtime - a.mtime) // 新しい順にソート
        
        // 上限を超えた古いファイルを削除
        if (files.length > maxImages) {
            const filesToDelete = files.slice(maxImages)
            console.log(`🗑️ 古い地震マップファイルを削除: ${filesToDelete.length}個`)
            
            filesToDelete.forEach(file => {
                try {
                    fs.unlinkSync(file.path)
                    console.log(`削除完了: ${file.name}`)
                } catch (deleteError) {
                    console.error(`削除失敗: ${file.name}`, deleteError)
                }
            })
        }
        
        console.log(`📊 地震マップファイル管理完了: ${Math.min(files.length, maxImages)}/${files.length}個保持`)
        
    } catch (error) {
        console.error('地震マップファイル管理エラー:', error)
    }
}

export { manageImageFiles }
