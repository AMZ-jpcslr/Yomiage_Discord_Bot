"use strict";
/**
 * Discord地震速報ボット メインファイル（新実装）
 * Wolfix API専用で震源地マークを正確に表示
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
const lotteryCommand = __importStar(require("./commands/lottery"));
const shiftCommand = __importStar(require("./commands/shift"));
const setEqChannelCommand = __importStar(require("./commands/set_eq_channel"));
const getEqCommand = __importStar(require("./commands/get_eq")); // 新しい実装
const dotenv_1 = __importDefault(require("dotenv"));
const eq_notify_new_1 = require("./eq_notify_new"); // 新しい通知システム
const http = __importStar(require("http"));
// 新しい実装をエクスポート（テスト用）
__exportStar(require("./utils/earthquake"), exports);
dotenv_1.default.config();
// 環境変数とトークンの確認
console.log('=== Discord地震速報ボット起動開始 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TOKEN確認:', process.env.TOKEN ? '✅ 設定済み' : '❌ 未設定');
console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION);
console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION);
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
    ],
});
// ステータスメッセージのバリエーション
const statusMessages = [
    'Wolfix API地震監視',
    '緊急地震速報待機中',
    '震源地マーク正確表示',
    '地震情報配信中',
    'EEW監視システム稼働',
    '地震速報24時間監視',
    'Wolfix APIと連携',
    'リアルタイム地震情報'
];
// 時間帯別メッセージ
const timeBasedMessages = {
    morning: ['おはよう！地震監視中', 'モーニング地震情報'],
    afternoon: ['午後も監視継続', '昼間安全確保'],
    evening: ['夕方チェック中', 'イブニング監視'],
    night: ['夜間24時間監視', 'ナイトモード稼働']
};
// 現在時刻に応じたメッセージを取得
function getTimeBasedMessage() {
    const hour = new Date().getHours();
    let timeCategory;
    if (hour >= 6 && hour < 12)
        timeCategory = 'morning';
    else if (hour >= 12 && hour < 18)
        timeCategory = 'afternoon';
    else if (hour >= 18 && hour < 22)
        timeCategory = 'evening';
    else
        timeCategory = 'night';
    const messages = timeBasedMessages[timeCategory];
    return messages[Math.floor(Math.random() * messages.length)];
}
// Botのプレゼンス（ステータス）を設定
function setBotPresence() {
    if (!client.user)
        return;
    const guildCount = client.guilds.cache.size;
    const shouldUseTimeBasedMessage = Math.random() < 0.3; // 30%の確率で時間帯メッセージ
    let message;
    if (shouldUseTimeBasedMessage) {
        message = getTimeBasedMessage();
    }
    else {
        message = statusMessages[Math.floor(Math.random() * statusMessages.length)];
    }
    client.user.setPresence({
        activities: [{
                name: `${message} | ${guildCount}サーバー`,
                type: discord_js_1.ActivityType.Watching
            }],
        status: 'online'
    });
    console.log(`🎮 ステータス更新: "${message} | ${guildCount}サーバー"`);
}
// インタラクション処理
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isChatInputCommand())
        return;
    console.log(`💬 コマンド実行: /${interaction.commandName} by ${interaction.user.tag}`);
    try {
        switch (interaction.commandName) {
            case 'ping':
                yield pingCommand.execute(interaction);
                break;
            case 'lottery':
                yield lotteryCommand.execute(interaction);
                break;
            case 'shift':
                yield shiftCommand.execute(interaction);
                break;
            case 'set_eq_channel':
                yield setEqChannelCommand.execute(interaction);
                break;
            case 'get_eq':
                yield getEqCommand.execute(interaction);
                break;
            default:
                yield interaction.reply({ content: 'コマンドが見つかりません。', ephemeral: true });
        }
    }
    catch (error) {
        console.error(`❌ コマンドエラー (/${interaction.commandName}):`, error);
        const errorMessage = 'コマンドの実行中にエラーが発生しました。';
        if (interaction.replied || interaction.deferred) {
            yield interaction.followUp({ content: errorMessage, ephemeral: true });
        }
        else {
            yield interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}));
// Bot準備完了
client.once('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    if (client.user) {
        console.log(`✅ ログイン成功: ${client.user.tag}`);
        console.log(`📊 参加サーバー数: ${client.guilds.cache.size}`);
    }
    // 環境情報表示
    console.log('=== 環境情報 ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION);
    console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION);
    console.log('プラットフォーム:', process.platform);
    console.log('Node.js バージョン:', process.version);
    // 初回ステータス設定
    setBotPresence();
    // 10秒ごとにBotステータスを更新
    const statusUpdateInterval = setInterval(() => {
        setBotPresence();
        const guildCount = client.guilds.cache.size;
        const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`📊 詳細情報: サーバー数: ${guildCount} | メモリ使用量: ${memoryUsage}MB`);
    }, 10 * 1000);
    // プロセス終了時にタイマーをクリア
    process.on('SIGINT', () => {
        console.log('🛑 ボット終了処理中...');
        clearInterval(statusUpdateInterval);
        process.exit(0);
    });
    // 新しい緊急地震速報監視システムを開始
    console.log('🚨 緊急地震速報監視システム開始...');
    (0, eq_notify_new_1.monitorEarthquakeAlerts)(client);
}));
// エラーハンドリング
client.on('error', error => {
    console.error('❌ Clientエラー:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未処理のPromise拒否:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('❌ 未処理の例外:', error);
    process.exit(1);
});
// ヘルスチェック用のHTTPサーバー
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            botStatus: client.user ? 'online' : 'offline',
            guilds: client.guilds.cache.size,
            uptime: process.uptime(),
            system: 'Wolfix API地震監視システム'
        }));
    }
    else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Discord 地震速報ボット (Wolfix API) は正常に動作中です！');
    }
    else {
        res.writeHead(404);
        res.end('Not Found');
    }
});
server.listen(port, () => {
    console.log(`🌐 ヘルスチェックサーバーがポート ${port} で起動しました`);
    console.log(`📡 ヘルスチェックURL: http://localhost:${port}/health`);
});
// Botにログイン
const token = process.env.TOKEN;
if (!token) {
    console.error('❌ TOKENが設定されていません');
    process.exit(1);
}
console.log('🚀 Discord Botを起動中...');
client.login(token).catch(error => {
    console.error('❌ ボットのログインに失敗:', error);
    process.exit(1);
});
