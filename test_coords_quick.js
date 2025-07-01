// Test P2P coordinate estimation
const { estimateP2PAreaCoordinates } = require('./build/utils/earthquake.js')

console.log('=== P2P座標推定テスト ===')

const testAreas = [
    '福島県',
    '宮城県',
    '茨城県',
    'トカラ列島近海',
    '関東'
]

testAreas.forEach(area => {
    const coords = estimateP2PAreaCoordinates(area)
    console.log(`${area}: ${coords ? `${coords.lat}°N, ${coords.lon}°E` : '座標推定失敗'}`)
})
