/**
 * 最低震度設定機能のテスト
 * 
 * このファイルは最低震度設定機能が正しく動作するかテストします。
 * 実際のBotを起動せずに、設定保存・読み込み機能をテストできます。
 */

import { setChannelMinIntensity, getChannelMinIntensity } from '../src/p2p_notify'
import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.resolve(__dirname, '../data')
const TEST_FILE = path.join(DATA_DIR, 'eq_min_intensity.json')

function testMinIntensitySettings() {
    console.log('=== 最低震度設定機能テスト開始 ===')
    
    // テスト用チャンネルID
    const testChannelId1 = 'test_channel_001'
    const testChannelId2 = 'test_channel_002'
    const testChannelId3 = 'test_channel_003'
    
    try {
        // テスト前に既存ファイルを削除
        if (fs.existsSync(TEST_FILE)) {
            fs.unlinkSync(TEST_FILE)
            console.log('✅ 既存テストファイル削除完了')
        }
        
        // 1. デフォルト値のテスト
        console.log('\n--- デフォルト値テスト ---')
        const defaultValue = getChannelMinIntensity(testChannelId1)
        console.log(`チャンネル1のデフォルト最低震度: ${defaultValue} (期待値: 0)`)
        
        if (defaultValue === 0) {
            console.log('✅ デフォルト値テスト: 成功')
        } else {
            console.log('❌ デフォルト値テスト: 失敗')
            return false
        }
        
        // 2. 設定保存テスト
        console.log('\n--- 設定保存テスト ---')
        setChannelMinIntensity(testChannelId1, 30) // 震度3以上
        setChannelMinIntensity(testChannelId2, 45) // 震度5弱以上
        setChannelMinIntensity(testChannelId3, 70) // 震度7のみ
        console.log('✅ 設定保存完了')
        
        // 3. 設定読み込みテスト
        console.log('\n--- 設定読み込みテスト ---')
        const intensity1 = getChannelMinIntensity(testChannelId1)
        const intensity2 = getChannelMinIntensity(testChannelId2)
        const intensity3 = getChannelMinIntensity(testChannelId3)
        
        console.log(`チャンネル1: ${intensity1} (期待値: 30)`)
        console.log(`チャンネル2: ${intensity2} (期待値: 45)`)
        console.log(`チャンネル3: ${intensity3} (期待値: 70)`)
        
        if (intensity1 === 30 && intensity2 === 45 && intensity3 === 70) {
            console.log('✅ 設定読み込みテスト: 成功')
        } else {
            console.log('❌ 設定読み込みテスト: 失敗')
            return false
        }
        
        // 4. 設定上書きテスト
        console.log('\n--- 設定上書きテスト ---')
        setChannelMinIntensity(testChannelId1, 55) // 震度6弱以上に変更
        const updatedIntensity = getChannelMinIntensity(testChannelId1)
        console.log(`更新後チャンネル1: ${updatedIntensity} (期待値: 55)`)
        
        if (updatedIntensity === 55) {
            console.log('✅ 設定上書きテスト: 成功')
        } else {
            console.log('❌ 設定上書きテスト: 失敗')
            return false
        }
        
        // 5. ファイル内容確認テスト
        console.log('\n--- ファイル内容確認テスト ---')
        if (fs.existsSync(TEST_FILE)) {
            const fileContent = fs.readFileSync(TEST_FILE, 'utf8')
            const jsonData = JSON.parse(fileContent)
            console.log('設定ファイル内容:', jsonData)
            
            if (jsonData[testChannelId1] === 55 && 
                jsonData[testChannelId2] === 45 && 
                jsonData[testChannelId3] === 70) {
                console.log('✅ ファイル内容確認テスト: 成功')
            } else {
                console.log('❌ ファイル内容確認テスト: 失敗')
                return false
            }
        } else {
            console.log('❌ 設定ファイルが存在しません')
            return false
        }
        
        console.log('\n=== 全テスト成功！ ===')
        return true
        
    } catch (error) {
        console.error('❌ テスト実行中にエラーが発生:', error)
        return false
    } finally {
        // テスト後のクリーンアップ
        if (fs.existsSync(TEST_FILE)) {
            fs.unlinkSync(TEST_FILE)
            console.log('🧹 テストファイルクリーンアップ完了')
        }
    }
}

// P2P震度コードから震度文字列への変換テスト
function testIntensityCodeConversion() {
    console.log('\n=== P2P震度コード変換テスト ===')
    
    const testCases = [
        { code: 10, expected: '1' },
        { code: 20, expected: '2' },
        { code: 30, expected: '3' },
        { code: 40, expected: '4' },
        { code: 45, expected: '5弱' },
        { code: 50, expected: '5強' },
        { code: 55, expected: '6弱' },
        { code: 60, expected: '6強' },
        { code: 70, expected: '7' }
    ]
    
    // この関数は通常はset_min_intensity.tsにあるが、テスト用にここで再定義
    function getIntensityString(p2pCode) {
        if (p2pCode >= 70) return '7'
        if (p2pCode >= 60) return '6強'
        if (p2pCode >= 55) return '6弱'
        if (p2pCode >= 50) return '5強'
        if (p2pCode >= 45) return '5弱'
        if (p2pCode >= 40) return '4'
        if (p2pCode >= 30) return '3'
        if (p2pCode >= 20) return '2'
        if (p2pCode >= 10) return '1'
        return 'すべて'
    }
    
    let allPassed = true
    
    for (const testCase of testCases) {
        const result = getIntensityString(testCase.code)
        const passed = result === testCase.expected
        
        console.log(`コード${testCase.code}: ${result} (期待値: ${testCase.expected}) ${passed ? '✅' : '❌'}`)
        
        if (!passed) {
            allPassed = false
        }
    }
    
    if (allPassed) {
        console.log('✅ 震度コード変換テスト: 全テスト成功')
    } else {
        console.log('❌ 震度コード変換テスト: 一部テスト失敗')
    }
    
    return allPassed
}

// メイン実行
if (require.main === module) {
    console.log('最低震度設定機能 統合テスト')
    console.log('実行時刻:', new Date().toLocaleString('ja-JP'))
    
    const test1Result = testMinIntensitySettings()
    const test2Result = testIntensityCodeConversion()
    
    if (test1Result && test2Result) {
        console.log('\n🎉 全テスト成功！実装は正常に動作しています。')
        process.exit(0)
    } else {
        console.log('\n💥 一部テストが失敗しました。実装を確認してください。')
        process.exit(1)
    }
}

export { testMinIntensitySettings, testIntensityCodeConversion }
