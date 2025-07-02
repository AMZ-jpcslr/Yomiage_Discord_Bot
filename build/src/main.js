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
const http = __importStar(require("http"));
dotenv_1.default.config();
// 環境変数とトークンの確認
console.log('=== Bot起動開始 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TOKEN確認:', process.env.TOKEN ? '✅ 設定済み' : '❌ 未設定');
console.log('FORCE_MAP_GENERATION:', process.env.FORCE_MAP_GENERATION);
console.log('SKIP_MAP_GENERATION:', process.env.SKIP_MAP_GENERATION);
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent, 
    ],
});
// ステータスメッセージのバリエーション（短縮版）
const statusMessages = [
    'キヴォトス情報配信中',
    '緊急地震速報監視中',
    'ブルアカ情報更新',
    '地震情報配信中',
    'キヴォトス最新ニュース',
    'Wolfix EEW監視',
    'P2P地震情報受信',
    'プレフェクト守護中'
];
// 時間帯別メッセージ（短縮版）
const timeBasedMessages = {
    morning: ['おはよう！安全をお守り中', 'モーニング配信中'],
    afternoon: ['午後も情報配信中', '昼間監視継続'],
    evening: ['夕方チェック中', 'イブニング配信'],
    night: ['夜間24時間監視', 'ナイトモード稼働']
};
let currentMessageIndex = 0;
function getTimeBasedMessage() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
        return timeBasedMessages.morning[Math.floor(Math.random() * timeBasedMessages.morning.length)];
    }
    else if (hour >= 12 && hour < 18) {
        return timeBasedMessages.afternoon[Math.floor(Math.random() * timeBasedMessages.afternoon.length)];
    }
    else if (hour >= 18 && hour < 22) {
        return timeBasedMessages.evening[Math.floor(Math.random() * timeBasedMessages.evening.length)];
    }
    else {
        return timeBasedMessages.night[Math.floor(Math.random() * timeBasedMessages.night.length)];
    }
}
function setBotPresence() {
    if (!client.user || !client.isReady()) {
        console.log('⚠️ ボットが準備完了していないため、ステータス更新をスキップ');
        return;
    }
    try {
        const ping = client.ws.ping;
        const isOnline = client.isReady();
        const cpuUsage = process.cpuUsage();
        const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000); // CPU使用率の近似値
        // 30%の確率で時間帯別メッセージを使用、それ以外は通常メッセージをローテーション
        let baseMessage;
        if (Math.random() < 0.3) {
            baseMessage = getTimeBasedMessage();
        }
        else {
            baseMessage = statusMessages[currentMessageIndex];
            currentMessageIndex = (currentMessageIndex + 1) % statusMessages.length;
        }
        const statusText = isOnline
            ? `✅ Ping:${ping}ms CPU:${cpuPercent}% | ${baseMessage}`
            : `❌ オフライン | ${baseMessage}`;
        // アクティビティタイプを0（Playing）に変更して確実に表示されるようにする
        client.user.setPresence({
            activities: [{
                    name: statusText,
                    type: 0 // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 5 = Competing
                }],
            status: isOnline ? 'online' : 'dnd',
        });
        console.log(`🔄 ステータス更新成功: ${statusText}`);
        console.log(`📊 現在時刻: ${new Date().toLocaleTimeString()} | メッセージインデックス: ${currentMessageIndex - 1}`);
    }
    catch (error) {
        console.error('❌ ステータス更新エラー:', error);
    }
}
client.once('ready', () => {
    console.log('✅ Discord Bot Ready!');
    if (client.user) {
        console.log(`✅ ログイン成功: ${client.user.tag}`);
    }
    setBotPresence();
    // サーバー環境と地図生成サポート状況を確認
    const envSupport = (0, earthquake_1.checkServerEnvironmentSupport)();
    const envInfo = (0, earthquake_1.getServerEnvironmentInfo)();
    console.log('=== 環境情報 ===');
    console.log(`サーバー環境: ${envSupport.isServerEnvironment}`);
    console.log(`地図生成可能: ${envSupport.canGenerateMap}`);
    console.log('詳細環境情報:', JSON.stringify(envInfo, null, 2));
    if (envSupport.recommendations.length > 0) {
        console.log('=== 推奨設定 ===');
        envSupport.recommendations.forEach(rec => console.log(`💡 ${rec}`));
    }
    // 初回ステータス設定
    console.log('🔄 初回ステータス設定を実行');
    setBotPresence();
    // 10秒ごとにBotステータスを更新し、ターミナルにも出力
    console.log('⏰ 10秒間隔のステータス更新タイマーを開始');
    const statusUpdateInterval = setInterval(() => {
        console.log('⏰ ステータス更新タイマー実行中...');
        const guildCount = client.guilds.cache.size;
        setBotPresence(); // ステータス更新（ログも出力される）
        // 詳細情報をターミナルに出力
        console.log(`📊 詳細情報: サーバー数: ${guildCount} | メモリ使用量: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 10 * 1000); // 10秒ごと
    // プロセス終了時にタイマーをクリア
    process.on('SIGINT', () => {
        console.log('🛑 ボット終了処理中...');
        clearInterval(statusUpdateInterval);
        process.exit(0);
    });
    (0, eq_notify_1.startEqAutoNotify)(client);
    // Wolfix EEW API監視を開始
    startWolfixEEWMonitoring(client);
});
// ヘルスチェック用のHTTPサーバー（Railwayの監視用）
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            botReady: client.isReady(),
            uptime: process.uptime(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                hasToken: !!process.env.TOKEN,
                skipMapGeneration: process.env.SKIP_MAP_GENERATION,
                forceMapGeneration: process.env.FORCE_MAP_GENERATION
            }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
    }
    else {
        res.writeHead(404);
        res.end('Not Found');
    }
});
server.listen(port, () => {
    console.log(`✅ ヘルスチェックサーバー起動: http://localhost:${port}/health`);
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
client.login(process.env.TOKEN)
    .then(() => {
    console.log('✅ Discord login attempt completed');
})
    .catch((error) => {
    console.error('❌ Discord login failed:', error);
    process.exit(1);
});
// エラーハンドリング
client.on('error', (error) => {
    console.error('Discord Client Error:', error);
});
client.on('warn', (warning) => {
    console.warn('Discord Client Warning:', warning);
});
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
            const result = yield (0, earthquake_1.createEarthquakeEmbedFromP2PData)(json);
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
// Wolfix EEW API監視機能
let lastWolfixEEWId = null;
function startWolfixEEWMonitoring(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('✅ Wolfix EEW API監視を開始');
        // 初回実行（既存の警報を取得してIDを設定、通知はしない）
        try {
            const initialData = yield (0, earthquake_1.processWolfixEEW)();
            if (initialData && initialData.eewData) {
                // 最初の警報IDを記録（通知は送信しない）
                const eventId = initialData.eewData.EventID || new Date().getTime().toString();
                lastWolfixEEWId = eventId;
                console.log(`初期化: 最新のWolfix EEW ID: ${lastWolfixEEWId}`);
            }
        }
        catch (error) {
            console.error('Wolfix EEW初期化エラー:', error);
        }
        // 30秒ごとにポーリング
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('[Wolfix EEW] ポーリング実行中...');
                const result = yield (0, earthquake_1.processWolfixEEW)();
                if (!result) {
                    console.log('[Wolfix EEW] データなし、またはエラー');
                    return;
                }
                const { embed, files, mapGenerated, eewData } = result;
                if (!eewData) {
                    console.warn('[Wolfix EEW] EEWデータが不完全です');
                    return;
                }
                const currentEventId = eewData.EventID || new Date().getTime().toString();
                // 新しい警報かチェック
                if (lastWolfixEEWId === currentEventId) {
                    console.log(`[Wolfix EEW] 同一イベント (ID: ${currentEventId})、スキップ`);
                    return;
                }
                console.log(`[Wolfix EEW] 新しい警報を検出! ID: ${currentEventId}`);
                lastWolfixEEWId = currentEventId;
                // 緊急地震速報用にタイトルと色を設定
                embed.setTitle('【緊急地震速報】(Wolfix)');
                embed.setColor(0xff4500); // オレンジレッド（P2Pと区別）
                console.log(`[Wolfix EEW] 埋め込み作成完了 - 地図生成: ${mapGenerated ? '成功' : '失敗'}, ファイル数: ${(files === null || files === void 0 ? void 0 : files.length) || 0}`);
                // 地図生成失敗時の警告
                if (!mapGenerated) {
                    console.warn('[Wolfix EEW] ⚠️  地図が生成されませんでした');
                }
                // 通知チャンネル取得
                const channelsPath = path_1.default.join(__dirname, '../data/eq_channels.json');
                if (!fs_1.default.existsSync(channelsPath)) {
                    console.log('[Wolfix EEW] 地震通知チャンネル設定ファイルが見つかりません');
                    return;
                }
                const channels = JSON.parse(fs_1.default.readFileSync(channelsPath, 'utf8'));
                console.log(`[Wolfix EEW] 通知対象チャンネル数: ${Object.keys(channels).length}`);
                // 各チャンネルに通知送信
                for (const guildId in channels) {
                    const channelId = channels[guildId];
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) {
                        console.log(`[Wolfix EEW] ギルド ${guildId} が見つかりません`);
                        continue;
                    }
                    const channel = guild.channels.cache.get(channelId);
                    if (channel && channel.isTextBased()) {
                        yield channel.send({
                            embeds: [embed],
                            files: files || []
                        });
                        console.log(`[Wolfix EEW] 緊急地震速報を送信: ${guild.name} - ${channel.name}`);
                    }
                    else {
                        console.log(`[Wolfix EEW] チャンネル ${channelId} が見つからないか、テキストチャンネルではありません`);
                    }
                }
            }
            catch (error) {
                console.error('[Wolfix EEW] 監視エラー:', error);
            }
        }), 30000); // 30秒間隔
    });
}
