/**
 * 地震情報取得と震度表示テスト
 */

import('url').then(({ fileURLToPath }) => {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    
    console.log('地震情報取得テストを開始...')
    
    import('./build/src/utils/earthquake.js').then(async ({ getLatestEarthquakeInfo }) => {
        try {
            console.log('最新の地震情報を取得中...')
            const result = await getLatestEarthquakeInfo()
            
            if (result) {
                console.log('✅ 地震情報取得成功')
                console.log('埋め込み詳細:', result.embed.data.description)
                console.log('添付ファイル数:', result.files?.length || 0)
                
                if (result.files && result.files.length > 0) {
                    console.log('生成された地図ファイル:', result.files[0].name)
                    console.log('震度数字が地図上に表示されているか画像を確認してください')
                }
            } else {
                console.log('❌ 地震情報が取得できませんでした')
            }
        } catch (error) {
            console.error('テストエラー:', error)
        }
    }).catch(error => {
        console.error('モジュール読み込みエラー:', error)
    })
}).catch(error => {
    console.error('初期化エラー:', error)
})

// 必要なモジュールのインポート
import path from 'path'
