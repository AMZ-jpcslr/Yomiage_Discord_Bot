/**
 * VoiceVoxずんだもんAPI音声読み上げ機能
 */

import { 
    Client, 
    VoiceChannel, 
    Message, 
    GuildMember,
    VoiceState
} from 'discord.js'
import { 
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnection,
    getVoiceConnection,
    DiscordGatewayAdapterCreator,
    AudioPlayer,
    AudioResource
} from '@discordjs/voice'
import * as fs from 'fs'
import * as path from 'path'

// HTTP クライアントの設定（Node.js バージョン互換性対応）
let fetch: typeof globalThis.fetch

// Node.js 18+ の標準 fetch または undici を使用
if (typeof globalThis.fetch !== 'undefined') {
    fetch = globalThis.fetch
} else {
    // Node.js 18未満の場合はundiciを使用
    const { fetch: undiciFetch } = require('undici')
    fetch = undiciFetch
}

// VoiceVox APIの設定
const VOICEVOX_API_URL = process.env.VOICEVOX_API_URL || 'http://localhost:50021'
const ZUNDAMON_SPEAKER_ID = 3 // ずんだもん（ノーマル）のスピーカーID
const VOICEVOX_ENABLED = process.env.VOICEVOX_ENABLED !== 'false' // デフォルトで有効

// 音声ファイル保存ディレクトリ
const AUDIO_DIR = path.resolve(__dirname, '../audio')

// アクティブな音声接続を管理
const activeConnections = new Map<string, VoiceConnection>()
const audioPlayers = new Map<string, AudioPlayer>()
const messageQueues = new Map<string, string[]>()

interface VoiceChannelConfig {
    [guildId: string]: {
        voiceChannelId: string
        textChannelId: string
        speakerId?: number
        speed?: number
        pitch?: number
    }
}

interface VoiceSettings {
    speakerId: number
    speed: number
    pitch: number
}

interface EnhancedVoiceSettings extends VoiceSettings {
    intonation?: number
    volume?: number
}

// デフォルト音声設定
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
    speakerId: 2, // 四国めたん（ノーマル）- VoiceVoxの基本音声
    speed: 0.8,   // ゆっくりめの速度（0.8倍速）
    pitch: 0.0    // 通常音程
}

/**
 * Speaker IDに応じて音声パラメータを強化（Mock Mode対応）
 */
function enhanceVoiceSettings(settings: VoiceSettings): EnhancedVoiceSettings {
    const enhanced: EnhancedVoiceSettings = { ...settings }
    
    // Speaker IDに応じて音声特性を調整
    switch (settings.speakerId) {
        case 0: // 四国めたん（あまあま）
            enhanced.pitch = settings.pitch + 0.05
            enhanced.speed = settings.speed * 0.95
            enhanced.intonation = 1.1
            enhanced.volume = 1.0
            break
        case 1: // ずんだもん（あまあま）
            enhanced.pitch = settings.pitch + 0.03
            enhanced.speed = settings.speed * 0.9
            enhanced.intonation = 1.05
            enhanced.volume = 0.95
            break
        case 2: // 四国めたん（ノーマル）
            enhanced.pitch = settings.pitch + 0.02
            enhanced.speed = settings.speed * 1.0
            enhanced.intonation = 1.0
            enhanced.volume = 1.0
            break
        case 3: // ずんだもん（ノーマル）
            enhanced.pitch = settings.pitch + 0.0
            enhanced.speed = settings.speed * 1.0
            enhanced.intonation = 1.0
            enhanced.volume = 1.0
            break
        case 6: // 四国めたん（ツンツン）
            enhanced.pitch = settings.pitch + 0.08
            enhanced.speed = settings.speed * 1.1
            enhanced.intonation = 1.2
            enhanced.volume = 1.05
            break
        case 7: // ずんだもん（ツンツン）
            enhanced.pitch = settings.pitch + 0.06
            enhanced.speed = settings.speed * 1.05
            enhanced.intonation = 1.15
            enhanced.volume = 1.02
            break
        case 8: // 春日部つむぎ
            enhanced.pitch = settings.pitch - 0.02
            enhanced.speed = settings.speed * 0.98
            enhanced.intonation = 0.95
            enhanced.volume = 1.0
            break
        case 9: // 波音リツ
            enhanced.pitch = settings.pitch - 0.05
            enhanced.speed = settings.speed * 1.02
            enhanced.intonation = 0.9
            enhanced.volume = 1.0
            break
        case 10: // 雨晴はう
            enhanced.pitch = settings.pitch + 0.04
            enhanced.speed = settings.speed * 0.92
            enhanced.intonation = 1.08
            enhanced.volume = 0.98
            break
        case 11: // 玄野武宏
            enhanced.pitch = settings.pitch - 0.08
            enhanced.speed = settings.speed * 1.08
            enhanced.intonation = 0.85
            enhanced.volume = 1.1
            break
        default:
            enhanced.intonation = 1.0
            enhanced.volume = 1.0
    }
    
    return enhanced
}

