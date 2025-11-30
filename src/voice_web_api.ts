/**
 * VoiceVox Web API音声読み上げ機能
 * https://voicevox.su-shiki.com/su-shikiapis/
 */

import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus,
    AudioPlayer,
    VoiceConnection 
} from '@discordjs/voice'
import { VoiceBasedChannel, TextChannel, Guild } from 'discord.js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// 環境変数を読み込み
dotenv.config()

// VoiceVox Web API設定
const VOICEVOX_WEB_API_URL = 'https://deprecatedapis.tts.quest/v2/voicevox/audio/'
const VOICEVOX_SPEAKERS_API_URL = 'https://deprecatedapis.tts.quest/v2/voicevox/speakers/'
const VOICEVOX_API_KEY = process.env.VOICEVOX_API_KEY || '' // 環境変数から取得

// デバッグログ
console.log('🔧 VoiceVox Web API初期化:', {
    apiKeySet: !!VOICEVOX_API_KEY,
    apiKeyLength: VOICEVOX_API_KEY.length,
    env: process.env.NODE_ENV
})

// 音声設定インターフェース
interface VoiceSettings {
    speakerId: number
    speed: number
    pitch: number
    intonationScale: number
}

// 音声チャンネル設定
interface VoiceChannelConfig {
    [guildId: string]: {
        voiceChannelId: string
        textChannelId: string
        settings: VoiceSettings
    }
}

// デフォルト音声設定（より自然な設定）
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
    speakerId: 2,           // 四国めたん（ノーマル）
    speed: 0.9,             // 自然な速度
    pitch: 0.02,            // わずかに高めの音程
    intonationScale: 1.1    // 豊かなイントネーション
}

// 設定ファイルパス
const VOICE_CONFIG_FILE = path.resolve(__dirname, '../config/voice_web_config.json')

// 音声ファイル保存ディレクトリ
const AUDIO_DIR = path.resolve(__dirname, '../audio_web')

// アクティブな音声接続を管理
const activeConnections = new Map<string, VoiceConnection>()
const audioPlayers = new Map<string, AudioPlayer>()
const messageQueues = new Map<string, string[]>()

/**
 * スピーカー情報を取得
 */
async function getSpeakers(): Promise<unknown[]> {
    try {
        // APIキーが設定されていない場合はスキップ
        if (!VOICEVOX_API_KEY) {
            console.warn('⚠️ VoiceVox Web API: APIキーが設定されていません')
            return []
        }

        const url = `${VOICEVOX_SPEAKERS_API_URL}?key=${VOICEVOX_API_KEY}`

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Discord Bot VoiceVox Integration'
            }
        })
        
        if (!response.ok) {
            if (response.status === 403) {
                console.warn('⚠️ VoiceVox Web API: APIキーが無効または期限切れです')
            } else {
                console.warn(`⚠️ VoiceVox Web API スピーカー取得エラー: ${response.status}`)
            }
            return []
        }

        const speakers: unknown[] = await response.json()
        console.log('✅ VoiceVox Web API スピーカー情報取得完了')
        return speakers
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn('⚠️ スピーカー情報取得エラー（ネットワークまたはタイムアウト）:', errorMessage)
        return []
    }
}

/**
 * Web APIで音声合成
 */
async function synthesizeVoiceWeb(text: string, settings: VoiceSettings): Promise<Buffer | null> {
    try {
        console.log(`🎤 VoiceVox Web API音声合成開始: "${text}"`)
        console.log(`🎭 設定: Speaker ${settings.speakerId}, Speed ${settings.speed}, Pitch ${settings.pitch}, Intonation ${settings.intonationScale}`)

        // APIパラメータを構築
        const params = new URLSearchParams({
            text: text,
            speaker: settings.speakerId.toString(),
            speed: settings.speed.toString(),
            pitch: settings.pitch.toString(),
            intonationScale: settings.intonationScale.toString()
        })

        // APIキーが設定されている場合は追加
        if (VOICEVOX_API_KEY) {
            params.append('key', VOICEVOX_API_KEY)
        }

        const url = `${VOICEVOX_WEB_API_URL}?${params.toString()}`
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Discord Bot VoiceVox Integration'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ VoiceVox Web API音声合成エラー:', response.status, errorText)
            
            // エラーメッセージの解析
            if (errorText.includes('invalidApiKey')) {
                console.error('🔑 無効なAPIキーです')
            } else if (errorText.includes('notEnoughPoints')) {
                console.error('📊 APIポイントが不足しています')
            } else if (errorText.includes('failed')) {
                console.error('🔧 音声合成に失敗しました')
            }
            
            return null
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer())
        console.log(`✅ VoiceVox Web API音声合成完了: ${audioBuffer.length}bytes`)
        
        return audioBuffer
        
    } catch (error) {
        console.error('❌ VoiceVox Web API通信エラー:', error)
        return null
    }
}

