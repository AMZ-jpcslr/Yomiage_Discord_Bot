/**
 * 詳細地図デバッグテスト
 */

const { processWolfixEEW } = require('./build/src/utils/earthquake.js');

async function detailedMapTest() {
    console.log('=== 詳細地図デバッグテスト開始 ===');
    
    try {
        // 環境変数設定
        process.env.SKIP_MAP_GENERATION = 'false';
        process.env.FORCE_MAP_GENERATION = 'true';
        
        console.log('Wolfix EEW処理実行中...');
        
        const result = await processWolfixEEW();
        
        if (result) {
            console.log('\n=== 処理結果概要 ===');
            console.log(`震源地: ${result.eewData?.Hypocenter}`);
            console.log(`座標: ${result.eewData?.Latitude}°N, ${result.eewData?.Longitude}°E`);
            console.log(`地図生成: ${result.mapGenerated ? '成功' : '失敗'}`);
            
            if (result.mapGenerated) {
                console.log('\n✅ 詳細ログから投影情報を確認してください');
                console.log('特に以下の項目に注目:');
                console.log('- 投影中心と震源地座標の一致');
                console.log('- 画面中央からのオフセット');
                console.log('- 投影範囲内への包含');
            }
        } else {
            console.log('Wolfix EEWデータが取得できませんでした');
        }
        
    } catch (error) {
        console.error('エラー:', error.message);
    }
}

detailedMapTest();
