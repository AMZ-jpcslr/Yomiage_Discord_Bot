/*
* Earthquake Map Generator
* Based on earthquake-alert/map-draw
* Copyright (c) 2020 Earthquake alert (MIT License)
*/

import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'

// simplify-geojson can be imported normally (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const simplify = require('simplify-geojson')

interface EarthquakeData {
    longitude: number
    latitude: number
    magnitude: number | string
    depth: number | string
    hypocenter: string
    maxScale: string
}

// earthquake-alert/map-draw compatible interface
interface MapConfig {
    width: number
    height: number
    scale: number
    resolution: number
    stroke_width: number
    sea_color: string
    land_color: string
    stroke_color: string
    map: string
    seismic_intensity_color: {
        [key: string]: string
    }
    epicenter: {
        color: string
        stroke: string
        size: number
        width: number
        stroke_width: number
    }
    seismic_intensity: {
        circle: number
        fontsize: number
        height: number
        width: number
        font: string
    }
    copyright: {
        text: string[]
        size: number
        color: string
        font: string
    }
}

interface AreaInfo {
    epicenter: [number, number]
    areas: {
        [key: string]: [number, number][]
    }
}

export async function generateEarthquakeMap(earthquakeData: EarthquakeData, areaInfo?: AreaInfo): Promise<string> {
    try {
        console.log('Starting earthquake map generation...')
        
        // Use CommonJS-compatible dynamic import to avoid require() of ES modules
        const d3Module = await Function('return import("d3")')()
        const d3GeoModule = await Function('return import("d3-geo")')()
        
        // Create d3 object similar to earthquake-alert/map-draw
        const d3 = Object.assign({}, d3Module, d3GeoModule)
        
        // Load config file (earthquake-alert/map-draw compatible)
        const configPath = path.join(__dirname, '../../config/config.json')
        const config: MapConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        
        // Load map data
        const mapPath = path.join(__dirname, '../../', config.map)
        const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
        
        // Create JSDOM environment for SVG (earthquake-alert/map-draw style)
        const document = new JSDOM('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>').window.document
        
        // earthquake-alert/map-draw algorithm
        const epicenter: [number, number] = [earthquakeData.longitude, earthquakeData.latitude]
        
        console.log('=== 震源地座標設定詳細 ===')
        console.log(`earthquakeData.longitude: ${earthquakeData.longitude}`)
        console.log(`earthquakeData.latitude: ${earthquakeData.latitude}`)
        console.log(`epicenter配列: [${epicenter[0]}, ${epicenter[1]}]`)
        console.log(`震源地: ${earthquakeData.hypocenter}`)
        
        // Area info structure (use provided data or default)
        const area_info: AreaInfo = areaInfo || {
            epicenter: epicenter,
            areas: {}
        }
        
        console.log(`area_info.epicenter: [${area_info.epicenter[0]}, ${area_info.epicenter[1]}]`)
        
        // Extract config values (earthquake-alert/map-draw style)
        const width = config.width
        const height = config.height
        const map_stroke = config.stroke_width
        const resolution = config.resolution
        const def_scale = config.scale
        const sea_color = config.sea_color
        const land_color = config.land_color
        const stroke_color = config.stroke_color
        const seismic_intensity_color = config.seismic_intensity_color
        const epicenter_config = config.epicenter
        const seismic_intensity_config = config.seismic_intensity
        const copyright = config.copyright
        
        // Calculate longitude and latitude bounds (earthquake-alert/map-draw algorithm)
        let longitude = [epicenter[0], epicenter[0]]
        let latitude = [epicenter[1], epicenter[1]]
        let volume = 1
        
        let sum_longitude = epicenter[0]
        let sum_latitude = epicenter[1]
        
        // Process areas if they exist (earthquake-alert/map-draw style)
        for (const area_key in area_info.areas) {
            const area = area_info.areas[area_key]
            
            // area が配列であることを確認
            if (Array.isArray(area)) {
                for (const element of area) {
                    if (Array.isArray(element) && element.length >= 2) {
                        sum_longitude += element[0]
                        sum_latitude += element[1]
                        longitude = [Math.max(longitude[0], element[0]), Math.min(longitude[1], element[0])]
                        latitude = [Math.max(latitude[0], element[1]), Math.min(latitude[1], element[1])]
                        volume++
                    }
                }
            } else if (area && typeof area === 'object') {
                // area がオブジェクトの場合は座標を直接取得を試行
                console.log(`エリア ${area_key} はオブジェクト形式:`, area)
                const areaObj = area as Record<string, unknown>
                if (typeof areaObj.longitude === 'number' && typeof areaObj.latitude === 'number') {
                    sum_longitude += areaObj.longitude
                    sum_latitude += areaObj.latitude
                    longitude = [Math.max(longitude[0], areaObj.longitude), Math.min(longitude[1], areaObj.longitude)]
                    latitude = [Math.max(latitude[0], areaObj.latitude), Math.min(latitude[1], areaObj.latitude)]
                    volume++
                }
            } else {
                console.warn(`エリア ${area_key} の形式が不正です:`, typeof area, area)
            }
        }
        
        const center: [number, number] = [sum_longitude / volume, sum_latitude / volume]
        const expansion_rate = longitude[0] - longitude[1] + latitude[0] - latitude[1]
        
        console.log('=== 地図中心計算詳細 ===')
        console.log(`震源地座標: [${epicenter[0]}, ${epicenter[1]}]`)
        console.log(`計算された中心: [${center[0]}, ${center[1]}]`)
        console.log(`volume (座標点数): ${volume}`)
        console.log(`expansion_rate: ${expansion_rate}`)
        
        // 震源地が中心から大きくずれていないかチェック
        const centerOffset = Math.sqrt(
            Math.pow(center[0] - epicenter[0], 2) + 
            Math.pow(center[1] - epicenter[1], 2)
        )
        console.log(`中心からの震源地オフセット: ${centerOffset.toFixed(4)}度`)
        if (centerOffset > 0.5) {
            console.warn('⚠️ 震源地が地図中心から大きくずれています')
        }
        
        // Scale calculation (earthquake-alert/map-draw algorithm) - 震源周辺をより詳細に表示
        let _scale: number
        
        // P2P地震情報（緊急地震速報）の場合は広域を表示
        const earthquakeDataRecord = earthquakeData as unknown as Record<string, unknown>
        const isP2PData = earthquakeDataRecord.source === 'P2P' || earthquakeDataRecord.isP2P === true
        
        if (isP2PData) {
            // 緊急地震速報の場合は縮尺を小さくして広域を表示
            console.log('P2P地震情報のため広域表示に調整')
            if (expansion_rate === 0) {
                _scale = 1.5  // 単一震源でも広域表示（縮尺を更に小さく）
            } else if (expansion_rate < 3) {
                _scale = 1.0  // より広域
            } else if (expansion_rate < 7) {
                _scale = 0.8
            } else {
                _scale = 0.6
            }
        } else {
            // 通常の地震情報の場合も縮尺を小さく調整
            if (expansion_rate === 0) {
                _scale = 4  // 単一震源の場合（従来の8から4に縮小）
            } else if (expansion_rate < 1) {
                _scale = 3  // 小さな範囲の場合（従来の6から3に縮小）
            } else if (expansion_rate < 3) {
                _scale = 2  // 従来の3から2に縮小
            } else if (expansion_rate < 5) {
                _scale = 1.5  // 従来の2から1.5に縮小
            } else if (expansion_rate < 7) {
                _scale = 1.0  // 従来の1.5から1.0に縮小
            } else if (expansion_rate < 9) {
                _scale = 0.8  // 従来の1.2から0.8に縮小
            } else {
                _scale = 0.6  // 従来の1から0.6に縮小
            }
        }
        
        console.log(`=== 縮尺計算結果 ===`)
        console.log(`expansion_rate: ${expansion_rate}`)
        console.log(`isP2PData: ${isP2PData}`)
        console.log(`動的スケール係数: ${_scale}`)
        console.log(`基本スケール: ${def_scale}`)
        console.log(`最終スケール: ${def_scale * _scale}`)
        console.log(`→ より広域表示のため縮尺を調整しました`)
        
        // Simplify geojson data with higher resolution for better map accuracy
        // 新しいprefectures.geojsonファイル用の最適化された解像度設定
        const data = simplify(mapData, Math.min(resolution * 0.1, 0.001))
        
        // Setup map projection (earthquake-alert/map-draw style) with improved accuracy
        const aProjection = d3.geoMercator()
            .center(center)
            .translate([width / 2, height / 2])
            .scale(def_scale * _scale)
            .precision(0.1) // 投影精度を向上
        
        console.log('=== 地図投影設定詳細 ===')
        console.log(`投影中心: [${center[0]}, ${center[1]}]`)
        console.log(`投影スケール: ${def_scale} * ${_scale} = ${def_scale * _scale}`)
        console.log(`画面サイズ: ${width}x${height}`)
        console.log(`translate: [${width / 2}, ${height / 2}]`)
        
        // 投影の境界確認
        const topLeft = aProjection.invert([0, 0])
        const bottomRight = aProjection.invert([width, height])
        if (topLeft && bottomRight) {
            console.log(`投影範囲: 左上[${topLeft[0].toFixed(3)}, ${topLeft[1].toFixed(3)}] - 右下[${bottomRight[0].toFixed(3)}, ${bottomRight[1].toFixed(3)}]`)
        }
        
        // 震源地が投影範囲内にあるかチェック
        const isInBounds = epicenter[0] >= (topLeft?.[0] || 0) && 
                          epicenter[0] <= (bottomRight?.[0] || 0) && 
                          epicenter[1] >= (bottomRight?.[1] || 0) && 
                          epicenter[1] <= (topLeft?.[1] || 0)
        console.log(`震源地が投影範囲内: ${isInBounds ? '✅' : '❌'}`)
        
        if (!isInBounds) {
            console.warn('⚠️ 震源地が投影範囲外にあります。これが位置ずれの原因の可能性があります。')
        }
        
        const geoPath = d3.geoPath()
            .projection(aProjection)
        
        // Create SVG (earthquake-alert/map-draw style)
        const svg = d3.select(document.body)
            .append('svg')
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('width', width)
            .attr('height', height)
            .attr('xmin', aProjection.invert([0, 0])?.[0])
            .attr('xmax', aProjection.invert([width, height])?.[0])
            .attr('ymin', aProjection.invert([width, height])?.[1])
            .attr('ymax', aProjection.invert([0, 0])?.[1])
            .attr('scale', aProjection.scale())
            .attr('encoding', 'utf-8')
            .style('background-color', sea_color)
        
        // Draw map with better stroke settings for improved clarity and detail
        // 新しいprefectures.geojsonに最適化された描画設定
        svg.append('path')
            .datum(data)
            .attr('d', geoPath)
            .attr('stroke-width', map_stroke)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-miterlimit', 10)
            .attr('vector-effect', 'non-scaling-stroke') // ズーム時の線幅維持
            .style('fill', land_color)
            .style('stroke', stroke_color)
            .style('shape-rendering', 'geometricPrecision') // より精密な描画
        
        // Seismic intensity plotting function (earthquake-alert/map-draw style)
        const Export = (area: [number, number], color: string, text: string) => {
            const coordinate = aProjection(area)
            if (!coordinate) return
            
            // Draw circle background with improved visual quality
            svg.append('circle')
                .attr('r', seismic_intensity_config.circle)
                .attr('cx', coordinate[0])
                .attr('cy', coordinate[1])
                .style('fill', color)
                .style('stroke', '#000000')
                .style('stroke-width', '2') // より太い枠線
                .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))') // 影を追加
            
            // Draw intensity text with better visibility
            svg.append('text')
                .text(text)
                .attr('x', coordinate[0] + seismic_intensity_config.width)
                .attr('y', coordinate[1] + seismic_intensity_config.height)
                .attr('font-size', seismic_intensity_config.fontsize)
                .attr('text-anchor', 'middle')
                .attr('font-family', seismic_intensity_config.font)
                .style('fill', '#000000')
                .style('font-weight', 'bold')
                .style('text-shadow', '1px 1px 1px rgba(255,255,255,0.8)') // テキストに影を追加
        }
        
        // Plot seismic intensity areas first (so epicenter appears on top)
        const intensityLevels = ['0', '1', '2', '3', '4', 'under_5', 'over_5', 'under_6', 'over_6', '7']
        const intensityTexts: { [key: string]: string } = {
            '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            'under_5': '5-', 'over_5': '5+', 'under_6': '6-', 'over_6': '6+', '7': '7'
        }
        
        console.log('震度データの詳細:', JSON.stringify(area_info.areas, null, 2))
        let totalStations = 0
        
        for (const level of intensityLevels) {
            if (area_info.areas[level] && area_info.areas[level].length > 0) {
                const color = seismic_intensity_color[level]
                const text = intensityTexts[level]
                const stationCount = area_info.areas[level].length
                totalStations += stationCount
                console.log(`震度${text}: ${stationCount}地点 - 色: ${color}`)
                for (const area of area_info.areas[level]) {
                    console.log(`  座標: [${area[0]}, ${area[1]}]`)
                    Export(area, color, text)
                }
            }
        }
        
        console.log(`総観測点数: ${totalStations}`)
        if (totalStations === 0) {
            console.warn('警告: 震度観測点データが見つかりませんでした。デフォルトで震源に表示します。')
            console.warn('デバッグ: areas構造を確認:')
            console.warn('  - areas keys:', Object.keys(area_info.areas))
            console.warn('  - areas values:', Object.values(area_info.areas))
            
            // 震度データがない場合、震源に最大震度を表示
            if (earthquakeData.maxScale && earthquakeData.maxScale !== '不明') {
                const maxScaleText = earthquakeData.maxScale.toString()
                const defaultColor = '#ff0000' // 赤色をデフォルトに
                Export(epicenter, defaultColor, maxScaleText)
                console.log(`震源に最大震度${maxScaleText}を表示しました`)
            }
        }
        
        // 常に右上に震度を表示（地図に表示されない場合も含む）
        if (!earthquakeData.maxScale || earthquakeData.maxScale === '不明') {
            // 震度データから最大震度を自動計算
            let calculatedMaxScale = '0'
            for (const level of intensityLevels.reverse()) { // 大きい震度から順に確認
                if (area_info.areas[level] && area_info.areas[level].length > 0) {
                    calculatedMaxScale = intensityTexts[level]
                    console.log(`計算された最大震度: ${calculatedMaxScale}`)
                    break
                }
            }
            earthquakeData.maxScale = calculatedMaxScale
        }
        
        // Draw epicenter (earthquake-alert/map-draw style) - on top of intensity data
        const epicenterCoord = aProjection(epicenter)
        console.log('=== 震源地描画詳細 ===')
        console.log(`震源地座標: [${epicenter[0]}, ${epicenter[1]}] (経度, 緯度)`)
        console.log(`投影後座標: [${epicenterCoord?.[0]}, ${epicenterCoord?.[1]}] (px)`)
        console.log(`地図サイズ: ${width}x${height}px`)
        console.log(`投影スケール: ${aProjection.scale()}`)
        console.log(`投影中心: [${aProjection.center()?.[0]}, ${aProjection.center()?.[1]}]`)
        
        // 画面中央からのずれを計算
        if (epicenterCoord) {
            const centerX = width / 2
            const centerY = height / 2
            const offsetX = epicenterCoord[0] - centerX
            const offsetY = epicenterCoord[1] - centerY
            const offsetDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
            
            console.log(`画面中央: [${centerX}, ${centerY}]px`)
            console.log(`震源地オフセット: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]px`)
            console.log(`中央からの距離: ${offsetDistance.toFixed(1)}px`)
            
            if (offsetDistance > 100) {
                console.warn(`⚠️ 震源地が画面中央から${offsetDistance.toFixed(0)}px離れています`)
            }
            
            // 震源地が画面外にある場合の警告
            if (epicenterCoord[0] < 0 || epicenterCoord[0] > width || 
                epicenterCoord[1] < 0 || epicenterCoord[1] > height) {
                console.error('❌ 震源地が画面外に描画されます！')
                console.error(`位置: x=${epicenterCoord[0].toFixed(1)} (範囲: 0-${width}), y=${epicenterCoord[1].toFixed(1)} (範囲: 0-${height})`)
            }
        }
        
        if (!epicenterCoord) {
            throw new Error('Failed to project epicenter coordinates')
        }
        
        // Epicenter X mark background (earthquake-alert/map-draw style)
        svg.append('line')
            .attr('x1', epicenterCoord[0] - epicenter_config.size - epicenter_config.stroke_width)
            .attr('x2', epicenterCoord[0] + epicenter_config.size + epicenter_config.stroke_width)
            .attr('y1', epicenterCoord[1] - epicenter_config.size - epicenter_config.stroke_width)
            .attr('y2', epicenterCoord[1] + epicenter_config.size + epicenter_config.stroke_width)
            .attr('stroke-width', epicenter_config.width + epicenter_config.stroke_width * 2)
            .style('stroke', epicenter_config.stroke)
        
        svg.append('line')
            .attr('x1', epicenterCoord[0] - epicenter_config.size - epicenter_config.stroke_width)
            .attr('x2', epicenterCoord[0] + epicenter_config.size + epicenter_config.stroke_width)
            .attr('y1', epicenterCoord[1] + epicenter_config.size + epicenter_config.stroke_width)
            .attr('y2', epicenterCoord[1] - epicenter_config.size - epicenter_config.stroke_width)
            .attr('stroke-width', epicenter_config.width + epicenter_config.stroke_width * 2)
            .style('stroke', epicenter_config.stroke)
        
        // Epicenter X mark foreground (earthquake-alert/map-draw style)
        svg.append('line')
            .attr('x1', epicenterCoord[0] - epicenter_config.size)
            .attr('x2', epicenterCoord[0] + epicenter_config.size)
            .attr('y1', epicenterCoord[1] - epicenter_config.size)
            .attr('y2', epicenterCoord[1] + epicenter_config.size)
            .attr('stroke-width', epicenter_config.width)
            .style('stroke', epicenter_config.color)
        
        svg.append('line')
            .attr('x1', epicenterCoord[0] - epicenter_config.size)
            .attr('x2', epicenterCoord[0] + epicenter_config.size)
            .attr('y1', epicenterCoord[1] + epicenter_config.size)
            .attr('y2', epicenterCoord[1] - epicenter_config.size)
            .attr('stroke-width', epicenter_config.width)
            .style('stroke', epicenter_config.color)
        
        // 震源地位置の検証用: 既知の場所にマーカーを追加
        console.log('=== 位置検証用マーカー追加 ===')
        
        // トカラ列島の主要な島々の座標
        const referencePoints = [
            { name: '悪石島', coords: [129.60, 29.45], color: '#00ff00' },
            { name: '小宝島', coords: [129.22, 29.23], color: '#00ffff' },
            { name: '宝島', coords: [129.20, 29.13], color: '#ffff00' }
        ]
        
        // 震源地がトカラ列島近海の場合のみ参照マーカーを表示
        if (earthquakeData.hypocenter && earthquakeData.hypocenter.includes('トカラ')) {
            console.log('トカラ列島近海の地震のため、参照マーカーを追加します')
            
            for (const point of referencePoints) {
                const refCoord = aProjection(point.coords)
                if (refCoord) {
                    // 参照点の円マーカー
                    svg.append('circle')
                        .attr('cx', refCoord[0])
                        .attr('cy', refCoord[1])
                        .attr('r', 8)
                        .style('fill', point.color)
                        .style('stroke', '#000000')
                        .style('stroke-width', '2')
                        .style('opacity', 0.8)
                    
                    // 参照点の名前ラベル
                    svg.append('text')
                        .text(point.name)
                        .attr('x', refCoord[0] + 12)
                        .attr('y', refCoord[1] + 4)
                        .attr('font-size', 14)
                        .attr('font-family', 'Arial, sans-serif')
                        .style('fill', '#ffffff')
                        .style('font-weight', 'bold')
                        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
                    
                    console.log(`${point.name}: [${point.coords[0]}, ${point.coords[1]}] → [${refCoord[0].toFixed(1)}, ${refCoord[1].toFixed(1)}]px`)
                    
                    // 震源地との距離計算
                    const distance = Math.sqrt(
                        Math.pow(refCoord[0] - epicenterCoord[0], 2) + 
                        Math.pow(refCoord[1] - epicenterCoord[1], 2)
                    )
                    console.log(`${point.name}から震源地までの画面上距離: ${distance.toFixed(1)}px`)
                }
            }
        }
        
        // Add copyright (earthquake-alert/map-draw style)
        svg.append('text')
            .text(copyright.text.join(' / '))
            .attr('x', 10)
            .attr('y', height - copyright.size)
            .attr('font-size', copyright.size)
            .attr('font-family', copyright.font)
            .style('fill', copyright.color)

        // 震度数字を右上に表示する機能
        const maxScale = earthquakeData.maxScale
        console.log(`震度右上表示: maxScale = "${maxScale}", type = ${typeof maxScale}`)
        
        // 震度右上表示を有効化
        if (maxScale && maxScale !== '不明' && maxScale !== '') {
            // 震度数字を右上に大きく表示
            let intensityText = maxScale.toString()
            
            // 震度の文字列を正規化
            if (intensityText.includes('弱')) {
                intensityText = intensityText.replace('弱', '-')
            } else if (intensityText.includes('強')) {
                intensityText = intensityText.replace('強', '+')
            }
            
            console.log(`震度右上表示: 表示する震度 = "${intensityText}"`)
            
            const intensityFontSize = 100 // 大きなフォントサイズ
            const rightMargin = 120
            const topMargin = 100
            
            // 背景の角丸四角形を描画（視認性向上のため）
            svg.append('rect')
                .attr('x', width - rightMargin - 80)
                .attr('y', topMargin - 60)
                .attr('width', 160)
                .attr('height', 120)
                .attr('rx', 20)
                .attr('ry', 20)
                .style('fill', 'rgba(0, 0, 0, 0.8)')
                .style('stroke', '#ffffff')
                .style('stroke-width', '4')
                .style('filter', 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))')
            
            // "Intensity"ラベルを描画（英語表記に変更）
            svg.append('text')
                .text('Max Intensity')
                .attr('x', width - rightMargin)
                .attr('y', topMargin - 20)
                .attr('font-size', 24)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Arial Black, sans-serif')
                .style('fill', '#ffffff')
                .style('font-weight', 'bold')
                .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)')
            
            // 震度数字を描画
            svg.append('text')
                .text(intensityText)
                .attr('x', width - rightMargin)
                .attr('y', topMargin + 40)
                .attr('font-size', intensityFontSize)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Arial Black, sans-serif')
                .style('fill', '#ffffff')
                .style('font-weight', 'bold')
                .style('text-shadow', '3px 3px 6px rgba(0,0,0,0.9)')
        }
        
        // Get SVG as HTML string with proper encoding
        const svgHtml = document.body.innerHTML
        
        // Add XML declaration and proper encoding for Japanese text
        const svgWithEncoding = `<?xml version="1.0" encoding="UTF-8"?>\n${svgHtml}`
        
        // Convert SVG to PNG using Sharp
        const timestamp = Date.now()
        const filename = `earthquake_map_${timestamp}.png`
        const outputDir = path.join(__dirname, '../../generated_images')
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }
        
        // 古い画像を削除して最新N枚を保持（環境変数で設定可能、デフォルト10枚）
        const maxImages = parseInt(process.env.MAX_GENERATED_IMAGES || '10')
        manageImageFiles(outputDir, maxImages)
        
        const filepath = path.join(outputDir, filename)
        
        // Convert SVG to PNG with proper text rendering
        await sharp(Buffer.from(svgWithEncoding, 'utf8'))
            .png({
                quality: 95,
                progressive: true
            })
            .toFile(filepath)
        
        console.log('✅ 地震マップ画像を生成しました:', filename)
        console.log('📁 保存パス:', filepath)
        
        // 生成後のファイル数を確認
        const finalFileCount = fs.readdirSync(outputDir).filter(f => f.endsWith('.png') && f.startsWith('earthquake_map_')).length
        console.log(`📊 現在の地震マップ画像数: ${finalFileCount}枚`)
        
        return filepath
        
        return filepath
        
    } catch (error) {
        console.error('Error generating earthquake map:', error)
        throw error
    }
}

