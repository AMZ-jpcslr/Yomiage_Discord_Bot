"use strict";
// 外部地図サービスを使用した地震マップ生成
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEarthquakeMapExternal = generateEarthquakeMapExternal;
exports.getEarthquakeMapUrl = getEarthquakeMapUrl;
exports.getEarthquakeInfoLinks = getEarthquakeInfoLinks;
/**
 * 外部地図サービスを使用して地震マップを生成
 * Canvas不要で軽量
 */
function generateEarthquakeMapExternal(earthquakeData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🗺️ 外部地図サービスを使用して地震マップを生成中...');
            const { longitude, latitude, magnitude, hypocenter } = earthquakeData;
            // OpenStreetMap Nominatim APIを使用（無料）
            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 1},${latitude - 1},${longitude + 1},${latitude + 1}&layer=mapnik&marker=${latitude},${longitude}`;
            console.log(`📍 震源地: ${hypocenter} (${latitude}, ${longitude})`);
            console.log(`📏 マグニチュード: ${magnitude}`);
            console.log(`🔗 地図URL: ${mapUrl}`);
            return mapUrl;
        }
        catch (error) {
            console.error('❌ 外部地図サービスでのマップ生成に失敗:', error);
            return null;
        }
    });
}
/**
 * 地震情報のマップURLを取得（軽量版）
 */
function getEarthquakeMapUrl(earthquakeData) {
    const { longitude, latitude, hypocenter } = earthquakeData;
    // マグニチュードを数値に変換
    const mag = typeof earthquakeData.magnitude === 'string' ? parseFloat(earthquakeData.magnitude) : earthquakeData.magnitude;
    const zoom = mag > 6 ? 8 : mag > 4 ? 10 : 12;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}#map=${zoom}/${latitude}/${longitude}`;
    console.log(`🗺️ 地震マップURL生成: ${hypocenter} M${mag}`);
    return mapUrl;
}
/**
 * 地震情報の詳細リンクを生成
 */
function getEarthquakeInfoLinks(earthquakeData) {
    const { longitude, latitude } = earthquakeData;
    return {
        map: getEarthquakeMapUrl(earthquakeData),
        googleMaps: `https://www.google.com/maps?q=${latitude},${longitude}`,
        jmaDetail: `https://www.jma.go.jp/bosai/quake/`,
        p2pquake: `https://www.p2pquake.net/`
    };
}