/**
 * テキストを音声ファイルに変換して保存
 */
async function createAudioFileWeb(text: string, guildId: string): Promise<string | null> {
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

        // 音声設定を取得
        const settings = getVoiceSettingsWeb(guildId)
        
        // VoiceVox Web APIで音声合成
        const audioBuffer = await synthesizeVoiceWeb(text, settings)
        if (!audioBuffer) {
            return null
        }

        // 音声ファイルを保存
        const timestamp = Date.now()
        const filename = `voice_web_${guildId}_${timestamp}.wav`
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
 * 音声チャンネル設定を読み込み
 */
function loadVoiceChannelConfigWeb(): VoiceChannelConfig {
    try {
        if (fs.existsSync(VOICE_CONFIG_FILE)) {
            const data = fs.readFileSync(VOICE_CONFIG_FILE, 'utf8')
            const config = JSON.parse(data)
            console.log(`✅ 音声チャンネル設定読み込み完了: ${VOICE_CONFIG_FILE}`)
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
function saveVoiceChannelConfigWeb(config: VoiceChannelConfig): void {
    try {
        const dir = path.dirname(VOICE_CONFIG_FILE)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(config, null, 2))
        console.log(`✅ 音声チャンネル設定保存完了: ${VOICE_CONFIG_FILE}`)
    } catch (error) {
        console.error('❌ 音声チャンネル設定の保存エラー:', error)
    }
}

/**
 * 音声設定を取得
 */
function getVoiceSettingsWeb(guildId: string): VoiceSettings {
    const config = loadVoiceChannelConfigWeb()
    return config[guildId]?.settings || { ...DEFAULT_VOICE_SETTINGS }
}

/**
 * 音声設定を更新
 */
export function updateVoiceSettingsWeb(guildId: string, newSettings: Partial<VoiceSettings>): void {
    const config = loadVoiceChannelConfigWeb()
    
    if (!config[guildId]) {
        config[guildId] = {
            voiceChannelId: '',
            textChannelId: '',
            settings: { ...DEFAULT_VOICE_SETTINGS }
        }
    }
    
    // 設定を更新
    config[guildId].settings = {
        ...config[guildId].settings,
        ...newSettings
    }
    
    saveVoiceChannelConfigWeb(config)
    console.log(`✅ 音声設定更新: Guild ${guildId}`, config[guildId].settings)
}

/**
 * 音声チャンネル設定を追加
 */
export function setVoiceChannelConfigWeb(guildId: string, voiceChannelId: string, textChannelId: string): void {
    const config = loadVoiceChannelConfigWeb()
    
    config[guildId] = {
        voiceChannelId,
        textChannelId,
        settings: config[guildId]?.settings || { ...DEFAULT_VOICE_SETTINGS }
    }
    
    saveVoiceChannelConfigWeb(config)
    console.log(`✅ 音声チャンネル設定追加: Guild ${guildId}`)
}

/**
 * 音声チャンネルに接続
 */
export async function joinVoiceChannelWeb(voiceChannel: VoiceBasedChannel, textChannel: TextChannel): Promise<boolean> {
    try {
        const guildId = voiceChannel.guild.id
        
        // 設定を保存
        setVoiceChannelConfigWeb(guildId, voiceChannel.id, textChannel.id)
        
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })

        // 接続状態の監視
        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`✅ ボイスチャンネル接続完了: ${voiceChannel.name}`)
        })

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log(`📤 ボイスチャンネル切断: ${voiceChannel.name}`)
            cleanup(guildId)
        })

        // オーディオプレイヤーを作成
        const player = createAudioPlayer()
        connection.subscribe(player)

        // プレイヤーの状態監視
        player.on(AudioPlayerStatus.Playing, () => {
            console.log('🎵 音声再生開始')
        })

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('⏸️ 音声再生完了')
            processNextMessage(guildId)
        })

        player.on('error', (error: unknown) => {
            // 型が不明な場合があるので安全に処理
            const err = error instanceof Error ? error : new Error(String(error))
            console.error('❌ 音声再生エラー:', err.message, err)
            processNextMessage(guildId)
        })

        // 管理マップに追加
        activeConnections.set(guildId, connection)
        audioPlayers.set(guildId, player)
        messageQueues.set(guildId, [])

        await textChannel.send(`🎤 **VoiceVox Web API読み上げ機能が有効になりました！**\n📝 このチャンネルでメッセージを送信すると読み上げられます。`)
        
        return true
        
    } catch (error) {
        console.error('❌ ボイスチャンネル接続エラー:', error)
        return false
    }
}

