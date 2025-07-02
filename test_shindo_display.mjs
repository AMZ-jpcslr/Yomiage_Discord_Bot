/**
 * 震度数字表示テスト
 */

import { generateEarthquakeMap } from './build/src/utils/mapGenerator_new.js'

async function testShindoDisplay() {
    console.log('震度数字表示テストを開始...')
    
    const earthquakeData = {
        longitude: 139.7673068,
        latitude: 35.6809591,
        magnitude: 5.5,
        depth: 60,
        hypocenter: 'テスト震源',
        maxScale: '4'
    }
    
    const areaInfo = {
        epicenter: [139.7673068, 35.6809591],
        areas: {
            '3': [[139.7673068, 35.6809591], [139.8, 35.7]],
            '4': [[139.6, 35.6], [139.9, 35.8]],
            'under_5': [[139.5, 35.5]]
        }
    }
    
    try {
        const imagePath = await generateEarthquakeMap(earthquakeData, areaInfo)
        console.log(`テスト成功: 地図が生成されました - ${imagePath}`)
        console.log('震度数字が地図上に表示されているか確認してください')
    } catch (error) {
        console.error('テスト失敗:', error)
    }
}

testShindoDisplay()
