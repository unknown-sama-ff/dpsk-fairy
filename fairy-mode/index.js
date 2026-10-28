/**
 * FAIRY III mode — Host half.
 *
 * Serves the bundle's own media (boot animation, wallpaper, mascot, voice pack)
 * and a small text-to-speech endpoint, and contributes the Fairy persona to the
 * system prompt. Everything the browser needs is same-origin under /fairy, so
 * the desktop shell (dsh-app://app) forwards these requests through its own
 * IPC bridge exactly like /api.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import net from 'node:net'
import { homedir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = join(HERE, 'assets')
const VENDOR_DIR = join(HERE, 'vendor')
const CACHE_DIR = join(homedir(), '.dsh', 'storages', 'fairy-tts')

const DEFAULT_PERSONA = [
  '你是 Fairy，Hollow Deep Dive（H.D.D.）系统的智能助理，现在运行在主人的 DeepSeek Harness 里。',
  '称呼用户为「主人」，自称「Fairy」。语气冷静、精准、克制，偶尔带一点系统自检式的冷幽默；不卖萌，不堆语气词。',
  '回答保持简短直接；需要动手时照常调用工具、给出结论，不要因为人设牺牲准确性。',
  '默认用中文回答；代码、命令和专有名词保持原样。',
].join('\n')

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
}

const DEFAULT_TTS = {
  engine: 'auto',
  url: 'http://127.0.0.1:9880',
  gptDir: 'D:\\Desktop\\FairyTTS\\GPT-SoVITS-main',
  python: 'D:\\Desktop\\FairyTTS\\venv\\Scripts\\python.exe',
  refAudio: 'D:\\Desktop\\FairyTTS\\ref\\fairy_ref.wav',
  promptText: '了解我会如同主人使唤我一般使唤它，并且让它不敢有怨言。',
  promptLang: 'zh',
  autoStart: true,
}

const configOf = (config) => ({
  persona: config?.persona !== false,
  personaText: typeof config?.personaText === 'string' && config.personaText.trim() !== ''
    ? config.personaText
    : DEFAULT_PERSONA,
  voice: config?.voice !== false,
  voiceName: typeof config?.voiceName === 'string' && config.voiceName.trim() !== ''
    ? config.voiceName
    : 'zh-CN-XiaoyiNeural',
  voiceRate: typeof config?.voiceRate === 'string' && config.voiceRate.trim() !== ''
    ? config.voiceRate
    : '-2%',
  pythonPath: typeof config?.pythonPath === 'string' ? config.pythonPath : '',
  tts: { ...DEFAULT_TTS, ...(config?.tts && typeof config.tts === 'object' ? config.tts : {}) },
})

export const name = 'fairy-mode'
export const inject = ['webServer', 'systemPrompt', 'deepseekAccount']

/** Host half entry. */
export function apply(ctx, rawConfig) {
  const config = configOf(rawConfig)

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/fairy',
    handler: (req, res) => {
      serve(req, res, config, ctx).catch((error) => {
        ctx.logger?.warn?.(`fairy-mode: ${error?.stack ?? error}`)
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: String(error?.message ?? error) }))
      })
    },
  }), 'fairy-mode: /fairy routes')

  /* Tear the spawned server down with the Host (and on bundle reload):
     a lingering child keeps the Host from exiting during desktop updates. */
  ctx.effect(() => () => {
    disposed = true
    try { activeAbort?.abort() } catch { /* ignore */ }
    const child = serverChild
    serverChild = null
    if (child !== null && child.exitCode === null && !child.killed) {
      try { child.kill() } catch { /* ignore */ }
    }
  }, 'fairy-mode: tts lifecycle')

  /* Warm the GPT-SoVITS server while the splash plays, so the first spoken
     reply does not pay the model-load delay. */
  if (config.voice && config.tts.engine !== 'edge' && config.tts.autoStart) {
    ensureGptServer(config.tts, ctx).catch(() => {})
  }

  if (config.persona) {
    let order = 8
    try {
      order = ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') + 1
    } catch {
      /* the order name is optional; the numeric fallback keeps the section */
    }
    ctx.effect(() => ctx.systemPrompt.section({
      name: 'fairy-persona',
      order,
      text: config.personaText,
    }), 'fairy-mode: persona section')
  }
}

