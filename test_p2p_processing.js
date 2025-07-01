// P2P地震情報と緊急地震速報の統一処理テスト
const { processP2PEarthquakeAlert } = require('./build/utils/earthquake');

// 緊急地震速報のサンプルデータ（code: 551）
const p2pEarthquakeData = {
    code: 551,
    time: "2025-07-01T13:08:09.851+09:00",
    earthquake: {
        hypocenter: {
            name: "トカラ列島近海",
            latitude: 29.3,
            longitude: 129.4,
            depth: 20
        },
        magnitude: 2.6,
        maxScale: 1
    },
    areas: [
        {
            name: "鹿児島県十島村",
            scaleFrom: 1,
            scaleTo: 1
        }
    ]
};

async function testP2PProcessing() {
    console.log('=== P2P地震情報処理テスト開始 ===');
    console.log('テストデータ:', JSON.stringify(p2pEarthquakeData, null, 2));
    
    try {
        const result = await processP2PEarthquakeAlert(p2pEarthquakeData);
        
        if (result) {
            console.log('✅ 処理成功');
            console.log('埋め込みタイトル:', result.embed.data.title);
            console.log('地図生成状況:', result.mapGenerated ? '成功' : '失敗');
            console.log('ファイル数:', result.files?.length || 0);
            
            if (result.files && result.files.length > 0) {
                console.log('地図ファイル:', result.files[0].name);
            }
        } else {
            console.log('❌ 処理失敗');
        }
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}

testP2PProcessing();