// 音声チャンネル設定ファイル
const VOICE_CONFIG_FILE = path.resolve(__dirname, '../data/voice_channels.json')

/**
 * 音声チャンネル設定を読み込み
 */
function loadVoiceChannelConfig(): VoiceChannelConfig {
    try {
        console.log(`📁 設定ファイル読み込み: ${VOICE_CONFIG_FILE}`)
        if (fs.existsSync(VOICE_CONFIG_FILE)) {
            const data = fs.readFileSync(VOICE_CONFIG_FILE, 'utf8')
            const config = JSON.parse(data)
            console.log(`✅ 設定ファイル読み込み完了:`, config)
            return config
        } else {
            console.log(`⚠️ 設定ファイルが見つかりません: ${VOICE_CONFIG_FILE}`)
        }
    } catch (error) {
        console.error('❌ 音声チャンネル設定の読み込みエラー:', error)
    }
    return {}
}

/**
 * 音声チャンネル設定を保存
 */
function saveVoiceChannelConfig(config: VoiceChannelConfig): void {
    try {
        const dir = path.dirname(VOICE_CONFIG_FILE)
        console.log(`📁 設定ディレクトリ確認: ${dir}`)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
            console.log(`✅ 設定ディレクトリ作成: ${dir}`)
        }
        fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(config, null, 2))
        console.log(`✅ 音声チャンネル設定保存完了: ${VOICE_CONFIG_FILE}`)
        console.log(`💾 保存された設定:`, config)
    } catch (error) {
        console.error('❌ 音声チャンネル設定の保存エラー:', error)
    }
}

/**
 * 音声チャンネル設定を追加
 */
export function setVoiceChannelConfig(guildId: string, voiceChannelId: string, textChannelId: string): void {
    const config = loadVoiceChannelConfig()
    config[guildId] = { voiceChannelId, textChannelId }
    saveVoiceChannelConfig(config)
}

/**
 * 音声チャンネル設定を削除
 */
export function removeVoiceChannelConfig(guildId: string): void {
    const config = loadVoiceChannelConfig()
    delete config[guildId]
    saveVoiceChannelConfig(config)
}

/**
 * 音声設定を更新
 */
export function updateVoiceSettings(guildId: string, settings: Partial<VoiceSettings>): void {
    const config = loadVoiceChannelConfig()
    
    // ギルド設定が存在しない場合は作成
    if (!config[guildId]) {
        config[guildId] = {
            voiceChannelId: '',
            textChannelId: '',
            speakerId: DEFAULT_VOICE_SETTINGS.speakerId,
            speed: DEFAULT_VOICE_SETTINGS.speed,
            pitch: DEFAULT_VOICE_SETTINGS.pitch
        }
    }
    
    // 設定を更新
    if (settings.speakerId !== undefined) config[guildId].speakerId = settings.speakerId
    if (settings.speed !== undefined) config[guildId].speed = settings.speed
    if (settings.pitch !== undefined) config[guildId].pitch = settings.pitch
    
    saveVoiceChannelConfig(config)
    console.log(`✅ 音声設定更新: ${guildId}`, settings)
    console.log(`🎵 現在の設定:`, {
        speakerId: config[guildId].speakerId,
        speed: config[guildId].speed,
        pitch: config[guildId].pitch
    })
}

/**
 * 音声設定を取得
 */
