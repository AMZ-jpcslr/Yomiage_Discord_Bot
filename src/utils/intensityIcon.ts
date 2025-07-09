/**
 * 震度アイコンユーティリティ
 */
import * as fs from 'fs'
import * as path from 'path'

/**
 * 震度から対応するアイコンファイルのパスを取得
 */
export function getIntensityIconPath(intensityScale: string): string | null {
    const projectRoot = process.cwd()
    const iconDir = path.join(projectRoot, 'data', 'intensity_icons')
    
    // 震度文字列をファイル名にマッピング
    const intensityFileMap: { [key: string]: string } = {
        '1': 'intensity_1.png',
        '2': 'intensity_2.png',
        '3': 'intensity_3.png',
        '4': 'intensity_4.png',
        '5-': 'intensity_5-.png',
        'under_5': 'intensity_5-.png',
        '5+': 'intensity_5+.png',
        'over_5': 'intensity_5+.png',
        '6-': 'intensity_6-.png',
        'under_6': 'intensity_6-.png',
        '6+': 'intensity_6+.png',
        'over_6': 'intensity_6+.png',
        '7': 'intensity_7.png'
    }
    
    const filename = intensityFileMap[intensityScale]
    if (filename) {
        const iconPath = path.join(iconDir, filename)
        if (fs.existsSync(iconPath)) {
            return iconPath
        }
    }
    
    console.warn(`未対応の震度または画像が見つからない: ${intensityScale}`)
    return null
}
