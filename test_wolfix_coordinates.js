/**
 * Test script to verify that Wolfix API coordinates are being used correctly
 * and no estimation/fallback coordinates are being used
 */

const { fetchWolfixEEW, convertWolfixToJMAFormat } = require('./build/src/utils/earthquake.js');
const { extractEarthquakeMapData } = require('./build/src/utils/mapGenerator_new.js');

async function testWolfixCoordinates() {
    console.log('=== Wolfix座標テスト開始 ===');
    
    try {
        // Wolfix APIからデータを取得
        console.log('1. Wolfix APIからデータを取得中...');
        const wolfixData = await fetchWolfixEEW();
        
        if (!wolfixData) {
            console.log('⚠️ Wolfix APIからデータが取得できませんでした（通常の状態）');
            
            // テスト用のサンプルデータを作成
            console.log('2. テスト用サンプルデータを使用');
            const sampleWolfixData = {
                Title: "緊急地震速報（テスト）",
                AnnouncedTime: "2025/01/08 12:30:00",
                Hypocenter: "茨城県南部",
                Latitude: 36.1234,
                Longitude: 140.5678,
                Depth: 50,
                Magunitude: 5.2,
                MaxIntensity: "4"
            };
            
            // JMA形式に変換
            console.log('3. JMA形式に変換中...');
            const jmaData = convertWolfixToJMAFormat(sampleWolfixData);
            console.log('変換されたJMAデータ:', JSON.stringify(jmaData, null, 2));
            
            // 座標抽出をテスト
            console.log('4. 座標抽出をテスト中...');
            const { earthquakeData, areaInfo } = extractEarthquakeMapData(jmaData);
            
            console.log('=== 結果 ===');
            console.log('✅ 元のWolfix座標:', `${sampleWolfixData.Latitude}°N, ${sampleWolfixData.Longitude}°E`);
            console.log('✅ 抽出された座標:', `${earthquakeData.latitude}°N, ${earthquakeData.longitude}°E`);
            console.log('✅ 震源地:', earthquakeData.hypocenter);
            console.log('✅ 震央座標:', areaInfo.epicenter);
            
            // 座標が一致するかチェック
            const latMatch = Math.abs(earthquakeData.latitude - sampleWolfixData.Latitude) < 0.0001;
            const lonMatch = Math.abs(earthquakeData.longitude - sampleWolfixData.Longitude) < 0.0001;
            
            if (latMatch && lonMatch) {
                console.log('🎉 座標の一致確認：Wolfix APIの座標が正確に使用されています！');
            } else {
                console.error('❌ 座標不一致：推定座標が使用されている可能性があります');
                console.error('期待値:', `${sampleWolfixData.Latitude}, ${sampleWolfixData.Longitude}`);
                console.error('実際値:', `${earthquakeData.latitude}, ${earthquakeData.longitude}`);
            }
            
        } else {
            console.log('✅ 実際のWolfix APIデータを取得しました');
            console.log('Wolfixデータ:', wolfixData);
            
            // 実データで同様のテストを実行
            const jmaData = convertWolfixToJMAFormat(wolfixData);
            const { earthquakeData, areaInfo } = extractEarthquakeMapData(jmaData);
            
            console.log('=== 実データ結果 ===');
            console.log('✅ 元のWolfix座標:', `${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
            console.log('✅ 抽出された座標:', `${earthquakeData.latitude}°N, ${earthquakeData.longitude}°E`);
            console.log('✅ 震源地:', earthquakeData.hypocenter);
        }
        
    } catch (error) {
        if (error.message.includes('正確な座標を取得できませんでした')) {
            console.log('✅ 期待されるエラー：推定座標を拒否する仕組みが正常に動作しています');
            console.log('   → Wolfix APIの座標のみを使用し、推定は行わない設定が有効です');
        } else {
            console.error('❌ 予期しないエラー:', error.message);
            console.error(error.stack);
        }
    }
}

testWolfixCoordinates();
