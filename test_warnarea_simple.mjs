// Simple test for WarnArea processing
(async () => {
    try {
        // Import the built earthquake module
        const earthquakeModule = await import('./build/utils/earthquake.js');
        const { processWolfixEEW } = earthquakeModule;
        
        console.log('=== WarnArea処理テスト開始 ===');
        
        const result = await processWolfixEEW();
        
        if (!result) {
            console.log('❌ 結果なし（データがない可能性）');
            return;
        }
        
        const { embed, files, mapGenerated, eewData } = result;
        
        console.log('✅ 処理成功!');
        console.log('タイトル:', embed.data.title || '未設定');
        console.log('地図生成:', mapGenerated ? '成功' : '失敗または無効');
        console.log('ファイル数:', files?.length || 0);
        
        if (eewData && eewData.WarnArea && Array.isArray(eewData.WarnArea)) {
            console.log('=== WarnAreaデータ詳細 ===');
            console.log('WarnArea配列長:', eewData.WarnArea.length);
            eewData.WarnArea.forEach((area, index) => {
                console.log(`WarnArea[${index}]:`, area);
            });
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error);
    }
    
    console.log('=== WarnArea処理テスト完了 ===');
})();
