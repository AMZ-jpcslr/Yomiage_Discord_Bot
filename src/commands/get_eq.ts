/**
 * 新しい地震情報取得コマンド（P2P地震情報API専用）
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { fetchP2PQuakeData, convertP2PDataToMapData, createP2PEarthquakeEmbed } from '../utils/p2p_earthquake'
import { generateEarthquakeMap } from '../utils/mapGenerator_new'
import { getIntensityIconPath } from '../utils/intensityIcon'
import { AttachmentBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
    .setName('get_eq')
    .setDescription('最新の地震情報を取得します（P2P地震情報API）')

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    
    try {
        console.log('=== /get_eq コマンド実行開始 ===')
        
        // P2P地震情報APIから最新の地震情報を取得
        const p2pData = await fetchP2PQuakeData()
        
        if (!p2pData || p2pData.length === 0) {
            await interaction.editReply({
                content: '最新の地震情報が見つかりませんでした。しばらく時間をおいてから再度お試しください。'
            })
            return
        }
        
        // 最新の地震情報を取得（震度情報があるもの優先）
        let latestEarthquake = p2pData.find((data) => 
            (data.code === 551 || data.code === 552) && 
            data.earthquake && 
            data.earthquake.hypocenter && 
            data.points && 
            data.points.length > 0
        )
        
        // 震度情報付きが見つからない場合は、地震情報全般から取得
        if (!latestEarthquake) {
            latestEarthquake = p2pData.find((data) => 
                (data.code === 551 || data.code === 552) && 
                data.earthquake && 
                data.earthquake.hypocenter
            )
        }
        
        if (!latestEarthquake) {
            await interaction.editReply({
                content: '地震情報が見つかりませんでした。しばらく時間をおいてから再度お試しください。'
            })
            return
        }
        
        console.log(`📋 取得した地震情報:`)
        console.log(`  ID: ${latestEarthquake.id}`)
        console.log(`  コード: ${latestEarthquake.code}`)
        console.log(`  震源地: ${latestEarthquake.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${latestEarthquake.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${latestEarthquake.earthquake?.maxScale || '不明'}`)
        console.log(`  震度観測点数: ${latestEarthquake.points?.length || 0}`)
        
        // Discord用埋め込みを作成
        const embed = createP2PEarthquakeEmbed(latestEarthquake)
        
        // 震度分布情報を埋め込みに追加
        if (latestEarthquake.points && latestEarthquake.points.length > 0) {
            // 震度ごとの地域数を集計
            const intensityCount: { [key: string]: number } = {}
            latestEarthquake.points.forEach(point => {
                const scale = point.scale
                const intensityStr = scale >= 70 ? '7' :
                                   scale >= 60 ? '6強' :
                                   scale >= 55 ? '6弱' :
                                   scale >= 50 ? '5強' :
                                   scale >= 45 ? '5弱' :
                                   scale >= 40 ? '4' :
                                   scale >= 30 ? '3' :
                                   scale >= 20 ? '2' :
                                   scale >= 10 ? '1' : '不明'
                
                intensityCount[intensityStr] = (intensityCount[intensityStr] || 0) + 1
            })
            
            // 震度分布サマリーを埋め込みに追加
            const intensitySummary = Object.entries(intensityCount)
                .sort(([a], [b]) => {
                    const order = ['7', '6強', '6弱', '5強', '5弱', '4', '3', '2', '1']
                    return order.indexOf(a) - order.indexOf(b)
                })
                .map(([intensity, count]) => `震度${intensity}: ${count}地域`)
                .join('\n')
            
            if (intensitySummary) {
                embed.addFields({
                    name: '📊 震度分布サマリー',
                    value: intensitySummary,
                    inline: false
                })
            }
        }
        
        // 地図生成用データに変換
        const mapData = convertP2PDataToMapData(latestEarthquake)
        
        const files: AttachmentBuilder[] = []
        
        // Railway環境での地震マップ生成設定（高メモリ環境では有効化）
        const skipMapGeneration = process.env.SKIP_MAP_GENERATION === 'true' || 
                                 (process.env.RAILWAY === 'true' && process.env.FORCE_MAP_GENERATION !== 'true')
        
        if (skipMapGeneration) {
            console.log('⚠️ 地震マップ生成をスキップ（SKIP_MAP_GENERATION=true または高メモリ設定未有効）')
        } else {
            console.log('🗺️ 地震マップ生成が有効です（高メモリ環境または開発環境）')
        }
        
        // 震度アイコンをembedに追加
        const maxScale = latestEarthquake.earthquake?.maxScale
        if (maxScale && maxScale !== 0) {
            // P2P震度コードから震度文字列に変換
            const scaleStr = maxScale >= 70 ? '7' :
                           maxScale >= 60 ? '6+' :
                           maxScale >= 55 ? '6-' :
                           maxScale >= 50 ? '5+' :
                           maxScale >= 45 ? '5-' :
                           maxScale >= 40 ? '4' :
                           maxScale >= 30 ? '3' :
                           maxScale >= 20 ? '2' :
                           maxScale >= 10 ? '1' : null
            
            if (scaleStr) {
                const intensityIconPath = getIntensityIconPath(scaleStr)
                if (intensityIconPath) {
                    const iconAttachment = new AttachmentBuilder(intensityIconPath, { name: 'intensity_icon.png' })
                    files.push(iconAttachment)
                    embed.setThumbnail('attachment://intensity_icon.png')
                    console.log(`✅ 震度アイコン追加: 震度${scaleStr}`)
                }
            }
        }
        
        if (mapData && !skipMapGeneration) {
            try {
                // メモリ使用量をチェック
                const memBefore = process.memoryUsage()
                console.log(`🧠 地震マップ生成前のメモリ使用量: ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`)
                
                // Railway環境での安全な地震マップ生成
                console.log('🗺️ 震度分布付き地震マップ生成中...')
                
                // タイムアウト付きでマップ生成を実行
                const mapPromise = generateEarthquakeMap(mapData.earthquakeData, mapData.areaInfo)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Map generation timeout')), 30000)
                )
                
                const mapImagePath = await Promise.race([mapPromise, timeoutPromise]) as string
                
                if (mapImagePath) {
                    const attachment = new AttachmentBuilder(mapImagePath, { name: 'earthquake_intensity_map.png' })
                    files.push(attachment)
                    
                    // 地図画像を埋め込みの画像として設定
                    embed.setImage('attachment://earthquake_intensity_map.png')
                    console.log('✅ 震度分布地震マップ生成成功（埋め込み画像として設定）:', mapImagePath)
                    
                    // 震度分布の詳細をログ出力
                    if (mapData.areaInfo.areas) {
                        const intensityTypes = Object.keys(mapData.areaInfo.areas)
                        console.log(`📊 描画した震度: ${intensityTypes.join(', ')}`)
                        intensityTypes.forEach(intensity => {
                            const areaCount = mapData.areaInfo.areas[intensity]?.length || 0
                            console.log(`  震度${intensity}: ${areaCount}地域`)
                        })
                    }
                } else {
                    console.log('⚠️ 震度分布地震マップ生成に失敗しました（タイムアウトまたは処理エラー）')
                }
            } catch (mapError) {
                console.error('❌ 震度分布地震マップ生成エラー:', mapError)
                
                // SIGSEGVやメモリエラーの詳細ログ
                if (mapError instanceof Error) {
                    console.error('❌ エラー詳細:', mapError.message)
                    console.error('❌ スタック:', mapError.stack)
                }
                
                // メモリ状況を確認
                const memError = process.memoryUsage()
                console.error(`🧠 エラー時メモリ: ${Math.round(memError.heapUsed / 1024 / 1024)}MB / ${Math.round(memError.rss / 1024 / 1024)}MB RSS`)
                
                // 強制ガベージコレクション
                if (global.gc) {
                    try {
                        global.gc()
                        console.log('🧹 エラー後ガベージコレクション実行')
                    } catch (gcError) {
                        console.error('❌ ガベージコレクションエラー:', gcError)
                    }
                }
                
                // 地震マップなしでも情報は表示する
                console.log('📋 地震マップ生成失敗のため、テキスト情報のみで継続します')
            }
        } else {
            console.log('⚠️ 地震マップデータの変換に失敗しました（震度情報が不完全な可能性）')
        }
        
        console.log(`✅ 地震情報取得・表示成功:`)
        console.log(`  震源地: ${latestEarthquake.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${latestEarthquake.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${latestEarthquake.earthquake?.maxScale || '不明'}`)
        console.log(`  震度観測点数: ${latestEarthquake.points?.length || 0}`)
        console.log(`  データソース: P2P地震情報API`)
        console.log(`  地図ファイル数: ${files.length}`)
        console.log(`  震度分布地図: ${files.length > 0 ? '生成済み' : '生成なし'}`)
        
        await interaction.editReply({
            embeds: [embed],
            files: files
        })
        
        console.log('=== /get_eq コマンド実行完了 ===')
        
    } catch (error) {
        console.error('❌ /get_eq コマンドエラー:', error)
        await interaction.editReply({
            content: '地震情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
        })
    }
}
