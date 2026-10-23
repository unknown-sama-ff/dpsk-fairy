import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('D:/Desktop/dpsk-fairy/promo')
const FRAMES = join(ROOT, 'frames')
const FPS = 30
const DUR = 28
const W = 1920
const H = 1080
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9222
const STAGE = 'file:///' + join(ROOT, 'stage.html').replace(/\\/g, '/')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + label)), ms))])

/* ---------------- WAV helpers ---------------- */
function readWav(buf) {
  let pos = 12
  let fmt = null
  let data = null
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    const body = pos + 8
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) }
    if (id === 'data') data = { start: body, size }
    pos = body + size + (size % 2)
  }
  return { fmt, data, buf }
}

function toMono(parsed) {
  const { fmt, data, buf } = parsed
  const samples = Math.floor(data.size / 2 / fmt.channels)
  const out = new Float32Array(samples)
  const stride = fmt.channels
  for (let i = 0; i < samples; i += 1) {
    let sum = 0
    for (let c = 0; c < stride; c += 1) sum += buf.readInt16LE(data.start + (i * stride + c) * 2) / 32768
    out[i] = sum / stride
  }
  return { samples: out, rate: fmt.rate }
}

function envelope(mono, buckets = 512) {
  const { samples, rate } = mono
  const step = Math.max(1, Math.floor(samples.length / buckets))
  const env = []
  let peak = 1e-6
  for (let b = 0; b < buckets; b += 1) {
    let sum = 0, n = 0
    for (let i = b * step; i < Math.min(samples.length, (b + 1) * step); i += 1) { sum += samples[i] * samples[i]; n += 1 }
    const rms = Math.sqrt(sum / Math.max(1, n))
    env.push(rms)
    if (rms > peak) peak = rms
  }
  return env.map(v => Math.min(1, Math.pow(v / peak, 0.65)))
}

function writeWavStereo(left, right, rate) {
  const n = left.length
  const dataSize = n * 4
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(dataSize, 40)
  let p = 44
  for (let i = 0; i < n; i += 1) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), p); p += 2
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), p); p += 2
  }
  return buf
}

/* ---------------- audio mix ---------------- */
async function buildAudio() {
  const rate = 48000
  const n = Math.floor(DUR * rate)
  const L = new Float32Array(n)
  const R = new Float32Array(n)

  // low drone with slow swells
  for (let i = 0; i < n; i += 1) {
    const t = i / rate
    const swell = 0.55 + 0.45 * Math.sin(t * 0.35 + 1.2) * Math.sin(t * 0.11)
    const s = Math.sin(2 * Math.PI * 46 * t) * 0.11
      + Math.sin(2 * Math.PI * 92.5 * t + 0.6) * 0.05
      + Math.sin(2 * Math.PI * 138 * t + 1.4) * 0.02
    L[i] += s * swell
    R[i] += s * swell * 0.96
  }

  // filtered noise bed
  let lpL = 0, lpR = 0
  for (let i = 0; i < n; i += 1) {
    const t = i / rate
    const fade = Math.min(1, t / 2.5) * Math.min(1, (DUR - t) / 2.2)
    lpL += 0.0018 * (Math.random() * 2 - 1 - lpL)
    lpR += 0.0016 * (Math.random() * 2 - 1 - lpR)
    L[i] += lpL * 0.9 * fade
    R[i] += lpR * 0.9 * fade
  }

  // beeps at scene boundaries
  const beeps = [
    [0.35, 880], [2.82, 1320], [6.62, 1046], [9.82, 1320], [13.22, 1046],
    [15.62, 880], [18.22, 1320], [21.62, 1046], [25.22, 1568], [27.3, 1760],
  ]
  for (const [at, freq] of beeps) {
    const start = Math.floor(at * rate)
    const len = Math.floor(0.07 * rate)
    for (let i = 0; i < len && start + i < n; i += 1) {
      const e = Math.exp(-i / (len * 0.22))
      const s = Math.sin(2 * Math.PI * freq * (i / rate)) * 0.075 * e
      L[start + i] += s
      R[start + i] += s
    }
  }

  // voice
  const voiceBuf = await readFile(join(ROOT, 'audio', 'hello.wav'))
  const voice = toMono(readWav(voiceBuf))
  const at = Math.floor(18.32 * rate)
  for (let i = 0; i < voice.samples.length && at + i < n; i += 1) {
    const s = voice.samples[i] * 0.92
    L[at + i] += s
    R[at + i] += s
  }

  // master fade
  for (let i = 0; i < n; i += 1) {
    const t = i / rate
    let gain = 1
    if (t < 0.4) gain = t / 0.4
    if (t > DUR - 0.7) gain = Math.max(0, (DUR - t) / 0.7)
    L[i] *= gain
    R[i] *= gain
  }
  await writeFile(join(ROOT, 'audio', 'mix.wav'), writeWavStereo(L, R, rate))
}