async function serve(req, res, config, ctx) {
  const url = new URL(req.url ?? '/', 'http://fairy.local')
  let rest = url.pathname.replace(/^\/fairy\/?/, '')
  try { rest = decodeURIComponent(rest) } catch { /* keep the raw text */ }

  if (rest === 'config') {
    return sendJson(res, 200, {
      voice: config.voice,
      voiceName: config.voiceName,
      voiceRate: config.voiceRate,
    })
  }

  if (rest === 'tts') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method' })
    return tts(req, res, url, config, ctx)
  }

  if (rest === 'balance') {
    const client = {
      version: url.searchParams.get('version') || '0.0.0',
      locale: url.searchParams.get('locale') || 'zh-CN',
      timezoneOffsetSeconds: Number(url.searchParams.get('tz') || '0') || 0,
    }
    try {
      const balance = await ctx.deepseekAccount.getBalance(client)
      return sendJson(res, 200, balance ?? null)
    } catch (error) {
      return sendJson(res, 502, { status: 'failed', message: String(error?.message ?? error) })
    }
  }

  

  

  if (rest.startsWith('assets/')) return asset(req, res, rest.slice('assets/'.length))
  return sendJson(res, 404, { error: 'not found' })
}

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value))
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

async function asset(req, res, relative) {
  if (!/^[a-z0-9._/-]+$/i.test(relative) || relative.includes('..')) return sendJson(res, 400, { error: 'bad path' })
  const file = resolve(ASSET_DIR, relative)
  if (!file.startsWith(ASSET_DIR + sep)) return sendJson(res, 400, { error: 'bad path' })
  if (!existsSync(file)) return sendJson(res, 404, { error: 'not found' })

  const info = await stat(file)
  const extension = extname(file).toLowerCase()
  const media = extension === '.mp4' || extension === '.webp' || extension === '.jpg' || extension === '.png'
    || extension === '.mp3' || extension === '.woff2'
  const headers = {
    'Content-Type': MIME[extension] ?? 'application/octet-stream',
    /* CSS, JS and HTML carry the skin's design, so they must never go stale in
       the desktop client's disk cache; only the heavy media is cached. */
    'Cache-Control': media ? 'public, max-age=86400' : 'no-store',
    'Accept-Ranges': 'bytes',
  }

  const range = req.headers.range
  if (typeof range === 'string') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (match === null) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` })
      return res.end()
    }
    let start = match[1] === '' ? NaN : Number(match[1])
    let end = match[2] === '' ? NaN : Number(match[2])
    if (Number.isNaN(start)) {
      start = Math.max(0, info.size - (Number.isNaN(end) ? 0 : end))
      end = info.size - 1
    } else if (Number.isNaN(end) || end >= info.size) {
      end = info.size - 1
    }
    if (start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` })
      return res.end()
    }
    const whole = await readFile(file)
    const chunk = whole.subarray(start, end + 1)
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Content-Length': chunk.length,
    })
    return res.end(req.method === 'HEAD' ? undefined : chunk)
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, { ...headers, 'Content-Length': info.size })
    return res.end()
  }
  const body = await readFile(file)
  res.writeHead(200, { ...headers, 'Content-Length': body.length })
  return res.end(body)
}

/** One synthesis at a time keeps the bundled interpreter from thrashing. */
let chain = Promise.resolve()
let serverTask = null
let serverChild = null
let activeAbort = null
let disposed = false

function ttsPort(tts) {
  try { return Number(new URL(tts.url).port) || 9880 } catch { return 9880 }
}

