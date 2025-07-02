/**
 * 地図投影と震源地位置の詳細分析
 */

const fs = require('fs');

// 地図設定の詳細分析
function analyzeMapConfiguration() {
    console.log('=== 地図設定詳細分析 ===');
    
    const configPath = 'config/config.json';
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('現在の地図設定:');
        console.log(`サイズ: ${config.width}x${config.height}px`);
        console.log(`基準スケール: ${config.scale}`);
        console.log(`解像度: ${config.resolution}`);
        console.log(`震源マーカーサイズ: ${config.epicenter.size}px`);
        
        console.log('\n=== スケール計算の影響 ===');
        console.log('現在のコードでは動的スケーリングが適用されます:');
        console.log('- 単一震源の場合: scale * 8 (より拡大)');
        console.log('- P2P地震情報: scale * 3 (広域表示)');
        console.log('- 震度観測点がある場合: 観測点範囲に基づく');
        
        console.log('\n=== 地図投影の詳細 ===');
        console.log('使用投影: d3.geoMercator()');
        console.log('- メルカトル図法: 角度は正確だが距離は緯度により歪む');
        console.log('- 日本付近(北緯35度前後): 歪みは比較的少ない');
        console.log('- トカラ列島(北緯29度): やや歪みが大きくなる可能性');
        
        console.log('\n=== 考えられる問題点 ===');
        console.log('1. 投影中心の設定');
        console.log('   → 震源地が中心からずれると歪みが増加');
        console.log('2. スケール計算');
        console.log('   → 動的スケーリングで意図しない拡大/縮小');
        console.log('3. 座標の精度');
        console.log('   → 小数点以下の精度により位置がずれる');
        console.log('4. 地図データの精度');
        console.log('   → GeoJSONデータの境界線精度');
    }
}

// 投影とスケールの問題を検証
function verifyProjectionIssues() {
    console.log('\n=== 投影・スケール問題の検証 ===');
    
    // トカラ列島近海の実データで検証
    const tokaraEarthquake = {
        latitude: 29.3,
        longitude: 129.1,
        hypocenter: 'トカラ列島近海'
    };
    
    console.log('検証データ:', tokaraEarthquake);
    
    // 地図の理論的中心計算
    console.log('\n理論的地図設定:');
    console.log(`震源地: [${tokaraEarthquake.longitude}, ${tokaraEarthquake.latitude}]`);
    console.log('投影中心: 震源地と同じ（単一震源の場合）');
    console.log('期待される表示: 地図の中央に震源マーカー');
    
    // 可能性のある問題
    console.log('\n=== 震源地位置のずれの原因候補 ===');
    console.log('1. 座標順序の問題:');
    console.log('   - [経度, 緯度] vs [緯度, 経度]');
    console.log('   - D3.jsは [longitude, latitude] を期待');
    
    console.log('\n2. 測地系の違い:');
    console.log('   - 地図データ: 世界測地系');
    console.log('   - API座標: 世界測地系（確認済み）');
    console.log('   → この問題は解決済み');
    
    console.log('\n3. 投影パラメータ:');
    console.log('   - center: 地図の中心点');
    console.log('   - scale: 拡大率');
    console.log('   - translate: 画面上での位置');
    
    console.log('\n4. 地図データの範囲:');
    console.log('   - GeoJSONの座標範囲');
    console.log('   - 簡略化による精度低下');
    
    console.log('\n=== 推奨する検証方法 ===');
    console.log('1. 固定座標でのテスト');
    console.log('   → 既知の位置（東京、大阪等）で震源マーカー位置確認');
    console.log('2. スケール固定テスト');
    console.log('   → 動的スケーリングを無効化して検証');
    console.log('3. 投影中心の検証');
    console.log('   → 中心座標と震源座標の一致確認');
    console.log('4. 地図データの確認');
    console.log('   → トカラ列島が正確に描画されているか');
}

// 修正提案
function proposeSolutions() {
    console.log('\n=== 修正提案 ===');
    
    console.log('1. デバッグ情報の強化');
    console.log('   → 投影前後の座標をログ出力');
    console.log('   → 地図中心と震源地の関係を可視化');
    
    console.log('\n2. 投影設定の見直し');
    console.log('   → 固定スケールでの動作確認');
    console.log('   → 投影中心の強制設定');
    
    console.log('\n3. 座標精度の向上');
    console.log('   → 小数点以下の桁数を増やす');
    console.log('   → 丸め誤差の最小化');
    
    console.log('\n4. 視覚的検証の実装');
    console.log('   → 震源地周辺の既知の場所をマーカー表示');
    console.log('   → グリッド線の追加');
    
    console.log('\n5. 地図データの検証');
    console.log('   → トカラ列島の境界データ確認');
    console.log('   → 高解像度データへの更新');
}

// 実行
analyzeMapConfiguration();
verifyProjectionIssues();
proposeSolutions();
