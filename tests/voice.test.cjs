const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const tick = () => new Promise(resolve => setImmediate(resolve))

test('voice queue serializes synthesis, continues after API error, discards audio after leave', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-test-'))
    const oldDir = process.env.DATA_DIR
    const oldEngine = process.env.VOICEVOX_ENGINE_URL
    const oldFetch = global.fetch
    const voicePath = require.resolve('@discordjs/voice')
    const oldModule = require.cache[voicePath]
    const players = []
    const played = []
    const requests = []
    let release
    let blocked = new Promise(resolve => { release = resolve })
    const waitUntil = async predicate => {
        for (let i = 0; i < 100; i++) { if (predicate()) return; await tick() }
        assert.fail('condition was not reached')
    }
    process.env.DATA_DIR = dir
    process.env.VOICEVOX_ENGINE_URL = 'http://voicevox.test'
    require.cache[voicePath] = { exports: {
        AudioPlayerStatus: { Idle: 'idle', Playing: 'playing' },
        VoiceConnectionStatus: { Ready: 'ready', Disconnected: 'disconnected' },
        NoSubscriberBehavior: { Play: 'play' },
        joinVoiceChannel: () => Object.assign(new EventEmitter(), { subscribe() {}, destroy() {} }),
        createAudioPlayer: () => {
            const player = Object.assign(new EventEmitter(), {
                state: { status: 'idle' },
                play(file) { played.push(fs.readFileSync(file, 'utf8')); this.state.status = 'playing' },
                stop() { this.state.status = 'idle' },
            })
            players.push(player)
            return player
        },
        createAudioResource: file => file,
        entersState: async (object, state) => { await tick(); if (object.state) object.state.status = state; return object },
    } }
    global.fetch = async (url, options) => {
        const parsed = new URL(url)
        if (parsed.pathname === '/audio_query') {
            const text = parsed.searchParams.get('text')
            requests.push(text)
            if (text === 'first' || text === 'after-leave') await blocked
            if (text === 'failure') return new Response('', { status: 500 })
            return Response.json({ text })
        }
        const query = JSON.parse(options.body)
        assert.equal(query.speedScale, 0.9)
        return new Response(query.text)
    }
    let api
    try {
        api = require('../build/voice_web_api')
        await api.joinVoiceChannelWeb({ id: 'vc', name: 'test', guild: { id: 'test-guild', voiceAdapterCreator: {} } }, { id: 'tc', send: async () => {} })
        await api.speakTextWeb('first', 'test-guild')
        await api.speakTextWeb('failure', 'test-guild')
        await api.speakTextWeb('third', 'test-guild')
        assert.deepEqual(requests, ['first'])
        release()
        await waitUntil(() => played.length === 2 && players[0].state.status === 'idle')
        assert.deepEqual(requests, ['first', 'failure', 'third'])
        assert.deepEqual(played, ['first', 'third'])
        await tick()
        blocked = new Promise(resolve => { release = resolve })
        await api.speakTextWeb('after-leave', 'test-guild')
        api.leaveVoiceChannelWeb('test-guild')
        release()
        for (let i = 0; i < 10; i++) await tick()
        assert.deepEqual(played, ['first', 'third'])
    } finally {
        api?.leaveVoiceChannelWeb('test-guild')
        global.fetch = oldFetch
        if (oldModule) require.cache[voicePath] = oldModule
        else delete require.cache[voicePath]
        if (oldDir === undefined) delete process.env.DATA_DIR
        else process.env.DATA_DIR = oldDir
        if (oldEngine === undefined) delete process.env.VOICEVOX_ENGINE_URL
        else process.env.VOICEVOX_ENGINE_URL = oldEngine
        fs.rmSync(dir, { recursive: true, force: true })
    }
})
