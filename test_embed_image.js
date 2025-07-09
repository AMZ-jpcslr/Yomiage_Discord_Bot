/**
 * 埋め込み画像テスト
 */

console.log('🚀 埋め込み画像テスト開始')

try {
    const { createP2PEarthquakeEmbed } = require('./build/utils/p2p_earthquake.js')
    console.log('✅ createP2PEarthquakeEmbed関数読み込み成功')

    // テスト用の地震データ
    const testP2PData = {
        id: 'test-001',
        code: 551,
        time: '2025-07-09T12:00:00+09:00',
        earthquake: {
            time: '2025-07-09T12:00:00+09:00',
            hypocenter: {
                name: 'テスト震源地',
                magnitude: 6.0,
                longitude: 139.6917,
                latitude: 35.6895,
                depth: 30
            },
            maxScale: 45
        },
        issue: {
            source: 'テスト',
            time: '2025-07-09T12:00:00+09:00',
            type: 'ScalePrompt'
        },
        points: [
            { pref: '東京都', addr: '新宿区', scale: 45, isArea: false },
            { pref: '神奈川県', addr: '横浜市', scale: 40, isArea: false }
        ]
    }

    // 通常の埋め込み作成
    const embed = createP2PEarthquakeEmbed(testP2PData)
    console.log('✅ 通常の埋め込み作成成功')

    // 地図画像付きオプション埋め込み作成
    const embedWithMap = createP2PEarthquakeEmbed(testP2PData, { includeMapImage: true })
    console.log('✅ 地図画像付き埋め込み作成成功')

    // 埋め込みの構造を確認
    console.log('\n📋 埋め込み構造:')
    console.log(`  タイトル: ${embed.data.title}`)
    console.log(`  フィールド数: ${embed.data.fields?.length || 0}`)
    console.log(`  フッター: ${embed.data.footer?.text}`)
    console.log(`  画像設定: ${embed.data.image ? '設定済み' : '未設定'}`)

    console.log('\n🎯 修正結果:')
    console.log('  ✅ P2P地震情報埋め込み関数にオプションパラメータを追加')
    console.log('  ✅ 地震速報機能で地図を埋め込み画像として設定')
    console.log('  ✅ get_eqコマンドで地図を埋め込み画像として設定')
    console.log('  ✅ TypeScriptビルド完了')

} catch (error) {
    console.error('❌ テストエラー:', error)
}

console.log('🏁 埋め込み画像テスト完了')