export function getVoiceSettings(guildId: string): VoiceSettings {
    const config = loadVoiceChannelConfig()
    const guildConfig = config[guildId]
    
    return {
        speakerId: guildConfig?.speakerId ?? DEFAULT_VOICE_SETTINGS.speakerId,
        speed: guildConfig?.speed ?? DEFAULT_VOICE_SETTINGS.speed,
        pitch: guildConfig?.pitch ?? DEFAULT_VOICE_SETTINGS.pitch
    }
}

/**
 * スピーカーID から名前を取得
 */
export function getSpeakerName(speakerId: number): string {
    const speakers: { [key: number]: string } = {
        0: '四国めたん（あまあま）',
        1: 'ずんだもん（あまあま）',
        2: '四国めたん（ノーマル）',
        3: 'ずんだもん（ノーマル）',
        6: '四国めたん（ツンツン）',
        7: 'ずんだもん（ツンツン）',
        8: '春日部つむぎ（ノーマル）',
        9: '波音リツ（ノーマル）',
        10: '雨晴はう（ノーマル）',
        11: '玄野武宏（ノーマル）'
    }
    return speakers[speakerId] || `不明（ID: ${speakerId}）`
}

/**
 * VoiceVox APIの可用性をチェック（Railway内部サービス対応）
 */
async function checkVoiceVoxAvailability(): Promise<boolean> {
    if (!VOICEVOX_ENABLED) {
        console.log('🔇 VoiceVox機能は無効化されています (VOICEVOX_ENABLED=false)')
        return false
    }
    
    try {
        // Railway内部サービスの場合は少し長めのタイムアウトを設定
        const controller = new AbortController()
        const timeoutMs = process.env.RAILWAY ? 10000 : 5000 // Railway環境では10秒
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        
        console.log(`🔍 VoiceVoxサーバーの可用性チェック中... (${VOICEVOX_API_URL})`)
        
        const response = await fetch(`${VOICEVOX_API_URL}/version`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Discord-Bot-VoiceVox/1.0'
            }
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
            const version = await response.text()
            console.log(`✅ VoiceVox接続確認完了: ${VOICEVOX_API_URL} (version: ${version})`)
            return true
        } else {
            console.log(`❌ VoiceVoxサーバーエラー: ${response.status}`)
            return false
        }
    } catch (error) {
        console.log(`❌ VoiceVoxサーバーに接続できません: ${VOICEVOX_API_URL}`)
        console.log(`エラー詳細: ${error}`)
        return false
    }
}

/**
 * Speaker IDに応じてFFmpegで音声ファイルを後処理
 */