// 古い地震マップ画像を削除して最新N枚を保持する関数
function manageImageFiles(outputDir: string, maxImages: number = 10): void {
    try {
        if (!fs.existsSync(outputDir)) {
            return
        }
        
        // generated_imagesディレクトリ内の.pngファイルを取得
        const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('.png') && file.startsWith('earthquake_map_'))
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
        
        console.log(`地震マップ画像管理: 現在${files.length}枚の画像があります（上限: ${maxImages}枚）`)
        
        // デバッグ用：現在のファイル一覧を表示
        if (files.length > 0) {
            console.log('既存ファイル一覧（新しい順）:')
            files.slice(0, 5).forEach((file, index) => {
                const date = new Date(file.mtime).toLocaleString('ja-JP')
                console.log(`  ${index + 1}. ${file.name} (${date})`)
            })
            if (files.length > 5) {
                console.log(`  ... 他${files.length - 5}枚`)
            }
        }
        
        // 上限を超える場合は古いファイルを削除
        if (files.length >= maxImages) {
            const filesToDelete = files.slice(maxImages - 1) // 新しい画像が1枚追加されることを考慮
            console.log(`上限${maxImages}枚を維持するため、${filesToDelete.length}枚の古い画像を削除します`)
            
            for (const file of filesToDelete) {
                try {
                    fs.unlinkSync(file.path)
                    console.log(`削除済み: ${file.name}`)
                } catch (deleteError) {
                    console.error(`ファイル削除エラー: ${file.name}`, deleteError)
                }
            }
        }
        
        const remainingCount = files.length - (files.length >= maxImages ? files.length - maxImages + 1 : 0)
        console.log(`地震マップ画像管理完了: ${remainingCount + 1}枚の画像を保持`)
        
    } catch (error) {
        console.error('地震マップ画像管理エラー:', error)
    }
}

