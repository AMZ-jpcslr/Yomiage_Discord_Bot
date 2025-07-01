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
// サーバー環境対応のための環境変数設定
if (process.env.NODE_ENV === 'production') {
    // Fontconfig設定を無効化（より安全な方法）
    process.env.FONTCONFIG_PATH = '';
    process.env.FONTCONFIG_FILE = '';
    delete process.env.FONTCONFIG_PATH;
    delete process.env.FONTCONFIG_FILE;
    // Sharp のメモリ使用量を制限
    try {
        sharp_1.default.cache({ memory: 50 });
        sharp_1.default.concurrency(1);
    }
    catch (err) {
        console.warn('Sharp configuration warning:', err);
    }
}
function generateEarthquakeMap(earthquakeData, areaInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            console.log('Starting earthquake map generation...');
            // Use CommonJS-compatible dynamic import to avoid require() of ES modules
            const d3Module = yield importD3();
            // Create d3 object similar to earthquake-alert/map-draw
            const d3 = Object.assign({}, d3Module);
            // Load config file (earthquake-alert/map-draw compatible)
            const configPath = path.join(__dirname, '../../config/config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Load map data
            const mapPath = path.join(__dirname, '../../', config.map);
            const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
            // Create JSDOM environment for SVG (earthquake-alert/map-draw style)
            const dom = new jsdom_1.JSDOM('<!DOCTYPE html><html><body></body></html>', {
                pretendToBeVisual: false,
                resources: 'usable'
            });
            const document = dom.window.document;
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
            // Scale calculation (earthquake-alert/map-draw algorithm)
            let _scale;
            if (expansion_rate === 0) {
                _scale = 1;
            }
            else if (expansion_rate < 1) {
                _scale = 3;
            }
            else if (expansion_rate < 3) {
                _scale = 1.75;
            }
            else if (expansion_rate < 5) {
                _scale = 1.4;
            }
            else if (expansion_rate < 7) {
                _scale = 1.2;
            }
            else if (expansion_rate < 9) {
                _scale = 1.2;
            }
            else {
                _scale = 1;
            }
            // Simplify geojson data with higher resolution for better map accuracy
            const data = simplify(mapData, Math.min(resolution, 0.01));
            // Setup map projection (earthquake-alert/map-draw style)
            const aProjection = d3.geoMercator()
                .center(center)
                .translate([width / 2, height / 2])
                .scale(def_scale * _scale);
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
            // Draw map with better stroke settings for clarity
            svg.append('path')
                .datum(data)
                .attr('d', geoPath)
                .attr('stroke-width', map_stroke)
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .style('fill', land_color)
                .style('stroke', stroke_color);
            // Seismic intensity plotting function (earthquake-alert/map-draw style)
            const Export = (area, color, text) => {
                const coordinate = aProjection(area);
                if (!coordinate)
                    return;
                // Draw circle background
                svg.append('circle')
                    .attr('r', seismic_intensity_config.circle)
                    .attr('cx', coordinate[0])
                    .attr('cy', coordinate[1])
                    .style('fill', color)
                    .style('stroke', '#000000')
                    .style('stroke-width', '1');
                // Draw intensity text
                svg.append('text')
                    .text(text)
                    .attr('x', coordinate[0] + seismic_intensity_config.width)
                    .attr('y', coordinate[1] + seismic_intensity_config.height)
                    .attr('font-size', seismic_intensity_config.fontsize)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', seismic_intensity_config.font)
                    .style('fill', '#000000')
                    .style('font-weight', 'bold');
            };
            // Plot seismic intensity areas first (so epicenter appears on top)
            const intensityLevels = ['0', '1', '2', '3', '4', 'under_5', 'over_5', 'under_6', 'over_6', '7'];
            const intensityTexts = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                'under_5': '5-', 'over_5': '5+', 'under_6': '6-', 'over_6': '6+', '7': '7'
            };
            console.log('震度データ:', area_info.areas);
            for (const level of intensityLevels) {
                if (area_info.areas[level] && area_info.areas[level].length > 0) {
                    const color = seismic_intensity_color[level];
                    const text = intensityTexts[level];
                    console.log(`震度${text}: ${area_info.areas[level].length}地点`);
                    for (const area of area_info.areas[level]) {
                        Export(area, color, text);
                    }
                }
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
            // Convert SVG to PNG with server-safe configuration
            try {
                // サーバー環境での安全なSharp設定
                const sharpInstance = (0, sharp_1.default)(Buffer.from(svgHtml), {
                    density: 150,
                    limitInputPixels: false
                });
                yield sharpInstance
                    .png({
                    compressionLevel: 6,
                    quality: 80,
                    force: true
                })
                    .toFile(filepath);
            }
            catch (sharpError) {
                console.error('Sharp conversion error:', sharpError);
                // フォールバック1: より基本的な設定で試行
                try {
                    yield (0, sharp_1.default)(Buffer.from(svgHtml))
                        .png({ force: true })
                        .toFile(filepath);
                }
                catch (fallbackError) {
                    console.error('Sharp fallback error:', fallbackError);
                    // フォールバック2: SVGファイルとして保存
                    const svgFilepath = filepath.replace('.png', '.svg');
                    fs.writeFileSync(svgFilepath, svgHtml);
                    console.log('SVGファイルとして保存:', svgFilepath);
                    throw new Error('PNG変換に失敗しました。SVGファイルのみ利用可能です。');
                }
            }
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    // 座標情報の抽出（気象庁XMLフォーマットに対応）
    let longitude = 139.69; // デフォルト（東京）
    let latitude = 35.68; // デフォルト（東京）
    // 複数の形式の座標情報に対応
    const hypocenterCoord = (_d = (_c = (_b = (_a = detail.Body) === null || _a === void 0 ? void 0 : _a.Earthquake) === null || _b === void 0 ? void 0 : _b.Hypocenter) === null || _c === void 0 ? void 0 : _c.Area) === null || _d === void 0 ? void 0 : _d.Coordinate;
    if (hypocenterCoord) {
        if (Array.isArray(hypocenterCoord)) {
            // 配列形式の場合
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
    if (intensityData && intensityData.Pref) {
        const prefectures = Array.isArray(intensityData.Pref) ? intensityData.Pref : [intensityData.Pref];
        for (const pref of prefectures) {
            if (pref.Area) {
                const areas_in_pref = Array.isArray(pref.Area) ? pref.Area : [pref.Area];
                for (const area of areas_in_pref) {
                    if (area.City) {
                        const cities = Array.isArray(area.City) ? area.City : [area.City];
                        for (const city of cities) {
                            if (city.IntensityStation) {
                                const stations = Array.isArray(city.IntensityStation) ? city.IntensityStation : [city.IntensityStation];
                                for (const station of stations) {
                                    const intensity = station.Int;
                                    const stationName = station.Name;
                                    // 観測点の座標を推定（都道府県・市区町村名から）
                                    const prefName = pref.Name;
                                    const cityName = city.Name;
                                    const coords = estimateCoordinates(prefName, cityName, stationName);
                                    if (coords && intensity) {
                                        // 震度を earthquake-alert/map-draw 形式に変換
                                        const intensityKey = convertIntensityFormat(intensity);
                                        if (!areas[intensityKey]) {
                                            areas[intensityKey] = [];
                                        }
                                        areas[intensityKey].push(coords);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    const earthquakeData = {
        longitude,
        latitude,
        magnitude: ((_m = (_l = detail.Body) === null || _l === void 0 ? void 0 : _l.Earthquake) === null || _m === void 0 ? void 0 : _m.Magnitude) || '不明',
        depth: ((_r = (_q = (_p = (_o = detail.Body) === null || _o === void 0 ? void 0 : _o.Earthquake) === null || _p === void 0 ? void 0 : _p.Hypocenter) === null || _q === void 0 ? void 0 : _q.Area) === null || _r === void 0 ? void 0 : _r.Depth) || '不明',
        hypocenter: hypocenterName,
        maxScale: ((_u = (_t = (_s = detail.Body) === null || _s === void 0 ? void 0 : _s.Intensity) === null || _t === void 0 ? void 0 : _t.Observation) === null || _u === void 0 ? void 0 : _u.MaxInt) || '不明'
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
            '釧路': [144.38, 42.98], '帯広': [143.20, 42.92], '北見': [143.91, 43.82],
            '室蘭': [140.97, 42.32], '苫小牧': [141.61, 42.63], '小樽': [141.00, 43.19],
            '江別': [141.53, 43.10], '根室': [145.59, 43.33], '稚内': [141.68, 45.42],
            '紋別': [143.35, 44.35], '網走': [144.27, 44.02], '留萌': [141.64, 43.94],
            '名寄': [142.46, 44.36], '富良野': [142.38, 43.34], '岩見沢': [141.77, 43.21]
        },
        '青森': {
            '青森': [140.74, 40.82], '八戸': [141.49, 40.51], '弘前': [140.47, 40.60],
            'むつ': [141.18, 41.29], '五所川原': [140.44, 40.81], '十和田': [141.21, 40.61],
            '三沢': [141.38, 40.68], '黒石': [140.59, 40.64], 'つがる': [140.38, 40.81]
        },
        '岩手': {
            '盛岡': [141.15, 39.70], '一関': [141.13, 38.93], '大船渡': [141.73, 39.07],
            '花巻': [141.11, 39.39], '宮古': [141.96, 39.64], '釜石': [141.88, 39.28],
            '奥州': [141.14, 39.14], '久慈': [141.77, 40.19], '二戸': [141.30, 40.27],
            '北上': [141.11, 39.29], '遠野': [141.53, 39.33], '陸前高田': [141.63, 39.02]
        },
        '宮城': {
            '仙台': [140.87, 38.27], '石巻': [141.30, 38.43], '気仙沼': [141.57, 38.91],
            '大崎': [140.95, 38.58], '登米': [141.39, 38.69], '名取': [140.89, 38.17],
            '角田': [140.78, 37.98], '白石': [140.62, 38.00], '塩竈': [141.02, 38.31],
            '多賀城': [141.00, 38.29], '岩沼': [140.87, 38.10], '栗原': [141.01, 38.73]
        },
        '秋田': {
            '秋田': [140.10, 39.72], '横手': [140.56, 39.31], '大館': [140.57, 40.27],
            '能代': [140.03, 40.21], '湯沢': [140.50, 39.16], '大仙': [140.49, 39.45],
            '由利本荘': [140.05, 39.39], '鹿角': [140.80, 40.22], '男鹿': [139.85, 39.89],
            '北秋田': [140.37, 40.22], '仙北': [140.73, 39.70], 'にかほ': [139.91, 39.20]
        },
        '山形': {
            '山形': [140.36, 38.24], '酒田': [139.83, 38.91], '米沢': [140.12, 37.92],
            '鶴岡': [139.83, 38.73], '新庄': [140.31, 38.76], '寒河江': [140.28, 38.38],
            '上山': [140.27, 38.15], '天童': [140.37, 38.36], '東根': [140.39, 38.43],
            '村山': [140.38, 38.48], '長井': [140.04, 38.11], '南陽': [140.15, 38.05]
        },
        '福島': {
            '福島': [140.47, 37.75], '郡山': [140.35, 37.40], 'いわき': [140.89, 37.05],
            '会津若松': [139.93, 37.50], '白河': [140.21, 37.13], '須賀川': [140.37, 37.29],
            '喜多方': [139.87, 37.65], '相馬': [140.92, 37.80], '二本松': [140.43, 37.59],
            '田村': [140.57, 37.44], '南相馬': [140.96, 37.64], '伊達': [140.57, 37.82],
            '本宮': [140.39, 37.51], '桑折': [140.53, 37.82], '浪江': [140.99, 37.49]
        },
        '茨城': {
            '水戸': [140.45, 36.34], 'つくば': [140.10, 36.08], '日立': [140.65, 36.60],
            '古河': [139.70, 36.18], '石岡': [140.27, 36.19], '結城': [139.88, 36.30],
            '龍ケ崎': [140.18, 35.91], '下妻': [139.97, 36.18], '常総': [139.99, 36.02],
            '常陸太田': [140.53, 36.54], '高萩': [140.72, 36.72], '北茨城': [140.75, 36.78],
            '笠間': [140.31, 36.34], '取手': [140.05, 35.91], '牛久': [140.15, 35.98],
            '土浦': [140.20, 36.07], 'ひたちなか': [140.53, 36.40], '鹿嶋': [140.63, 35.97]
        },
        '栃木': {
            '宇都宮': [139.88, 36.57], '足利': [139.45, 36.34], '小山': [139.80, 36.31],
            '栃木': [139.73, 36.38], '佐野': [139.58, 36.31], '鹿沼': [139.75, 36.57],
            '日光': [139.69, 36.76], '真岡': [140.01, 36.44], '大田原': [140.02, 36.87],
            '矢板': [139.93, 36.81], '那須塩原': [140.05, 36.96], 'さくら': [139.96, 36.68],
            '那須烏山': [140.16, 36.66], '下野': [139.84, 36.38], '益子': [140.11, 36.48]
        },
        '群馬': {
            '前橋': [139.06, 36.39], '高崎': [139.01, 36.32], '桐生': [139.34, 36.41],
            '伊勢崎': [139.20, 36.31], '太田': [139.38, 36.29], '沼田': [139.04, 36.65],
            '館林': [139.54, 36.25], '渋川': [138.99, 36.49], '藤岡': [139.08, 36.26],
            '富岡': [138.89, 36.26], '安中': [138.88, 36.33], 'みどり': [139.28, 36.39],
            '中之条': [138.85, 36.59], '草津': [138.60, 36.62], '榛東': [139.07, 36.48]
        },
        '埼玉': {
            'さいたま': [139.65, 35.86], '川越': [139.49, 35.92], '熊谷': [139.39, 36.15],
            '川口': [139.72, 35.81], '行田': [139.46, 36.14], '秩父': [139.08, 35.99],
            '所沢': [139.47, 35.80], '飯能': [139.33, 35.86], '加須': [139.60, 36.13],
            '本庄': [139.19, 36.24], '東松山': [139.40, 35.95], '春日部': [139.75, 35.98],
            '狭山': [139.41, 35.85], '羽生': [139.55, 36.17], '鴻巣': [139.52, 36.07],
            '深谷': [139.28, 36.20], '上尾': [139.59, 35.98], '草加': [139.81, 35.82],
            '越谷': [139.79, 35.89], '蕨': [139.68, 35.83], '戸田': [139.68, 35.82],
            '朝霞': [139.59, 35.80], '志木': [139.58, 35.84], '和光': [139.61, 35.78]
        },
        '千葉': {
            '千葉': [140.12, 35.61], '船橋': [139.98, 35.69], '柏': [139.97, 35.86],
            '市川': [139.93, 35.72], '市原': [140.12, 35.50], '流山': [139.90, 35.86],
            '八千代': [140.10, 35.72], '我孫子': [140.03, 35.86], '鎌ケ谷': [140.00, 35.78],
            '浦安': [139.90, 35.65], '四街道': [140.17, 35.67], '袖ケ浦': [140.02, 35.43],
            '八街': [140.32, 35.67], '印西': [140.15, 35.83], '白井': [140.06, 35.79],
            '富里': [140.34, 35.73], '南房総': [139.84, 35.04], '匝瑳': [140.57, 35.70],
            '香取': [140.50, 35.90], '山武': [140.41, 35.60], '習志野': [140.03, 35.68],
            '成田': [140.32, 35.78], '佐倉': [140.22, 35.72], '木更津': [139.92, 35.38]
        },
        '東京': {
            '新宿': [139.70, 35.69], '渋谷': [139.70, 35.66], '品川': [139.74, 35.63],
            '江戸川': [139.87, 35.71], '足立': [139.80, 35.78], '八王子': [139.34, 35.66],
            '立川': [139.41, 35.70], '武蔵野': [139.56, 35.72], '三鷹': [139.56, 35.68],
            '青梅': [139.28, 35.79], '府中': [139.48, 35.67], '昭島': [139.35, 35.71],
            '調布': [139.54, 35.65], '町田': [139.44, 35.55], '小金井': [139.50, 35.70],
            '小平': [139.48, 35.73], '日野': [139.40, 35.67], '東村山': [139.47, 35.75],
            '国分寺': [139.46, 35.71], '国立': [139.44, 35.68], '福生': [139.33, 35.74],
            '狛江': [139.58, 35.63], '東大和': [139.43, 35.75], '清瀬': [139.53, 35.78],
            '東久留米': [139.53, 35.76], '武蔵村山': [139.39, 35.75], '多摩': [139.45, 35.64],
            '稲城': [139.51, 35.64], '羽村': [139.31, 35.77], 'あきる野': [139.29, 35.73],
            '西東京': [139.54, 35.73], '千代田': [139.75, 35.69], '中央': [139.77, 35.67],
            '港': [139.75, 35.66], '文京': [139.75, 35.71], '台東': [139.78, 35.71],
            '墨田': [139.80, 35.71], '江東': [139.82, 35.67], '目黒': [139.70, 35.64],
            '大田': [139.72, 35.56], '世田谷': [139.65, 35.65], '中野': [139.67, 35.71],
            '杉並': [139.64, 35.70], '豊島': [139.71, 35.73], '北': [139.73, 35.75],
            '荒川': [139.78, 35.74], '板橋': [139.69, 35.75], '練馬': [139.65, 35.75],
            '葛飾': [139.85, 35.74]
        },
        '神奈川': {
            '横浜': [139.64, 35.45], '川崎': [139.70, 35.53], '相模原': [139.37, 35.57],
            '横須賀': [139.67, 35.28], '平塚': [139.35, 35.33], '鎌倉': [139.55, 35.32],
            '藤沢': [139.49, 35.34], '小田原': [139.16, 35.26], '茅ヶ崎': [139.40, 35.33],
            '逗子': [139.58, 35.30], '三浦': [139.62, 35.14], '秦野': [139.22, 35.37],
            '厚木': [139.36, 35.44], '大和': [139.46, 35.49], '伊勢原': [139.31, 35.40],
            '海老名': [139.39, 35.45], '座間': [139.41, 35.49], '南足柄': [139.00, 35.31],
            '綾瀬': [139.43, 35.44]
        },
        '新潟': {
            '新潟': [139.02, 37.90], '長岡': [138.85, 37.45], '上越': [138.25, 37.15],
            '三条': [138.96, 37.64], '柏崎': [138.56, 37.37], '新発田': [139.33, 37.95],
            '小千谷': [138.79, 37.32], '加茂': [139.04, 37.53], '十日町': [138.76, 37.13],
            '見附': [138.91, 37.53], '村上': [139.48, 38.22], '燕': [138.91, 37.68],
            '糸魚川': [137.86, 37.04], '妙高': [138.25, 36.97], '五泉': [139.18, 37.75],
            '阿賀野': [139.22, 37.83], '佐渡': [138.37, 38.02], '魚沼': [139.00, 37.23],
            '南魚沼': [138.86, 37.07], '胎内': [139.41, 38.06]
        },
        '富山': {
            '富山': [137.21, 36.70], '高岡': [137.02, 36.75], '魚津': [137.41, 36.82],
            '氷見': [136.99, 36.85], '滑川': [137.35, 36.78], '黒部': [137.44, 36.87],
            '砺波': [136.96, 36.65], '小矢部': [136.87, 36.68], '南砺': [136.95, 36.56],
            '射水': [137.10, 36.78]
        },
        '石川': {
            '金沢': [136.62, 36.59], '小松': [136.45, 36.41], '輪島': [136.90, 37.39],
            '珠洲': [137.26, 37.51], '加賀': [136.31, 36.30], '羽咋': [136.78, 36.90],
            'かほく': [136.71, 36.72], '白山': [136.57, 36.51], '能美': [136.46, 36.46],
            '野々市': [136.61, 36.52]
        },
        '福井': {
            '福井': [136.22, 35.94], '敦賀': [136.07, 35.64], '小浜': [135.75, 35.50],
            '大野': [136.49, 35.98], '勝山': [136.88, 36.06], '鯖江': [136.19, 35.96],
            'あわら': [136.23, 36.22], '越前': [136.17, 35.91], '坂井': [136.23, 36.17]
        },
        '山梨': {
            '甲府': [138.57, 35.66], '富士吉田': [138.80, 35.49], '韮崎': [138.45, 35.71],
            '南アルプス': [138.46, 35.61], '北杜': [138.45, 35.78], '甲斐': [138.51, 35.70],
            '笛吹': [138.64, 35.65], '山梨': [138.68, 35.69], '大月': [138.95, 35.61],
            '上野原': [139.13, 35.63], '甲州': [138.73, 35.70], '中央': [138.76, 35.61]
        },
        '長野': {
            '長野': [138.18, 36.65], '松本': [137.97, 36.24], '飯田': [137.82, 35.52],
            '諏訪': [138.11, 36.04], '須坂': [138.31, 36.65], '小諸': [138.43, 36.33],
            '伊那': [137.95, 35.83], '駒ヶ根': [137.93, 35.73], '中野': [138.37, 36.74],
            '大町': [137.85, 36.50], '飯山': [138.36, 36.86], '茅野': [138.16, 35.99],
            '塩尻': [137.95, 36.11], '佐久': [138.48, 36.25], '千曲': [138.37, 36.53],
            '東御': [138.33, 36.36], '安曇野': [137.90, 36.31]
        },
        '岐阜': {
            '岐阜': [136.72, 35.39], '大垣': [136.62, 35.36], '高山': [137.25, 36.15],
            '多治見': [137.13, 35.33], '関': [136.91, 35.50], '中津川': [137.50, 35.49],
            '美濃': [136.91, 35.54], '瑞浪': [137.25, 35.37], '羽島': [136.70, 35.32],
            '恵那': [137.41, 35.45], '美濃加茂': [137.02, 35.44], '土岐': [137.18, 35.36],
            '各務原': [136.85, 35.40], '可児': [137.06, 35.43], '山県': [136.68, 35.50],
            '瑞穂': [136.65, 35.40], '飛騨': [137.19, 36.24], '本巣': [136.68, 35.49],
            '郡上': [136.96, 35.75], '下呂': [137.24, 35.80], '海津': [136.63, 35.22]
        },
        '静岡': {
            '静岡': [138.38, 34.98], '浜松': [137.73, 34.71], '沼津': [138.86, 35.10],
            '熱海': [139.07, 35.10], '三島': [138.92, 35.12], '富士宮': [138.62, 35.22],
            '伊東': [139.10, 34.97], '島田': [138.17, 34.83], '富士': [138.68, 35.16],
            '磐田': [137.85, 34.72], '焼津': [138.32, 34.87], '掛川': [138.01, 34.77],
            '藤枝': [138.25, 34.87], '御殿場': [138.93, 35.31], '袋井': [137.93, 34.75],
            '下田': [138.95, 34.68], '裾野': [138.91, 35.17], '湖西': [137.53, 34.70],
            '伊豆': [138.94, 34.98], '御前崎': [138.13, 34.63], '菊川': [138.08, 34.76],
            '伊豆の国': [138.95, 35.04], '牧之原': [138.22, 34.73]
        },
        '愛知': {
            '名古屋': [136.91, 35.18], '豊田': [137.16, 35.08], '岡崎': [137.17, 34.95],
            '一宮': [136.80, 35.30], '瀬戸': [137.08, 35.22], '半田': [136.94, 34.90],
            '春日井': [136.97, 35.25], '豊川': [137.38, 34.83], '津島': [136.74, 35.18],
            '碧南': [136.99, 34.86], '刈谷': [137.00, 35.00], '安城': [137.08, 34.96],
            '西尾': [137.06, 34.86], '蒲郡': [137.22, 34.83], '犬山': [136.94, 35.38],
            '常滑': [136.82, 34.89], '江南': [136.87, 35.33], '小牧': [136.91, 35.29],
            '稲沢': [136.78, 35.25], '新城': [137.50, 34.90], '東海': [136.90, 35.02],
            '大府': [136.96, 35.01], '知多': [136.84, 34.99], '知立': [137.05, 35.00],
            '尾張旭': [137.03, 35.22], '高浜': [137.04, 34.93], '岩倉': [136.87, 35.28],
            '豊明': [137.01, 35.05], '日進': [137.04, 35.13], '田原': [137.26, 34.67],
            '愛西': [136.73, 35.15], '清須': [136.85, 35.20], '北名古屋': [136.86, 35.25],
            '弥富': [136.74, 35.11], 'みよし': [137.08, 35.09], 'あま': [136.81, 35.18],
            '長久手': [137.05, 35.18]
        },
        '三重': {
            '津': [136.51, 34.73], '四日市': [136.62, 34.97], '伊勢': [136.71, 34.49],
            '松阪': [136.53, 34.58], '桑名': [136.68, 35.06], '名張': [136.11, 34.63],
            '尾鷲': [136.19, 33.97], '亀山': [136.45, 34.85], '鳥羽': [136.84, 34.48],
            '熊野': [136.11, 33.89], 'いなべ': [136.53, 35.11], '志摩': [136.83, 34.33],
            '伊賀': [136.13, 34.77]
        },
        '滋賀': {
            '大津': [135.87, 35.00], '彦根': [136.25, 35.27], '長浜': [136.27, 35.38],
            '近江八幡': [136.10, 35.13], '草津': [135.96, 35.02], '守山': [135.97, 35.08],
            '栗東': [135.99, 35.02], '甲賀': [136.17, 34.97], '野洲': [136.02, 35.12],
            '湖南': [136.05, 34.98], '高島': [135.91, 35.35], '東近江': [136.21, 35.11],
            '米原': [136.31, 35.32]
        },
        '京都': {
            '京都': [135.75, 35.01], '福知山': [135.13, 35.30], '舞鶴': [135.39, 35.47],
            '綾部': [135.26, 35.30], '宇治': [135.80, 34.88], '宮津': [135.20, 35.54],
            '亀岡': [135.57, 35.01], '城陽': [135.78, 34.85], '向日': [135.70, 34.95],
            '長岡京': [135.69, 34.93], '八幡': [135.70, 34.88], '京田辺': [135.77, 34.81],
            '京丹後': [135.07, 35.62], '南丹': [135.46, 35.11], '木津川': [135.82, 34.73]
        },
        '大阪': {
            '大阪': [135.50, 34.69], '堺': [135.48, 34.57], '岸和田': [135.37, 34.46],
            '豊中': [135.47, 34.78], '池田': [135.43, 34.82], '吹田': [135.52, 34.76],
            '泉大津': [135.41, 34.50], '高槻': [135.62, 34.85], '貝塚': [135.36, 34.44],
            '守口': [135.57, 34.74], '枚方': [135.65, 34.81], '茨木': [135.57, 34.82],
            '八尾': [135.60, 34.62], '泉佐野': [135.33, 34.41], '富田林': [135.60, 34.50],
            '寝屋川': [135.63, 34.77], '河内長野': [135.57, 34.46], '松原': [135.55, 34.58],
            '大東': [135.61, 34.73], '和泉': [135.44, 34.48], '箕面': [135.47, 34.83],
            '柏原': [135.64, 34.58], '羽曳野': [135.61, 34.55], '門真': [135.59, 34.74],
            '摂津': [135.56, 34.79], '高石': [135.44, 34.52], '藤井寺': [135.60, 34.57],
            '東大阪': [135.60, 34.68], '泉南': [135.27, 34.37], '四條畷': [135.65, 34.74],
            '交野': [135.68, 34.79], '大阪狭山': [135.57, 34.50], '阪南': [135.20, 34.36]
        },
        '兵庫': {
            '神戸': [135.18, 34.69], '姫路': [134.69, 34.82], '尼崎': [135.42, 34.73],
            '明石': [135.00, 34.65], '西宮': [135.34, 34.74], '洲本': [134.60, 34.34],
            '芦屋': [135.31, 34.73], '伊丹': [135.40, 34.78], '相生': [134.49, 34.81],
            '豊岡': [134.82, 35.55], '加古川': [134.84, 34.76], '赤穂': [134.39, 34.75],
            '西脇': [134.99, 34.99], '宝塚': [135.36, 34.80], '三木': [134.99, 34.80],
            '高砂': [134.80, 34.76], '川西': [135.42, 34.83], '小野': [134.94, 34.85],
            '三田': [135.22, 34.89], '加西': [134.86, 34.93], '篠山': [135.22, 35.07],
            '養父': [134.77, 35.40], '丹波': [135.04, 35.17], '南あわじ': [134.75, 34.29],
            '朝来': [134.85, 35.34], '淡路': [134.91, 34.43], '宍粟': [134.55, 35.00],
            '加東': [134.97, 34.92], 'たつの': [134.54, 34.86]
        },
        '奈良': {
            '奈良': [135.83, 34.69], '大和高田': [135.74, 34.52], '大和郡山': [135.78, 34.65],
            '天理': [135.84, 34.60], '橿原': [135.79, 34.51], '桜井': [135.84, 34.52],
            '五條': [135.71, 34.35], '御所': [135.74, 34.46], '生駒': [135.70, 34.69],
            '香芝': [135.70, 34.54], '葛城': [135.71, 34.49], '宇陀': [136.01, 34.53]
        },
        '和歌山': {
            '和歌山': [135.17, 34.23], '海南': [135.21, 34.16], '橋本': [135.61, 34.31],
            '有田': [135.13, 34.08], '御坊': [135.16, 33.89], '田辺': [135.38, 33.73],
            '新宮': [135.99, 33.73], '紀の川': [135.36, 34.27], '岩出': [135.31, 34.26]
        },
        '鳥取': {
            '鳥取': [134.24, 35.50], '米子': [133.33, 35.43], '倉吉': [133.83, 35.43],
            '境港': [133.23, 35.54]
        },
        '島根': {
            '松江': [133.05, 35.47], '浜田': [132.08, 34.90], '出雲': [132.75, 35.37],
            '益田': [131.84, 34.67], '大田': [132.50, 35.19], '安来': [133.25, 35.43],
            '江津': [132.22, 34.86], '雲南': [132.91, 35.29]
        },
        '岡山': {
            '岡山': [133.93, 34.66], '倉敷': [133.77, 34.60], '津山': [134.00, 35.06],
            '玉野': [133.95, 34.49], '笠岡': [133.51, 34.51], '井原': [133.46, 34.60],
            '総社': [133.75, 34.67], '高梁': [133.61, 34.79], '新見': [133.47, 34.97],
            '備前': [134.18, 34.75], '瀬戸内': [134.05, 34.65], '赤磐': [134.01, 34.76],
            '真庭': [133.80, 35.00], '美作': [134.15, 35.00], '浅口': [133.58, 34.52]
        },
        '広島': {
            '広島': [132.46, 34.40], '呉': [132.56, 34.25], '竹原': [132.91, 34.34],
            '三原': [133.08, 34.40], '尾道': [133.20, 34.41], '福山': [133.36, 34.49],
            '府中': [133.24, 34.57], '三次': [132.85, 34.81], '庄原': [133.00, 34.86],
            '大竹': [132.22, 34.24], '東広島': [132.74, 34.43], '廿日市': [132.33, 34.36],
            '安芸高田': [132.71, 34.67], '江田島': [132.44, 34.21]
        },
        '山口': {
            '下関': [130.94, 33.96], '宇部': [131.25, 33.95], '山口': [131.47, 34.19],
            '萩': [131.40, 34.42], '防府': [131.57, 34.05], '下松': [131.87, 34.02],
            '岩国': [132.22, 34.16], '光': [131.94, 33.96], '長門': [131.19, 34.37],
            '柳井': [132.11, 33.97], '美祢': [131.21, 34.17], '周南': [131.81, 34.06],
            '山陽小野田': [131.13, 34.00]
        },
        '徳島': {
            '徳島': [134.56, 34.07], '鳴門': [134.61, 34.18], '小松島': [134.59, 34.00],
            '阿南': [134.66, 33.92], '吉野川': [134.35, 34.07], '阿波': [134.50, 34.08],
            '美馬': [134.16, 34.06], '三好': [133.81, 34.00]
        },
        '香川': {
            '高松': [134.04, 34.34], '丸亀': [133.80, 34.29], '坂出': [133.86, 34.31],
            '善通寺': [133.78, 34.23], '観音寺': [133.66, 34.12], 'さぬき': [134.18, 34.32],
            '東かがわ': [134.36, 34.25], '三豊': [133.72, 34.23]
        },
        '愛媛': {
            '松山': [132.77, 33.84], '今治': [133.00, 34.07], '宇和島': [132.56, 33.22],
            '八幡浜': [132.62, 33.46], '新居浜': [133.28, 33.95], '西条': [133.18, 33.92],
            '大洲': [132.55, 33.51], '伊予': [132.71, 33.76], '四国中央': [133.55, 33.99],
            '西予': [132.52, 33.36], '東温': [132.88, 33.77]
        },
        '高知': {
            '高知': [133.53, 33.56], '室戸': [134.15, 33.29], '安芸': [133.90, 33.50],
            '南国': [133.64, 33.58], '土佐': [133.43, 33.49], '須崎': [133.28, 33.40],
            '宿毛': [132.73, 32.93], '土佐清水': [132.96, 32.78], '四万十': [132.93, 33.00],
            '香南': [133.70, 33.56], '香美': [133.68, 33.60]
        },
        '福岡': {
            '福岡': [130.42, 33.61], '北九州': [130.88, 33.88], '久留米': [130.51, 33.32],
            '直方': [130.73, 33.74], '飯塚': [130.69, 33.64], '田川': [130.81, 33.64],
            '柳川': [130.41, 33.16], '八女': [130.56, 33.21], '筑後': [130.50, 33.21],
            '大川': [130.38, 33.21], '行橋': [130.98, 33.73], '豊前': [131.14, 33.61],
            '中間': [130.71, 33.82], '小郡': [130.56, 33.40], '筑紫野': [130.52, 33.50],
            '春日': [130.47, 33.53], '大野城': [130.50, 33.54], '宗像': [130.55, 33.80],
            '太宰府': [130.52, 33.52], '古賀': [130.47, 33.73], '福津': [130.48, 33.76],
            'うきは': [130.76, 33.35], '宮若': [130.67, 33.72], '嘉麻': [130.74, 33.57],
            '朝倉': [130.66, 33.42], 'みやま': [130.47, 33.15], '糸島': [130.20, 33.56]
        },
        '佐賀': {
            '佐賀': [130.30, 33.25], '唐津': [129.97, 33.45], '鳥栖': [130.51, 33.37],
            '多久': [130.10, 33.29], '伊万里': [129.88, 33.27], '武雄': [130.01, 33.19],
            '鹿島': [130.10, 33.10], '小城': [130.29, 33.29], '嬉野': [130.06, 33.13],
            '神埼': [130.37, 33.32]
        },
        '長崎': {
            '長崎': [129.87, 32.75], '佐世保': [129.72, 33.17], '島原': [130.37, 32.79],
            '諫早': [130.05, 32.85], '大村': [129.96, 32.90], '平戸': [129.55, 33.37],
            '松浦': [129.71, 33.34], '対馬': [129.29, 34.20], '壱岐': [129.69, 33.75],
            '五島': [128.84, 32.69], '西海': [129.61, 32.93], '雲仙': [130.29, 32.76],
            '南島原': [130.31, 32.65]
        },
        '熊本': {
            '熊本': [130.74, 32.79], '八代': [130.61, 32.51], '人吉': [130.76, 32.21],
            '荒尾': [130.43, 32.98], '水俣': [130.41, 32.21], '玉名': [130.56, 32.93],
            '山鹿': [130.69, 33.02], '菊池': [130.82, 32.98], '宇土': [130.64, 32.69],
            '上天草': [130.43, 32.59], '宇城': [130.67, 32.65], '阿蘇': [131.11, 32.95],
            '天草': [130.19, 32.46], '合志': [130.81, 32.89]
        },
        '大分': {
            '大分': [131.61, 33.24], '別府': [131.49, 33.28], '中津': [131.19, 33.60],
            '日田': [130.94, 33.32], '佐伯': [131.90, 32.96], '臼杵': [131.81, 33.13],
            '津久見': [131.86, 33.07], '竹田': [131.40, 32.97], '豊後高田': [131.45, 33.56],
            '杵築': [131.62, 33.42], '宇佐': [131.35, 33.53], '豊後大野': [131.60, 32.98],
            '由布': [131.43, 33.18], '国東': [131.73, 33.55]
        },
        '宮崎': {
            '宮崎': [131.42, 31.91], '都城': [131.07, 31.72], '延岡': [131.66, 32.58],
            '日南': [131.38, 31.60], '小林': [130.98, 31.99], '日向': [131.62, 32.42],
            '串間': [131.23, 31.46], '西都': [131.40, 32.11], 'えびの': [130.81, 32.05]
        },
        '鹿児島': {
            '鹿児島': [130.56, 31.56], '鹿屋': [130.85, 31.38], '枕崎': [130.30, 31.27],
            '阿久根': [130.20, 32.02], '出水': [130.35, 32.09], '指宿': [130.65, 31.25],
            '西之表': [130.99, 30.73], '垂水': [130.70, 31.49], '薩摩川内': [130.31, 31.82],
            '日置': [130.40, 31.63], '曽於': [130.99, 31.67], '霧島': [130.76, 31.74],
            'いちき串木野': [130.27, 31.72], '南さつま': [130.32, 31.42], '志布志': [131.10, 31.48],
            '奄美': [129.49, 28.38], '南九州': [130.44, 31.38], '伊佐': [130.61, 32.06],
            '姶良': [130.63, 31.73]
        },
        '沖縄': {
            '那覇': [127.68, 26.21], '宜野湾': [127.78, 26.28], '石垣': [124.16, 24.34],
            '浦添': [127.73, 26.25], '名護': [127.98, 26.59], '糸満': [127.67, 26.12],
            '沖縄': [127.81, 26.34], '豊見城': [127.67, 26.16], 'うるま': [127.85, 26.37],
            '宮古島': [125.28, 24.80], '南城': [127.77, 26.14]
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
// D3.js の動的インポート関数（サーバー環境対応）
function importD3() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const d3Module = yield Function('return import("d3")')();
            const d3GeoModule = yield Function('return import("d3-geo")')();
            return Object.assign(Object.assign({}, d3Module), d3GeoModule);
        }
        catch (error) {
            console.error('D3 import error:', error);
            throw new Error('D3ライブラリの読み込みに失敗しました');
        }
    });
}
