/**
 * Wolfix API専用震源地詳細テスト
 */

const { processWolfixEEW } = require('./build/src/utils/earthquake.js');

async function testWolfixMapGeneration() {
    console.log('=== Wolfix API震源地詳細テスト ===');
    
    try {
        // 環境変数を設定して地図生成を強制的に有効化
        const originalSkip = process.env.SKIP_MAP_GENERATION;
        const originalForce = process.env.FORCE_MAP_GENERATION;
        process.env.SKIP_MAP_GENERATION = 'false';
        process.env.FORCE_MAP_GENERATION = 'true';
        
        console.log('Wolfix API処理開始...');
        
        try {
            const result = await processWolfixEEW();
            
            if (result) {
                const { eewData, mapGenerated } = result;
                console.log('\n=== Wolfix処理結果 ===');
                console.log(`震源地: ${eewData?.Hypocenter}`);
                console.log(`座標: ${eewData?.Latitude}°N, ${eewData?.Longitude}°E`);
                console.log(`マグニチュード: ${eewData?.Magunitude}`);
                console.log(`最大震度: ${eewData?.MaxIntensity}`);
                console.log(`地図生成: ${mapGenerated ? '成功' : '失敗'}`);
                
                if (mapGenerated) {
                    console.log('\n✅ 地図が正常に生成されました！');
                    console.log('ログから震源地の位置情報を確認してください。');
                } else {
                    console.log('\n⚠️ 地図生成に失敗しました。');
                }
            } else {
                console.log('⚠️ Wolfix APIからデータが取得できませんでした。');
            }
            
        } catch (wolfixError) {
            console.error('Wolfix処理エラー:', wolfixError.message);
            // Canvas関連のエラーは予想内
            if (wolfixError.message.includes('Canvas') || wolfixError.message.includes('cairo')) {
                console.log('これはCanvas依存関係によるエラーです。開発環境では正常です。');
            }
        } finally {
            // 環境変数復元
            if (originalSkip !== undefined) {
                process.env.SKIP_MAP_GENERATION = originalSkip;
            } else {
                delete process.env.SKIP_MAP_GENERATION;
            }
            if (originalForce !== undefined) {
                process.env.FORCE_MAP_GENERATION = originalForce;
            } else {
                delete process.env.FORCE_MAP_GENERATION;
            }
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    }
}

testWolfixMapGeneration();
