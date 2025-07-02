// Test script for P2P earthquake alert area data conversion
// 注意: このテストは新しいWolfix API専用システムでは使用されません
/*
import { createEarthquakeEmbedFromP2PData } from './src/utils/earthquake'

// Mock P2P earthquake data with areas (based on typical P2P EEW format)
const mockP2PData = {
    code: 551, // 緊急地震速報
    created_at: new Date().toISOString(),
    earthquake: {
        magnitude: 6.2,
        hypocenter: {
            name: '福島県沖',
            depth: 40
        }
    },
    areas: [
        {
            name: '福島県',
            scaleFrom: 40,
            scaleTo: 50
        },
        {
            name: '宮城県',
            scaleFrom: 30,
            scaleTo: 40
        },
        {
            name: '茨城県',
            scaleFrom: 30,
            scaleTo: 45
        }
    ],
    maxScale: 50
}

async function testP2PConversion() {
    console.log('=== P2P地震情報のエリアデータ変換テスト ===')
    console.log('テストデータ:', JSON.stringify(mockP2PData, null, 2))
    
    try {
        const result = await createEarthquakeEmbedFromP2PData(mockP2PData)
        if (result) {
            console.log('✅ P2P変換成功')
            console.log('埋め込みタイトル:', result.embed.data.title)
            console.log('地図生成:', result.mapGenerated ? '成功' : '失敗')
            console.log('添付ファイル数:', result.files?.length || 0)
        } else {
            console.log('❌ P2P変換失敗')
        }
    } catch (error) {
        console.error('❌ テスト中にエラー:', error)
    }
}

// Run test only if this file is executed directly
if (require.main === module) {
    testP2PConversion()
}
*/

console.log('このテストは新しいWolfix API専用システムでは無効化されています。')
console.log('新しいシステムではWolfix APIのみを使用し、P2P地震情報は使用しません。')
