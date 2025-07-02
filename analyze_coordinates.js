/**
 * Wolfix API座標系詳細調査
 */

const { fetchWolfixEEW } = require('./build/src/utils/earthquake.js');

// 日本の測地系と座標変換
function analyzeCoordinateSystem() {
    console.log('=== 日本の測地系について ===');
    console.log('1. 世界測地系 (WGS84/JGD2011)');
    console.log('   - GPS等で使用される国際標準');
    console.log('   - 2002年以降の日本の標準測地系');
    console.log('   - 気象庁の地震情報でも使用');
    
    console.log('\n2. 日本測地系 (Tokyo Datum/Bessel楕円体)');
    console.log('   - 2002年以前の日本の測地系');
    console.log('   - 現在は原則使用されていない');
    
    console.log('\n3. 座標系の違い例（東京付近）:');
    console.log('   世界測地系: N35°40\'57\" E139°45\'10\"');
    console.log('   日本測地系: N35°40\'45\" E139°44\'28\"');
    console.log('   差: 約12秒角（約400m程度）');
    
    console.log('\n4. 気象庁データの座標系:');
    console.log('   - 2002年以降: 世界測地系 (JGD2011/WGS84)');
    console.log('   - Wolfix APIも気象庁データを元にしているため、世界測地系と推測');
    
    console.log('\n=== トカラ列島近海の位置確認 ===');
    console.log('トカラ列島の実際の位置:');
    console.log('- 鹿児島県十島村');
    console.log('- 悪石島: 約29°27\'N, 129°36\'E');
    console.log('- 小宝島: 約29°14\'N, 129°13\'E');
    console.log('- 宝島: 約29°08\'N, 129°12\'E');
}

async function compareWolfixCoordinates() {
    console.log('\n=== Wolfix座標と実際の位置比較 ===');
    
    try {
        const wolfixData = await fetchWolfixEEW();
        
        if (wolfixData && wolfixData.Hypocenter === 'トカラ列島近海') {
            console.log(`Wolfix API座標: ${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
            
            // トカラ列島の各島との比較
            const islands = {
                '悪石島': { lat: 29.45, lon: 129.60 },
                '小宝島': { lat: 29.23, lon: 129.22 },
                '宝島': { lat: 29.13, lon: 129.20 }
            };
            
            console.log('\n各島との距離計算:');
            for (const [name, coords] of Object.entries(islands)) {
                const latDiff = Math.abs(wolfixData.Latitude - coords.lat);
                const lonDiff = Math.abs(wolfixData.Longitude - coords.lon);
                const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // 概算km
                
                console.log(`${name}: 緯度差${latDiff.toFixed(2)}°, 経度差${lonDiff.toFixed(2)}°, 距離約${distance.toFixed(1)}km`);
            }
            
            // 座標の妥当性チェック
            console.log('\n=== 座標妥当性分析 ===');
            if (wolfixData.Latitude >= 29.0 && wolfixData.Latitude <= 29.5 &&
                wolfixData.Longitude >= 129.0 && wolfixData.Longitude <= 129.7) {
                console.log('✅ 座標はトカラ列島近海の範囲内にあります');
                
                // より詳細な位置分析
                if (wolfixData.Latitude < 29.2) {
                    console.log('→ 宝島・小宝島付近');
                } else if (wolfixData.Latitude < 29.4) {
                    console.log('→ 中之島・悪石島付近');
                } else {
                    console.log('→ 口之島・中之島付近');
                }
                
                if (wolfixData.Longitude < 129.3) {
                    console.log('→ 列島の西側海域');
                } else if (wolfixData.Longitude < 129.6) {
                    console.log('→ 列島の中央海域');
                } else {
                    console.log('→ 列島の東側海域');
                }
                
            } else {
                console.log('❌ 座標がトカラ列島近海の範囲から外れています');
                console.log('   座標系の問題、APIの誤差、または震源の実際の位置の可能性があります');
            }
            
            // 海底地形との関係
            console.log('\n=== 海底地形との関係 ===');
            console.log('トカラ列島近海の特徴:');
            console.log('- トカラ海峡: 深い海溝');
            console.log('- 火山活動: 活発な海底火山');
            console.log('- 地震活動: プレート境界に近い');
            console.log('震源の深さ:', wolfixData.Depth, 'km');
            
        } else {
            console.log('現在、トカラ列島近海以外の地震データです');
            if (wolfixData) {
                console.log(`震源地: ${wolfixData.Hypocenter}`);
                console.log(`座標: ${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
            }
        }
        
    } catch (error) {
        console.error('エラー:', error.message);
    }
}

// 座標系変換の検証
function coordinateSystemTest() {
    console.log('\n=== 座標系変換テスト ===');
    
    // テスト座標: 東京駅
    const tokyoWGS84 = { lat: 35.681236, lon: 139.767125 }; // 世界測地系
    const tokyoTokyo = { lat: 35.679444, lon: 139.762778 }; // 日本測地系(概算)
    
    console.log('東京駅の座標:');
    console.log(`世界測地系(WGS84): ${tokyoWGS84.lat}°N, ${tokyoWGS84.lon}°E`);
    console.log(`日本測地系(推定): ${tokyoTokyo.lat}°N, ${tokyoTokyo.lon}°E`);
    
    const latDiff = tokyoWGS84.lat - tokyoTokyo.lat;
    const lonDiff = tokyoWGS84.lon - tokyoTokyo.lon;
    const metersDiff = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000;
    
    console.log(`測地系による差: 緯度${latDiff.toFixed(6)}°, 経度${lonDiff.toFixed(6)}°`);
    console.log(`距離差: 約${metersDiff.toFixed(0)}m`);
    
    console.log('\n=== 結論 ===');
    console.log('気象庁は2002年以降世界測地系を使用しているため、');
    console.log('Wolfix APIも世界測地系(WGS84/JGD2011)を使用していると推測されます。');
    console.log('ただし、データの精度やAPI処理での丸め誤差の可能性も考慮が必要です。');
}

// 実行
async function main() {
    analyzeCoordinateSystem();
    await compareWolfixCoordinates();
    coordinateSystemTest();
}

main().catch(console.error);