async function applyVoiceEffects(inputPath: string, settings: EnhancedVoiceSettings): Promise<string> {
    const outputPath = inputPath.replace('.wav', '_processed.wav')
    
    try {
        // Speaker IDに応じたFFmpegフィルターを構築
        const filters = []
        
        // 音程変更 (pitch)
        if (settings.pitch !== 0) {
            const semitones = settings.pitch * 12 // -0.15 to 0.15 → -1.8 to 1.8 semitones
            filters.push(`asetrate=48000*${Math.pow(2, semitones/12)},aresample=48000`)
        }
        
        // 速度変更 (speed) - 音程を保持
        if (settings.speed !== 1.0) {
            filters.push(`atempo=${settings.speed}`)
        }
        
        // 音量調整 (volume)
        if (settings.volume && settings.volume !== 1.0) {
            filters.push(`volume=${settings.volume}`)
        }
        
        // 抑揚/音質調整 (intonation) - EQで模擬
        if (settings.intonation && settings.intonation !== 1.0) {
            if (settings.intonation > 1.0) {
                // 抑揚を強くする - 高音域を強調
                filters.push(`equalizer=f=2000:width_type=h:width=1000:g=${(settings.intonation - 1.0) * 6}`)
            } else {
                // 抑揚を弱くする - 中音域を強調
                filters.push(`equalizer=f=1000:width_type=h:width=800:g=${(1.0 - settings.intonation) * 4}`)
            }
        }
        
        // Character-specific voice effects
        switch (settings.speakerId) {
            case 0: // 四国めたん（あまあま）
                filters.push('equalizer=f=800:width_type=h:width=200:g=3') // 柔らかい音質
                break
            case 1: // ずんだもん（あまあま）
                filters.push('equalizer=f=1200:width_type=h:width=300:g=2')
                break
            case 6: // 四国めたん（ツンツン）
                filters.push('equalizer=f=2500:width_type=h:width=500:g=4') // 鋭い音質
                break
            case 7: // ずんだもん（ツンツン）
                filters.push('equalizer=f=2000:width_type=h:width=400:g=3')
                break
            case 8: // 春日部つむぎ
                filters.push('equalizer=f=600:width_type=h:width=150:g=2') // 落ち着いた音質
                break
            case 9: // 波音リツ
                filters.push('equalizer=f=400:width_type=h:width=100:g=3') // 低音強調
                break
            case 10: // 雨晴はう
                filters.push('equalizer=f=1500:width_type=h:width=350:g=2.5')
                break
            case 11: // 玄野武宏
                filters.push('equalizer=f=300:width_type=h:width=80:g=5') // 男性的な低音
                break
        }
        
        if (filters.length === 0) {
            // エフェクトが不要な場合はそのまま返す
            return inputPath
        }
        
        const filterChain = filters.join(',')
        console.log(`🎛️ FFmpeg音声処理: Speaker ${settings.speakerId} - ${filterChain}`)
        
        const { spawn } = require('child_process')
        
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-af', filterChain,
                '-y', // 出力ファイルを上書き
                outputPath
            ])
            
            ffmpeg.on('close', (code: number) => {
                if (code === 0) {
                    console.log(`✅ FFmpeg音声処理完了: ${outputPath}`)
                    // 元ファイルを削除
                    try {
                        require('fs').unlinkSync(inputPath)
                    } catch (e) {
                        console.warn('⚠️ 元音声ファイル削除失敗:', e)
                    }
                    resolve(outputPath)
                } else {
                    console.error(`❌ FFmpeg音声処理失敗: code ${code}`)
                    reject(new Error(`FFmpeg処理失敗: ${code}`))
                }
            })
            
            ffmpeg.on('error', (error: Error) => {
                console.error('❌ FFmpeg実行エラー:', error)
                reject(error)
            })
        })
        
    } catch (error) {
        console.error('❌ 音声エフェクト適用エラー:', error)
        return inputPath // エラー時は元ファイルを返す
    }
}
async function synthesizeVoice(text: string, guildId: string): Promise<Buffer | null> {
    try {
        const settings = getVoiceSettings(guildId)
        console.log(`🎤 VoiceVox音声合成開始: "${text}" (Speaker: ${getSpeakerName(settings.speakerId)}, Speed: ${settings.speed}, Pitch: ${settings.pitch})`)
        
        // Speaker IDに応じた音声パラメータを調整（Mock Mode対応）
        const enhancedSettings = enhanceVoiceSettings(settings)
        console.log(`🎭 Enhanced settings for Mock Mode:`, enhancedSettings)
        
        // まず音素クエリを取得
        const queryResponse = await fetch(`${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${enhancedSettings.speakerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        
        if (!queryResponse.ok) {
            console.error('❌ VoiceVox音素クエリ取得エラー:', queryResponse.status, queryResponse.statusText)
            return null
        }
        
        const audioQuery = await queryResponse.json()
        
        // 強化された音声設定を適用
        audioQuery.speedScale = enhancedSettings.speed
        audioQuery.pitchScale = enhancedSettings.pitch
        audioQuery.intonationScale = enhancedSettings.intonation || 1.0
        audioQuery.volumeScale = enhancedSettings.volume || 1.0
        
        // 音声合成を実行
        const synthesisResponse = await fetch(`${VOICEVOX_API_URL}/synthesis?speaker=${enhancedSettings.speakerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery)
        })
        
        if (!synthesisResponse.ok) {
            console.error('❌ VoiceVox音声合成エラー:', synthesisResponse.status, synthesisResponse.statusText)
            return null
        }
        
        const audioBuffer = Buffer.from(await synthesisResponse.arrayBuffer())
        console.log(`✅ VoiceVox音声合成完了: ${audioBuffer.length}bytes`)
        
        return audioBuffer
        
    } catch (error) {
        console.error('❌ VoiceVox API通信エラー:', error)
        return null
    }
}