// 地震データ型定義を追加
interface CoordinateData {
    '@type'?: string
    type?: string
    '#text'?: string
}

interface EarthquakeDetail {
    Head?: {
        ReportDateTime?: string
        Text?: string
    }
    Body?: {
        Earthquake?: {
            Hypocenter?: {
                Area?: {
                    Name?: string
                    Coordinate?: CoordinateData | CoordinateData[] | { '#text'?: string }
                    Depth?: string
                }
            }
            Magnitude?: string
        }
        Intensity?: {
            Observation?: {
                MaxInt?: string
                Pref?: Record<string, unknown>[]
            }
        }
    }
}

// 震度データと地震情報を抽出する関数
export function extractEarthquakeMapData(detail: EarthquakeDetail): { earthquakeData: EarthquakeData, areaInfo: AreaInfo } {
    console.log('=== 地震座標データ抽出開始 ===')
    console.log('受信データ構造:', JSON.stringify(detail, null, 2))
    
    // Wolfix APIの座標情報を抽出（推定座標は一切使用しない）
    let longitude: number | null = null
    let latitude: number | null = null
    
    // 複数の形式の座標情報に対応
    const hypocenterCoord = detail.Body?.Earthquake?.Hypocenter?.Area?.Coordinate
    
    console.log('受信した座標データ:', JSON.stringify(hypocenterCoord, null, 2))
    
    if (hypocenterCoord) {
        if (Array.isArray(hypocenterCoord)) {
            // 配列形式の場合
            console.log('配列形式の座標データを処理中')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const epicenterCoord = hypocenterCoord.find((coord: any) =>
                coord['@type'] === 'epicenter' || coord.type === 'epicenter')
            if (epicenterCoord && epicenterCoord['#text']) {
                const coordText = epicenterCoord['#text']
                console.log('配列内座標テキスト:', coordText)
                const coords = coordText.split('/')
                if (coords.length >= 2) {
                    // JMA形式：緯度/経度 の順序
                    const newLat = parseFloat(coords[0])  // 1番目が緯度
                    const newLon = parseFloat(coords[1])  // 2番目が経度
                    if (!isNaN(newLon) && !isNaN(newLat)) {
                        longitude = newLon
                        latitude = newLat
                        console.log(`✅ 配列形式から実座標取得成功: 緯度=${latitude}, 経度=${longitude}`)
                    }
                }
            }
        } else if (hypocenterCoord['#text']) {
            // 単一オブジェクト形式の場合（Wolfix APIからの変換データ）
            console.log('単一オブジェクト形式の座標データを処理中')
            const coordText = hypocenterCoord['#text']
            console.log('座標テキスト:', coordText)
            const coords = coordText.split('/')
            if (coords.length >= 2) {
                // JMA形式：緯度/経度 の順序
                const newLat = parseFloat(coords[0])  // 1番目が緯度
                const newLon = parseFloat(coords[1])  // 2番目が経度
                if (!isNaN(newLon) && !isNaN(newLat)) {
                    longitude = newLon
                    latitude = newLat
                    console.log(`✅ 単一形式から実座標取得成功: 緯度=${latitude}, 経度=${longitude}`)
                    console.log(`座標確認: ${coordText} → 緯度=${latitude}°N, 経度=${longitude}°E`)
                }
            }
        }
    }
    
    // 座標が取得できない場合はエラーとする（推定は行わない）
    if (longitude === null || latitude === null) {
        const hypocenterName = detail.Body?.Earthquake?.Hypocenter?.Area?.Name || '不明'
        console.error(`❌ 実座標が取得できませんでした。震源地名: ${hypocenterName}`)
        throw new Error(`Wolfix APIから正確な座標を取得できませんでした。推定座標は使用しません。`)
    }
    
    const hypocenterName = detail.Body?.Earthquake?.Hypocenter?.Area?.Name || '不明'
    console.log(`震源座標: ${latitude}°N, ${longitude}°E (${hypocenterName})`)
    
    // 震度観測点データの抽出
    const areas: { [key: string]: [number, number][] } = {}
    
    // Wolfix WarnAreaデータを優先して使用
    console.log('=== 震度エリアデータ抽出開始 ===')
    const intensityData = detail.Body?.Intensity?.Observation
    console.log('震度観測データのPrefフィールド:', intensityData?.Pref ? 'あり' : 'なし')
    
    if (intensityData && intensityData.Pref) {
        const prefectures = Array.isArray(intensityData.Pref) ? intensityData.Pref : [intensityData.Pref]
        console.log(`処理する都道府県数: ${prefectures.length}`)
        
        for (const pref of prefectures) {
            console.log(`処理中の都道府県: ${pref.Name}`)
            
            // Wolfix WarnArea由来のエリア情報を処理
            if (pref.Areas && Array.isArray(pref.Areas)) {
                console.log(`  Wolfix WarnAreaエリア数: ${pref.Areas.length}`)
                
                for (const warnArea of pref.Areas) {
                    const areaName = warnArea.Name as string
                    const intensity = warnArea.MaxInt as string
                    
                    console.log(`  WarnAreaエリア: ${areaName}, 震度: ${intensity}`)
                    
                    // エリア名から代表座標を取得
                    const coords = getWarnAreaCoordinates(areaName)
                    if (coords && intensity) {
                        // 震度を earthquake-alert/map-draw 形式に変換
                        const intensityKey = convertIntensityFormat(intensity)
                        if (!areas[intensityKey]) {
                            areas[intensityKey] = []
                        }
                        areas[intensityKey].push(coords)
                        console.log(`    → WarnArea座標追加: [${coords[0]}, ${coords[1]}] 震度: ${intensityKey}`)
                    } else {
                        console.log(`    → WarnArea座標取得失敗: ${areaName}`)
                    }
                }
            }
            
            // JMA従来のXMLデータも処理（互換性のため）
            if (pref.Area) {
                const areas_in_pref = Array.isArray(pref.Area) ? pref.Area : [pref.Area]
                console.log(`  従来形式地域数: ${areas_in_pref.length}`)
                
                for (const area of areas_in_pref) {
                    console.log(`  処理中の地域: ${area.Name}`)
                    if (area.City) {
                        const cities = Array.isArray(area.City) ? area.City : [area.City]
                        console.log(`    市区町村数: ${cities.length}`)
                        
                        for (const city of cities) {
                            console.log(`    処理中の市区町村: ${city.Name}`)
                            if (city.IntensityStation) {
                                const stations = Array.isArray(city.IntensityStation) ? city.IntensityStation : [city.IntensityStation]
                                console.log(`      観測点数: ${stations.length}`)
                                
                                for (const station of stations) {
                                    const intensity = station.Int
                                    const stationName = station.Name
                                    console.log(`      観測点: ${stationName}, 震度: ${intensity}`)
                                    
                                    // 正確な座標情報があるか確認
                                    let coords: [number, number] | null = null
                                    
                                    // JSONデータに含まれる正確な座標を優先的に使用
                                    if (station.latlon && station.latlon.lat && station.latlon.lon) {
                                        coords = [station.latlon.lon, station.latlon.lat]
                                        console.log(`      → 正確な座標使用: [${coords[0]}, ${coords[1]}]`)
                                    } else {
                                        // フォールバック: 地名から推定
                                        const prefName = typeof pref.Name === 'string' ? pref.Name : ''
                                        const cityName = typeof city.Name === 'string' ? city.Name : ''
                                        const stationNameStr = typeof stationName === 'string' ? stationName : undefined
                                        coords = estimateCoordinates(prefName, cityName, stationNameStr)
                                        if (coords) {
                                            console.log(`      → 推定座標使用: [${coords[0]}, ${coords[1]}]`)
                                        }
                                    }
                                    
                                    if (coords && intensity) {
                                        // 震度を earthquake-alert/map-draw 形式に変換
                                        const intensityKey = convertIntensityFormat(intensity)
                                        if (!areas[intensityKey]) {
                                            areas[intensityKey] = []
                                        }
                                        areas[intensityKey].push(coords)
                                        console.log(`      → 従来形式座標追加: [${coords[0]}, ${coords[1]}] 震度キー: ${intensityKey}`)
                                    } else {
                                        console.log(`      → 座標取得失敗またはデータ不完全`)
                                    }
                                }
                            } else {
                                console.log(`      観測点データなし`)
                            }
                        }
                    } else {
                        console.log(`    市区町村データなし`)
                    }
                }
            } else {
                console.log(`  従来形式地域データなし`)
            }
        }
    } else {
        console.log('震度観測データが見つかりません')
    }
    
    // 深さ情報を複数のパスから取得（earthquake.tsと同様の改善）
    let depth = '不明'
    const depthPaths = [
        'Body.Earthquake.Hypocenter.Area.Depth',
        'Body.Earthquake.Hypocenter.Depth',
        'Body.Earthquake.Depth'
    ]
    
    for (const path of depthPaths) {
        const pathParts = path.split('.')
        let current: unknown = detail
        let success = true
        
        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = (current as Record<string, unknown>)[part]
            } else {
                success = false
                break
            }
        }
        
        if (success && current && current !== '不明' && current !== '') {
            depth = typeof current === 'string' ? current : String(current)
            if (!depth.includes('km') && depth.match(/^\d+(\.\d+)?$/)) {
                depth = `${depth}km`
            }
            console.log(`深さ情報取得成功 (mapGenerator): パス=${path}, 値=${depth}`)
            break
        }
    }
    
    // フォールバック: 震源名から推定
    if (depth === '不明' && hypocenterName !== '不明') {
        if (hypocenterName.includes('近海') || hypocenterName.includes('沖') || hypocenterName.includes('海域')) {
            depth = '10km'
            console.log(`深さ推定 (mapGenerator): 海域地震のため10kmと推定`)
        }
    }
    
    const earthquakeData: EarthquakeData = {
        longitude,
        latitude,
        magnitude: detail.Body?.Earthquake?.Magnitude || '不明',
        depth,
        hypocenter: hypocenterName,
        maxScale: detail.Body?.Intensity?.Observation?.MaxInt || '不明'
    }
    
    const areaInfo: AreaInfo = {
        epicenter: [longitude, latitude],
        areas
    }
    
    return { earthquakeData, areaInfo }
}