/* ---------------- CDP ---------------- */
async function httpJson(path) {
  const res = await fetch('http://127.0.0.1:' + PORT + path)
  return res.json()
}

async function waitForTarget(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const list = await httpJson('/json/list')
      const page = list.find(t => t.type === 'page' && t.url.startsWith('file://'))
      if (page) return page
    } catch { /* not up yet */ }
    await sleep(300)
  }
  throw new Error('devtools target not found')
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.ws.onmessage = e => this.onMessage(e.data) }
  onMessage(raw) {
    const msg = JSON.parse(raw)
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result)
    }
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  return new Cdp(ws)
}

/* ---------------- main ---------------- */
async function main() {
  await mkdir(FRAMES, { recursive: true })

  // audio + envelope
  console.log('building audio…')
  await buildAudio()
  const mono = toMono(readWav(await readFile(join(ROOT, 'audio', 'hello.wav'))))
  const env = envelope(mono, 512)
  await writeFile(join(ROOT, 'env.json'), JSON.stringify(env))

  // launch edge
  const profile = join(ROOT, '.edge-profile')
  await rm(profile, { recursive: true, force: true }).catch(() => {})
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--force-device-scale-factor=1', '--window-size=' + W + ',' + H,
    '--allow-file-access-from-files', '--remote-debugging-port=' + PORT,
    '--disable-extensions', '--disable-component-extensions-with-background-pages',
    '--no-service-autorun', '--disable-background-networking', '--disable-sync',
    '--user-data-dir=' + profile, STAGE,
  ], { stdio: 'ignore' })
  child.unref()

  console.log('waiting for devtools…')
  const target = await waitForTarget(30000)
  const cdp = await connect(target.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

  // wait for assets
  const deadline = Date.now() + 60000
  for (;;) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'window.__ready === true ? "ready" : (window.__error || "loading")', returnByValue: true })
    const v = r.result && r.result.value
    if (v === 'ready') break
    if (v && v !== 'loading') throw new Error('stage error: ' + v)
    if (Date.now() > deadline) throw new Error('assets not ready')
    await sleep(250)
  }
  // inject envelope
  await cdp.send('Runtime.evaluate', { expression: 'window.__ENV = ' + JSON.stringify(env) + '; true' })

  const total = Math.floor(DUR * FPS)
  console.log('rendering ' + total + ' frames…')
  const t0 = Date.now()
  let lastPng = null
  let failures = 0
  for (let i = 0; i < total; i += 1) {
    const t = i / FPS
    let png = lastPng
    try {
      await withTimeout(cdp.send('Runtime.evaluate', { expression: '__renderFrame(' + t + ')', returnByValue: true }), 8000, 'eval')
      const shot = await withTimeout(cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }), 12000, 'shot')
      png = Buffer.from(shot.data, 'base64')
      failures = 0
    } catch (e) {
      failures += 1
      console.log('  frame ' + i + ' skipped: ' + e.message)
      if (failures >= 5) throw new Error('renderer unresponsive at frame ' + i)
    }
    if (png) {
      await writeFile(join(FRAMES, 'f' + String(i + 1).padStart(5, '0') + '.png'), png)
      lastPng = png
    }
    if (i % 30 === 0) console.log('  ' + i + '/' + total + '  ' + Math.round((Date.now() - t0) / 1000) + 's')
  }
  console.log('frames done in ' + Math.round((Date.now() - t0) / 1000) + 's')
  try { child.kill() } catch {}
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
