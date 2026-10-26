window.__ModuleLoader__.load({
  id: '@local/dsh-fairy-mode',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React

    const API = '/fairy'
    const ASSET = API + '/assets'
    const BANDS = 20
    const SHIFTS = [-12, 6, -7, 14, -4, 9, -14, 3, -9, 11, -6, 5, -11, 8, -3, 13, -8, 4, -15, 10]
    const MODULE_BOOT = Date.now()
    const KEY = {
      /* The skin is on for every launch; only an explicit close in this window
         hides it, and that state is deliberately session-scoped. */
      closed: 'fairy.closed',
      mute: 'fairy.mute',
      autoRead: 'fairy.autoRead',
      booted: 'fairy.booted',
    }
    const GREETING = [
      '欢迎回来，主人。',
      'H.D.D. 系统自检完成，Fairy 已就位。',
      '今天想先处理哪一件事？',
    ]
    const IDLE = [
      { text: '主人，我一直都在。', voice: 'idle1' },
      { text: '数据链路稳定，随时可以开始。', voice: 'idle2' },
      { text: '需要我先帮你理一下今天的任务吗？', voice: 'idle3' },
    ]

    /* ------------------------------------------------------------------ */
    /* preferences                                                         */
    /* ------------------------------------------------------------------ */

    const pref = {
      read(key, fallback) {
        try {
          const value = window.localStorage.getItem(key)
          return value === null ? fallback : value === '1'
        } catch {
          return fallback
        }
      },
      write(key, value) {
        try { window.localStorage.setItem(key, value ? '1' : '0') } catch { /* private mode */ }
      },
    }

    /* ------------------------------------------------------------------ */
    /* theme                                                               */
    /* ------------------------------------------------------------------ */

    const PAIRS = {
      '--dsw-alias-bg-base': ['rgba(3, 8, 15, 0.30)', 'rgba(3, 8, 15, 0.30)'],
      '--dsw-static-neutral-00': ['rgba(4, 10, 18, 0.98)', 'rgba(4, 10, 18, 0.98)'],
      '--dsw-static-neutral-50': ['rgba(7, 16, 28, 0.98)', 'rgba(7, 16, 28, 0.98)'],
      '--dsw-static-neutral-100': ['rgba(10, 22, 36, 0.98)', 'rgba(10, 22, 36, 0.98)'],
      '--dsw-static-neutral-150': ['rgba(12, 27, 43, 0.98)', 'rgba(12, 27, 43, 0.98)'],
      '--dsw-static-neutral-200': ['rgba(18, 35, 54, 0.98)', 'rgba(18, 35, 54, 0.98)'],
      '--dsw-static-neutral-300': ['rgba(35, 60, 78, 0.98)', 'rgba(35, 60, 78, 0.98)'],
      '--dsw-static-neutral-bluish-00': ['rgba(4, 10, 18, 0.98)', 'rgba(4, 10, 18, 0.98)'],
      '--dsw-static-neutral-bluish-50': ['rgba(7, 16, 28, 0.98)', 'rgba(7, 16, 28, 0.98)'],
      '--dsw-static-neutral-bluish-60': ['rgba(8, 18, 30, 0.98)', 'rgba(8, 18, 30, 0.98)'],
      '--dsw-static-neutral-bluish-75': ['rgba(10, 22, 36, 0.98)', 'rgba(10, 22, 36, 0.98)'],
      '--dsw-static-neutral-bluish-100': ['rgba(12, 27, 43, 0.98)', 'rgba(12, 27, 43, 0.98)'],
      '--dsw-static-neutral-bluish-150': ['rgba(15, 31, 48, 0.98)', 'rgba(15, 31, 48, 0.98)'],
      '--dsw-static-neutral-bluish-200': ['rgba(20, 40, 60, 0.98)', 'rgba(20, 40, 60, 0.98)'],
      '--dsw-static-neutral-bluish-300': ['rgba(35, 60, 78, 0.98)', 'rgba(35, 60, 78, 0.98)'],
      '--dsw-static-neutral-bluish-400': ['#7f9caf', '#7f9caf'],
      '--dsw-alias-bg-layer-1': ['rgba(7, 17, 30, 0.52)', 'rgba(7, 17, 30, 0.52)'],
      '--dsw-alias-bg-layer-2': ['rgba(9, 22, 38, 0.72)', 'rgba(9, 22, 38, 0.72)'],
      '--dsw-alias-bg-layer-3': ['rgba(10, 22, 36, 0.68)', 'rgba(10, 22, 36, 0.68)'],
      '--dsw-alias-bg-overlay': ['rgba(5, 12, 21, 0.94)', 'rgba(5, 12, 21, 0.94)'],
      '--dsw-alias-border-l1': ['rgba(126, 220, 255, 0.14)', 'rgba(126, 220, 255, 0.14)'],
      '--dsw-alias-border-l2': ['rgba(126, 220, 255, 0.30)', 'rgba(126, 220, 255, 0.30)'],
      '--dsw-alias-border-l3': ['rgba(126, 220, 255, 0.20)', 'rgba(126, 220, 255, 0.20)'],
      '--dsw-alias-border-l4': ['rgba(126, 220, 255, 0.12)', 'rgba(126, 220, 255, 0.12)'],
      '--dsw-alias-brand-primary': ['#7d95ff', '#7d95ff'],
      '--dsw-alias-label-primary': ['#e3effb', '#e3effb'],
      '--dsw-alias-label-primary-bluish': ['#dbe9ff', '#dbe9ff'],
      '--dsw-alias-label-secondary': ['#93aec9', '#93aec9'],
      '--dsw-alias-label-tertiary': ['#69809a', '#69809a'],
      '--dsw-alias-state-error-primary': ['#ff6f8e', '#ff6f8e'],
      '--dsw-alias-state-idle-primary': ['#7f97b3', '#7f97b3'],
      '--dsw-alias-state-success-primary': ['#4fe3c1', '#4fe3c1'],
      '--dsw-alias-state-warn-primary': ['#f2d94e', '#f2d94e'],
      '--dsw-alias-interactive-bg-hover': ['rgba(126, 220, 255, 0.08)', 'rgba(126, 220, 255, 0.08)'],
      '--dsw-alias-interactive-bg-active': ['rgba(126, 220, 255, 0.14)', 'rgba(126, 220, 255, 0.14)'],
      '--dsw-alias-menu-surface-fill': ['rgba(8, 17, 29, 0.92)', 'rgba(8, 17, 29, 0.92)'],
      '--dsw-alias-menu-icon': ['#9fc4e2', '#9fc4e2'],
      '--dsw-alias-settings-card-fill': ['rgba(8, 18, 30, 0.72)', 'rgba(8, 18, 30, 0.72)'],
      '--dsw-alias-settings-card-stroke': ['rgba(126, 220, 255, 0.16)', 'rgba(126, 220, 255, 0.16)'],
      '--dsw-alias-button-tool-bar-fill': ['rgba(9, 20, 34, 0.70)', 'rgba(9, 20, 34, 0.70)'],
      '--dsw-alias-button-elevated-fill': ['rgba(9, 20, 34, 0.72)', 'rgba(9, 20, 34, 0.72)'],
      '--dsw-alias-button-floating-fill': ['rgba(9, 20, 34, 0.82)', 'rgba(9, 20, 34, 0.82)'],
      '--dsw-specific-sidebar-fill': ['rgba(4, 10, 19, 0.50)', 'rgba(4, 10, 19, 0.50)'],
      '--dsw-specific-sidebar-nav-item-active': ['rgba(30, 64, 110, 0.55)', 'rgba(30, 64, 110, 0.55)'],
      '--dsw-specific-sidebar-nav-item-active-accent': ['#7edcff', '#7edcff'],
      '--dsw-specific-sidebar-nav-item-hover': ['rgba(126, 220, 255, 0.07)', 'rgba(126, 220, 255, 0.07)'],
      '--dsw-specific-input-major': ['rgba(7, 18, 30, 0.70)', 'rgba(7, 18, 30, 0.70)'],
      '--dsw-specific-bubble': ['rgba(22, 48, 80, 0.58)', 'rgba(22, 48, 80, 0.58)'],
      '--dsw-specific-bubble-highlight': ['rgba(34, 68, 110, 0.66)', 'rgba(34, 68, 110, 0.66)'],
      '--dsw-specific-menu': ['rgba(6, 14, 24, 0.94)', 'rgba(6, 14, 24, 0.94)'],
    }

    const THEME_TOKENS = {}
    for (const [name, pair] of Object.entries(PAIRS)) THEME_TOKENS[name] = { light: pair[0], dark: pair[1] }

    let themeApi = null
    let themeDispose = null
    let themePrevious = 'system'

    function enableTheme() {
      if (themeApi === null || themeDispose !== null) return
      try {
        const snapshot = themeApi.getTheme?.()
        themePrevious = snapshot?.preference && snapshot.preference !== 'fairy' ? snapshot.preference : 'dark'
        themeDispose = themeApi.register({ id: 'fairy', colorScheme: 'dark', tokens: THEME_TOKENS })
        themeApi.setTheme('fairy')
      } catch (error) {
        console.warn('[fairy-mode] theme registration failed', error)
        themeDispose = null
      }
    }

    function disableTheme() {
      if (themeDispose !== null) {
        try { themeDispose() } catch { /* already gone */ }
        themeDispose = null
      }
      try { themeApi?.setTheme(themePrevious === 'fairy' ? 'dark' : themePrevious) } catch { /* ignore */ }
    }

    /* Lightweight re-assert used by the theme guard: only fixes the markers the
       presenter can drop. Rewriting every inline token here would force a full
       style recalculation of open popovers and show up as a flash. */
    function reassertSkin() {
      const root = document.documentElement
      root.classList.add('fairy-on')
      root.style.colorScheme = 'dark'
      root.setAttribute('data-ds-theme-source', 'dark')
      root.style.backgroundColor = '#03070d'
      if (document.body) document.body.setAttribute('data-ds-dark-theme', '')
    }

    /* ------------------------------------------------------------------ */
    /* running indicator (深度求索中 → HDD计算中，鲸鱼尾 → FAIRY)            */
    /* ------------------------------------------------------------------ */

    const THINK_COPY = {
      original: '深度求索中',
      branded: 'HDD计算中',
      originalEn: 'Deep diving',
      brandedEn: 'HDD computing',
    }

    let brandFrame = 0

    /* Find the innermost element that carries the stock running copy (the chat
       plugin's shimmer span). The screen-reader status span is skipped: it must
       keep announcing the plugin's own wording. */
    function findRunningLabel(row) {
      let best = null
      for (const el of row.querySelectorAll('span, p, div')) {
        if (el.getAttribute('role') === 'status') continue
        const text = el.textContent || ''
        if (!text.includes(THINK_COPY.original) && !text.includes(THINK_COPY.originalEn)) continue
        const nested = Array.from(el.children).some((child) => {
          const childText = child.textContent || ''
          return childText.includes(THINK_COPY.original) || childText.includes(THINK_COPY.originalEn)
        })
        if (!nested) best = el
      }
      return best
    }

    /* The stock label is hidden and a sibling we own (@see .fairy-think-label)
       mirrors it with the branded wording. The sibling deliberately does NOT
       reuse the stock class names: the shimmer paints its text with a clipped
       gradient, so copied classes would render ours invisible. */
    function brandRunningRows(on) {
      const rows = document.querySelectorAll('[data-chat-running]')
      for (const row of rows) {
        if (!on) {
          row.removeAttribute('data-fairy-think')
          for (const node of row.querySelectorAll('[data-fairy-mine]')) node.remove()
          for (const node of row.querySelectorAll('[data-fairy-orig]')) node.removeAttribute('data-fairy-orig')
          continue
        }
        row.setAttribute('data-fairy-think', '')
        const label = findRunningLabel(row)
        if (label === null) continue
        label.setAttribute('data-fairy-orig', '')
        /* Mount beside the label's wrapper, not inside it: the shimmer clips its
           own subtree, so a nested mirror would be cut off. */
        const host = row.lastElementChild !== null && row.lastElementChild.contains(label)
          ? row.lastElementChild
          : label.parentElement
        if (host === null) continue
        let mine = host.querySelector('[data-fairy-mine]')
        if (mine === null) {
          mine = document.createElement('span')
          mine.setAttribute('data-fairy-mine', '')
          mine.className = 'fairy-think-label'
          host.appendChild(mine)
        }
        const stock = label.textContent || ''
        const branded = stock
          .split(THINK_COPY.original).join(THINK_COPY.branded)
          .split(THINK_COPY.originalEn).join(THINK_COPY.brandedEn)
        if (mine.textContent !== branded) mine.textContent = branded
      }
    }

    /* Re-apply after React re-renders the label (it owns that text node). */
    function scheduleBrand(on) {
      if (brandFrame !== 0) return
      brandFrame = window.requestAnimationFrame(() => {
        brandFrame = 0
        if (!document.querySelector('[data-chat-running]')) return
        brandRunningRows(on)
      })
    }

    function setSkin(on) {
      document.documentElement.classList.toggle('fairy-on', on)
      if (on) {
        enableTheme()
        /* Fallback palette: the theme snapshot may land after this plugin and
           repaint body with the built-in light palette, so every token is set
           with important priority and the dark-theme attribute is re-asserted.
           Both carry the same values as the registered theme. */
        if (document.body) {
          for (const [name, pair] of Object.entries(PAIRS)) document.body.style.setProperty(name, pair[1], 'important')
          document.body.setAttribute('data-ds-dark-theme', '')
        }
        document.documentElement.style.colorScheme = 'dark'
        /* The Electron shell mirrors this attribute into nativeTheme, so the
           native frame flips to light for a frame unless it stays 'dark'. */
        document.documentElement.setAttribute('data-ds-theme-source', 'dark')
        document.documentElement.style.backgroundColor = '#03070d'
        brandRunningRows(true)
      } else {
        disableTheme()
        document.documentElement.removeAttribute('data-ds-theme-source')
        document.documentElement.style.backgroundColor = ''
        if (document.body) {
          for (const name of Object.keys(PAIRS)) document.body.style.removeProperty(name)
          document.body.removeAttribute('data-ds-dark-theme')
        }
        document.documentElement.style.colorScheme = ''
        brandRunningRows(false)
      }
    }

    /* ------------------------------------------------------------------ */
    /* voice                                                               */
    /* ------------------------------------------------------------------ */

    let audioElement = null
    const audioCache = new Map()

    function stopVoice() {
      if (audioElement === null) return
      try { audioElement.pause() } catch { /* ignore */ }
      audioElement = null
    }

    function playUrl(url) {
      stopVoice()
      const audio = new Audio(url)
      audio.volume = 0.95
      audioElement = audio
      const played = audio.play()
      if (played && typeof played.catch === 'function') {
        played.catch(() => { /* a gesture is needed; the next click retries */ })
      }
      return audio
    }

    function cleanSpeech(input) {
      return String(input ?? '')
        .replace(/```[\s\S]*?```/g, '。代码块已省略。')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[#>*_~|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 420)
    }

    async function ttsUrl(text) {
      if (audioCache.has(text)) return audioCache.get(text)
      const response = await fetch(API + '/tts?text=' + encodeURIComponent(text))
      if (!response.ok) throw new Error('tts ' + response.status)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      audioCache.set(text, url)
      if (audioCache.size > 24) {
        const oldest = audioCache.keys().next().value
        URL.revokeObjectURL(audioCache.get(oldest))
        audioCache.delete(oldest)
      }
      return url
    }

    function speakText(text) {
      if (pref.read(KEY.mute, false)) return
      const clean = cleanSpeech(text)
      if (clean === '') return
      ttsUrl(clean)
        .then((url) => playUrl(url))
        .catch(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(clean)
            utterance.lang = 'zh-CN'
            utterance.rate = 1.02
            window.speechSynthesis.speak(utterance)
          } catch { /* no speech available */ }
        })
    }

    /* ------------------------------------------------------------------ */
    /* mascot                                                              */
    /* ------------------------------------------------------------------ */

    let mascotPromise = null
    function mascot() {
      if (mascotPromise === null) {
        mascotPromise = fetch(ASSET + '/mascot.svg')
          .then((response) => (response.ok ? response.text() : ''))
          .catch(() => '')
      }
      return mascotPromise
    }

    function useMascot() {
      const [svg, setSvg] = useState('')
      useEffect(() => {
        let alive = true
        mascot().then((text) => { if (alive) setSvg(text) })
        return () => { alive = false }
      }, [])
      return svg
    }

    function Emblem({ px, simple = false, className = '' }) {
      const svg = useMascot()
      const style = { width: px, height: px }
      if (svg === '') return h('div', { className: 'fairy-emblem is-empty ' + className, style })
      if (simple) {
        return h('div', {
          className: 'fairy-emblem is-simple ' + className,
          style,
          dangerouslySetInnerHTML: { __html: svg },
        })
      }
      const bands = []
      for (let index = 0; index < BANDS; index += 1) {
        const top = (index * 100) / BANDS
        const bottom = ((BANDS - 1 - index) * 100) / BANDS
        bands.push(h('div', {
          key: index,
          className: 'fairy-band',
          style: { clipPath: 'inset(' + top + '% 0 ' + bottom + '% 0)', '--fairy-shift': SHIFTS[index] + 'px' },
          dangerouslySetInnerHTML: { __html: svg },
        }))
      }
      return h('div', { className: 'fairy-emblem ' + className, style },
        h('span', { className: 'fairy-bloom' }),
        h('span', { className: 'fairy-ring' }),
        h('div', { className: 'fairy-mark' }, bands))
    }

    /* ------------------------------------------------------------------ */
    /* icons                                                               */
    /* ------------------------------------------------------------------ */

    function Icon({ name, size = 14 }) {
      const common = {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
      }
      if (name === 'speaker') return h('svg', common, h('path', { d: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4z' }), h('path', { d: 'M16 9a4.4 4.4 0 0 1 0 6' }), h('path', { d: 'M18.6 6.4a8 8 0 0 1 0 11.2' }))
      if (name === 'mute') return h('svg', common, h('path', { d: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4z' }), h('path', { d: 'M16 9.5l5 5' }), h('path', { d: 'M21 9.5l-5 5' }))
      if (name === 'replay') return h('svg', common, h('path', { d: 'M4 5v5h5' }), h('path', { d: 'M4.6 10a8 8 0 1 1-.6 4' }))
      if (name === 'close') return h('svg', common, h('path', { d: 'M6 6l12 12' }), h('path', { d: 'M18 6L6 18' }))
      if (name === 'spark') return h('svg', common, h('path', { d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' }))
      if (name === 'bolt') return h('svg', common, h('path', { d: 'M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z' }))
      return h('svg', common, h('circle', { cx: 12, cy: 12, r: 7 }))
    }

    /* ------------------------------------------------------------------ */
    /* account balance (剩余电量)                                          */
    /* ------------------------------------------------------------------ */

    function accountClient() {
      const release = window.__DSH_BOOT__ && window.__DSH_BOOT__.release
      return {
        version: (release && release.version) || '0.0.0',
        locale: document.documentElement.lang || 'zh-CN',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      }
    }

    function money(amount, currency) {
      const symbol = currency === 'USD' ? '$' : '¥'
      const value = Number(amount)
      if (!Number.isFinite(value)) return symbol + String(amount ?? '')
      if (value === 0) return symbol + '0.00'
      if (value < 0.01) return '<' + symbol + '0.01'
      return symbol + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    function BalancePill() {
      const [text, setText] = useState('')
      useEffect(() => {
        let alive = true
        const load = async () => {
          try {
            const client = accountClient()
            const query = '?version=' + encodeURIComponent(client.version)
              + '&locale=' + encodeURIComponent(client.locale)
              + '&tz=' + client.timezoneOffsetSeconds
            const response = await fetch(API + '/balance' + query)
            if (!alive || !response.ok) return
            const walletSet = await response.json()
            if (!alive || !walletSet || walletSet.status !== 'ready') return
            const wallets = Array.isArray(walletSet.value) ? walletSet.value : []
            const wallet = wallets.find((entry) => entry.currency === 'CNY') ?? wallets[0]
            if (!wallet) return
            setText(money(wallet.balance, wallet.currency))
          } catch { /* signed out or offline: the pill stays hidden */ }
        }
        load()
        const timer = window.setInterval(load, 60_000)
        const focus = () => load()
        window.addEventListener('focus', focus)
        return () => {
          alive = false
          window.clearInterval(timer)
          window.removeEventListener('focus', focus)
        }
      }, [])
      if (text === '') return null
      return h('span', { className: 'fairy-balance', title: '账户余额（剩余电量）' },
        h(Icon, { name: 'bolt', size: 11 }),
        h('span', { className: 'fairy-balance-label' }, '电量'),
        h('span', { className: 'fairy-balance-value' }, text))
    }

    /* ------------------------------------------------------------------ */
    /* chat text                                                           */
    /* ------------------------------------------------------------------ */

    function blocksText(blocks) {
      if (!Array.isArray(blocks)) return ''
      return blocks
        .filter((block) => block && block.kind === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('')
    }

    function findAssistantText(snapshot, messageId) {
      if (!snapshot || !snapshot.nodes || typeof snapshot.nodes.values !== 'function') return ''
      for (const node of snapshot.nodes.values()) {
        const data = node && node.data
        const closing = data && data.closing
        const final = closing && closing.finalNode
        if (final && final.messageId === messageId && Array.isArray(closing.blocks)) return blocksText(closing.blocks)
      }
      return ''
    }

    function SpeakAction({ messageId, useChat }) {
      const text = typeof useChat === 'function' ? useChat((snapshot) => findAssistantText(snapshot, messageId)) : ''
      const spoken = useRef(false)
      useEffect(() => {
        if (spoken.current || text === '') return
        spoken.current = true
        if (Date.now() - MODULE_BOOT < 4000) return
        if (!pref.read(KEY.autoRead, true)) return
        speakText(text)
      }, [text])
      return h('button', {
        type: 'button',
        className: 'fairy-speak',
        title: 'Fairy 朗读',
        'aria-label': '朗读这条回复',
        onClick: () => speakText(text),
      }, h(Icon, { name: 'speaker', size: 13 }))
    }

    /* ------------------------------------------------------------------ */
    /* brand                                                               */
    /* ------------------------------------------------------------------ */

    function BrandMark() {
      return h('span', { className: 'fairy-brand-mark' }, h(Emblem, { px: 22, simple: true }))
    }

    function BrandName() {
      return h('span', { className: 'fairy-brand-text' }, 'FAIRY')
    }

    /* The blank-session hero: the shipped headline and its preview badge give
       way to Fairy's own mark and greeting (the CSS gates the swap on this
       occupant, so a failed registration leaves the stock hero intact). */
    function HeroBrandMark({ size = 34 }) {
      /* The stock headline group is hidden by this marker class, which exists
         exactly while the occupant is mounted — no dependency on the slot
         wrapper's DOM shape. Layout effect keeps the swap out of paint. */
      useLayoutEffect(() => {
        document.documentElement.classList.add('fairy-hero-mounted')
        return () => document.documentElement.classList.remove('fairy-hero-mounted')
      }, [])
      return h('span', { className: 'fairy-hero' },
        h('span', { className: 'fairy-hero-mark', 'aria-hidden': true }, h(Emblem, { px: size })),
        h('span', { className: 'fairy-hero-text' }, '欢迎回来，法厄同'))
    }

    /* ------------------------------------------------------------------ */
    /* root overlay                                                        */
    /* ------------------------------------------------------------------ */

    function FairyRoot() {
      const [phase, setPhase] = useState(() => {
        try {
          if (window.sessionStorage.getItem(KEY.closed) === '1') return 'off'
          if (window.sessionStorage.getItem(KEY.booted) === '1') return 'dock'
        } catch { /* ignore */ }
        return 'boot'
      })
      const [muted, setMuted] = useState(() => pref.read(KEY.mute, false))
      const [autoRead, setAutoRead] = useState(() => pref.read(KEY.autoRead, true))
      const [open, setOpen] = useState(false)
      const [line, setLine] = useState(IDLE[0])
      const [toast, setToast] = useState('')
      const dockRef = useRef(null)

      useEffect(() => {
        setSkin(phase !== 'off')
      }, [phase])

      /* The bubble closes on any pointer press outside the dock, and on Escape. */
      useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const dock = dockRef.current
          if (dock !== null && event.target instanceof Node && dock.contains(event.target)) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      useEffect(() => () => stopVoice(), [])

      const toggleMute = useCallback(() => {
        setMuted((current) => {
          const next = !current
          pref.write(KEY.mute, next)
          if (next) stopVoice()
          return next
        })
      }, [])

      const toggleAutoRead = useCallback(() => {
        setAutoRead((current) => {
          const next = !current
          pref.write(KEY.autoRead, next)
          setToast(next ? '回复将自动朗读' : '已关闭自动朗读')
          return next
        })
      }, [])

      const finishBoot = useCallback(() => {
        try { window.sessionStorage.setItem(KEY.booted, '1') } catch { /* ignore */ }
        setPhase('greet')
      }, [])

      const finishGreet = useCallback(() => {
        setPhase('dock')
      }, [])

      if (phase === 'off') {
        return h('div', { className: 'fairy-off' },
          h('button', {
            type: 'button',
            className: 'fairy-revive',
            onClick: () => {
              try { window.sessionStorage.removeItem(KEY.closed) } catch { /* ignore */ }
              try { window.sessionStorage.removeItem(KEY.booted) } catch { /* ignore */ }
              setPhase('boot')
            },
            title: '重新唤醒 FAIRY',
          }, h(Emblem, { px: 26, simple: true }), h('span', null, 'FAIRY')))
      }

      if (phase === 'boot') {
        return h(BootScene, { onDone: finishBoot, muted })
      }

      if (phase === 'greet') {
        return h(GreetScene, { onDone: finishGreet, muted })
      }

      const say = () => {
        const next = IDLE[Math.floor(Math.random() * IDLE.length)]
        setLine(next)
        setOpen(true)
        if (!pref.read(KEY.mute, false)) {
          playUrl(ASSET + '/voice/' + next.voice + '.mp3?v=2')
        }
      }

      return h('div', { className: 'fairy-shell' },
        h('div', { className: 'fairy-dock', ref: dockRef },
          open && h('div', { className: 'fairy-bubble' },
            h('div', { className: 'fairy-bubble-head' },
              h('span', { className: 'fairy-dot' }),
              h('span', { className: 'fairy-bubble-title' }, 'FAIRY'),
              h('span', { className: 'fairy-bubble-sub' }, 'H.D.D. ONLINE')),
            h('p', { className: 'fairy-bubble-line' }, line.text),
            toast !== '' && h('p', { className: 'fairy-toast' }, toast),
            h('div', { className: 'fairy-tools' },
              h('button', { type: 'button', className: 'fairy-chip', onClick: toggleMute, title: muted ? '取消静音' : '静音' },
                h(Icon, { name: muted ? 'mute' : 'speaker' }), h('span', null, muted ? '静音' : '语音')),
              h('button', { type: 'button', className: 'fairy-chip' + (autoRead ? ' is-on' : ''), onClick: toggleAutoRead, title: '自动朗读回复' },
                h('span', null, '朗读 ' + (autoRead ? '开' : '关'))),
              h('button', {
                type: 'button', className: 'fairy-chip', title: '重播开屏',
                onClick: () => {
                  try { window.sessionStorage.removeItem(KEY.booted) } catch { /* ignore */ }
                  setPhase('boot')
                },
              }, h(Icon, { name: 'replay' }), h('span', null, '开屏')),
              h('button', {
                type: 'button', className: 'fairy-chip fairy-chip-quiet', title: '关闭 FAIRY 皮肤',
                onClick: () => {
                  try { window.sessionStorage.setItem(KEY.closed, '1') } catch { /* ignore */ }
                  setOpen(false)
                  setPhase('off')
                },
              }, h(Icon, { name: 'close' }), h('span', null, '关闭'))),
          ),
          h('button', {
            type: 'button',
            className: 'fairy-dock-btn',
            title: 'FAIRY',
            onClick: () => { if (open) setOpen(false); else say() },
          },
            h(Emblem, { px: 84 }),
            h('span', { className: 'fairy-dock-label' }, 'FAIRY')),
          !muted && h('span', { className: 'fairy-dock-hint' }, '点击对话'),
        ))
    }

    function BootScene({ onDone, muted }) {
      const videoRef = useRef(null)
      const [progress, setProgress] = useState(0)
      const [needsTap, setNeedsTap] = useState(false)
      const [clock, setClock] = useState(() => new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      const done = useRef(false)

      const finish = useCallback(() => {
        if (done.current) return
        done.current = true
        onDone()
      }, [onDone])

      useEffect(() => {
        const timer = window.setInterval(() => {
          setClock(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
        }, 1000)
        const fallback = window.setTimeout(() => {
          const video = videoRef.current
          if (video && (video.readyState < 2 || video.error)) finish()
        }, 6000)
        /* A stalled or paused decode must never trap the app behind the splash. */
        const watchdog = window.setTimeout(finish, 24000)
        const skip = (event) => {
          if (event.type === 'keydown' && event.key !== 'Escape' && event.key !== ' ') return
          finish()
        }
        window.addEventListener('keydown', skip)
        return () => {
          window.clearInterval(timer)
          window.clearTimeout(fallback)
          window.clearTimeout(watchdog)
          window.removeEventListener('keydown', skip)
        }
      }, [finish])

      useEffect(() => {
        const video = videoRef.current
        if (!video) return
        const attempt = video.play()
        if (attempt && typeof attempt.catch === 'function') {
          attempt.catch(() => {
            video.muted = true
            setNeedsTap(true)
            video.play().catch(() => finish())
          })
        }
      }, [finish])

      const step = progress < 0.28 ? 0 : progress < 0.62 ? 1 : 2
      const steps = ['系统自检', '神经链接', '人格载入']

      return h('div', { className: 'fairy-splash', onClick: needsTap ? () => {
        const video = videoRef.current
        if (video) {
          video.muted = muted
          video.play().catch(() => {})
        }
        setNeedsTap(false)
      } : undefined },
        h('video', {
          ref: videoRef,
          className: 'fairy-splash-video',
          src: ASSET + '/boot.mp4',
          poster: ASSET + '/poster.jpg',
          muted,
          autoPlay: true,
          playsInline: true,
          preload: 'auto',
          onTimeUpdate: (event) => {
            const video = event.currentTarget
            if (video.duration > 0) setProgress(Math.min(1, video.currentTime / video.duration))
          },
          onEnded: finish,
          onError: finish,
        }),
        h('div', { className: 'fairy-splash-veil' }),
        h('div', { className: 'fairy-splash-hud' },
          h('div', { className: 'fairy-hud-top' },
            h('div', { className: 'fairy-hud-left' },
              h('span', { className: 'fairy-hud-kicker' }, 'H.D.D. SYSTEM'),
              h('span', { className: 'fairy-hud-sub' }, 'HOLLOW DEEP DIVE')),
            h('div', { className: 'fairy-hud-right' },
              h('span', { className: 'fairy-hud-clock' }, clock),
              h('span', { className: 'fairy-hud-sub' }, 'FAIRY'))),
          h('div', { className: 'fairy-hud-bottom' },
            h('div', { className: 'fairy-progress' },
              h('div', { className: 'fairy-progress-bar', style: { width: Math.round(progress * 100) + '%' } })),
            h('div', { className: 'fairy-steps' },
              steps.map((label, index) => h('span', {
                key: label,
                className: 'fairy-step' + (index < step ? ' is-done' : index === step ? ' is-now' : ''),
              }, h('i', null), label))),
            h('button', {
              type: 'button', className: 'fairy-skip',
              onClick: (event) => { event.stopPropagation(); finish() },
            }, '跳过 SKIP'))),
        needsTap && h('div', { className: 'fairy-tap' }, h('span', null, '点击启用声音')))
    }

    function GreetScene({ onDone, muted }) {
      const [step, setStep] = useState(0)
      const [launching, setLaunching] = useState(false)
      const stageRef = useRef(null)
      const done = useRef(false)

      useEffect(() => {
        if (!muted) {
          const timer = window.setTimeout(() => playUrl(ASSET + '/voice/hello.mp3?v=2'), 900)
          return () => window.clearTimeout(timer)
        }
      }, [muted])

      useEffect(() => {
        const timers = [
          window.setTimeout(() => setStep(1), 700),
          window.setTimeout(() => setStep(2), 1500),
          window.setTimeout(() => setStep(3), 2300),
          window.setTimeout(() => launch(), 8600),
        ]
        return () => timers.forEach((timer) => window.clearTimeout(timer))
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const launch = useCallback(() => {
        if (done.current) return
        done.current = true
        const stage = stageRef.current
        let dx = 0
        let dy = 0
        let scale = 0.36
        if (stage) {
          const rect = stage.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const targetX = 18 + 42
          const targetY = window.innerHeight - 18 - 52
          dx = targetX - centerX
          dy = targetY - centerY
          scale = 84 / Math.max(1, rect.width)
        }
        stage?.style.setProperty('--fairy-launch-x', dx + 'px')
        stage?.style.setProperty('--fairy-launch-y', dy + 'px')
        stage?.style.setProperty('--fairy-launch-scale', String(scale))
        setLaunching(true)
        window.setTimeout(onDone, 760)
      }, [onDone])

      return h('div', { className: 'fairy-greet' + (launching ? ' is-launching' : ''), onClick: launch },
        h('div', { className: 'fairy-greet-bloom' }),
        h('div', { className: 'fairy-greet-scan' }),
        h('div', { className: 'fairy-greet-inner' },
          h('div', { className: 'fairy-greet-stage', ref: stageRef },
            h(Emblem, { px: 260 })),
          h('div', { className: 'fairy-greet-text' },
            GREETING.map((text, index) => h('p', {
              key: text,
              className: 'fairy-greet-line' + (step > index ? ' is-in' : ''),
            }, text))),
          h('div', { className: 'fairy-greet-meta' },
            h('span', null, 'H.D.D. / FAIRY'),
            h('span', null, '点击任意处进入'))))
    }

    /* ------------------------------------------------------------------ */
    /* styles                                                              */
    /* ------------------------------------------------------------------ */


    /* ------------------------------------------------------------------ */
    /* plugin                                                              */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'theme'],
      apply(ctx) {
        themeApi = ctx.theme

        ctx.effect(() => {
          const style = document.createElement('link')
          style.id = 'fairy-mode-style'
          style.rel = 'stylesheet'
          style.href = ASSET + '/fairy.css?v=13'
          document.head.appendChild(style)
          const skinOn = () => {
            try { return window.sessionStorage.getItem(KEY.closed) !== '1' } catch { return true }
          }
          const skinApplied = () => document.documentElement.classList.contains('fairy-on')
            && document.body?.getAttribute('data-ds-dark-theme') === ''
            && document.documentElement.getAttribute('data-ds-theme-source') === 'dark'
          const guard = () => {
            if (!skinOn() || skinApplied()) return
            try {
              const snapshot = themeApi?.getTheme?.()
              /* A settings reload can drop the registered theme; put it back
                 before re-asserting the palette. */
              if (snapshot && snapshot.preference !== 'fairy') {
                themeDispose = null
                enableTheme()
              } else {
                themeApi?.setTheme('fairy')
              }
            } catch { /* theme may be disposing */ }
            reassertSkin()
          }
          const observer = new MutationObserver(guard)
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-ds-theme-source'],
          })
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-ds-dark-theme'],
          })
          /* React rewrites the running label every tick; re-brand it whenever
             the chat flow mutates and the skin is on. */
          const chatObserver = new MutationObserver(() => {
            if (!document.documentElement.classList.contains('fairy-on')) return
            if (document.querySelector('[data-chat-running]') === null) return
            scheduleBrand(true)
          })
          chatObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
          setSkin(skinOn())
          /* The theme feature hydrates its durable preference asynchronously and
             repaints body when it lands; re-assert once it has settled. */
          const reassert = window.setTimeout(() => setSkin(skinOn()), 1400)
          return () => {
            window.clearTimeout(reassert)
            observer.disconnect()
            chatObserver.disconnect()
            style.remove()
            setSkin(false)
            stopVoice()
            themeApi = null
          }
        }, 'fairy-mode: style + skin')

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'fairy-root',
          order: 900,
        }, FairyRoot))

        ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({
          name: 'sidebar.brand.mark',
          priority: -1,
        }, BrandMark))

        ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
          name: 'sidebar.brand.name',
          priority: -1,
        }, BrandName))

        ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
          name: 'conversation.hero.brand.mark',
          priority: -1,
        }, HeroBrandMark))

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'fairy-balance',
          order: 2,
        }, BalancePill))

        ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
          name: 'conversation.chat.assistant-actions',
          id: 'fairy-speak',
          order: 20,
        }, SpeakAction))
      },
    }
  },
})
