/**
 * 座標順序修正の検証テスト
 */

const { fetchWolfixEEW, convertWolfixToJMAFormat } = require('./build/src/utils/earthquake.js');
const { extractEarthquakeMapData } = require('./build/src/utils/mapGenerator_new.js');

async function testCoordinateOrderFix() {
    console.log('=== 座標順序修正の検証 ===');
    
    try {
        // Wolfix APIデータ取得
        const wolfixData = await fetchWolfixEEW();
        
        if (wolfixData) {
            console.log('\n1. 元のWolfixデータ:');
            console.log(`  Latitude: ${wolfixData.Latitude}°N`);
            console.log(`  Longitude: ${wolfixData.Longitude}°E`);
            console.log(`  震源地: ${wolfixData.Hypocenter}`);
            
            // JMA形式に変換
            console.log('\n2. JMA形式への変換:');
            const jmaData = convertWolfixToJMAFormat(wolfixData);
            const coordinateText = jmaData.Body.Earthquake.Hypocenter.Area.Coordinate['#text'];
            console.log(`  座標文字列: "${coordinateText}"`);
            
            // 座標抽出
            console.log('\n3. 座標抽出結果:');
            const { earthquakeData } = extractEarthquakeMapData(jmaData);
            
            console.log('\n=== 修正結果の比較 ===');
            console.log('変換前 (Wolfix API):');
            console.log(`  緯度: ${wolfixData.Latitude}°N`);
            console.log(`  経度: ${wolfixData.Longitude}°E`);
            
            console.log('変換後 (抽出結果):');
            console.log(`  緯度: ${earthquakeData.latitude}°N`);
            console.log(`  経度: ${earthquakeData.longitude}°E`);
            
            // 一致確認
            const latMatch = Math.abs(earthquakeData.latitude - wolfixData.Latitude) < 0.0001;
            const lonMatch = Math.abs(earthquakeData.longitude - wolfixData.Longitude) < 0.0001;
            
            console.log('\n=== 座標一致確認 ===');
            console.log(`緯度一致: ${latMatch ? '✅' : '❌'}`);
            console.log(`経度一致: ${lonMatch ? '✅' : '❌'}`);
            
            if (latMatch && lonMatch) {
                console.log('\n🎉 座標順序の修正が成功しました！');
                console.log('震源地の座標が正確に変換されています。');
            } else {
                console.log('\n❌ まだ座標に問題があります。');
                console.log('期待値:', `${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
                console.log('実際値:', `${earthquakeData.latitude}°N, ${earthquakeData.longitude}°E`);
            }
            
        } else {
            console.log('現在Wolfix APIからデータが取得できません');
        }
        
    } catch (error) {
        console.error('エラー:', error.message);
    }
}

testCoordinateOrderFix();