// 震度を earthquake-alert/map-draw 形式に変換
function convertIntensityFormat(intensity: string): string {
    switch (intensity) {
        case '0': return '0'
        case '1': return '1'
        case '2': return '2'
        case '3': return '3'
        case '4': return '4'
        case '5弱': case '5-': return 'under_5'
        case '5強': case '5+': return 'over_5'
        case '6弱': case '6-': return 'under_6'
        case '6強': case '6+': return 'over_6'
        case '7': return '7'
        default: return '0'
    }
}

// 地名から座標を推定する関数（詳細な座標データベース）
function estimateCoordinates(prefName: string, cityName: string, stationName?: string): [number, number] | null {
    // より詳細な座標データベース（主要都市・観測点）
    const locationDatabase: { [key: string]: { [key: string]: [number, number] } } = {
        '北海道': {
            '札幌': [141.35, 43.06], '函館': [140.74, 41.77], '旭川': [142.36, 43.77],
            '釧路': [144.38, 42.98], '帯広': [143.20, 42.92], '北見': [143.91, 43.82]
        },
        '青森': {
            '青森': [140.74, 40.82], '八戸': [141.49, 40.51], '弘前': [140.47, 40.60]
        },
        '岩手': {
            '盛岡': [141.15, 39.70], '一関': [141.13, 38.93], '大船渡': [141.73, 39.07]
        },
        '宮城': {
            '仙台': [140.87, 38.27], '石巻': [141.30, 38.43], '気仙沼': [141.57, 38.91]
        },
        '秋田': {
            '秋田': [140.10, 39.72], '横手': [140.56, 39.31], '大館': [140.57, 40.27]
        },
        '山形': {
            '山形': [140.36, 38.24], '酒田': [139.83, 38.91], '米沢': [140.12, 37.92]
        },
        '福島': {
            '福島': [140.47, 37.75], '郡山': [140.35, 37.40], 'いわき': [140.89, 37.05]
        },
        '茨城': {
            '水戸': [140.45, 36.34], 'つくば': [140.10, 36.08], '日立': [140.65, 36.60]
        },
        '栃木': {
            '宇都宮': [139.88, 36.57], '足利': [139.45, 36.34], '小山': [139.80, 36.31]
        },
        '群馬': {
            '前橋': [139.06, 36.39], '高崎': [139.01, 36.32], '桐生': [139.34, 36.41]
        },
        '埼玉': {
            'さいたま': [139.65, 35.86], '川越': [139.49, 35.92], '熊谷': [139.39, 36.15]
        },
        '千葉': {
            '千葉': [140.12, 35.61], '船橋': [139.98, 35.69], '柏': [139.97, 35.86]
        },
        '東京': {
            '新宿': [139.70, 35.69], '渋谷': [139.70, 35.66], '品川': [139.74, 35.63],
            '江戸川': [139.87, 35.71], '足立': [139.80, 35.78], '八王子': [139.34, 35.66]
        },
        '神奈川': {
            '横浜': [139.64, 35.45], '川崎': [139.70, 35.53], '相模原': [139.37, 35.57]
        },
        '新潟': {
            '新潟': [139.02, 37.90], '長岡': [138.85, 37.45], '上越': [138.25, 37.15]
        },
        '富山': {
            '富山': [137.21, 36.70], '高岡': [137.02, 36.75], '魚津': [137.41, 36.82]
        },
        '石川': {
            '金沢': [136.62, 36.59], '小松': [136.45, 36.41], '輪島': [136.90, 37.39]
        },
        '福井': {
            '福井': [136.22, 35.94], '敦賀': [136.07, 35.64], '小浜': [135.75, 35.50]
        },
        '山梨': {
            '甲府': [138.57, 35.66], '富士吉田': [138.80, 35.49], '韮崎': [138.45, 35.71]
        },
        '長野': {
            '長野': [138.18, 36.65], '松本': [137.97, 36.24], '飯田': [137.82, 35.52]
        },
        '岐阜': {
            '岐阜': [136.72, 35.39], '大垣': [136.62, 35.36], '高山': [137.25, 36.15]
        },
        '静岡': {
            '静岡': [138.38, 34.98], '浜松': [137.73, 34.71], '沼津': [138.86, 35.10]
        },
        '愛知': {
            '名古屋': [136.91, 35.18], '豊田': [137.16, 35.08], '岡崎': [137.17, 34.95]
        },
        '三重': {
            '津': [136.51, 34.73], '四日市': [136.62, 34.97], '伊勢': [136.71, 34.49]
        },
        '滋賀': {
            '大津': [135.87, 35.00], '彦根': [136.25, 35.27], '長浜': [136.27, 35.38]
        },
        '京都': {
            '京都': [135.75, 35.01], '福知山': [135.13, 35.30], '舞鶴': [135.39, 35.47]
        },
        '大阪': {
            '大阪': [135.50, 34.69], '堺': [135.48, 34.57], '岸和田': [135.37, 34.46]
        },
        '兵庫': {
            '神戸': [135.18, 34.69], '姫路': [134.69, 34.82], '尼崎': [135.42, 34.73]
        },
        '奈良': {
            '奈良': [135.83, 34.69], '大和高田': [135.74, 34.52], '大和郡山': [135.78, 34.65]
        },
        '和歌山': {
            '和歌山': [135.17, 34.23], '海南': [135.21, 34.16], '橋本': [135.61, 34.31]
        },
        '鳥取': {
            '鳥取': [134.24, 35.50], '米子': [133.33, 35.43], '倉吉': [133.83, 35.43]
        },
        '島根': {
            '松江': [133.05, 35.47], '浜田': [132.08, 34.90], '出雲': [132.75, 35.37]
        },
        '岡山': {
            '岡山': [133.93, 34.66], '倉敷': [133.77, 34.60], '津山': [134.00, 35.06]
        },
        '広島': {
            '広島': [132.46, 34.40], '呉': [132.56, 34.25], '竹原': [132.91, 34.34]
        },
        '山口': {
            '下関': [130.94, 33.96], '宇部': [131.25, 33.95], '山口': [131.47, 34.19]
        },
        '徳島': {
            '徳島': [134.56, 34.07], '鳴門': [134.61, 34.18], '小松島': [134.59, 34.00]
        },
        '香川': {
            '高松': [134.04, 34.34], '丸亀': [133.80, 34.29], '坂出': [133.86, 34.31]
        },
        '愛媛': {
            '松山': [132.77, 33.84], '今治': [133.00, 34.07], '宇和島': [132.56, 33.22]
        },
        '高知': {
            '高知': [133.53, 33.56], '室戸': [134.15, 33.29], '安芸': [133.90, 33.50]
        },
        '福岡': {
            '福岡': [130.42, 33.61], '北九州': [130.88, 33.88], '久留米': [130.51, 33.32]
        },
        '佐賀': {
            '佐賀': [130.30, 33.25], '唐津': [129.97, 33.45], '鳥栖': [130.51, 33.37]
        },
        '長崎': {
            '長崎': [129.87, 32.75], '佐世保': [129.72, 33.17], '島原': [130.37, 32.79]
        },
        '熊本': {
            '熊本': [130.74, 32.79], '八代': [130.61, 32.51], '人吉': [130.76, 32.21]
        },
        '大分': {
            '大分': [131.61, 33.24], '別府': [131.49, 33.28], '中津': [131.19, 33.60]
        },
        '宮崎': {
            '宮崎': [131.42, 31.91], '都城': [131.07, 31.72], '延岡': [131.66, 32.58]
        },
        '鹿児島': {
            '鹿児島': [130.56, 31.56], '鹿屋': [130.85, 31.38], '枕崎': [130.30, 31.27]
        },
        '沖縄': {
            '那覇': [127.68, 26.21], '宜野湾': [127.78, 26.28], '石垣': [124.16, 24.34]
        }
    }
    
    // 都道府県名から検索
    for (const [dbPref, cities] of Object.entries(locationDatabase)) {
        if (prefName.includes(dbPref) || dbPref.includes(prefName)) {
            // 市名から検索
            for (const [dbCity, coords] of Object.entries(cities)) {
                if (cityName.includes(dbCity) || dbCity.includes(cityName)) {
                    return coords
                }
            }
            // 観測点名から検索
            if (stationName) {
                for (const [dbCity, coords] of Object.entries(cities)) {
                    if (stationName.includes(dbCity) || dbCity.includes(stationName)) {
                        return coords
                    }
                }
            }
            // 最初の都市の座標を返す
            const firstCity = Object.values(cities)[0]
            if (firstCity) {
                return firstCity
            }
        }
    }
    
    return null
}

