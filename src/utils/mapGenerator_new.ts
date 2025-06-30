/*
* Earthquake Map Generator
* Based on earthquake-alert/map-draw
* Copyright (c) 2020 Earthquake alert (MIT License)
*/

import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'

// simplify-geojson can be required normally (CommonJS)
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
        const document = new JSDOM('').window.document
        
        // earthquake-alert/map-draw algorithm
        const epicenter: [number, number] = [earthquakeData.longitude, earthquakeData.latitude]
        
        // Area info structure (use provided data or default)
        const area_info: AreaInfo = areaInfo || {
            epicenter: epicenter,
            areas: {}
        }
        
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
            for (const element of area_info.areas[area_key]) {
                sum_longitude += element[0]
                sum_latitude += element[1]
                longitude = [Math.max(longitude[0], element[0]), Math.min(longitude[1], element[0])]
                latitude = [Math.max(latitude[0], element[1]), Math.min(latitude[1], element[1])]
                volume++
            }
        }
        
        const center: [number, number] = [sum_longitude / volume, sum_latitude / volume]
        const expansion_rate = longitude[0] - longitude[1] + latitude[0] - latitude[1]
        
        // Scale calculation (earthquake-alert/map-draw algorithm)
        let _scale: number
        if (expansion_rate === 0) {
            _scale = 1
        } else if (expansion_rate < 1) {
            _scale = 3
        } else if (expansion_rate < 3) {
            _scale = 1.75
        } else if (expansion_rate < 5) {
            _scale = 1.4
        } else if (expansion_rate < 7) {
            _scale = 1.2
        } else if (expansion_rate < 9) {
            _scale = 1.2
        } else {
            _scale = 1
        }
        
        // Simplify geojson data with higher resolution for better map accuracy
        const data = simplify(mapData, Math.min(resolution, 0.01))
        
        // Setup map projection (earthquake-alert/map-draw style)
        const aProjection = d3.geoMercator()
            .center(center)
            .translate([width / 2, height / 2])
            .scale(def_scale * _scale)
        
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
        
        // Draw map with better stroke settings for clarity
        svg.append('path')
            .datum(data)
            .attr('d', geoPath)
            .attr('stroke-width', map_stroke)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .style('fill', land_color)
            .style('stroke', stroke_color)
        
        // Seismic intensity plotting function (earthquake-alert/map-draw style)
        const Export = (area: [number, number], color: string, text: string) => {
            const coordinate = aProjection(area)
            if (!coordinate) return
            
            // Draw circle background
            svg.append('circle')
                .attr('r', seismic_intensity_config.circle)
                .attr('cx', coordinate[0])
                .attr('cy', coordinate[1])
                .style('fill', color)
                .style('stroke', '#000000')
                .style('stroke-width', '1')
            
            // Draw intensity text
            svg.append('text')
                .text(text)
                .attr('x', coordinate[0] + seismic_intensity_config.width)
                .attr('y', coordinate[1] + seismic_intensity_config.height)
                .attr('font-size', seismic_intensity_config.fontsize)
                .attr('text-anchor', 'middle')
                .attr('font-family', seismic_intensity_config.font)
                .style('fill', '#000000')
                .style('font-weight', 'bold')
        }
        
        // Plot seismic intensity areas first (so epicenter appears on top)
        const intensityLevels = ['0', '1', '2', '3', '4', 'under_5', 'over_5', 'under_6', 'over_6', '7']
        const intensityTexts: { [key: string]: string } = {
            '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            'under_5': '5-', 'over_5': '5+', 'under_6': '6-', 'over_6': '6+', '7': '7'
        }
        
        console.log('震度データ:', area_info.areas)
        
        for (const level of intensityLevels) {
            if (area_info.areas[level] && area_info.areas[level].length > 0) {
                const color = seismic_intensity_color[level]
                const text = intensityTexts[level]
                console.log(`震度${text}: ${area_info.areas[level].length}地点`)
                for (const area of area_info.areas[level]) {
                    Export(area, color, text)
                }
            }
        }
        
        // Draw epicenter (earthquake-alert/map-draw style) - on top of intensity data
        const epicenterCoord = aProjection(epicenter)
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
        
        // Add copyright (earthquake-alert/map-draw style)
        svg.append('text')
            .text(copyright.text.join(' / '))
            .attr('x', 10)
            .attr('y', height - copyright.size)
            .attr('font-size', copyright.size)
            .attr('font-family', copyright.font)
            .style('fill', copyright.color)
        
        // Get SVG as HTML string
        const svgHtml = document.body.innerHTML
        
        // Convert SVG to PNG using Sharp
        const timestamp = Date.now()
        const filename = `earthquake_map_${timestamp}.png`
        const outputDir = path.join(__dirname, '../../generated_images')
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }
        
        const filepath = path.join(outputDir, filename)
        
        // Convert SVG to PNG
        await sharp(Buffer.from(svgHtml))
            .png()
            .toFile(filepath)
        
        console.log('Generated earthquake map:', filepath)
        return filepath
        
    } catch (error) {
        console.error('Error generating earthquake map:', error)
        throw error
    }
}