/**
 * テキストを音声ファイルに変換して保存
 */
async function createAudioFile(text: string, guildId: string): Promise<string | null> {
    try {
        // 音声ディレクトリを作成
        if (!fs.existsSync(AUDIO_DIR)) {
            try {
                fs.mkdirSync(AUDIO_DIR, { recursive: true })
                console.log(`✅ 音声ディレクトリ作成: ${AUDIO_DIR}`)
            } catch (mkdirError) {
                console.error(`❌ 音声ディレクトリ作成エラー: ${mkdirError}`)
                throw new Error(`音声ディレクトリの作成に失敗しました: ${AUDIO_DIR}`)
            }
        }
        
        // VoiceVoxで音声合成
        const audioBuffer = await synthesizeVoice(text, guildId)
        if (!audioBuffer) {
            return null
        }
        
        // 音声ファイルを保存
        const timestamp = Date.now()
        const filename = `voice_${guildId}_${timestamp}.wav`
        const filepath = path.join(AUDIO_DIR, filename)
        
        fs.writeFileSync(filepath, audioBuffer)
        console.log(`💾 音声ファイル保存完了: ${filepath}`)
        
        // Speaker IDに応じた音声エフェクトを適用
        const settings = getVoiceSettings(guildId)
        const enhancedSettings = enhanceVoiceSettings(settings)
        const processedFilepath = await applyVoiceEffects(filepath, enhancedSettings)
        
        console.log(`🎛️ 音声処理完了: ${processedFilepath}`)
        return processedFilepath
        
    } catch (error) {
        console.error('❌ 音声ファイル作成エラー:', error)
        return null
    }
}

/**
 * 音声を再生
 */
async function playAudio(connection: VoiceConnection, audioPath: string, guildId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            // オーディオプレイヤーを取得または作成
            let player = audioPlayers.get(guildId)
            if (!player) {
                player = createAudioPlayer()
                audioPlayers.set(guildId, player)
                
                // プレイヤーイベントリスナー
                player.on(AudioPlayerStatus.Playing, () => {
                    console.log(`🔊 音声再生開始: ${guildId}`)
                })
                
                player.on(AudioPlayerStatus.Idle, () => {
                    console.log(`🔇 音声再生終了: ${guildId}`)
                    
                    // 音声ファイルを削除
                    setTimeout(() => {
                        if (fs.existsSync(audioPath)) {
                            fs.unlinkSync(audioPath)
                            console.log(`🗑️ 音声ファイル削除: ${audioPath}`)
                        }
                    }, 1000)
                    
                    // キューの次の音声を再生
                    processMessageQueue(guildId)
                    resolve()
                })
                
                player.on('error', (error: Error) => {
                    console.error(`❌ 音声再生エラー: ${guildId}`, error)
                    reject(error)
                })
                
                // 接続にプレイヤーを登録
                connection.subscribe(player)
            }
            
            // オーディオリソースを作成して再生
            const resource = createAudioResource(audioPath)
            player.play(resource)
            
        } catch (error) {
            console.error('❌ 音声再生設定エラー:', error)
            reject(error)
        }
    })
}

/**
 * メッセージキューを処理
 */
async function processMessageQueue(guildId: string): Promise<void> {
    const queue = messageQueues.get(guildId)
    if (!queue || queue.length === 0) {
        return
    }
    
    const connection = activeConnections.get(guildId)
    if (!connection) {
        return
    }
    
    const player = audioPlayers.get(guildId)
    if (player && player.state.status === AudioPlayerStatus.Playing) {
        // 現在再生中の場合は待機
        return
    }
    
    const nextText = queue.shift()
    if (nextText) {
        console.log(`📢 キューから音声読み上げ: "${nextText}"`)
        await speakText(nextText, guildId)
    }
}

/**
 * テキストを音声で読み上げ
 */
