/**
 * 震源地座標の詳細検証テスト
 */

const { fetchWolfixEEW, convertWolfixToJMAFormat } = require('./build/src/utils/earthquake.js');
const { extractEarthquakeMapData } = require('./build/src/utils/mapGenerator_new.js');

async function verifyEpicenterCoordinates() {
    console.log('=== 震源地座標詳細検証開始 ===');
    
    try {
        // 1. Wolfix APIデータ取得
        console.log('1. Wolfix APIからデータを取得中...');
        const wolfixData = await fetchWolfixEEW();
        
        if (!wolfixData) {
            console.log('⚠️ 実データがないため、テストデータを使用');
            // 具体的な座標でテスト（例：東京近郊）
            const testData = {
                Title: "テスト地震",
                AnnouncedTime: "2025/01/08 12:30:00",
                Hypocenter: "東京湾",
                Latitude: 35.5,    // 緯度
                Longitude: 139.8,  // 経度
                Depth: 30,
                Magunitude: 4.0,
                MaxIntensity: "3"
            };
            
            console.log('テストデータ:');
            console.log(`  震源地: ${testData.Hypocenter}`);
            console.log(`  緯度: ${testData.Latitude}°N`);
            console.log(`  経度: ${testData.Longitude}°E`);
            
            // 2. JMA形式に変換
            console.log('\n2. JMA形式に変換中...');
            const jmaData = convertWolfixToJMAFormat(testData);
            const coordinateText = jmaData.Body.Earthquake.Hypocenter.Area.Coordinate['#text'];
            console.log(`  JMA座標文字列: "${coordinateText}"`);
            
            // 3. 座標抽出
            console.log('\n3. 座標抽出中...');
            const { earthquakeData, areaInfo } = extractEarthquakeMapData(jmaData);
            
            console.log('\n=== 座標変換結果詳細 ===');
            console.log('元データ (Wolfix):');
            console.log(`  Latitude: ${testData.Latitude}`);
            console.log(`  Longitude: ${testData.Longitude}`);
            
            console.log('\nJMA変換後:');
            console.log(`  Coordinate['#text']: "${coordinateText}"`);
            const [lonStr, latStr] = coordinateText.split('/');
            console.log(`  分割後: 経度="${lonStr}", 緯度="${latStr}"`);
            
            console.log('\n抽出結果:');
            console.log(`  earthquakeData.latitude: ${earthquakeData.latitude}`);
            console.log(`  earthquakeData.longitude: ${earthquakeData.longitude}`);
            
            console.log('\nD3.js用座標配列:');
            console.log(`  epicenter: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`);
            console.log(`  areaInfo.epicenter: [${areaInfo.epicenter[0]}, ${areaInfo.epicenter[1]}]`);
            
            // 座標一致確認
            const latMatch = Math.abs(earthquakeData.latitude - testData.Latitude) < 0.0001;
            const lonMatch = Math.abs(earthquakeData.longitude - testData.Longitude) < 0.0001;
            
            console.log('\n=== 座標一致検証 ===');
            console.log(`緯度一致: ${latMatch ? '✅' : '❌'} (${testData.Latitude} vs ${earthquakeData.latitude})`);
            console.log(`経度一致: ${lonMatch ? '✅' : '❌'} (${testData.Longitude} vs ${earthquakeData.longitude})`);
            
            if (latMatch && lonMatch) {
                console.log('\n🎉 座標は正確に抽出されています');
                
                // D3座標順序の確認
                console.log('\n=== D3.js座標順序確認 ===');
                console.log('D3.geoMercator()は [経度, 緯度] の順序を期待');
                console.log(`現在の設定: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`);
                console.log('これは正しい順序です ✅');
                
            } else {
                console.error('\n❌ 座標変換に問題があります');
            }
            
        } else {
            console.log('✅ 実データで検証中...');
            // 実データで同様の検証を実行
            const jmaData = convertWolfixToJMAFormat(wolfixData);
            const { earthquakeData, areaInfo } = extractEarthquakeMapData(jmaData);
            
            console.log('\n=== 実データ検証結果 ===');
            console.log(`元データ: ${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
            console.log(`抽出結果: ${earthquakeData.latitude}°N, ${earthquakeData.longitude}°E`);
            console.log(`D3配列: [${earthquakeData.longitude}, ${earthquakeData.latitude}]`);
        }
        
    } catch (error) {
        console.error('❌ エラー発生:', error.message);
        console.error(error.stack);
    }
}

verifyEpicenterCoordinates();
