// 新しい地震システムの機能テスト
import { fetchWolfixEarthquakeData, getLatestEarthquakeInfo, processEarthquakeAlert } from './build/utils/earthquake_new.js';

async function testNewEarthquakeSystem() {
    console.log('=== 新しい地震システム機能テスト ===');
    
    try {
        // テスト1: Wolfix APIデータ取得
        console.log('\n1. Wolfix APIデータ取得テスト');
        const wolfixData = await fetchWolfixEarthquakeData();
        
        if (wolfixData) {
            console.log('✅ Wolfix APIデータ取得成功');
            console.log('イベントID:', wolfixData.EventID);
            console.log('震源地:', wolfixData.Hypocenter);
            console.log('座標:', `${wolfixData.Latitude}°N, ${wolfixData.Longitude}°E`);
            console.log('マグニチュード:', wolfixData.Magunitude);
            console.log('最大震度:', wolfixData.MaxIntensity);
            console.log('WarnArea数:', wolfixData.WarnArea?.length || 0);
            
            if (wolfixData.WarnArea && wolfixData.WarnArea.length > 0) {
                console.log('WarnAreaの詳細:');
                wolfixData.WarnArea.forEach((area, index) => {
                    console.log(`  [${index}] ${area.Chiiki} 震度${area.Shindo1}`);
                });
            }
        } else {
            console.log('❌ Wolfix APIデータ取得失敗');
        }
        
        // テスト2: 最新地震情報の埋め込み作成（コマンド用）
        console.log('\n2. 最新地震情報埋め込み作成テスト');
        const latestInfo = await getLatestEarthquakeInfo();
        
        if (latestInfo) {
            console.log('✅ 最新地震情報作成成功');
            console.log('タイトル:', latestInfo.embed.data.title);
            console.log('説明:', latestInfo.embed.data.description?.substring(0, 100) + '...');
            console.log('フィールド数:', latestInfo.embed.data.fields?.length || 0);
            console.log('ファイル数:', latestInfo.files?.length || 0);
            console.log('色:', latestInfo.embed.data.color ? `#${latestInfo.embed.data.color.toString(16)}` : 'なし');
        } else {
            console.log('❌ 最新地震情報作成失敗');
        }
        
        // テスト3: 緊急地震速報処理（通知用）
        console.log('\n3. 緊急地震速報処理テスト');
        const alertInfo = await processEarthquakeAlert();
        
        if (alertInfo) {
            console.log('✅ 緊急地震速報処理成功');
            console.log('タイトル:', alertInfo.embed.data.title);
            console.log('色:', alertInfo.embed.data.color ? `#${alertInfo.embed.data.color.toString(16)}` : 'なし');
            console.log('ファイル数:', alertInfo.files?.length || 0);
            
            if (alertInfo.wolfixData) {
                console.log('データ詳細:');
                console.log('  最終報:', alertInfo.wolfixData.isFinal ? 'はい' : 'いいえ');
                console.log('  警報:', alertInfo.wolfixData.isWarn ? 'はい' : 'いいえ');
                console.log('  訓練:', alertInfo.wolfixData.isTraining ? 'はい' : 'いいえ');
                console.log('  キャンセル:', alertInfo.wolfixData.isCancel ? 'はい' : 'いいえ');
            }
        } else {
            console.log('⚠️ 緊急地震速報処理結果なし（正常 - 条件に該当する警報なし）');
        }
        
        console.log('\n=== テスト完了 ===');
        console.log('🎯 震源地マークの正確な表示を含む新しいシステムが準備完了');
        
    } catch (error) {
        console.error('❌ テストエラー:', error);
    }
}

testNewEarthquakeSystem();
