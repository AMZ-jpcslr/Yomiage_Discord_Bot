/**
 * 地震マップの震度表示バグ修正テスト
 */

import { generateEarthquakeMap } from './build/src/utils/mapGenerator_new.js'

console.log('=== 地震マップ震度表示バグ修正テスト ===')

// テスト用地震データ（異なる震度を持つ観測点）
const testEarthquakeData = {
    longitude: 139.7,
    latitude: 35.7,
    magnitude: 5.2,
    depth: 30,
    hypocenter: '東京湾',
    maxScale: '4',
    originTime: new Date().toISOString()
}

// テスト用震度分布データ（多様な震度を含む）
const testAreaInfo = {
    areas: {
        '1': [[139.5, 35.5]],           // 震度1地点
        '2': [[139.8, 35.8]],           // 震度2地点
        '3': [[139.6, 35.6]],           // 震度3地点
        '4': [[139.7, 35.9]],           // 震度4地点
        'under_5': [[139.9, 35.4]]      // 震度5弱地点
    }
}

async function testMapGeneration() {
    try {
        console.log('📊 テスト地震データ:')
        console.log('  震源地:', testEarthquakeData.hypocenter)
        console.log('  座標:', `[${testEarthquakeData.longitude}, ${testEarthquakeData.latitude}]`)
        console.log('  最大震度:', testEarthquakeData.maxScale)
        
        console.log('📍 テスト震度分布:')
        for (const [intensity, coords] of Object.entries(testAreaInfo.areas)) {
            console.log(`  震度${intensity}: ${coords.length}地点`)
            coords.forEach(coord => console.log(`    座標: [${coord[0]}, ${coord[1]}]`))
        }
        
        console.log('🗺️ 地震マップ生成開始...')
        const mapPath = await generateEarthquakeMap(testEarthquakeData, testAreaInfo)
        
        if (mapPath) {
            console.log('✅ 地震マップ生成成功:', mapPath)
            console.log('📋 確認項目:')
            console.log('  1. 震源地に赤いXマークが1つだけ表示されているか')
            console.log('  2. 観測点の震度が正しく表示されているか（1, 2, 3, 4, 5弱）')
            console.log('  3. 緑色の参照マーカーが表示されていないか')
        } else {
            console.log('❌ 地震マップ生成失敗')
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

testMapGeneration()
