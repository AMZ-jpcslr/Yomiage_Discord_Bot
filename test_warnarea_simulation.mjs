/**
 * WarnAreaデータありのシミュレーションテスト
 */

async function testWithWarnAreaData() {
    console.log('=== WarnAreaデータ有りシミュレーションテスト ===')
    
    try {
        const { createEarthquakeEmbed } = await import('./build/src/utils/earthquake.js')
        
        // WarnAreaデータがある地震のシミュレーション
        const mockWolfixData = {
            EventID: '20250703011234',
            Hypocenter: 'トカラ列島近海',
            Latitude: 29.5,
            Longitude: 129.1,
            Magunitude: 4.4,
            Depth: 10,
            MaxIntensity: '4', // 最大震度を明示的に設定
            AnnouncedTime: '2025/07/03 01:12:26',
            OriginTime: '2025/07/03 01:12:00',
            WarnArea: [
                {
                    Chiiki: '鹿児島県十島村',
                    Shindo1: '4',
                    Shindo2: '不明',
                    Time: '//////',
                    Type: '警報',
                    Arrive: '既に到達と予測'
                },
                {
                    Chiiki: '鹿児島県',
                    Shindo1: '3',
                    Shindo2: '不明',
                    Time: '16:33:30',
                    Type: '予報',
                    Arrive: '間もなく到達'
                },
                {
                    Chiiki: '大分県',
                    Shindo1: '2',
                    Shindo2: '不明',
                    Time: '16:34:00',
                    Type: '予報',
                    Arrive: '間もなく到達'
                }
            ]
        }
        
        console.log('1. WarnAreaデータ有りのシミュレーション開始')
        console.log(`震源地: ${mockWolfixData.Hypocenter}`)
        console.log(`最大震度: ${mockWolfixData.MaxIntensity}`)
        console.log(`WarnArea数: ${mockWolfixData.WarnArea.length}`)
        
        const result = await createEarthquakeEmbed(mockWolfixData, false)
        
        if (result) {
            console.log('\n✅ 埋め込み作成成功')
            console.log('\n=== 埋め込み内容 ===')
            console.log('タイトル:', result.embed.data.title)
            console.log('説明:')
            console.log(result.embed.data.description)
            console.log('サムネイル:', result.embed.data.thumbnail?.url || 'なし')
            
            if (result.files && result.files.length > 0) {
                console.log('\n=== 生成された地図 ===')
                console.log(`地図ファイル: ${result.files[0].name}`)
                console.log('震度観測点が正しく表示されているか確認してください')
            } else {
                console.log('\n❌ 地図が生成されませんでした')
            }
        } else {
            console.log('❌ 埋め込み作成失敗')
        }
        
        // MaxIntensityなしのケースもテスト
        console.log('\n2. MaxIntensity不明の場合のテスト')
        const mockDataNoMaxIntensity = {
            ...mockWolfixData,
            MaxIntensity: '不明'
        }
        
        const result2 = await createEarthquakeEmbed(mockDataNoMaxIntensity, false)
        if (result2) {
            console.log('✅ MaxIntensity不明でも処理成功')
            console.log('説明（推定震度）:')
            console.log(result2.embed.data.description)
        }
        
    } catch (error) {
        console.error('❌ シミュレーションエラー:', error)
    }
}

testWithWarnAreaData()
