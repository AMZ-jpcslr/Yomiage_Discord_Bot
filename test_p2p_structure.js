// P2P地震情報のWebSocketテスト
const WebSocket = require('ws');

const ws = new WebSocket('wss://api.p2pquake.net/v2/ws');

ws.on('open', () => {
    console.log('P2P地震情報WebSocketに接続しました');
});

ws.on('message', (data) => {
    try {
        const json = JSON.parse(data.toString());
        console.log('=== 受信データ ===');
        console.log('コード:', json.code);
        console.log('完全なデータ構造:', JSON.stringify(json, null, 2));
        
        if (json.code === 551) {
            console.log('=== 緊急地震速報データ詳細 ===');
            console.log('震源データ:', json.earthquake);
            console.log('地域データ:', json.areas);
            console.log('時刻データ:', json.created_at || json.time || json.occurred_time);
        }
    } catch (e) {
        console.error('データ解析エラー:', e);
    }
});

ws.on('error', (error) => {
    console.error('WebSocketエラー:', error);
});

console.log('P2P地震情報の受信を開始します...');
console.log('緊急地震速報（code: 551）のデータ構造を確認中...');