// 震度データと地震情報を抽出する関数
export function extractEarthquakeMapData(detail: any): { earthquakeData: EarthquakeData, areaInfo: AreaInfo } {
    // 座標情報の抽出（気象庁XMLフォーマットに対応）
    let longitude = 139.69 // デフォルト（東京）
    let latitude = 35.68   // デフォルト（東京）
    
    // 複数の形式の座標情報に対応
    const hypocenterCoord = detail.Body?.Earthquake?.Hypocenter?.Area?.Coordinate
    
    if (hypocenterCoord) {
        if (Array.isArray(hypocenterCoord)) {
            // 配列形式の場合
            const epicenterCoord = hypocenterCoord.find((coord: any) => 
                coord['@type'] === 'epicenter' || coord.type === 'epicenter')
            if (epicenterCoord && epicenterCoord['#text']) {
                const coordText = epicenterCoord['#text']
                const coords = coordText.split('/')
                if (coords.length >= 2) {
                    longitude = parseFloat(coords[0]) || longitude
                    latitude = parseFloat(coords[1]) || latitude
                }
            }
        } else if (hypocenterCoord['#text']) {
            // 単一オブジェクト形式の場合
            const coords = hypocenterCoord['#text'].split('/')
            if (coords.length >= 2) {
                longitude = parseFloat(coords[0]) || longitude
                latitude = parseFloat(coords[1]) || latitude
            }
        }
    }
    
    // 代替方法：名前から推定される緯度経度
    const hypocenterName = detail.Body?.Earthquake?.Hypocenter?.Area?.Name || '不明'
    if (longitude === 139.69 && latitude === 35.68) {
        // デフォルト座標の場合、地名から推定
        const locationMap: { [key: string]: [number, number] } = {
            '福島': [140.47, 37.75],
            '宮城': [140.87, 38.27],
            '岩手': [141.15, 39.70],
            '茨城': [140.45, 36.34],
            '栃木': [139.88, 36.57],
            '群馬': [139.06, 36.39],
            '千葉': [140.12, 35.61],
            '埼玉': [139.65, 35.86],
            '東京': [139.69, 35.68],
            '神奈川': [139.64, 35.45],
            '静岡': [138.38, 34.98],
            '山梨': [138.57, 35.66],
            '長野': [138.18, 36.65],
            '新潟': [139.02, 37.90],
            '富山': [137.21, 36.70],
            '石川': [136.62, 36.59],
            '福井': [136.22, 35.94],
            '愛知': [136.91, 35.18],
            '岐阜': [136.72, 35.39],
            '三重': [136.51, 34.73],
            '滋賀': [135.87, 35.00],
            '京都': [135.75, 35.01],
            '大阪': [135.50, 34.69],
            '兵庫': [134.69, 34.69],
            '奈良': [135.83, 34.69],
            '和歌山': [135.17, 34.23],
            '鳥取': [134.24, 35.50],
            '島根': [132.55, 35.47],
            '岡山': [133.93, 34.66],
            '広島': [132.46, 34.40],
            '山口': [131.47, 34.19],
            '徳島': [134.56, 34.07],
            '香川': [134.04, 34.34],
            '愛媛': [132.77, 33.84],
            '高知': [133.53, 33.56],
            '福岡': [130.42, 33.61],
            '佐賀': [130.30, 33.25],
            '長崎': [129.87, 32.75],
            '熊本': [130.74, 32.79],
            '大分': [131.61, 33.24],
            '宮崎': [131.42, 31.91],
            '鹿児島': [130.56, 31.56],
            '沖縄': [127.68, 26.21]
        }
        
        for (const [region, coords] of Object.entries(locationMap)) {
            if (hypocenterName.includes(region)) {
                longitude = coords[0]
                latitude = coords[1]
                break
            }
        }
    }
    
    console.log(`震源座標: ${latitude}°N, ${longitude}°E (${hypocenterName})`)
    
    // 震度観測点データの抽出
    const areas: { [key: string]: [number, number][] } = {}
    
    // 気象庁XMLから震度データを抽出
    const intensityData = detail.Body?.Intensity?.Observation
    if (intensityData && intensityData.Pref) {
        const prefectures = Array.isArray(intensityData.Pref) ? intensityData.Pref : [intensityData.Pref]
        
        for (const pref of prefectures) {
            if (pref.Area) {
                const areas_in_pref = Array.isArray(pref.Area) ? pref.Area : [pref.Area]
                
                for (const area of areas_in_pref) {
                    if (area.City) {
                        const cities = Array.isArray(area.City) ? area.City : [area.City]
                        
                        for (const city of cities) {
                            if (city.IntensityStation) {
                                const stations = Array.isArray(city.IntensityStation) ? city.IntensityStation : [city.IntensityStation]
                                
                                for (const station of stations) {
                                    const intensity = station.Int
                                    const stationName = station.Name
                                    
                                    // 観測点の座標を推定（都道府県・市区町村名から）
                                    const prefName = pref.Name
                                    const cityName = city.Name
                                    const coords = estimateCoordinates(prefName, cityName, stationName)
                                    
                                    if (coords && intensity) {
                                        // 震度を earthquake-alert/map-draw 形式に変換
                                        const intensityKey = convertIntensityFormat(intensity)
                                        if (!areas[intensityKey]) {
                                            areas[intensityKey] = []
                                        }
                                        areas[intensityKey].push(coords)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    const earthquakeData: EarthquakeData = {
        longitude,
        latitude,
        magnitude: detail.Body?.Earthquake?.Magnitude || '不明',
        depth: detail.Body?.Earthquake?.Hypocenter?.Area?.Depth || '不明',
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
