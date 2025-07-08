/**
 * 簡単なモジュールテスト
 */

console.log('🚀 簡単なモジュールテスト開始')

try {
    const { fetchP2PQuakeData, convertP2PDataToMapData } = require('./build/utils/p2p_earthquake.js')
    console.log('✅ p2p_earthquake.js モジュール読み込み成功')

    const { generateEarthquakeMap } = require('./build/utils/mapGenerator_new.js')
    console.log('✅ mapGenerator_new.js モジュール読み込み成功')

    console.log('✅ 全モジュールの読み込み完了')
    console.log('🎯 ReferenceErrorが修正されていることを確認できました')

} catch (error) {
    console.error('❌ モジュール読み込みエラー:', error.message)
    console.error('詳細:', error)
}

console.log('🏁 テスト完了')