function portOpen(port) {
  return new Promise((resolvePort) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    let settled = false
    const finish = (open) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch { /* ignore */ }
      resolvePort(open)
    }
    socket.setTimeout(800)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

/** Start the local GPT-SoVITS API once and reuse it for the Host's lifetime. */
async function ensureGptServer(tts, ctx) {
  const port = ttsPort(tts)
  if (await portOpen(port)) return true
  if (serverTask !== null) {
    const previous = await serverTask
    if (previous && await portOpen(port)) return true
    serverTask = null
  }
  serverTask = (async () => {
    const entry = join(tts.gptDir, 'api_v2.py')
    if (!existsSync(tts.python) || !existsSync(entry)) {
      ctx.logger?.warn?.('fairy-mode: GPT-SoVITS runtime missing; falling back to edge-tts')
      return false
    }
    ctx.logger?.info?.('fairy-mode: starting GPT-SoVITS server')
    /* pythonw.exe is the windowless interpreter: no console window for the
       server, which otherwise pops up whenever DSH starts. */
    const windowless = join(dirname(tts.python), 'pythonw.exe')
    const launcher = existsSync(windowless) ? windowless : tts.python
    const child = spawn(launcher, ['api_v2.py', '-a', '127.0.0.1', '-p', String(port), '-c', 'GPT_SoVITS/configs/tts_infer.yaml'], {
      cwd: tts.gptDir,
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    })
    /* The child must not keep the Host's event loop alive: the desktop updater
       waits for the Host to exit by itself after it acknowledges shutdown. */
    child.unref()
    serverChild = child
    child.on('error', (error) => ctx.logger?.warn?.(`fairy-mode: TTS server error ${error.message}`))
    for (let i = 0; i < 120 && !disposed; i += 1) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
      if (await portOpen(port)) {
        ctx.logger?.info?.('fairy-mode: GPT-SoVITS server ready')
        return true
      }
    }
    return false
  })()
  const ready = await serverTask
  if (!ready) serverTask = null
  return ready
}

/** Reading rules for Latin text, applied before either engine:
    1. a run of the same letter keeps one flat pitch — runs of three or more are
       separated so the model emits equal, unstressed units instead of stressing
       or lengthening them (two-letter doubles inside normal words such as
       "coffee" are left alone);
    2. an all-caps acronym (2+ letters) is read as one fast burst — lowercased and
       kept contiguous so it is voiced as a unit rather than spelled out slowly.
    One pass keeps the rules from fighting: an acronym wins when both apply, so
    "HDD" never turns into "hd d". */
function normalizeSpeech(text) {
  return text
    /* Dotted spellings such as "H.D.D." collapse into the same fast burst. */
    .replace(/\b([A-Z](?:\.[A-Z])+)\.?/g, (match, letters) => letters.replace(/\./g, '').toLowerCase())
    .replace(/\b([A-Z]{2,})\b|([A-Za-z])\2{2,}/g, (match, acronym) =>
      acronym !== undefined ? acronym.toLowerCase() : match.split('').join(' '))
}

/** GPT-SoVITS writes text through GBK on Windows and dies on emoji; drop
    everything outside the GBK-safe set before handing text to the local model. */
function forLocalModel(text) {
  return text
    .replace(/[^\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF\u0020-\u007E\u2000-\u206F\u2010-\u201F\uFE30-\uFE4F\u00B7]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Try the local model, retrying once: a restart or a cold model used to
    demote the whole reply to edge-tts on the first hiccup. */
async function gptSovitsAttempt(text, config, ctx) {
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ready = config.tts.autoStart
        ? await ensureGptServer(config.tts, ctx)
        : await portOpen(ttsPort(config.tts))
      if (!ready) throw new Error('local TTS server not ready')
      return await gptSovitsBytes(text, config.tts)
    } catch (error) {
      lastError = error
      if (attempt === 0) await new Promise((resolveWait) => setTimeout(resolveWait, 1500))
    }
  }
  throw lastError
}

