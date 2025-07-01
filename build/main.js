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
const ws_1 = __importDefault(require("ws"));
const eq_notify_1 = require("./eq_notify");
const earthquake_1 = require("./utils/earthquake");
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
ws.on('open', () => {
    console.log('✅ P2P地震情報WebSocketに接続しました');
});
ws.on('error', (error) => {
    console.error('❌ P2P地震情報WebSocketエラー:', error);
});
ws.on('close', (code, reason) => {
    console.log(`⚠️  P2P地震情報WebSocketが切断されました: コード=${code}, 理由=${reason}`);
    // 自動再接続を検討する場合はここに実装
});
ws.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const json = JSON.parse(data.toString());
        console.log('=== P2P WebSocket受信データ ===');
        console.log('コード:', json.code);
        console.log('完全なデータ:', JSON.stringify(json, null, 2));
        if (json.code === 551) { // 緊急地震速報
            console.log('=== 緊急地震速報を受信 ===');
            console.log('受信時刻:', new Date().toISOString());
            // P2P地震情報データを統一された処理関数で処理
            console.log('地震情報埋め込みの作成を開始...');
            const result = yield (0, earthquake_1.processP2PEarthquakeAlert)(json);
            if (!result) {
                console.error('❌ P2P地震情報から埋め込み作成に失敗');
                return;
            }
            const { embed, files, mapGenerated } = result;
            console.log(`📊 埋め込み作成完了 - 地図生成: ${mapGenerated ? '成功' : '失敗'}, ファイル数: ${(files === null || files === void 0 ? void 0 : files.length) || 0}`);
            // 緊急地震速報用にタイトルを変更
            embed.setTitle('【緊急地震速報】');
            embed.setColor(0xff0000); // 赤色に変更
            // 地図生成の結果に応じてメッセージを調整
            if (!mapGenerated) {
                console.warn('⚠️  地図が生成されませんでした。震源地の地図なしで通知を送信します。');
                // 必要に応じて、地図なしの旨を説明に追加することも可能
                // embed.setDescription(embed.data.description + '\n*震源地の地図は生成できませんでした*')
            }
            // 通知チャンネル取得
            const channelsPath = path_1.default.join(__dirname, '../data/eq_channels.json');
            if (!fs_1.default.existsSync(channelsPath)) {
                console.log('地震通知チャンネル設定ファイルが見つかりません');
                return;
            }
            const channels = JSON.parse(fs_1.default.readFileSync(channelsPath, 'utf8'));
            console.log('通知対象チャンネル数:', Object.keys(channels).length);
            for (const guildId in channels) {
                const channelId = channels[guildId];
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    console.log(`ギルド ${guildId} が見つかりません`);
                    continue;
                }
                const channel = guild.channels.cache.get(channelId);
                if (channel && channel.isTextBased()) {
                    yield channel.send({
                        embeds: [embed],
                        files: files || []
                    });
                    console.log(`緊急地震速報を送信: ${guild.name} - ${channel.name}`);
                }
                else {
                    console.log(`チャンネル ${channelId} が見つからないか、テキストチャンネルではありません`);
                }
            }
        }
    }
    catch (e) {
        console.error('地震速報通知エラー:', e);
    }
}));
