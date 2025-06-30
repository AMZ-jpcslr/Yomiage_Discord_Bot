"use strict";
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
exports.createEarthquakeEmbed = createEarthquakeEmbed;
const discord_js_1 = require("discord.js");
// 震度値を文字列に変換する関数
function maxScaleToString(maxScale) {
    switch (maxScale) {
        case 10: return '1';
        case 20: return '2';
        case 30: return '3';
        case 40: return '4';
        case 45: return '5弱';
        case 50: return '5強';
        case 55: return '6弱';
        case 60: return '6強';
        case 70: return '7';
        default: return String(maxScale);
    }
}
// 震度画像URLを取得する関数
function getShindoImageUrl(maxScale) {
    switch (String(maxScale)) {
        case '1': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png';
        case '2': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png';
        case '3': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png';
        case '4': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png';
        case '5-': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png';
        case '5+': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png';
        case '6-': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png';
        case '6+': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png';
        case '7': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png';
        // 数値形式の場合も対応（旧形式）
        case '10': return 'https://i.gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613.png';
        case '20': return 'https://i.gyazo.com/32a63f749d9a95b1bd4c610ac54c3639.png';
        case '30': return 'https://i.gyazo.com/af3a39eebdc321ae76eab731e60eb110.png';
        case '40': return 'https://i.gyazo.com/39351fbdd780e0db5a1b4b0dfd025.png';
        case '45': return 'https://i.gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29.png';
        case '50': return 'https://i.gyazo.com/3cd7bab33cf0682e57ece10df2189988.png';
        case '55': return 'https://i.gyazo.com/77c3a1e02e8fcb0239afa5e4388146be.png';
        case '60': return 'https://i.gyazo.com/8ca22b91e82cc578dffed126f3987fbb.png';
        case '70': return 'https://i.gyazo.com/74b556e4e716116e546e0638ab9e5db4.png';
        default: return undefined;
    }
}
// 地震情報の埋め込みを作成する共通関数
function createEarthquakeEmbed(latestId_1) {
    return __awaiter(this, arguments, void 0, function* (latestId, isAutoNotify = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        const detailRes = yield fetch(`https://www.jma.go.jp/bosai/quake/data/${latestId}`);
        const detail = yield detailRes.json();
        const time = (_b = (_a = detail.Head) === null || _a === void 0 ? void 0 : _a.ReportDateTime) !== null && _b !== void 0 ? _b : '不明';
        const hypocenter = (_g = (_f = (_e = (_d = (_c = detail.Body) === null || _c === void 0 ? void 0 : _c.Earthquake) === null || _d === void 0 ? void 0 : _d.Hypocenter) === null || _e === void 0 ? void 0 : _e.Area) === null || _f === void 0 ? void 0 : _f.Name) !== null && _g !== void 0 ? _g : '不明';
        const magnitude = (_k = (_j = (_h = detail.Body) === null || _h === void 0 ? void 0 : _h.Earthquake) === null || _j === void 0 ? void 0 : _j.Magnitude) !== null && _k !== void 0 ? _k : '不明';
        const maxScale = (_p = (_o = (_m = (_l = detail.Body) === null || _l === void 0 ? void 0 : _l.Intensity) === null || _m === void 0 ? void 0 : _m.Observation) === null || _o === void 0 ? void 0 : _o.MaxInt) !== null && _p !== void 0 ? _p : '不明';
        const depth = (_u = (_t = (_s = (_r = (_q = detail.Body) === null || _q === void 0 ? void 0 : _q.Earthquake) === null || _r === void 0 ? void 0 : _r.Hypocenter) === null || _s === void 0 ? void 0 : _s.Area) === null || _t === void 0 ? void 0 : _t.Depth) !== null && _u !== void 0 ? _u : '不明';
        const text = (_w = (_v = detail.Head) === null || _v === void 0 ? void 0 : _v.Text) !== null && _w !== void 0 ? _w : '';
        const maxScaleStr = maxScale !== '不明' ? maxScaleToString(Number(maxScale)) : '不明';
        // 震度画像URL取得
        const shindoImageUrl = getShindoImageUrl(maxScale);
        // 画像URL生成（複数パターンを試行）
        const baseImageName = latestId.replace('.json', '');
        const eventId = (_x = detail === null || detail === void 0 ? void 0 : detail.Head) === null || _x === void 0 ? void 0 : _x.EventID;
        let possibleImageUrls = [
            // 基本パターン
            `https://www.jma.go.jp/bosai/quake/data/${baseImageName}.png`,
            // EventIDベース
            eventId ? `https://www.jma.go.jp/bosai/quake/data/${eventId}.png` : null,
            eventId ? `https://www.jma.go.jp/bosai/quake/data/map/${eventId}.png` : null,
            eventId ? `https://www.jma.go.jp/bosai/quake/data/detail/${eventId}.png` : null,
            // 代替の固定画像
            `https://www.jma.go.jp/bosai/forecast/img/warn_quake.png`,
            `https://www.jma.go.jp/bosai/quake/data/quake_map.png`
        ].filter(Boolean);
        // 震度画像をプレースホルダーとして追加
        if (shindoImageUrl) {
            possibleImageUrls.push(shindoImageUrl);
        }
        // 埋め込み作成
        const title = isAutoNotify ? '🚨 【自動通知】地震情報' : '🚨 地震情報';
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setColor(0xff4444)
            .setDescription(`**${time.replace(/T/, ' ').replace(/\+09:00/, '')}ごろ、**\n` +
            `**最大震度${maxScaleStr}の地震がありました。**\n` +
            `${text ? text + '\n' : ''}`)
            .addFields({ name: '震源', value: hypocenter, inline: true }, { name: '規模', value: `M${magnitude}`, inline: true }, { name: '深さ', value: `${depth}`, inline: true });
        // 震度画像を右上サムネイルに設定
        if (shindoImageUrl) {
            embed.setThumbnail(shindoImageUrl);
        }
        // 気象庁の画像を試行して設定
        let validImageUrl = null;
        for (const url of possibleImageUrls) {
            if (!url)
                continue;
            try {
                const imageCheckResponse = yield fetch(url, { method: 'HEAD' });
                if (imageCheckResponse.ok) {
                    validImageUrl = url;
                    break;
                }
            }
            catch (error) {
                // エラーは無視して次のURLを試行
            }
        }
        if (validImageUrl) {
            embed.setImage(validImageUrl);
        }
        else {
            // 代替として震度分布図のリンクを表示
            embed.addFields({
                name: '震度分布図',
                value: `[気象庁の地震情報を確認](https://www.jma.go.jp/bosai/earthquake/)`,
                inline: false
            });
        }
        // フッター設定
        embed.setFooter({
            text: 'Earthquake Information by JMA',
            iconURL: 'https://www.jma.go.jp/jma/kishou/favicon.ico'
        });
        embed.setTimestamp(new Date());
        return embed;
    });
}