// Wolfix WarnAreaエリア名から代表座標を取得
function getWarnAreaCoordinates(areaName: string): [number, number] | null {
    console.log(`WarnAreaエリア座標検索: ${areaName}`)
    
    // エリア名から座標への変換マップ（経度、緯度の順）
    const areaCoordinatesMap: Record<string, [number, number]> = {
        // 鹿児島県
        '鹿児島県十島村': [129.9, 29.2],
        '鹿児島県': [130.6, 31.6],
        '奄美大島': [130.0, 28.5],
        '種子島': [131.0, 30.5],
        '種子島近海': [131.0, 30.5],
        '屋久島': [130.5, 30.3],
        // 沖縄県
        '沖縄県': [127.7, 26.2],
        '沖縄本島': [127.7, 26.2],
        '石垣島': [124.2, 24.3],
        '宮古島': [125.3, 24.8],
        // 九州
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
        '北海道': [143.0, 43.1],
        // 特定地域
        'トカラ列島': [129.9, 29.2],
        'トカラ列島近海': [129.9, 29.2],
        '奄美大島近海': [130.0, 28.5],
        '大隅半島東方沖': [131.5, 31.0],
        '薩摩半島西方沖': [129.5, 31.5],
        '日向灘': [132.0, 32.0],
        '豊後水道': [132.3, 33.2],
        '伊予灘': [132.0, 33.7],
        '安芸灘': [132.5, 34.2],
        '周防灘': [131.0, 33.8]
    }
    
    // 完全一致を優先
    if (areaCoordinatesMap[areaName]) {
        console.log(`完全一致で座標取得: ${areaName} → [${areaCoordinatesMap[areaName][0]}, ${areaCoordinatesMap[areaName][1]}]`)
        return areaCoordinatesMap[areaName]
    }
    
    // 部分一致で検索
    for (const [mapArea, coords] of Object.entries(areaCoordinatesMap)) {
        if (areaName.includes(mapArea) || mapArea.includes(areaName)) {
            console.log(`部分一致で座標取得: ${areaName} ≈ ${mapArea} → [${coords[0]}, ${coords[1]}]`)
            return coords
        }
    }
    
    console.log(`座標が見つからないエリア: ${areaName}`)
    return null
}

// earthquake-alert/map-draw compatible interface
