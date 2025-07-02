// Direct Wolfix API test to see WarnArea structure
async function testWolfixAPI() {
    console.log('=== Wolfix API直接テスト開始 ===')
    
    try {
        const response = await fetch('https://api.wolfx.jp/jma_eew.json')
        
        if (!response.ok) {
            console.error(`API HTTPエラー: ${response.status} ${response.statusText}`)
            return
        }
        
        const data = await response.json()
        console.log('=== Wolfix EEWデータ ===')
        console.log(JSON.stringify(data, null, 2))
        
        if (data.WarnArea) {
            console.log('=== WarnArea詳細 ===')
            console.log('WarnArea配列長:', data.WarnArea.length)
            data.WarnArea.forEach((area, index) => {
                console.log(`WarnArea[${index}]:`, JSON.stringify(area, null, 2))
            })
        } else {
            console.log('WarnAreaデータなし')
        }
        
    } catch (error) {
        console.error('❌ APIテストエラー:', error)
    }
    
    console.log('=== テスト完了 ===')
}

testWolfixAPI()
