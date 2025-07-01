// JMAとP2P地震情報の突合テスト

async function testJMADataMatching() {
    try {
        console.log('=== JMA地震情報一覧を取得 ===');
        
        // JMA地震情報一覧を取得
        const listResponse = await fetch('https://www.jma.go.jp/bosai/quake/data/list.json');
        const list = await listResponse.json();
        
        console.log(`取得した地震情報数: ${list.length}`);
        
        // 最新10件の地震情報詳細を取得
        for (let i = 0; i < Math.min(5, list.length); i++) {
            const item = list[i];
            console.log(`\n=== 地震情報 ${i + 1} ===`);
            console.log(`ID: ${item.json}`);
            console.log(`概要: ${item.anm}`);
            
            try {
                const detailResponse = await fetch(`https://www.jma.go.jp/bosai/quake/data/${item.json}`);
                const detail = await detailResponse.json();
                
                // 基本情報を抽出
                const reportTime = detail.Head?.ReportDateTime;
                const originTime = detail.Body?.Earthquake?.OriginTime;
                const hypocenter = detail.Body?.Earthquake?.Hypocenter?.Area?.Name;
                const magnitude = detail.Body?.Earthquake?.Magnitude;
                
                console.log(`発表時刻: ${reportTime}`);
                console.log(`発生時刻: ${originTime}`);
                console.log(`震源地: ${hypocenter}`);
                console.log(`マグニチュード: ${magnitude}`);
                
                // P2P地震情報のサンプルデータとの突合テスト
                console.log('--- P2P突合テスト ---');
                const p2pSampleTime = "2025-07-01T13:08:09.851+09:00";
                const p2pSampleHypocenter = "トカラ列島近海";
                const p2pSampleMagnitude = 2.6;
                
                if (originTime) {
                    const jmaTime = new Date(originTime);
                    const p2pTime = new Date(p2pSampleTime);
                    const timeDiff = Math.abs(jmaTime.getTime() - p2pTime.getTime()) / (1000 * 60);
                    
                    console.log(`時刻差: ${timeDiff.toFixed(1)}分`);
                    
                    if (timeDiff <= 30) {
                        console.log('✅ 時刻が一致範囲内');
                        
                        // 震源地の一致チェック
                        if (hypocenter && hypocenter.includes(p2pSampleHypocenter)) {
                            console.log('✅ 震源地が一致');
                        }
                        
                        // マグニチュードの一致チェック
                        const magDiff = Math.abs(parseFloat(magnitude || '0') - p2pSampleMagnitude);
                        if (magDiff <= 0.5) {
                            console.log('✅ マグニチュードが一致範囲内');
                        }
                        
                        if (hypocenter && hypocenter.includes(p2pSampleHypocenter) && magDiff <= 0.5) {
                            console.log('🎯 完全一致！このJMA地震IDをP2P緊急地震速報で使用可能');
                        }
                    }
                }
                
            } catch (error) {
                console.error(`地震詳細取得エラー (${item.json}):`, error.message);
            }
        }
        
    } catch (error) {
        console.error('JMA地震情報取得エラー:', error);
    }
}

testJMADataMatching();
