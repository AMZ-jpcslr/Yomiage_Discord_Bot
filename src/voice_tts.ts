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
    }
}

// 音声チャンネル設定ファイル
const VOICE_CONFIG_FILE = path.resolve(__dirname, '../data/voice_channels.json')

/**
 * 音声チャンネル設定を読み込み
 */
function loadVoiceChannelConfig(): VoiceChannelConfig {
    try {
        if (fs.existsSync(VOICE_CONFIG_FILE)) {
            const data = fs.readFileSync(VOICE_CONFIG_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('音声チャンネル設定の読み込みエラー:', error)
    }
    return {}
}

/**
 * 音声チャンネル設定を保存
 */
function saveVoiceChannelConfig(config: VoiceChannelConfig): void {
    try {
        const dir = path.dirname(VOICE_CONFIG_FILE)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(config, null, 2))
        console.log('✅ 音声チャンネル設定保存完了')
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
 * VoiceVox APIで音声合成
 */
async function synthesizeVoice(text: string): Promise<Buffer | null> {
    try {
        console.log(`🎤 VoiceVox音声合成開始: "${text}"`)
        
        // まず音素クエリを取得
        const queryResponse = await fetch(`${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${ZUNDAMON_SPEAKER_ID}`, {
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
        
        // 音声合成を実行
        const synthesisResponse = await fetch(`${VOICEVOX_API_URL}/synthesis?speaker=${ZUNDAMON_SPEAKER_ID}`, {
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
            fs.mkdirSync(AUDIO_DIR, { recursive: true })
        }
        
        // VoiceVoxで音声合成
        const audioBuffer = await synthesizeVoice(text)
        if (!audioBuffer) {
            return null
        }
        
        // 音声ファイルを保存
        const timestamp = Date.now()
        const filename = `voice_${guildId}_${timestamp}.wav`
        const filepath = path.join(AUDIO_DIR, filename)
        
        fs.writeFileSync(filepath, audioBuffer)
        console.log(`💾 音声ファイル保存完了: ${filepath}`)
        
        return filepath
        
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
    
    // 長すぎるテキストは切り詰め
    if (text.length > 100) {
        text = text.substring(0, 100) + '、以下省略'
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
        
        try {
            const config = loadVoiceChannelConfig()
            const guildConfig = config[message.guild.id]
            
            if (!guildConfig) return
            
            // 設定されたテキストチャンネルからのメッセージのみ処理
            if (message.channel.id !== guildConfig.textChannelId) return
            
            // ボイスチャンネルに誰もいない場合は読み上げしない
            const voiceChannel = message.guild.channels.cache.get(guildConfig.voiceChannelId) as VoiceChannel
            if (!voiceChannel || voiceChannel.members.size === 0) return
            
            // 音声読み上げキューに追加
            await addToSpeechQueue(message.content, message.guild.id)
            
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
