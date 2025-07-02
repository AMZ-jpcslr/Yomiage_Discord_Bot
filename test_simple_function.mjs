/**
 * シンプルな関数テスト
 */

async function simpleTest() {
    console.log('=== シンプル関数テスト ===')
    
    try {
        const { normalizeIntensity } = await import('./build/src/utils/earthquake.js')
        
        console.log('normalizeIntensity関数テスト:')
        console.log('4 →', normalizeIntensity('4'))
        console.log('5弱 →', normalizeIntensity('5弱'))
        console.log('不明 →', normalizeIntensity('不明'))
        
    } catch (error) {
        console.error('シンプルテストエラー:', error)
    }
}

simpleTest()
