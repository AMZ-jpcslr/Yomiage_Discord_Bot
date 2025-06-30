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
const discord_js_1 = require("discord.js");
const pingCommand = __importStar(require("./commands/ping"));
const lotteryCommand = __importStar(require("./commands/lottery")); // ←追加
const shiftCommand = __importStar(require("./commands/shift"));
const setEqChannelCommand = __importStar(require("./commands/set_eq_channel"));
const getEqCommand = __importStar(require("./commands/get_eq"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const discord_js_2 = require("discord.js");
const ws_1 = __importDefault(require("ws"));
const eq_notify_1 = require("./eq_notify");
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent, 
    ],
});
function setBotPresence() {
    if (client.user) {
        client.user.setPresence({
            activities: [{ name: 'キヴォトスの最新情報', type: 1 }],
            status: 'online',
        });
    }
}
client.once('ready', () => {
    console.log('Ready!');
    if (client.user) {
        console.log(client.user.tag);
    }
    setBotPresence();
    // 5分ごとにPing値とサーバー数をターミナルに出力
    setInterval(() => {
        const ping = client.ws.ping;
        const guildCount = client.guilds.cache.size;
        console.log(`Bot起動中！Ping: ${ping}ms / サーバー数: ${guildCount}`);
    }, 5 * 60 * 1000); // 5分ごと（ミリ秒に修正）
    (0, eq_notify_1.startEqAutoNotify)(client);
});
// 再接続時にもステータスを再設定
client.on('shardResume', () => {
    setBotPresence();
});
//コマンドの登録
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isChatInputCommand())
        return;
    if (interaction.commandName === 'ping') {
        yield pingCommand.execute(interaction);
    }
    if (interaction.commandName === 'lottery') {
        yield lotteryCommand.execute(interaction);
    }
    if (interaction.commandName === 'shift') {
        yield shiftCommand.execute(interaction);
    }
    if (interaction.commandName === 'set_eq_channel') {
        yield setEqChannelCommand.execute(interaction);
    }
    if (interaction.commandName === 'get_eq') {
        yield getEqCommand.execute(interaction);
    }
}));
client.login(process.env.TOKEN);
// 緊急地震速報の受信（例: P2P地震情報 WebSocket）
const ws = new ws_1.default('wss://api.p2pquake.net/v2/ws');
ws.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const json = JSON.parse(data.toString());
        if (json.code === 551) { // 緊急地震速報
            const { hypocenter, magnitude, maxScale, time } = json;
            const lat = hypocenter === null || hypocenter === void 0 ? void 0 : hypocenter.latitude;
            const lon = hypocenter === null || hypocenter === void 0 ? void 0 : hypocenter.longitude;
            const place = (_a = hypocenter === null || hypocenter === void 0 ? void 0 : hypocenter.name) !== null && _a !== void 0 ? _a : '不明';
            // 震度画像URL（例: 気象庁風アイコン。自作やフリー素材を使う場合はURLを差し替えてください）
            // ここでは例として「震度5強」のアイコン画像URLを使用
            // 震度ごとに画像を切り替えたい場合はmaxScaleの値で分岐してください
            let shindoImageUrl = undefined;
            switch (maxScale) {
                case 10:
                    shindoImageUrl = 'https://gyazo.com/4e7e465a1fadcdacb6b2d7ad77e26613';
                    break;
                case 20:
                    shindoImageUrl = 'https://gyazo.com/32a63f749d9a95b1bd4c610ac54c3639';
                    break;
                case 30:
                    shindoImageUrl = 'https://gyazo.com/af3a39eebdc321ae76eab731e60eb110';
                    break;
                case 40:
                    shindoImageUrl = 'https://gyazo.com/39351fbdd780e0db5a1b4b24b0dfd025';
                    break;
                case 45:
                    shindoImageUrl = 'https://gyazo.com/7bf28e3aff47cf4c4b8b20bcf9a33b29';
                    break;
                case 50:
                    shindoImageUrl = 'https://gyazo.com/3cd7bab33cf0682e57ece10df2189988';
                    break;
                case 55:
                    shindoImageUrl = 'https://gyazo.com/77c3a1e02e8fcb0239afa5e4388146be';
                    break;
                case 60:
                    shindoImageUrl = 'https://gyazo.com/8ca22b91e82cc578dffed126f3987fbb';
                    break;
                case 70:
                    shindoImageUrl = 'https://gyazo.com/74b556e4e716116e546e0638ab9e5db4';
                    break;
                default: shindoImageUrl = undefined;
            }
            // 地図画像
            let mapUrl = undefined;
            if (lat && lon) {
                mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=6&size=450,300&l=map&pt=${lon},${lat},pm2rdm`;
            }
            // Embed作成
            const embed = new discord_js_2.EmbedBuilder()
                .setTitle('【緊急地震速報】')
                .setColor(0xff0000)
                .setDescription(`**震源地**: ${place}\n` +
                `**発生時刻**: ${time}\n` +
                `**マグニチュード**: ${magnitude}\n` +
                `**最大震度**: ${maxScale !== undefined ? maxScaleToString(maxScale) : '不明'}`);
            // 震度画像をサムネイルに
            if (shindoImageUrl) {
                embed.setThumbnail(shindoImageUrl);
            }
            // 地図画像を埋め込み画像に
            if (mapUrl) {
                embed.setImage(mapUrl);
            }
            // 通知チャンネル取得
            const channelsPath = path_1.default.join(__dirname, '../data/eq_channels.json');
            if (!fs_1.default.existsSync(channelsPath))
                return;
            const channels = JSON.parse(fs_1.default.readFileSync(channelsPath, 'utf8'));
            for (const guildId in channels) {
                const channelId = channels[guildId];
                const guild = client.guilds.cache.get(guildId);
                if (!guild)
                    continue;
                const channel = guild.channels.cache.get(channelId);
                if (channel && channel.isTextBased()) {
                    channel.send({ embeds: [embed] });
                }
            }
        }
    }
    catch (e) {
        console.error('地震速報通知エラー:', e);
    }
}));
// 震度コードを日本語表記に変換する関数
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