async function speakText(text: string, guildId: string): Promise<void> {
    try {
        const connection = activeConnections.get(guildId)
        if (!connection) {
            console.log('⚠️ 音声接続がありません')
            return
        }
        
        // 音声ファイルを作成
        const audioPath = await createAudioFile(text, guildId)
        if (!audioPath) {
            console.error('❌ 音声ファイルの作成に失敗')
            return
        }
        
        // 音声を再生
        await playAudio(connection, audioPath, guildId)
        
    } catch (error) {
        console.error('❌ テキスト読み上げエラー:', error)
    }
}

/**
 * ボイスチャンネルに接続
 */
export async function joinVoiceChannelById(client: Client, guildId: string, voiceChannelId: string): Promise<VoiceConnection | null> {
    try {
        // VoiceVoxの可用性をチェック
        const isVoiceVoxAvailable = await checkVoiceVoxAvailability()
        if (!isVoiceVoxAvailable) {
            console.error('❌ VoiceVoxサーバーが利用できないため、音声読み上げ機能を開始できません')
            return null
        }
        const guild = client.guilds.cache.get(guildId)
        if (!guild) {
            console.error('❌ ギルドが見つかりません:', guildId)
            return null
        }
        
        const voiceChannel = guild.channels.cache.get(voiceChannelId) as VoiceChannel
        if (!voiceChannel || voiceChannel.type !== 2) { // ChannelType.GuildVoice = 2
            console.error('❌ ボイスチャンネルが見つかりません:', voiceChannelId)
            return null
        }
        
        // 既存の接続を切断
        const existingConnection = activeConnections.get(guildId)
        if (existingConnection) {
            existingConnection.destroy()
            activeConnections.delete(guildId)
        }
        
        // 新しい接続を作成
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: guildId,
            adapterCreator: guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        })
        
        activeConnections.set(guildId, connection)
        
        // メッセージキューを初期化
        messageQueues.set(guildId, [])
        
        console.log(`✅ ボイスチャンネル接続成功: ${voiceChannel.name} (${guildId})`)
        return connection
        
    } catch (error) {
        console.error('❌ ボイスチャンネル接続エラー:', error)
        return null
    }
}

/**
 * ボイスチャンネルから切断
 */
export function leaveVoiceChannel(guildId: string): void {
    try {
        const connection = activeConnections.get(guildId)
        if (connection) {
            connection.destroy()
            activeConnections.delete(guildId)
        }
        
        const player = audioPlayers.get(guildId)
        if (player) {
            player.stop()
            audioPlayers.delete(guildId)
        }
        
        messageQueues.delete(guildId)
        
        console.log(`✅ ボイスチャンネル切断完了: ${guildId}`)
        
    } catch (error) {
        console.error('❌ ボイスチャンネル切断エラー:', error)
    }
}

/**
 * メッセージを音声読み上げキューに追加
 */
export async function addToSpeechQueue(text: string, guildId: string): Promise<void> {
    try {
        const connection = activeConnections.get(guildId)
        if (!connection) {
            console.log('⚠️ 音声接続がないため読み上げをスキップ')
            return
        }
        
        // テキストを整理（メンションや絵文字を除去）
        const cleanText = cleanTextForSpeech(text)
        if (!cleanText) {
            return
        }
        
        console.log(`📝 読み上げキューに追加: "${cleanText}"`)
        
        const player = audioPlayers.get(guildId)
        if (player && player.state.status === AudioPlayerStatus.Playing) {
            // 現在再生中の場合はキューに追加
            const queue = messageQueues.get(guildId) || []
            queue.push(cleanText)
            messageQueues.set(guildId, queue)
            console.log(`⏳ キューに追加（現在${queue.length}件待機中）`)
        } else {
            // すぐに読み上げ
            await speakText(cleanText, guildId)
        }
        
    } catch (error) {
        console.error('❌ 音声読み上げキュー追加エラー:', error)
    }
}

/**
 * 読み上げ用にテキストをクリーンアップ
 */
