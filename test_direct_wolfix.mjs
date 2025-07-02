// Direct test of Wolfix API processing with our updated functions
import pkg from './build/utils/earthquake.js';
const { createWolfixEEWEmbed, fetchWolfixEEW } = pkg;

async function testDirectWolfixProcessing() {
    console.log('=== Wolfix直接処理テスト開始 ===');
    
    try {
        // Step 1: Fetch Wolfix data
        console.log('1. Wolfix APIからデータ取得中...');
        const wolfixData = await fetchWolfixEEW();
        
        if (!wolfixData) {
            console.log('❌ Wolfix APIからデータを取得できませんでした');
            return;
        }
        
        console.log('✅ Wolfix APIデータ取得成功');
        console.log('イベントID:', wolfixData.EventID);
        console.log('震源地:', wolfixData.Hypocenter);
        console.log('緯度:', wolfixData.Latitude);
        console.log('経度:', wolfixData.Longitude);
        console.log('マグニチュード:', wolfixData.Magunitude);
        console.log('最大震度:', wolfixData.MaxIntensity);
        
        // Step 2: Check WarnArea data
        if (wolfixData.WarnArea && Array.isArray(wolfixData.WarnArea)) {
            console.log('=== WarnAreaデータ詳細 ===');
            console.log('WarnArea配列長:', wolfixData.WarnArea.length);
            wolfixData.WarnArea.forEach((area, index) => {
                console.log(`WarnArea[${index}]:`, JSON.stringify(area, null, 2));
            });
        } else {
            console.log('⚠️ WarnAreaデータなし');
        }
        
        // Step 3: Process into embed (this will test our WarnArea conversion)
        console.log('2. 埋め込み作成中...');
        const result = await createWolfixEEWEmbed(wolfixData);
        
        if (!result) {
            console.log('❌ 埋め込み作成失敗');
            return;
        }
        
        console.log('✅ 埋め込み作成成功');
        console.log('地図生成:', result.mapGenerated ? '成功' : '失敗または無効');
        console.log('ファイル数:', result.files?.length || 0);
        
        // Step 4: Show resulting embed info
        console.log('=== 生成された埋め込み情報 ===');
        console.log('タイトル:', result.embed.data.title);
        console.log('説明:', result.embed.data.description?.substring(0, 200) + '...');
        console.log('フィールド数:', result.embed.data.fields?.length || 0);
        
        if (result.embed.data.fields) {
            result.embed.data.fields.forEach((field, index) => {
                console.log(`フィールド[${index}]: ${field.name} = ${field.value}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 処理エラー:', error);
        console.error('エラー詳細:', error.stack);
    }
    
    console.log('=== Wolfix直接処理テスト完了 ===');
}

testDirectWolfixProcessing();
