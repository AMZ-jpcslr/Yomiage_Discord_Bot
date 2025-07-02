// Test the new WarnArea processing and map generation
const { processWolfixEEW } = require('./build/utils/earthquake');

async function testWarnAreaProcessing() {
    console.log('=== WarnArea処理テスト開始 ===');
    
    try {
        const result = await processWolfixEEW();
        
        if (!result) {
            console.log('❌ 結果なし（データがない可能性）');
            return;
        }
        
        const { embed, files, mapGenerated, eewData } = result;
        
        console.log('✅ 処理成功!');
        console.log('タイトル:', embed.data.title || '未設定');
        console.log('説明文の一部:', embed.data.description?.substring(0, 100) || '未設定');
        console.log('地図生成:', mapGenerated ? '成功' : '失敗または無効');
        console.log('ファイル数:', files?.length || 0);
        
        if (eewData) {
            console.log('=== EEWデータ詳細 ===');
            console.log('イベントID:', eewData.EventID || '不明');
            console.log('震源地:', eewData.Hypocenter || '不明');
            console.log('緯度:', eewData.Latitude || '不明');
            console.log('経度:', eewData.Longitude || '不明');
            console.log('マグニチュード:', eewData.Magunitude || '不明');
            console.log('最大震度:', eewData.MaxIntensity || '不明');
            
            if (eewData.WarnArea && Array.isArray(eewData.WarnArea)) {
                console.log('=== WarnAreaデータ ===');
                console.log('WarnArea配列長:', eewData.WarnArea.length);
                eewData.WarnArea.forEach((area, index) => {
                    console.log(`WarnArea[${index}]:`, JSON.stringify(area, null, 2));
                });
            } else {
                console.log('WarnAreaデータなし');
            }
        }
        
        if (files && files.length > 0) {
            console.log('=== 生成されたファイル ===');
            files.forEach((file, index) => {
                console.log(`ファイル[${index}]: ${file.name}`);
            });
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error);
    }
    
    console.log('=== WarnArea処理テスト完了 ===');
}

testWarnAreaProcessing();