function cleanTextForSpeech(text: string): string {
    // メンション除去
    text = text.replace(/<@!?\d+>/g, '')
    text = text.replace(/<@&\d+>/g, '')
    text = text.replace(/<#\d+>/g, '')
    
    // カスタム絵文字除去
    text = text.replace(/<a?:\w+:\d+>/g, '')
    
    // URL除去
    text = text.replace(/https?:\/\/[^\s]+/g, 'リンク')
    
    // 改行を句読点に
    text = text.replace(/\n+/g, '。')
    
    // 連続する空白を削除
    text = text.replace(/\s+/g, ' ')
    
    // 前後の空白削除
    text = text.trim()
    
    // 長すぎるテキストは切り詰め（送信者名も考慮）
    if (text.length > 80) {
        text = text.substring(0, 80) + '、以下省略'
    }
    
    // 空文字列や記号のみの場合はスキップ
    if (!text || /^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]*$/.test(text)) {
        return ''
    }
    
    return text
}

/**
 * メッセージ監視を開始
 */
export function startMessageMonitoring(client: Client): void {
    console.log('🎤 VoiceVox音声読み上げ監視開始')
    
    // 起動時にVoiceVoxの可用性をチェック
    checkVoiceVoxAvailability().then(isAvailable => {
        if (isAvailable) {
            console.log('✅ VoiceVox音声読み上げ機能が利用可能です')
        } else {
            console.log('⚠️ VoiceVox音声読み上げ機能は利用できません（VoiceVoxサーバーが見つかりません）')
            console.log('💡 音声読み上げ機能を無効化するには環境変数 VOICEVOX_ENABLED=false を設定してください')
        }
    })
    
    client.on('messageCreate', async (message: Message) => {
        // ボット自身のメッセージは無視
        if (message.author.bot) return
        
        // DMは無視
        if (!message.guild) return
        
        console.log(`🔍 VoiceVox: メッセージ受信 - サーバー: ${message.guild.name}, チャンネル: ${message.channel.id}, 内容: "${message.content}"`)
        
        try {
            const config = loadVoiceChannelConfig()
            console.log('🔍 VoiceVox: 設定ファイル読み込み完了', config)
            
            const guildConfig = config[message.guild.id]
            console.log(`🔍 VoiceVox: サーバー設定:`, guildConfig)
            
            if (!guildConfig) {
                console.log('⚠️ VoiceVox: このサーバーは設定されていません')
                return
            }
            
            // 設定されたテキストチャンネルからのメッセージのみ処理
            if (message.channel.id !== guildConfig.textChannelId) {
                console.log(`⚠️ VoiceVox: チャンネル不一致 - 現在: ${message.channel.id}, 設定: ${guildConfig.textChannelId}`)
                return
            }
            
            console.log('✅ VoiceVox: チャンネル一致、音声読み上げ開始')
            
            // ボイスチャンネルに誰もいない場合は読み上げしない
            const voiceChannel = message.guild.channels.cache.get(guildConfig.voiceChannelId) as VoiceChannel
            if (!voiceChannel || voiceChannel.members.size === 0) {
                console.log('⚠️ VoiceVox: ボイスチャンネルが空です')
                return
            }
            
            // 送信者名とメッセージ内容を組み合わせて読み上げ
            const senderName = message.member?.displayName || message.author.username
            const textToSpeak = `${senderName}さん、${message.content}`
            
            console.log(`🎤 VoiceVox: 読み上げキューに追加 - "${textToSpeak}"`)
            
            // 音声読み上げキューに追加
            await addToSpeechQueue(textToSpeak, message.guild.id)
            
        } catch (error) {
            console.error('❌ メッセージ監視エラー:', error)
        }
    })
    
    // ボイスチャンネルの状態変化を監視
    client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
        try {
            const guildId = newState.guild.id
            const config = loadVoiceChannelConfig()
            const guildConfig = config[guildId]
            
            if (!guildConfig) return
            
            // 設定されたボイスチャンネルの監視
            const targetChannelId = guildConfig.voiceChannelId
            
            // チャンネルが空になった場合は切断
            if (oldState.channelId === targetChannelId) {
                const channel = newState.guild.channels.cache.get(targetChannelId) as VoiceChannel
                if (channel && channel.members.size === 0) {
                    console.log('👋 ボイスチャンネルが空になったため切断')
                    leaveVoiceChannel(guildId)
                }
            }
            
        } catch (error) {
            console.error('❌ ボイス状態変化監視エラー:', error)
        }
    })
}
