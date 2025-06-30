"use strict";
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
// simplify-geojson can be required normally
const simplify = require('simplify-geojson');
function generateEarthquakeMap(earthquakeData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting earthquake map generation...');
            // Use eval to prevent TypeScript from converting to require()
            const importD3 = new Function('specifier', 'return import(specifier)');
            const d3Module = yield importD3('d3');
            const d3GeoModule = yield importD3('d3-geo');
            // Handle both default and named exports
            const d3 = d3Module.default || d3Module;
            const d3Geo = d3GeoModule.default || d3GeoModule;
            // Load config file (earthquake-alert/map-draw compatible)
            const configPath = path.join(__dirname, '../../config/config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Load map data
            const mapPath = path.join(__dirname, '../../', config.map);
            const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
            // Create JSDOM environment for SVG
            const dom = new jsdom_1.JSDOM('');
            const document = dom.window.document;
            // earthquake-alert/map-draw algorithm
            const epicenter = [earthquakeData.longitude, earthquakeData.latitude];
            // Default areas (just the epicenter for now)
            const area_info = {
                epicenter: epicenter,
                areas: {}
            };
            // Calculate longitude and latitude bounds (map-draw style)
            let longitude = [epicenter[0], epicenter[0]];
            let latitude = [epicenter[1], epicenter[1]];
            let volume = 1;
            let sum_longitude = epicenter[0];
            let sum_latitude = epicenter[1];
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
            // Scale calculation (earthquake-alert/map-draw style)
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
            // Simplify geojson data
            const data = simplify(mapData, config.resolution);
            // Setup map projection (earthquake-alert/map-draw style)
            const aProjection = d3Geo.geoMercator()
                .center(center)
                .translate([config.width / 2, config.height / 2])
                .scale(config.scale * _scale);
            const geoPath = d3Geo.geoPath()
                .projection(aProjection);
            // Create SVG (earthquake-alert/map-draw style)
            const svg = d3.select(document.body)
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('width', config.width)
                .attr('height', config.height)
                .attr('scale', aProjection.scale())
                .attr('encoding', 'utf-8')
                .style('background-color', config.sea_color);
            // Draw map (earthquake-alert/map-draw style)
            svg.append('path')
                .datum(data)
                .attr('d', geoPath)
                .attr('stroke-width', config.stroke_width)
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .style('fill', config.land_color)
                .style('stroke', config.stroke_color);
            // Draw epicenter (earthquake-alert/map-draw style)
            const epicenterCoord = aProjection(epicenter);
            if (!epicenterCoord) {
                throw new Error('Failed to project epicenter coordinates');
            }
            // Epicenter X mark background
            svg.append('line')
                .attr('x1', epicenterCoord[0] - config.epicenter.size - config.epicenter.stroke_width)
                .attr('x2', epicenterCoord[0] + config.epicenter.size + config.epicenter.stroke_width)
                .attr('y1', epicenterCoord[1] - config.epicenter.size - config.epicenter.stroke_width)
                .attr('y2', epicenterCoord[1] + config.epicenter.size + config.epicenter.stroke_width)
                .attr('stroke-width', config.epicenter.width + config.epicenter.stroke_width * 2)
                .style('stroke', config.epicenter.stroke);
            svg.append('line')
                .attr('x1', epicenterCoord[0] - config.epicenter.size - config.epicenter.stroke_width)
                .attr('x2', epicenterCoord[0] + config.epicenter.size + config.epicenter.stroke_width)
                .attr('y1', epicenterCoord[1] + config.epicenter.size + config.epicenter.stroke_width)
                .attr('y2', epicenterCoord[1] - config.epicenter.size - config.epicenter.stroke_width)
                .attr('stroke-width', config.epicenter.width + config.epicenter.stroke_width * 2)
                .style('stroke', config.epicenter.stroke);
            // Epicenter X mark foreground
            svg.append('line')
                .attr('x1', epicenterCoord[0] - config.epicenter.size)
                .attr('x2', epicenterCoord[0] + config.epicenter.size)
                .attr('y1', epicenterCoord[1] - config.epicenter.size)
                .attr('y2', epicenterCoord[1] + config.epicenter.size)
                .attr('stroke-width', config.epicenter.width)
                .style('stroke', config.epicenter.color);
            svg.append('line')
                .attr('x1', epicenterCoord[0] - config.epicenter.size)
                .attr('x2', epicenterCoord[0] + config.epicenter.size)
                .attr('y1', epicenterCoord[1] + config.epicenter.size)
                .attr('y2', epicenterCoord[1] - config.epicenter.size)
                .attr('stroke-width', config.epicenter.width)
                .style('stroke', config.epicenter.color);
            // Add earthquake information text overlay
            const textGroup = svg.append('g');
            // Background rectangle for text
            textGroup.append('rect')
                .attr('x', 10)
                .attr('y', 20)
                .attr('width', 380)
                .attr('height', 140)
                .attr('fill', 'rgba(255, 255, 255, 0.95)')
                .attr('stroke', '#333333')
                .attr('stroke-width', 2)
                .attr('rx', 5);
            // Add text information
            const textInfo = [
                `震源: ${earthquakeData.hypocenter}`,
                `マグニチュード: ${earthquakeData.magnitude}`,
                `深さ: ${earthquakeData.depth}`,
                `最大震度: ${earthquakeData.maxScale}`,
                `座標: ${earthquakeData.latitude.toFixed(2)}°N, ${earthquakeData.longitude.toFixed(2)}°E`
            ];
            textInfo.forEach((text, index) => {
                textGroup.append('text')
                    .attr('x', 20)
                    .attr('y', 45 + index * 22)
                    .attr('font-family', config.seismic_intensity.font || 'Arial')
                    .attr('font-size', index < 4 ? '18px' : '16px')
                    .attr('font-weight', 'bold')
                    .attr('fill', '#333333')
                    .text(text);
            });
            // Add copyright (earthquake-alert/map-draw style)
            svg.append('text')
                .text(config.copyright.text.join(' / '))
                .attr('x', 10)
                .attr('y', config.height - config.copyright.size)
                .attr('font-size', config.copyright.size)
                .attr('font-family', config.copyright.font)
                .style('fill', config.copyright.color);
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
// 地震データから画像生成用のデータを抽出
function extractEarthquakeMapData(detail) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
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
    return {
        longitude,
        latitude,
        magnitude: ((_k = (_j = detail.Body) === null || _j === void 0 ? void 0 : _j.Earthquake) === null || _k === void 0 ? void 0 : _k.Magnitude) || '不明',
        depth: ((_p = (_o = (_m = (_l = detail.Body) === null || _l === void 0 ? void 0 : _l.Earthquake) === null || _m === void 0 ? void 0 : _m.Hypocenter) === null || _o === void 0 ? void 0 : _o.Area) === null || _p === void 0 ? void 0 : _p.Depth) || '不明',
        hypocenter: hypocenterName,
        maxScale: ((_s = (_r = (_q = detail.Body) === null || _q === void 0 ? void 0 : _q.Intensity) === null || _r === void 0 ? void 0 : _r.Observation) === null || _s === void 0 ? void 0 : _s.MaxInt) || '不明'
    };
}