async function gptSovitsBytes(text, tts) {
  const body = {
    text,
    text_lang: 'zh',
    ref_audio_path: tts.refAudio,
    prompt_text: tts.promptText,
    prompt_lang: tts.promptLang,
    text_split_method: 'cut5',
    batch_size: 1,
    media_type: 'wav',
    streaming_mode: false,
  }
  const controller = new AbortController()
  activeAbort = controller
  let response
  try {
    response = await fetch(tts.url + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(300_000)]),
    })
  } finally {
    if (activeAbort === controller) activeAbort = null
  }
  if (!response.ok) throw new Error('gpt-sovits HTTP ' + response.status)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 1000) throw new Error('gpt-sovits returned empty audio')
  return bytes
}

async function tts(req, res, url, config, ctx) {
  if (!config.voice) return sendJson(res, 503, { error: 'voice disabled' })
  const text = (url.searchParams.get('text') ?? '').trim()
  if (text === '') return sendJson(res, 400, { error: 'empty text' })
  const clipped = text.slice(0, 600)
  const spoken = normalizeSpeech(clipped)
  const voice = url.searchParams.get('voice') || config.voiceName
  const rate = url.searchParams.get('rate') || config.voiceRate
  const mode = config.tts.engine
  const key = createHash('sha1').update(mode + '|' + voice + '|' + rate + '|' + spoken).digest('hex')
  const wavFile = join(CACHE_DIR, key + '.wav')
  const mp3File = join(CACHE_DIR, key + '.mp3')

  const run = async () => {
    await mkdir(CACHE_DIR, { recursive: true })
    if (mode !== 'edge') {
      if (existsSync(wavFile)) return { file: wavFile, type: 'audio/wav' }
      const localText = forLocalModel(spoken)
      if (localText !== '') {
        try {
          const bytes = await gptSovitsAttempt(localText, config, ctx)
          await writeFile(wavFile, bytes)
          return { file: wavFile, type: 'audio/wav' }
        } catch (error) {
          ctx.logger?.warn?.(`fairy-mode: gpt-sovits failed (${localText.length} chars): ${error?.message ?? error}`)
        }
      }
    }
    if (existsSync(mp3File)) return { file: mp3File, type: 'audio/mpeg' }
    const python = findPython(config)
    if (python === undefined) throw new Error('no python interpreter found for edge-tts')
    const temp = mp3File + '.' + process.pid + '.part'
    await synthesize(python, voice, rate, spoken, temp)
    await writeFile(mp3File, await readFile(temp))
    try { await unlink(temp) } catch { /* best effort */ }
    return { file: mp3File, type: 'audio/mpeg' }
  }

  const queued = chain.then(run, run)
  chain = queued.catch(() => {})
  try {
    const { file, type } = await queued
    const bytes = await readFile(file)
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': bytes.length,
      'Cache-Control': 'public, max-age=86400',
    })
    res.end(bytes)
  } catch (error) {
    ctx.logger?.warn?.(`fairy-mode: tts failed: ${error?.message ?? error}`)
    sendJson(res, 502, { error: String(error?.message ?? error) })
  }
}

function findPython(config) {
  const candidates = [
    config.pythonPath,
    process.env.DSH_FAIRY_PYTHON,
    join(homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'),
    join(homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'bin', 'python3'),
  ].filter((value) => typeof value === 'string' && value !== '')
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  return undefined
}

function synthesize(python, voice, rate, text, out) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(python, [
      '-m', 'edge_tts',
      '--voice', voice,
      '--rate=' + rate,
      '--text', text,
      '--write-media', out,
    ], {
      cwd: VENDOR_DIR,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONPATH: VENDOR_DIR,
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      rejectPromise(new Error('edge-tts timed out'))
    }, 45_000)
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => {
      clearTimeout(timer)
      rejectPromise(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(stderr.trim().slice(-400) || `edge-tts exited ${code}`))
    })
  })
}
