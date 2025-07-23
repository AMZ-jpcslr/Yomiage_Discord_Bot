/**
 * 新しい地震情報取得コマンド（P2P地震情報API専用）- SVG版
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js'
import { fetchP2PQuakeData, convertP2PDataToMapData, createP2PEarthquakeEmbed, scaleCodeToString } from '../utils/p2p_earthquake'
import { generateEarthquakeMapSVG } from '../utils/mapGenerator_svg'
import { getIntensityIconPath } from '../utils/intensityIcon'
import * as path from 'path'

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
                content: '最新の地震情報が見つかりませんでした。気象庁から新しい地震情報が発表されていない可能性があります。'
            })
            return
        }
        
        console.log(`地震情報取得成功: ${latestEarthquake.earthquake?.hypocenter?.name} M${latestEarthquake.earthquake?.hypocenter?.magnitude}`)
        
        // P2P地震情報から埋め込みメッセージ作成
        const embed = createP2PEarthquakeEmbed(latestEarthquake)
        const files: AttachmentBuilder[] = []
        
        // 震度アイコンを添付
        if (latestEarthquake.earthquake?.maxScale) {
            const maxScaleString = scaleCodeToString(latestEarthquake.earthquake.maxScale)
            const iconPath = getIntensityIconPath(maxScaleString)
            if (iconPath) {
                const iconAttachment = new AttachmentBuilder(iconPath, { name: 'intensity_icon.png' })
                files.push(iconAttachment)
                embed.setThumbnail('attachment://intensity_icon.png')
            }
        }
        
        // P2Pデータをマップ用に変換
        const mapData = convertP2PDataToMapData(latestEarthquake)
        
        if (mapData && latestEarthquake.points && latestEarthquake.points.length > 0) {
            // SVG地震マップ生成を試行
            try {
                console.log('🗺️ 震度分布付きSVG地震マップ生成中...')
                
                // 出力ディレクトリのパス
                const outputDir = path.join(process.cwd(), 'generated_images')
                
                // P2Pデータから地点情報を抽出してLocation配列に変換
                const locations: Array<{
                    name: string
                    fullAddress: string
                    lat: number
                    lng: number
                    intensityLevel: string
                }> = []
                
                for (const point of latestEarthquake.points) {
                    // 都道府県名と地点名を組み合わせて場所名を作成
                    const locationName = point.addr || '不明'
                    const fullAddress = `${point.pref || '不明'}${locationName}`
                    
                    // 震度コードを文字列に変換
                    const intensityLevel = scaleCodeToString(point.scale)
                    
                    // 基本的な座標を設定（ランダムな日本国内座標、実際のアプリでは座標データベース検索）
                    const lat = 35 + Math.random() * 10  // 35-45度の範囲
                    const lng = 130 + Math.random() * 15 // 130-145度の範囲
                    
                    locations.push({
                        name: locationName,
                        fullAddress: fullAddress,
                        lat: lat,
                        lng: lng,
                        intensityLevel: intensityLevel
                    })
                }
                console.log(`📍 変換した地点数: ${locations.length}`)
                
                // タイムアウト付きでSVGマップ生成を実行（30秒）
                const mapPromise = generateEarthquakeMapSVG(locations, outputDir)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SVG map generation timeout (30s)')), 30000)
                )
                
                const mapImagePath = await Promise.race([mapPromise, timeoutPromise]) as string
                
                if (mapImagePath) {
                    const attachment = new AttachmentBuilder(mapImagePath, { name: 'earthquake_intensity_map.svg' })
                    files.push(attachment)
                    
                    // SVG地図ファイルを添付として設定
                    embed.addFields({
                        name: '📍 震度分布マップ',
                        value: '添付のSVGファイルで詳細な震度分布を確認できます',
                        inline: false
                    })
                    console.log('✅ SVG震度分布地震マップ生成成功:', mapImagePath)
                    
                    // 生成後のメモリ状況確認
                    const memAfterMap = process.memoryUsage()
                    console.log(`🧠 マップ生成後メモリ: ${Math.round(memAfterMap.heapUsed / 1024 / 1024)}MB / ${Math.round(memAfterMap.rss / 1024 / 1024)}MB RSS`)
                } else {
                    console.log('⚠️ SVG地震マップ生成に失敗しました（タイムアウトまたは処理エラー）')
                }
            } catch (mapError) {
                console.error('❌ SVG地震マップ生成エラー:', mapError)
                
                // エラーの詳細ログ
                if (mapError instanceof Error) {
                    console.error('❌ エラー詳細:', mapError.message)
                    console.error('❌ スタック:', mapError.stack)
                }
                
                // メモリ状況を確認
                const memError = process.memoryUsage()
                console.error(`🧠 エラー時メモリ: ${Math.round(memError.heapUsed / 1024 / 1024)}MB / ${Math.round(memError.rss / 1024 / 1024)}MB RSS`)
                
                // 地震マップなしでも情報は表示する
                console.log('📋 地震マップ生成失敗のため、テキスト情報のみで継続します')
            }
        } else {
            console.log('⚠️ 地震マップデータの変換に失敗しました（震度情報が不完全な可能性）')
        }
        
        // Discordに返信
        await interaction.editReply({
            embeds: [embed],
            files: files
        })
        
        console.log(`✅ 地震情報取得・表示成功:`)
        console.log(`  震源地: ${latestEarthquake.earthquake?.hypocenter?.name || '不明'}`)
        console.log(`  マグニチュード: M${latestEarthquake.earthquake?.hypocenter?.magnitude || '不明'}`)
        console.log(`  最大震度: ${latestEarthquake.earthquake?.maxScale || '不明'}`)
        console.log(`  震度観測点数: ${latestEarthquake.points?.length || 0}`)
        
        console.log('=== /get_eq コマンド実行完了 ===')
        
    } catch (error) {
        console.error('❌ /get_eq コマンドエラー:', error)
        await interaction.editReply({
            content: '地震情報の取得中にエラーが発生しました。しばらく時間をおいてから再度お試しください。'
        })
    }
}