/**
 * 音声チャンネルから切断
 */
export function leaveVoiceChannelWeb(guildId: string): void {
    const connection = activeConnections.get(guildId)
    if (connection) {
        connection.destroy()
    }
    cleanup(guildId)
}

/**
 * テキストを音声で読み上げ
 */
export async function speakTextWeb(text: string, guildId: string): Promise<void> {
    try {
        const queue = messageQueues.get(guildId)
        if (queue) {
            queue.push(text)
            console.log(`📝 メッセージをキューに追加: "${text}" (キュー長: ${queue.length})`)
            
            // 現在再生中でない場合はすぐに処理
            const player = audioPlayers.get(guildId)
            if (player && player.state.status === AudioPlayerStatus.Idle) {
                processNextMessage(guildId)
            }
        }
    } catch (error) {
        console.error('❌ 音声読み上げエラー:', error)
    }
}

/**
 * 次のメッセージを処理
 */
async function processNextMessage(guildId: string): Promise<void> {
    const queue = messageQueues.get(guildId)
    const player = audioPlayers.get(guildId)
    
    if (!queue || !player || queue.length === 0) {
        return
    }

    const text = queue.shift()!
    console.log(`🎤 音声読み上げ処理開始: "${text}"`)

    try {
        const audioPath = await createAudioFileWeb(text, guildId)
        if (!audioPath) {
            console.error('❌ 音声ファイル作成失敗')
            // 次のメッセージを処理
            setTimeout(() => processNextMessage(guildId), 1000)
            return
        }

        const resource = createAudioResource(audioPath)
        player.play(resource)

        // ファイル再生後に削除
        setTimeout(() => {
            try {
                fs.unlinkSync(audioPath)
                console.log(`🗑️ 音声ファイル削除: ${audioPath}`)
            } catch (e) {
                console.warn('⚠️ 音声ファイル削除失敗:', e)
            }
        }, 30000) // 30秒後に削除

    } catch (error) {
        console.error('❌ 音声処理エラー:', error)
        // エラー時も次のメッセージを処理
        setTimeout(() => processNextMessage(guildId), 1000)
    }
}

/**
 * リソースクリーンアップ
 */
function cleanup(guildId: string): void {
    activeConnections.delete(guildId)
    audioPlayers.delete(guildId)
    messageQueues.delete(guildId)
    console.log(`🧹 リソースクリーンアップ完了: Guild ${guildId}`)
}

/**
 * スピーカー名を取得
 */
export function getSpeakerNameWeb(speakerId: number): string {
    const speakerNames: { [key: number]: string } = {
        0: '四国めたん（あまあま）',
        1: 'ずんだもん（あまあま）',
        2: '四国めたん（ノーマル）',
        3: 'ずんだもん（ノーマル）',
        4: '四国めたん（セクシー）',
        5: 'ずんだもん（セクシー）',
        6: '四国めたん（ツンツン）',
        7: 'ずんだもん（ツンツン）',
        8: '春日部つむぎ（ノーマル）',
        9: '波音リツ（ノーマル）',
        10: '雨晴はう（ノーマル）',
        11: '玄野武宏（ノーマル）'
    }
    return speakerNames[speakerId] || `Speaker ${speakerId}`
}

/**
 * APIキーの設定状況確認
 */
export function checkApiKeyStatus(): string {
    if (!VOICEVOX_API_KEY) {
        return '⚠️ APIキーが設定されていません。環境変数 VOICEVOX_API_KEY を設定してください。'
    }
    return '✅ APIキーが設定されています。'
}

/**
 * メンションやDiscord記法をユーザー名に変換
 */
