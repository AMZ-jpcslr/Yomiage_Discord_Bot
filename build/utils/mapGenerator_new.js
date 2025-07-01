"use strict";
/*
* Earthquake Map Generator
* Based on earthquake-alert/map-draw
* Copyright (c) 2020 Earthquake alert (MIT License)
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEarthquakeMap = generateEarthquakeMap;
exports.extractEarthquakeMapData = extractEarthquakeMapData;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsdom_1 = require("jsdom");
const sharp_1 = __importDefault(require("sharp"));
// simplify-geojson can be required normally (CommonJS)
const simplify = require('simplify-geojson');
// 震度画像URLを取得する関数（earthquake.tsと同じ）
function getShindoImageUrl(maxScale) {
    switch (String(maxScale)) {
        case '1': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613/raw';
        case '2': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639/raw';
        case '3': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110/raw';
        case '4': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025/raw';
        case '5-':
        case '5弱': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29/raw';
        case '5+':
        case '5強': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988/raw';
        case '6-':
        case '6弱': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be/raw';
        case '6+':
        case '6強': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb/raw';
        case '7': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4/raw';
        // 数値形式の場合も対応（旧形式）
        case '10': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613/raw';
        case '20': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639/raw';
        case '30': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110/raw';
        case '40': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025/raw';
        case '45': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29/raw';
        case '50': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988/raw';
        case '55': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be/raw';
        case '60': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb/raw';
        case '70': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4/raw';
        default: return undefined;
    }
}
function generateEarthquakeMap(earthquakeData, areaInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            console.log('Starting earthquake map generation...');
            // Use CommonJS-compatible dynamic import to avoid require() of ES modules
            const d3Module = yield Function('return import("d3")')();
            const d3GeoModule = yield Function('return import("d3-geo")')();
            // Create d3 object similar to earthquake-alert/map-draw
            const d3 = Object.assign({}, d3Module, d3GeoModule);
            // Load config file (earthquake-alert/map-draw compatible)
            const configPath = path.join(__dirname, '../../config/config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Load map data
            const mapPath = path.join(__dirname, '../../', config.map);
            const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
            // Create JSDOM environment for SVG (earthquake-alert/map-draw style)
            const document = new jsdom_1.JSDOM('').window.document;
            // earthquake-alert/map-draw algorithm
            const epicenter = [earthquakeData.longitude, earthquakeData.latitude];
            // Area info structure (use provided data or default)
            const area_info = areaInfo || {
                epicenter: epicenter,
                areas: {}
            };
            // Extract config values (earthquake-alert/map-draw style)
            const width = config.width;
            const height = config.height;
            const map_stroke = config.stroke_width;
            const resolution = config.resolution;
            const def_scale = config.scale;
            const sea_color = config.sea_color;
            const land_color = config.land_color;
            const stroke_color = config.stroke_color;
            const seismic_intensity_color = config.seismic_intensity_color;
            const epicenter_config = config.epicenter;
            const seismic_intensity_config = config.seismic_intensity;
            const copyright = config.copyright;
            // Calculate longitude and latitude bounds (earthquake-alert/map-draw algorithm)
            let longitude = [epicenter[0], epicenter[0]];
            let latitude = [epicenter[1], epicenter[1]];
            let volume = 1;
            let sum_longitude = epicenter[0];
            let sum_latitude = epicenter[1];
            // Process areas if they exist (earthquake-alert/map-draw style)
            for (const area_key in area_info.areas) {
                for (const element of area_info.areas[area_key]) {
                    sum_longitude += element[0];
                    sum_latitude += element[1];
                    longitude = [Math.max(longitude[0], element[0]), Math.min(longitude[1], element[0])];
                    latitude = [Math.max(latitude[0], element[1]), Math.min(latitude[1], element[1])];
                    volume++;
                }
            }
            const center = [sum_longitude / volume, sum_latitude / volume];
            const expansion_rate = longitude[0] - longitude[1] + latitude[0] - latitude[1];
            // Scale calculation (earthquake-alert/map-draw algorithm) - 震源周辺をより詳細に表示
            let _scale;
            if (expansion_rate === 0) {
                _scale = 8; // 単一震源の場合はさらにズームイン
            }
            else if (expansion_rate < 1) {
                _scale = 6; // 小さな範囲の場合はより拡大
            }
            else if (expansion_rate < 3) {
                _scale = 3;
            }
            else if (expansion_rate < 5) {
                _scale = 2;
            }
            else if (expansion_rate < 7) {
                _scale = 1.5;
            }
            else if (expansion_rate < 9) {
                _scale = 1.2;
            }
            else {
                _scale = 1;
            }
            // Simplify geojson data with higher resolution for better map accuracy
            // 新しいprefectures.geojsonファイル用の最適化された解像度設定
            const data = simplify(mapData, Math.min(resolution * 0.1, 0.001));
            // Setup map projection (earthquake-alert/map-draw style) with improved accuracy
            const aProjection = d3.geoMercator()
                .center(center)
                .translate([width / 2, height / 2])
                .scale(def_scale * _scale)
                .precision(0.1); // 投影精度を向上
            const geoPath = d3.geoPath()
                .projection(aProjection);
            // Create SVG (earthquake-alert/map-draw style)
            const svg = d3.select(document.body)
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('width', width)
                .attr('height', height)
                .attr('xmin', (_a = aProjection.invert([0, 0])) === null || _a === void 0 ? void 0 : _a[0])
                .attr('xmax', (_b = aProjection.invert([width, height])) === null || _b === void 0 ? void 0 : _b[0])
                .attr('ymin', (_c = aProjection.invert([width, height])) === null || _c === void 0 ? void 0 : _c[1])
                .attr('ymax', (_d = aProjection.invert([0, 0])) === null || _d === void 0 ? void 0 : _d[1])
                .attr('scale', aProjection.scale())
                .attr('encoding', 'utf-8')
                .style('background-color', sea_color);
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
                .style('shape-rendering', 'geometricPrecision'); // より精密な描画
            // Seismic intensity plotting function (earthquake-alert/map-draw style)
            const Export = (area, color, text) => {
                const coordinate = aProjection(area);
                if (!coordinate)
                    return;
                // Draw circle background with improved visual quality
                svg.append('circle')
                    .attr('r', seismic_intensity_config.circle)
                    .attr('cx', coordinate[0])
                    .attr('cy', coordinate[1])
                    .style('fill', color)
                    .style('stroke', '#000000')
                    .style('stroke-width', '2') // より太い枠線
                    .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))'); // 影を追加
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
                    .style('text-shadow', '1px 1px 1px rgba(255,255,255,0.8)'); // テキストに影を追加
            };
            // Plot seismic intensity areas first (so epicenter appears on top)
            const intensityLevels = ['0', '1', '2', '3', '4', 'under_5', 'over_5', 'under_6', 'over_6', '7'];
            const intensityTexts = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                'under_5': '5-', 'over_5': '5+', 'under_6': '6-', 'over_6': '6+', '7': '7'
            };
            console.log('震度データの詳細:', JSON.stringify(area_info.areas, null, 2));
            let totalStations = 0;
            for (const level of intensityLevels) {
                if (area_info.areas[level] && area_info.areas[level].length > 0) {
                    const color = seismic_intensity_color[level];
                    const text = intensityTexts[level];
                    const stationCount = area_info.areas[level].length;
                    totalStations += stationCount;
                    console.log(`震度${text}: ${stationCount}地点 - 色: ${color}`);
                    for (const area of area_info.areas[level]) {
                        console.log(`  座標: [${area[0]}, ${area[1]}]`);
                        Export(area, color, text);
                    }
                }
            }
            console.log(`総観測点数: ${totalStations}`);
            if (totalStations === 0) {
                console.warn('警告: 震度観測点データが見つかりませんでした。デフォルトで震源に表示します。');
                // 震度データがない場合、震源に最大震度を表示
                if (earthquakeData.maxScale && earthquakeData.maxScale !== '不明') {
                    const maxScaleText = earthquakeData.maxScale.toString();
                    const defaultColor = '#ff0000'; // 赤色をデフォルトに
                    Export(epicenter, defaultColor, maxScaleText);
                    console.log(`震源に最大震度${maxScaleText}を表示しました`);
                }
            }
            // 常に右上に震度を表示（地図に表示されない場合も含む）
            if (!earthquakeData.maxScale || earthquakeData.maxScale === '不明') {
                // 震度データから最大震度を自動計算
                let calculatedMaxScale = '0';
                for (const level of intensityLevels.reverse()) { // 大きい震度から順に確認
                    if (area_info.areas[level] && area_info.areas[level].length > 0) {
                        calculatedMaxScale = intensityTexts[level];
                        console.log(`計算された最大震度: ${calculatedMaxScale}`);
                        break;
                    }
                }
                earthquakeData.maxScale = calculatedMaxScale;
            }
            // Draw epicenter (earthquake-alert/map-draw style) - on top of intensity data
            const epicenterCoord = aProjection(epicenter);
            if (!epicenterCoord) {
                throw new Error('Failed to project epicenter coordinates');
            }
            // Epicenter X mark background (earthquake-alert/map-draw style)
            svg.append('line')
                .attr('x1', epicenterCoord[0] - epicenter_config.size - epicenter_config.stroke_width)
                .attr('x2', epicenterCoord[0] + epicenter_config.size + epicenter_config.stroke_width)
                .attr('y1', epicenterCoord[1] - epicenter_config.size - epicenter_config.stroke_width)
                .attr('y2', epicenterCoord[1] + epicenter_config.size + epicenter_config.stroke_width)
                .attr('stroke-width', epicenter_config.width + epicenter_config.stroke_width * 2)
                .style('stroke', epicenter_config.stroke);
            svg.append('line')
                .attr('x1', epicenterCoord[0] - epicenter_config.size - epicenter_config.stroke_width)
                .attr('x2', epicenterCoord[0] + epicenter_config.size + epicenter_config.stroke_width)
                .attr('y1', epicenterCoord[1] + epicenter_config.size + epicenter_config.stroke_width)
                .attr('y2', epicenterCoord[1] - epicenter_config.size - epicenter_config.stroke_width)
                .attr('stroke-width', epicenter_config.width + epicenter_config.stroke_width * 2)
                .style('stroke', epicenter_config.stroke);
            // Epicenter X mark foreground (earthquake-alert/map-draw style)
            svg.append('line')
                .attr('x1', epicenterCoord[0] - epicenter_config.size)
                .attr('x2', epicenterCoord[0] + epicenter_config.size)
                .attr('y1', epicenterCoord[1] - epicenter_config.size)
                .attr('y2', epicenterCoord[1] + epicenter_config.size)
                .attr('stroke-width', epicenter_config.width)
                .style('stroke', epicenter_config.color);
            svg.append('line')
                .attr('x1', epicenterCoord[0] - epicenter_config.size)
                .attr('x2', epicenterCoord[0] + epicenter_config.size)
                .attr('y1', epicenterCoord[1] + epicenter_config.size)
                .attr('y2', epicenterCoord[1] - epicenter_config.size)
                .attr('stroke-width', epicenter_config.width)
                .style('stroke', epicenter_config.color);
            // Add copyright (earthquake-alert/map-draw style)
            svg.append('text')
                .text(copyright.text.join(' / '))
                .attr('x', 10)
                .attr('y', height - copyright.size)
                .attr('font-size', copyright.size)
                .attr('font-family', copyright.font)
                .style('fill', copyright.color);
            // 震度数字を右上に表示する機能を追加
            const maxScale = earthquakeData.maxScale;
            console.log(`震度右上表示: maxScale = "${maxScale}", type = ${typeof maxScale}`);
            if (maxScale && maxScale !== '不明' && maxScale !== '') {
                // 震度数字を右上に大きく表示
                let intensityText = maxScale.toString();
                // 震度の文字列を正規化
                if (intensityText.includes('弱')) {
                    intensityText = intensityText.replace('弱', '-');
                }
                else if (intensityText.includes('強')) {
                    intensityText = intensityText.replace('強', '+');
                }
                console.log(`震度右上表示: 表示する震度 = "${intensityText}"`);
                const intensityFontSize = 100; // 大きなフォントサイズ
                const rightMargin = 120;
                const topMargin = 100;
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
                    .style('filter', 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))');
                // "震度"ラベルを描画
                svg.append('text')
                    .text('震度')
                    .attr('x', width - rightMargin)
                    .attr('y', topMargin - 20)
                    .attr('font-size', 32)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', 'Arial Black, sans-serif')
                    .style('fill', '#ffffff')
                    .style('font-weight', 'bold')
                    .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)');
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
                    .style('text-shadow', '3px 3px 6px rgba(0,0,0,0.9)');
            }
            // Get SVG as HTML string
            const svgHtml = document.body.innerHTML;
            // Convert SVG to PNG using Sharp
            const timestamp = Date.now();
            const filename = `earthquake_map_${timestamp}.png`;
            const outputDir = path.join(__dirname, '../../generated_images');
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const filepath = path.join(outputDir, filename);
            // Convert SVG to PNG
            yield (0, sharp_1.default)(Buffer.from(svgHtml))
                .png()
                .toFile(filepath);
            console.log('Generated earthquake map:', filepath);
            return filepath;
        }
        catch (error) {
            console.error('Error generating earthquake map:', error);
            throw error;
        }
    });
}
// 震度データと地震情報を抽出する関数
function extractEarthquakeMapData(detail) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    // 座標情報の抽出（気象庁XMLフォーマットに対応）
    let longitude = 139.69; // デフォルト（東京）
    let latitude = 35.68; // デフォルト（東京）
    // 複数の形式の座標情報に対応
    const hypocenterCoord = (_d = (_c = (_b = (_a = detail.Body) === null || _a === void 0 ? void 0 : _a.Earthquake) === null || _b === void 0 ? void 0 : _b.Hypocenter) === null || _c === void 0 ? void 0 : _c.Area) === null || _d === void 0 ? void 0 : _d.Coordinate;
    if (hypocenterCoord) {
        if (Array.isArray(hypocenterCoord)) {
            // 配列形式の場合
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const epicenterCoord = hypocenterCoord.find((coord) => coord['@type'] === 'epicenter' || coord.type === 'epicenter');
            if (epicenterCoord && epicenterCoord['#text']) {
                const coordText = epicenterCoord['#text'];
                const coords = coordText.split('/');
                if (coords.length >= 2) {
                    longitude = parseFloat(coords[0]) || longitude;
                    latitude = parseFloat(coords[1]) || latitude;
                }
            }
        }
        else if (hypocenterCoord['#text']) {
            // 単一オブジェクト形式の場合
            const coords = hypocenterCoord['#text'].split('/');
            if (coords.length >= 2) {
                longitude = parseFloat(coords[0]) || longitude;
                latitude = parseFloat(coords[1]) || latitude;
            }
        }
    }
    // 代替方法：名前から推定される緯度経度
    const hypocenterName = ((_h = (_g = (_f = (_e = detail.Body) === null || _e === void 0 ? void 0 : _e.Earthquake) === null || _f === void 0 ? void 0 : _f.Hypocenter) === null || _g === void 0 ? void 0 : _g.Area) === null || _h === void 0 ? void 0 : _h.Name) || '不明';
    if (longitude === 139.69 && latitude === 35.68) {
        // デフォルト座標の場合、地名から推定
        const locationMap = {
            'トカラ列島': [129.9, 29.2],
            'トカラ列島近海': [129.9, 29.2],
            '奄美大島近海': [130.0, 28.5],
            '種子島近海': [131.0, 30.5],
            '屋久島': [130.5, 30.3],
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
        };
        for (const [region, coords] of Object.entries(locationMap)) {
            if (hypocenterName.includes(region)) {
                longitude = coords[0];
                latitude = coords[1];
                break;
            }
        }
    }
    console.log(`震源座標: ${latitude}°N, ${longitude}°E (${hypocenterName})`);
    // 震度観測点データの抽出
    const areas = {};
    // 気象庁XMLから震度データを抽出
    const intensityData = (_k = (_j = detail.Body) === null || _j === void 0 ? void 0 : _j.Intensity) === null || _k === void 0 ? void 0 : _k.Observation;
    console.log('震度観測データ:', JSON.stringify(intensityData, null, 2));
    if (intensityData && intensityData.Pref) {
        const prefectures = Array.isArray(intensityData.Pref) ? intensityData.Pref : [intensityData.Pref];
        console.log(`処理する都道府県数: ${prefectures.length}`);
        for (const pref of prefectures) {
            console.log(`処理中の都道府県: ${pref.Name}`);
            if (pref.Area) {
                const areas_in_pref = Array.isArray(pref.Area) ? pref.Area : [pref.Area];
                console.log(`  地域数: ${areas_in_pref.length}`);
                for (const area of areas_in_pref) {
                    console.log(`  処理中の地域: ${area.Name}`);
                    if (area.City) {
                        const cities = Array.isArray(area.City) ? area.City : [area.City];
                        console.log(`    市区町村数: ${cities.length}`);
                        for (const city of cities) {
                            console.log(`    処理中の市区町村: ${city.Name}`);
                            if (city.IntensityStation) {
                                const stations = Array.isArray(city.IntensityStation) ? city.IntensityStation : [city.IntensityStation];
                                console.log(`      観測点数: ${stations.length}`);
                                for (const station of stations) {
                                    const intensity = station.Int;
                                    const stationName = station.Name;
                                    console.log(`      観測点: ${stationName}, 震度: ${intensity}`);
                                    // 正確な座標情報があるか確認
                                    let coords = null;
                                    // JSONデータに含まれる正確な座標を優先的に使用
                                    if (station.latlon && station.latlon.lat && station.latlon.lon) {
                                        coords = [station.latlon.lon, station.latlon.lat];
                                        console.log(`      → 正確な座標使用: [${coords[0]}, ${coords[1]}]`);
                                    }
                                    else {
                                        // フォールバック: 地名から推定
                                        const prefName = typeof pref.Name === 'string' ? pref.Name : '';
                                        const cityName = typeof city.Name === 'string' ? city.Name : '';
                                        const stationNameStr = typeof stationName === 'string' ? stationName : undefined;
                                        coords = estimateCoordinates(prefName, cityName, stationNameStr);
                                        if (coords) {
                                            console.log(`      → 推定座標使用: [${coords[0]}, ${coords[1]}]`);
                                        }
                                    }
                                    if (coords && intensity) {
                                        // 震度を earthquake-alert/map-draw 形式に変換
                                        const intensityKey = convertIntensityFormat(intensity);
                                        if (!areas[intensityKey]) {
                                            areas[intensityKey] = [];
                                        }
                                        areas[intensityKey].push(coords);
                                        console.log(`      → 座標追加: [${coords[0]}, ${coords[1]}] 震度キー: ${intensityKey}`);
                                    }
                                    else {
                                        console.log(`      → 座標取得失敗またはデータ不完全`);
                                    }
                                }
                            }
                            else {
                                console.log(`      観測点データなし`);
                            }
                        }
                    }
                    else {
                        console.log(`    市区町村データなし`);
                    }
                }
            }
            else {
                console.log(`  地域データなし`);
            }
        }
    }
    else {
        console.log('震度観測データが見つかりません');
    }
    // 深さ情報を複数のパスから取得（earthquake.tsと同様の改善）
    let depth = '不明';
    const depthPaths = [
        'Body.Earthquake.Hypocenter.Area.Depth',
        'Body.Earthquake.Hypocenter.Depth',
        'Body.Earthquake.Depth'
    ];
    for (const path of depthPaths) {
        const pathParts = path.split('.');
        let current = detail;
        let success = true;
        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                success = false;
                break;
            }
        }
        if (success && current && current !== '不明' && current !== '') {
            depth = typeof current === 'string' ? current : String(current);
            if (!depth.includes('km') && depth.match(/^\d+(\.\d+)?$/)) {
                depth = `${depth}km`;
            }
            console.log(`深さ情報取得成功 (mapGenerator): パス=${path}, 値=${depth}`);
            break;
        }
    }
    // フォールバック: 震源名から推定
    if (depth === '不明' && hypocenterName !== '不明') {
        if (hypocenterName.includes('近海') || hypocenterName.includes('沖') || hypocenterName.includes('海域')) {
            depth = '10km';
            console.log(`深さ推定 (mapGenerator): 海域地震のため10kmと推定`);
        }
    }
    const earthquakeData = {
        longitude,
        latitude,
        magnitude: ((_m = (_l = detail.Body) === null || _l === void 0 ? void 0 : _l.Earthquake) === null || _m === void 0 ? void 0 : _m.Magnitude) || '不明',
        depth,
        hypocenter: hypocenterName,
        maxScale: ((_q = (_p = (_o = detail.Body) === null || _o === void 0 ? void 0 : _o.Intensity) === null || _p === void 0 ? void 0 : _p.Observation) === null || _q === void 0 ? void 0 : _q.MaxInt) || '不明'
    };
    const areaInfo = {
        epicenter: [longitude, latitude],
        areas
    };
    return { earthquakeData, areaInfo };
}
// 震度を earthquake-alert/map-draw 形式に変換
function convertIntensityFormat(intensity) {
    switch (intensity) {
        case '0': return '0';
        case '1': return '1';
        case '2': return '2';
        case '3': return '3';
        case '4': return '4';
        case '5弱':
        case '5-': return 'under_5';
        case '5強':
        case '5+': return 'over_5';
        case '6弱':
        case '6-': return 'under_6';
        case '6強':
        case '6+': return 'over_6';
        case '7': return '7';
        default: return '0';
    }
}
// 地名から座標を推定する関数（詳細な座標データベース）
function estimateCoordinates(prefName, cityName, stationName) {
    // より詳細な座標データベース（主要都市・観測点）
    const locationDatabase = {
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
    };
    // 都道府県名から検索
    for (const [dbPref, cities] of Object.entries(locationDatabase)) {
        if (prefName.includes(dbPref) || dbPref.includes(prefName)) {
            // 市名から検索
            for (const [dbCity, coords] of Object.entries(cities)) {
                if (cityName.includes(dbCity) || dbCity.includes(cityName)) {
                    return coords;
                }
            }
            // 観測点名から検索
            if (stationName) {
                for (const [dbCity, coords] of Object.entries(cities)) {
                    if (stationName.includes(dbCity) || dbCity.includes(stationName)) {
                        return coords;
                    }
                }
            }
            // 最初の都市の座標を返す
            const firstCity = Object.values(cities)[0];
            if (firstCity) {
                return firstCity;
            }
        }
    }
    return null;
}
