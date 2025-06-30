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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEqAutoNotify = startEqAutoNotify;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const earthquake_1 = require("./utils/earthquake");
const DATA_PATH = path_1.default.join(__dirname, '../../data/eq_channels.json');
// 通知チャンネル設定をロード
function loadChannels() {
    if (!fs_1.default.existsSync(DATA_PATH))
        return {};
    return JSON.parse(fs_1.default.readFileSync(DATA_PATH, 'utf8'));
}
// 直近の地震IDを保存して重複通知を防ぐ
const latestIdPath = path_1.default.join(__dirname, '../../data/latest_eq_id.txt');
function loadLatestId() {
    if (!fs_1.default.existsSync(latestIdPath))
        return null;
    return fs_1.default.readFileSync(latestIdPath, 'utf8').trim();
}
function saveLatestId(id) {
    fs_1.default.mkdirSync(path_1.default.dirname(latestIdPath), { recursive: true });
    fs_1.default.writeFileSync(latestIdPath, id, 'utf8');
}
// 定期的に気象庁APIを監視して新しい地震があれば通知
function startEqAutoNotify(client) {
    console.log('地震自動通知システムを開始しました（60秒間隔）');
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const res = yield fetch('https://www.jma.go.jp/bosai/quake/data/list.json');
            const list = yield res.json();
            if (!list.length)
                return;
            const latestId = (_a = list[0]) === null || _a === void 0 ? void 0 : _a.json;
            if (!latestId ||
                typeof latestId !== 'string' ||
                !latestId.endsWith('.json') ||
                latestId.startsWith('/') || // 先頭が/の場合も不正
                latestId.includes('..') // パストラバーサル防止
            ) {
                console.warn('不正なlatestId:', latestId);
                return;
            }
            const previousLatestId = loadLatestId();
            if (latestId === previousLatestId) {
                // すでに通知済み（ログは出力しない）
                return;
            }
            console.log('新しい地震情報を検出:', latestId);
            console.log('前回の地震ID:', previousLatestId);
            // 共通関数を使用して地震情報の埋め込みを作成
            const result = yield (0, earthquake_1.createEarthquakeEmbed)(latestId, true);
            // 通知チャンネルへ送信
            const channels = loadChannels();
            let notificationCount = 0;
            for (const guildId in channels) {
                const channelId = channels[guildId];
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    console.warn(`Guild not found: ${guildId}`);
                    continue;
                }
                const channel = guild.channels.cache.get(channelId);
                if (channel && channel.isTextBased()) {
                    try {
                        yield channel.send({
                            embeds: [result.embed],
                            files: result.files
                        });
                        notificationCount++;
                        console.log(`地震通知送信完了: ${guild.name} (#${channel.name})`);
                    }
                    catch (error) {
                        console.error(`地震通知送信エラー (${guild.name}):`, error);
                    }
                }
                else {
                    console.warn(`Channel not found or not text-based: Guild=${guild.name}, Channel=${channelId}`);
                }
            }
            console.log(`地震自動通知完了: ${notificationCount}チャンネルに送信`);
            saveLatestId(latestId);
        }
        catch (e) {
            console.error('地震自動通知エラー:', e);
        }
    }), 60 * 1000); // 1分ごとにチェック
}
