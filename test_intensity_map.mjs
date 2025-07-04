/**
 * 震度分布マップ生成テスト
 */

import { generateEarthquakeMap } from './build/utils/mapGenerator_new.js'

console.log('=== 震度分布マップ生成テスト ===')

// P2P地震情報を模したテスト用地震データ（震度分布付き）
const testEarthquakeData = {
    longitude: 139.6917,  // 東京
    latitude: 35.6895,
    magnitude: 6.5,
    depth: 30,
    hypocenter: '東京都23区',
    maxScale: '6弱',
    originTime: '2025-07-03T12:00:00+09:00'
}

// 震度分布情報
const testAreaInfo = {
    epicenter: [139.6917, 35.6895],
    areas: {
        '6弱': [[139.6917, 35.6895], [139.6425, 35.4478]], // 東京都、神奈川県
        '5強': [[140.1233, 35.6047], [139.6489, 35.8617]], // 千葉県、埼玉県
        '5弱': [[139.8836, 36.5657], [140.4467, 36.3418]], // 栃木県、茨城県
        '4': [[139.0608, 36.3910], [138.5683, 35.6636]],   // 群馬県、山梨県
        '3': [[138.3829, 34.9769], [137.1805, 35.1802]]    // 静岡県、愛知県
    }
}

async function testIntensityMap() {
    try {
        console.log('🗾 震度分布マップ生成開始...')
        
        const mapPath = await generateEarthquakeMap(testEarthquakeData, testAreaInfo)
        
        if (mapPath) {
            console.log('✅ 震度分布マップ生成成功!')
            console.log(`📁 保存先: ${mapPath}`)
            console.log('🎨 震度分布が色分けされているか確認してください:')
            console.log('  - 震度6弱: 赤色 (東京都、神奈川県)')
            console.log('  - 震度5強: オレンジ色 (千葉県、埼玉県)')
            console.log('  - 震度5弱: 黄色 (栃木県、茨城県)')
            console.log('  - 震度4: 黄色 (群馬県、山梨県)')
            console.log('  - 震度3: 緑色 (静岡県、愛知県)')
            console.log('  - 震源地: 赤い×マーク (東京都)')
        } else {
            console.log('❌ 震度分布マップ生成失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testIntensityMap()
