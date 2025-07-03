/**
 * P2P地震情報API 全種別テスト
 */

import fetch from 'node-fetch'

// P2P地震情報コード定義
const P2P_CODES = {
    551: '震度速報',
    552: '震源・震度情報', 
    554: '緊急地震速報（警報）',
    555: '緊急地震速報（予報）',
    556: '緊急地震速報（キャンセル）',
    561: '津波注意報・警報',
    562: '津波予報',
    571: '気象警報・注意報',
    581: '火山情報',
    611: 'その他の防災気象情報'
}

async function testP2PAllTypes() {
    try {
        console.log('📡 P2P API全種別テスト開始...')
        
        // 全種別の最新情報を取得（複数のAPIエンドポイントを試す）
        console.log('地震情報を取得中...')
        let response = await fetch('https://api.p2pquake.net/v2/jma/quake?limit=10&order=-1')
        
        if (!response.ok) {
            console.log('地震情報APIが失敗、全般情報APIを試行中...')
            response = await fetch('https://api.p2pquake.net/v2/history?limit=20&order=-1')
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        console.log(`✅ 取得成功: ${data.length}件`)
        console.log('')
        
        // 種別ごとにグループ化
        const typeGroups = {}
        data.forEach(item => {
            const code = item.code
            const typeName = P2P_CODES[code] || `未知(${code})`
            
            if (!typeGroups[typeName]) {
                typeGroups[typeName] = []
            }
            typeGroups[typeName].push(item)
        })
        
        // 各種別の情報を表示
        for (const [typeName, items] of Object.entries(typeGroups)) {
            console.log(`=== ${typeName} (${items.length}件) ===`)
            
            items.slice(0, 2).forEach(item => {
                console.log(`ID: ${item.id}`)
                console.log(`時刻: ${item.time}`)
                
                // 不完全データ判定のテスト
                const isIncomplete = isIncompleteData(item)
                console.log(`不完全データ: ${isIncomplete ? 'はい' : 'いいえ'}`)
                
                if (item.earthquake) {
                    console.log(`震源地: ${item.earthquake.hypocenter?.name || '不明'}`)
                    console.log(`マグニチュード: M${item.earthquake.hypocenter?.magnitude || '不明'}`)
                    console.log(`最大震度: ${item.earthquake.maxScale || '不明'}`)
                }
                
                if (item.title) {
                    console.log(`タイトル: ${item.title}`)
                }
                
                if (item.text) {
                    console.log(`内容: ${item.text.substring(0, 100)}...`)
                }
                
                if (item.areas) {
                    console.log(`対象地域数: ${item.areas.length}`)
                }
                
                console.log('---')
            })
            console.log('')
        }
        
        console.log('✅ P2P API全種別テスト完了')
        
    } catch (error) {
        console.error('❌ テストエラー:', error)
    }
}

// 不完全データ判定関数（簡易版）
function isIncompleteData(p2pData) {
    // 地震情報以外（津波、気象警報等）は基本的に完全とみなす
    if (p2pData.code !== 551 && p2pData.code !== 552) {
        // ただし、titleやtextが空の場合は不完全と判定
        if (!p2pData.title && !p2pData.text && !p2pData.areas) {
            return true
        }
        return false
    }
    
    // 地震情報が存在しない
    if (!p2pData.earthquake) {
        return true
    }
    
    // 震源地情報が不完全
    if (!p2pData.earthquake.hypocenter) {
        return true
    }
    
    // 基本的な地震情報（名前、マグニチュード、座標）のいずれかが不明
    if (!p2pData.earthquake.hypocenter.name || 
        !p2pData.earthquake.hypocenter.magnitude ||
        !p2pData.earthquake.hypocenter.longitude || 
        !p2pData.earthquake.hypocenter.latitude) {
        return true
    }
    
    return false
}

// テスト実行
testP2PAllTypes()
