const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { TranslationStore, targetRules, translateText, splitTranslation, handleTranslation } = require('../build/translation')

const rules = [
    { guildId: 'g', channelId: 'c', userId: '1', language: 'EN-US' },
    { guildId: 'g', channelId: 'c', userId: '2', language: 'KO' },
]
test('direct mentions and replies match once; author and unrelated users excluded', () => {
    assert.deepEqual(targetRules(rules, '3', ['1'], '1'), [rules[0]])
    assert.deepEqual(targetRules(rules, '3', [], '2'), [rules[1]])
    assert.deepEqual(targetRules(rules, '1', ['1']), [])
    assert.deepEqual(targetRules(rules, '3', []), [])
})
test('settings persist, update, isolate guild/channel, and remove', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'translation-'))
    try {
        const file = path.join(dir, 'settings.json')
        const store = new TranslationStore(file)
        store.set(rules[0]); store.set({ ...rules[0], language: 'JA' })
        assert.equal(new TranslationStore(file).list('g', 'c')[0].language, 'JA')
        assert.deepEqual(store.list('other', 'c'), [])
        assert.deepEqual(store.list('g', 'other'), [])
        store.remove(rules[0])
        assert.deepEqual(new TranslationStore(file).list('g', 'c'), [])
        fs.writeFileSync(file, '{}')
        assert.throws(() => new TranslationStore(file))
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})
test('DeepL Free/Pro request, automatic source detection, failures', async () => {
    const original = process.env.DEEPL_API_KEY
    try {
        process.env.DEEPL_API_KEY = 'test:fx'
        const translated = await translateText('こんにちは', 'EN-US', async (url, options) => {
            assert.equal(url, 'https://api-free.deepl.com/v2/translate')
            assert.equal(options.headers.Authorization, 'DeepL-Auth-Key test:fx')
            assert.deepEqual(JSON.parse(options.body), { text: ['こんにちは'], target_lang: 'EN-US' })
            assert.ok(options.signal)
            return Response.json({ translations: [{ text: 'Hello' }] })
        })
        assert.equal(translated, 'Hello')
        process.env.DEEPL_API_KEY = 'test-pro'
        await translateText('hello', 'JA', async url => {
            assert.equal(url, 'https://api.deepl.com/v2/translate')
            return Response.json({ translations: [{ text: 'こんにちは' }] })
        })
        for (const status of [403, 429, 456, 500]) {
            await assert.rejects(translateText('hello', 'JA', async () => new Response('', { status })), new RegExp(String(status)))
        }
        await assert.rejects(translateText('hello', 'JA', async () => Response.json({})))
        await assert.rejects(translateText('hello', 'JA', async () => { throw new Error('timeout') }))
    } finally {
        if (original === undefined) delete process.env.DEEPL_API_KEY
        else process.env.DEEPL_API_KEY = original
    }
})
test('Discord chunks preserve emoji and full output within message limit', () => {
    const text = '🌐あ'.repeat(2000)
    const parts = splitTranslation(text)
    assert.equal(parts.join(''), text)
    assert.ok(parts.every(p => p.length <= 1800 && !/[\uD800-\uDBFF]$/.test(p)))
})
test('command schema serializes all subcommands', () => {
    const { data } = require('../build/commands/translate')
    assert.deepEqual(data.toJSON().options.map(o => o.name), ['set', 'remove', 'list'])
})
test('monitor replies without pinging and ignores bots, other channels and authors', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'translation-handler-'))
    const oldKey = process.env.DEEPL_API_KEY
    const oldDir = process.env.DATA_DIR
    const oldFetch = global.fetch
    try {
        process.env.DATA_DIR = dir
        process.env.DEEPL_API_KEY = 'test:fx'
        const { getTranslationStore } = require('../build/translation')
        getTranslationStore().set(rules[0])
        const replies = []
        let calls = 0
        global.fetch = async () => { calls++; return Response.json({ translations: [{ text: 'Hello' }] }) }
        const message = {
            guild: { id: 'g', members: { me: {} } }, channelId: 'c',
            author: { id: '3', bot: false }, content: '<@1> こんにちは', cleanContent: '@User こんにちは',
            channel: { permissionsFor: () => ({ has: () => true }) },
            reply: async payload => replies.push(payload),
        }
        await handleTranslation(message)
        assert.equal(calls, 1)
        assert.deepEqual(replies[0].allowedMentions, { parse: [], repliedUser: false })
        await handleTranslation({ ...message, author: { id: '1', bot: false } })
        await handleTranslation({ ...message, author: { id: '3', bot: true } })
        await handleTranslation({ ...message, channelId: 'other' })
        assert.equal(calls, 1)
        await handleTranslation({ ...message, content: 'reply', reference: { messageId: 'm' }, fetchReference: async () => ({ author: { id: '1' } }) })
        assert.equal(calls, 2)
        await handleTranslation({ ...message, reference: { messageId: 'm' }, fetchReference: async () => { throw new Error('deleted') } })
        assert.equal(calls, 3)
        global.fetch = async () => new Response('', { status: 456 })
        await handleTranslation(message)
        assert.match(replies.at(-1).content, /翻訳に失敗/)
    } finally {
        global.fetch = oldFetch
        if (oldKey === undefined) delete process.env.DEEPL_API_KEY
        else process.env.DEEPL_API_KEY = oldKey
        if (oldDir === undefined) delete process.env.DATA_DIR
        else process.env.DATA_DIR = oldDir
        fs.rmSync(dir, { recursive: true, force: true })
    }
})
