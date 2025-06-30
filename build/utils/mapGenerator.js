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
const path = __importStar(require("path"));
const canvas_1 = require("canvas");
const sharp_1 = __importDefault(require("sharp"));
// 日本地図のGeoJSONデータ（簡略化）
const japanGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": { "name": "Japan" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                        [129.0, 30.0], [146.0, 30.0], [146.0, 46.0], [129.0, 46.0], [129.0, 30.0]
                    ]]
            }
        }
    ]
};
function generateEarthquakeMap(earthquakeData) {
    return __awaiter(this, void 0, void 0, function* () {
        // D3.jsを動的にインポート
        const d3 = yield Promise.resolve().then(() => __importStar(require('d3')));
        const width = 800;
        const height = 600;
        const center = [139.69, 35.68]; // 東京を中心
        const scale = 4000;
        // Canvasを作成
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const context = canvas.getContext('2d');
        // 背景色（海）
        context.fillStyle = '#4A90E2';
        context.fillRect(0, 0, width, height);
        // 地図投影の設定
        const projection = d3.geoMercator()
            .center(center)
            .translate([width / 2, height / 2])
            .scale(scale);
        const geoPath = d3.geoPath()
            .projection(projection)
            .context(context);
        // 陸地を描画
        context.fillStyle = '#F5F5DC';
        context.strokeStyle = '#8B4513';
        context.lineWidth = 1;
        // 日本列島の基本形状を描画（簡略化）
        const japanOutline = [
            // 本州の大まかな輪郭
            [138.5, 35.0], [139.0, 35.5], [140.0, 36.0], [141.0, 37.0],
            [141.5, 38.0], [141.0, 39.0], [140.5, 40.0], [140.0, 41.0],
            [139.5, 41.5], [138.5, 41.0], [137.5, 40.0], [136.5, 39.0],
            [135.5, 38.0], [134.5, 37.0], [133.5, 36.0], [132.5, 35.0],
            [133.0, 34.5], [134.0, 34.0], [135.0, 34.0], [136.0, 34.5],
            [137.0, 34.8], [138.0, 35.0], [138.5, 35.0]
        ];
        context.beginPath();
        japanOutline.forEach((coord, index) => {
            const [x, y] = projection(coord) || [0, 0];
            if (index === 0) {
                context.moveTo(x, y);
            }
            else {
                context.lineTo(x, y);
            }
        });
        context.closePath();
        context.fill();
        context.stroke();
        // 震源地を描画
        const [epicenterX, epicenterY] = projection([earthquakeData.longitude, earthquakeData.latitude]) || [0, 0];
        // 震源マーク（大きな赤い円）
        context.fillStyle = '#FF0000';
        context.beginPath();
        context.arc(epicenterX, epicenterY, 15, 0, 2 * Math.PI);
        context.fill();
        // 震源マークの輪郭
        context.strokeStyle = '#8B0000';
        context.lineWidth = 3;
        context.stroke();
        // 震源地の十字マーク
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(epicenterX - 10, epicenterY);
        context.lineTo(epicenterX + 10, epicenterY);
        context.moveTo(epicenterX, epicenterY - 10);
        context.lineTo(epicenterX, epicenterY + 10);
        context.stroke();
        // 地震の規模に応じた同心円を描画
        const magnitude = parseFloat(earthquakeData.magnitude.toString());
        if (!isNaN(magnitude)) {
            context.strokeStyle = '#FF6666';
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            for (let i = 1; i <= 3; i++) {
                const radius = 30 + (i * 20 * magnitude / 5);
                context.beginPath();
                context.arc(epicenterX, epicenterY, radius, 0, 2 * Math.PI);
                context.stroke();
            }
            context.setLineDash([]);
        }
        // 情報テキストを描画
        context.fillStyle = '#000000';
        context.font = 'bold 16px Arial';
        context.textAlign = 'left';
        // 背景付きテキストボックス
        const textX = 20;
        const textY = 30;
        const lineHeight = 25;
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(textX - 10, textY - 5, 300, lineHeight * 5 + 10);
        context.fillStyle = '#000000';
        context.fillText(`震源: ${earthquakeData.hypocenter}`, textX, textY + lineHeight);
        context.fillText(`マグニチュード: ${earthquakeData.magnitude}`, textX, textY + lineHeight * 2);
        context.fillText(`深さ: ${earthquakeData.depth}`, textX, textY + lineHeight * 3);
        context.fillText(`最大震度: ${earthquakeData.maxScale}`, textX, textY + lineHeight * 4);
        // 緯度・経度の表示
        context.font = '12px Arial';
        context.fillText(`震源地: ${earthquakeData.latitude.toFixed(2)}°N, ${earthquakeData.longitude.toFixed(2)}°E`, textX, textY + lineHeight * 5);
        // CanvasをPNGバッファに変換
        const buffer = canvas.toBuffer('image/png');
        // 生成された画像を保存
        const timestamp = Date.now();
        const filename = `earthquake_map_${timestamp}.png`;
        const filepath = path.join(__dirname, '../../generated_images', filename);
        yield (0, sharp_1.default)(buffer)
            .png()
            .toFile(filepath);
        console.log('地震マップ画像を生成しました:', filepath);
        return filepath;
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
