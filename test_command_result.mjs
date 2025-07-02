/**
 * 地震コマンドの実行結果確認テスト
 */

async function testEarthquakeCommand() {
    console.log('=== 地震コマンド実行結果確認 ===')
    
    try {
        // 実際のコマンド処理をシミュレート
        const { getLatestEarthquakeInfo } = await import('./build/src/utils/earthquake.js')
        
        console.log('地震情報を取得中...')
        const result = await getLatestEarthquakeInfo()
        
        if (result) {
            console.log('✅ 地震情報取得成功')
            
            // 埋め込み内容の確認
            const embed = result.embed
            console.log('\n=== Discord埋め込み内容 ===')
            console.log('タイトル:', embed.data.title)
            console.log('色:', embed.data.color)
            console.log('説明:')
            console.log(embed.data.description)
            
            if (embed.data.thumbnail) {
                console.log('サムネイル:', embed.data.thumbnail.url)
            } else {
                console.log('サムネイル: なし')
            }
            
            if (embed.data.fields && embed.data.fields.length > 0) {
                console.log('フィールド:')
                embed.data.fields.forEach((field, index) => {
                    console.log(`  [${index}] ${field.name}: ${field.value}`)
                })
            }
            
            // 添付ファイルの確認
            console.log('\n=== 添付ファイル ===')
            if (result.files && result.files.length > 0) {
                result.files.forEach((file, index) => {
                    console.log(`[${index}] ${file.name} (${file.attachment})`)
                })
                console.log('\n✅ 地図画像が生成されました')
                console.log('震度数字が地図上に正しく表示されているか画像を確認してください')
            } else {
                console.log('添付ファイルなし')
            }
            
            // WolfixDataの確認
            if (result.wolfixData) {
                console.log('\n=== Wolfixデータ詳細 ===')
                console.log(`最大震度: ${result.wolfixData.MaxIntensity}`)
                console.log(`WarnArea数: ${result.wolfixData.WarnArea?.length || 0}`)
                if (result.wolfixData.WarnArea && result.wolfixData.WarnArea.length > 0) {
                    console.log('震度エリア詳細:')
                    result.wolfixData.WarnArea.forEach((area, index) => {
                        console.log(`  [${index}] ${area.Chiiki}: 震度${area.Shindo1 || area.Shindo2}`)
                    })
                }
            }
            
        } else {
            console.log('❌ 地震情報が取得できませんでした')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testEarthquakeCommand()
