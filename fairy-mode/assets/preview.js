/* Standalone design preview for the FAIRY skin.
   Renders the same CSS/DOM shapes the client plugin produces, so the splash,
   greeting and dock can be judged without mounting the plugin. */
(() => {
  const ASSET = '/fairy/assets'
  const BANDS = 20
  const SHIFTS = [-12, 6, -7, 14, -4, 9, -14, 3, -9, 11, -6, 5, -11, 8, -3, 13, -8, 4, -15, 10]
  const TOKENS = {
    '--dsw-alias-bg-base': 'rgba(3,8,15,0.55)',
    '--dsw-alias-bg-layer-1': 'rgba(7,17,30,0.74)',
    '--dsw-alias-bg-layer-2': 'rgba(9,22,38,0.86)',
    '--dsw-alias-bg-layer-3': 'rgba(10,22,36,0.82)',
    '--dsw-alias-bg-overlay': 'rgba(5,12,21,0.95)',
    '--dsw-alias-border-l1': 'rgba(126,220,255,0.14)',
    '--dsw-alias-border-l2': 'rgba(126,220,255,0.30)',
    '--dsw-alias-border-l3': 'rgba(126,220,255,0.20)',
    '--dsw-alias-border-l4': 'rgba(126,220,255,0.12)',
    '--dsw-alias-brand-primary': '#7d95ff',
    '--dsw-alias-label-primary': '#e3effb',
    '--dsw-alias-label-secondary': '#93aec9',
    '--dsw-specific-sidebar-fill': 'rgba(4,10,19,0.66)',
    '--dsw-specific-input-major': 'rgba(7,18,30,0.86)',
    '--dsw-specific-bubble': 'rgba(22,48,80,0.55)',
  }

  const params = new URLSearchParams(location.search)
  const scene = params.get('scene') || 'dock'
  let svg = ''

  for (const [key, value] of Object.entries(TOKENS)) document.body.style.setProperty(key, value)

  function emblem(px, simple) {
    const root = document.createElement('div')
    root.className = 'fairy-emblem' + (simple ? ' is-simple' : '')
    root.style.width = px + 'px'
    root.style.height = px + 'px'
    if (svg === '') return root
    if (simple) {
      root.innerHTML = svg
      return root
    }
    const bloom = document.createElement('span')
    bloom.className = 'fairy-bloom'
    const ring = document.createElement('span')
    ring.className = 'fairy-ring'
    const mark = document.createElement('div')
    mark.className = 'fairy-mark'
    for (let i = 0; i < BANDS; i += 1) {
      const band = document.createElement('div')
      band.className = 'fairy-band'
      band.style.clipPath = 'inset(' + (i * 100 / BANDS) + '% 0 ' + ((BANDS - 1 - i) * 100 / BANDS) + '% 0)'
      band.style.setProperty('--fairy-shift', SHIFTS[i] + 'px')
      band.innerHTML = svg
      mark.append(band)
    }
    root.append(bloom, ring, mark)
    return root
  }

  function splash() {
    const root = document.createElement('div')
    root.className = 'fairy-splash'
    const video = document.createElement('video')
    video.className = 'fairy-splash-video'
    video.src = ASSET + '/boot.mp4'
    video.poster = ASSET + '/poster.jpg'
    video.autoplay = true
    video.muted = true
    video.loop = true
    video.playsInline = true
    const veil = document.createElement('div')
    veil.className = 'fairy-splash-veil'
    const hud = document.createElement('div')
    hud.className = 'fairy-splash-hud'
    hud.innerHTML = [
      '<div class="fairy-hud-top">',
      '  <div class="fairy-hud-left"><span class="fairy-hud-kicker">H.D.D. SYSTEM</span><span class="fairy-hud-sub">HOLLOW DEEP DIVE</span></div>',
      '  <div class="fairy-hud-right"><span class="fairy-hud-clock">19:27:10</span><span class="fairy-hud-sub">FAIRY</span></div>',
      '</div>',
      '<div class="fairy-hud-bottom">',
      '  <div class="fairy-progress"><div class="fairy-progress-bar" style="width:62%"></div></div>',
      '  <div class="fairy-steps"><span class="fairy-step is-done"><i></i>系统自检</span><span class="fairy-step is-done"><i></i>神经链接</span><span class="fairy-step is-now"><i></i>人格载入</span></div>',
      '  <button class="fairy-skip">跳过 SKIP</button>',
      '</div>',
    ].join('')
    root.append(video, veil, hud)
    document.body.append(root)
  }

  function greet() {
    const root = document.createElement('div')
    root.className = 'fairy-greet'
    const bloom = document.createElement('div')
    bloom.className = 'fairy-greet-bloom'
    const scan = document.createElement('div')
    scan.className = 'fairy-greet-scan'
    const inner = document.createElement('div')
    inner.className = 'fairy-greet-inner'
    const stage = document.createElement('div')
    stage.className = 'fairy-greet-stage'
    stage.append(emblem(260))
    const text = document.createElement('div')
    text.className = 'fairy-greet-text'
    ;['欢迎回来，主人。', 'H.D.D. 系统自检完成，Fairy 已就位。', '今天想先处理哪一件事？'].forEach((line) => {
      const p = document.createElement('p')
      p.className = 'fairy-greet-line is-in'
      p.textContent = line
      text.append(p)
    })
    const meta = document.createElement('div')
    meta.className = 'fairy-greet-meta'
    meta.innerHTML = '<span>H.D.D. / FAIRY</span><span>点击任意处进入</span>'
    inner.append(stage, text, meta)
    root.append(bloom, scan, inner)
    document.body.append(root)
  }

  function dock() {
    const shell = document.createElement('div')
    shell.className = 'fairy-shell'
    const dock = document.createElement('div')
    dock.className = 'fairy-dock'
    const bubble = document.createElement('div')
    bubble.className = 'fairy-bubble'
    bubble.innerHTML = [
      '<div class="fairy-bubble-head"><span class="fairy-dot"></span><span class="fairy-bubble-title">FAIRY</span><span class="fairy-bubble-sub">H.D.D. ONLINE</span></div>',
      '<p class="fairy-bubble-line">主人，我一直都在。</p>',
      '<div class="fairy-tools">',
      '  <button class="fairy-chip">◀ 语音</button>',
      '  <button class="fairy-chip is-on">朗读 开</button>',
      '  <button class="fairy-chip">↻ 开屏</button>',
      '  <button class="fairy-chip fairy-chip-quiet">✕ 关闭</button>',
      '</div>',
    ].join('')
    const button = document.createElement('button')
    button.className = 'fairy-dock-btn'
    button.append(emblem(84))
    const label = document.createElement('span')
    label.className = 'fairy-dock-label'
    label.innerHTML = 'FAIRY '
    button.append(label)
    dock.append(bubble, button)
    shell.append(dock)
    document.body.append(shell)
  }

  function run() {
    const brand = document.getElementById('brand-mark')
    if (brand) brand.append(emblem(22, true))
    if (scene === 'splash') splash()
    else if (scene === 'greet') greet()
    else if (scene === 'dock') dock()
  }

  fetch(ASSET + '/mascot.svg')
    .then((response) => (response.ok ? response.text() : ''))
    .then((text) => { svg = text; run() })
    .catch(() => run())
})()
