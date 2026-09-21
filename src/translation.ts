import fs from 'fs'
import path from 'path'
import { Client, Message, PermissionFlagsBits } from 'discord.js'

export interface TranslationRule {
    guildId: string
    channelId: string
    userId: string
    language: string
}

export class TranslationStore {
    private rules: TranslationRule[]
    constructor(private readonly file: string) {
        this.rules = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
        if (!Array.isArray(this.rules) || this.rules.some(r =>
            !r || !['guildId', 'channelId', 'userId', 'language'].every(k => typeof r[k as keyof TranslationRule] === 'string'))) {
            throw new Error('翻訳設定ファイルの形式が不正です')
        }
    }
    list(guildId: string, channelId: string): TranslationRule[] {
        return this.rules.filter(r => r.guildId === guildId && r.channelId === channelId).map(r => ({ ...r }))
    }
    set(rule: TranslationRule): void {
        this.save([...this.rules.filter(r => !this.matches(r, rule)), rule])
    }
    remove(rule: Omit<TranslationRule, 'language'>): void {
        this.save(this.rules.filter(r => !this.matches(r, rule)))
    }
    private matches(a: TranslationRule, b: Omit<TranslationRule, 'language'>): boolean {
        return a.guildId === b.guildId && a.channelId === b.channelId && a.userId === b.userId
    }
    private save(rules: TranslationRule[]): void {
        fs.mkdirSync(path.dirname(this.file), { recursive: true })
        fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(rules, null, 2), { mode: 0o600 })
        fs.renameSync(`${this.file}.tmp`, this.file)
        this.rules = rules
    }
}

let store: TranslationStore | undefined
export function getTranslationStore(): TranslationStore {
    return store ??= new TranslationStore(path.resolve(process.env.DATA_DIR || 'config', 'translation.json'))
}

export function targetRules(rules: TranslationRule[], authorId: string, mentionedIds: string[], replyAuthorId?: string): TranslationRule[] {
    return rules.filter(r => r.userId !== authorId && (mentionedIds.includes(r.userId) || r.userId === replyAuthorId))
}

export async function translateText(text: string, language: string, request: typeof fetch = fetch): Promise<string> {
    const key = process.env.DEEPL_API_KEY
    if (!key) throw new Error('DEEPL_API_KEY が未設定です')
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'
    const response = await request(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text], target_lang: language }),
        signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`DeepL HTTP ${response.status}`)
    const result = await response.json() as { translations?: { text?: string }[] }
    const translated = result.translations?.[0]?.text
    if (typeof translated !== 'string' || !translated.trim()) throw new Error('DeepL の応答が不正です')
    return translated
}

export function splitTranslation(text: string, limit = 1800): string[] {
    const characters = Array.from(text)
    const parts: string[] = []
    let part = ''
    for (const character of characters) {
        if (part.length + character.length > limit) { parts.push(part); part = '' }
        part += character
    }
    if (part) parts.push(part)
    return parts
}

export async function handleTranslation(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.webhookId || !message.content.trim() || !process.env.DEEPL_API_KEY) return
    const rules = getTranslationStore().list(message.guild.id, message.channelId)
    if (!rules.length) return
    const me = message.guild.members.me
    if (!me || !('permissionsFor' in message.channel) || !message.channel.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory,
    ])) return
    let replyAuthorId: string | undefined
    if (message.reference?.messageId) {
        try { replyAuthorId = (await message.fetchReference()).author.id }
        catch { /* 削除済みの返信元でも明示メンションは処理する */ }
    }
    const mentioned = [...message.content.matchAll(/<@!?(\d+)>/g)].map(m => m[1])
    const targets = targetRules(rules, message.author.id, mentioned, replyAuthorId)
    const languages = new Set(targets.map(r => r.language))
    for (const language of languages) {
        try {
            const translated = await translateText(message.cleanContent, language)
            const users = targets.filter(r => r.language === language).map(r => `<@${r.userId}>`).join(' ')
            for (const part of splitTranslation(`🌐 ${language} / ${users}\n${translated}`)) {
                await message.reply({ content: part, allowedMentions: { parse: [], repliedUser: false } })
            }
        } catch (error) {
            // APIキーや本文をログへ出さない。
            console.error('[translation]', error instanceof Error ? error.message : '翻訳失敗')
            await message.reply({ content: `⚠️ ${language} への翻訳に失敗しました。管理者はDeepLのキー・利用上限を確認してください。`, allowedMentions: { parse: [], repliedUser: false } }).catch(() => undefined)
        }
    }
}

export function startTranslationMonitoring(client: Client): void {
    getTranslationStore()
    // 全体の同時実行・待機数を制限し、API障害時にも無制限に蓄積しない。
    let pending = 0
    let tail = Promise.resolve()
    client.on('messageCreate', message => {
        if (!message.guildId || message.author.bot || message.webhookId || !message.content.trim() ||
            !process.env.DEEPL_API_KEY || !getTranslationStore().list(message.guildId, message.channelId).length) return
        if (pending >= 100) { console.warn('[translation] queue full; skipped message'); return }
        pending++
        tail = tail.then(() => handleTranslation(message)).catch(() => {
            console.error('[translation] メッセージ処理に失敗しました')
        }).finally(() => { pending-- })
    })
}