function replaceMentions(content: string, guild: Guild): string {
    // ユーザーメンション <@!ユーザーID> または <@ユーザーID> を置換
    let processedContent = content.replace(/<@!?(\d+)>/g, (match, userId) => {
        try {
            const member = guild.members.cache.get(userId)
            if (member) {
                const displayName = member.displayName || member.user.displayName || member.user.username
                return `@${displayName}さん`
            }
        } catch (error) {
            console.warn(`⚠️ ユーザーID ${userId} の情報取得に失敗:`, error)
        }
        return '@ユーザー'
    })
    
    // ロールメンション <@&ロールID> を置換
    processedContent = processedContent.replace(/<@&(\d+)>/g, (match, roleId) => {
        try {
            const role = guild.roles.cache.get(roleId)
            if (role) {
                return `@${role.name}`
            }
        } catch (error) {
            console.warn(`⚠️ ロールID ${roleId} の情報取得に失敗:`, error)
        }
        return '@ロール'
    })
    
    // チャンネルメンション <#チャンネルID> を置換
    processedContent = processedContent.replace(/<#(\d+)>/g, (match, channelId) => {
        try {
            const channel = guild.channels.cache.get(channelId)
            if (channel) {
                return `#${channel.name}`
            }
        } catch (error) {
            console.warn(`⚠️ チャンネルID ${channelId} の情報取得に失敗:`, error)
        }
        return '#チャンネル'
    })
    
    // カスタム絵文字 <:絵文字名:ID> または <a:絵文字名:ID> を置換
    processedContent = processedContent.replace(/<a?:([^:]+):\d+>/g, (match, emojiName) => {
        return `${emojiName}の絵文字`
    })
    
    // URL表記を簡略化
    processedContent = processedContent.replace(/https?:\/\/[^\s]+/g, 'URL')
    
    // その他のDiscord記法をクリーンアップ
    processedContent = processedContent
        .replace(/\*\*(.*?)\*\*/g, '$1')  // 太字
        .replace(/\*(.*?)\*/g, '$1')      // 斜体
        .replace(/__(.*?)__/g, '$1')      // 下線
        .replace(/~~(.*?)~~/g, '$1')      // 取り消し線
        .replace(/`([^`]+)`/g, '$1')      // インラインコード
        .replace(/```[\s\S]*?```/g, 'コードブロック')  // コードブロック
        .replace(/> (.+)/g, '引用、$1')   // 引用
    
    return processedContent
}

/**
 * メッセージ監視を開始（Web API版）
 */
export function startMessageMonitoring(client: import('discord.js').Client): void {
    console.log('🎤 VoiceVox Web API メッセージ監視開始')
    
    client.on('messageCreate', async (message: import('discord.js').Message) => {
        // ボット自身のメッセージは無視
        if (message.author.bot) return
        
        // DMは無視
        if (!message.guild) return
        
        // 設定を確認
        const config = loadVoiceChannelConfigWeb()
        const guildConfig = config[message.guild.id]
        
        // 設定されていない場合は無視
        if (!guildConfig) return
        
        // 指定されたテキストチャンネル以外は無視
        if (message.channel.id !== guildConfig.textChannelId) return
        
        // 空メッセージは無視
        if (!message.content || message.content.trim().length === 0) return
        
        // コマンドは無視
        if (message.content.startsWith('/') || message.content.startsWith('!')) return
        
        // メンションやDiscord記法をユーザー名に変換
        const processedContent = replaceMentions(message.content, message.guild)
        
        // ユーザー名 + 変換済みメッセージ内容を音声で読み上げ
        const userDisplayName = message.member?.displayName || (message.author as import('discord.js').User).username || 'ユーザー'
        const textToSpeak = `${userDisplayName}さん、${processedContent}`
        
        console.log(`🎤 音声読み上げ: ${textToSpeak}`)
        await speakTextWeb(textToSpeak, message.guild.id)
    })
}

// スピーカー情報を初期化時に取得（エラーハンドリング強化）
if (process.env.NODE_ENV !== 'deploy') {
    getSpeakers().then(speakers => {
        if (speakers.length > 0) {
            console.log(`✅ VoiceVox Web API利用可能スピーカー: ${speakers.length}個`)
        }
    }).catch(error => {
        console.warn('⚠️ スピーカー情報取得をスキップ（デプロイ時またはAPIエラー）:', error.message)
    })
}
