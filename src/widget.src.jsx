// ─────────────────────────────────────────────────────────────
//  Карта тривог — віджет для Übersicht (macOS)
//  Червоні/жовті тривоги по областях, районах і громадах,
//  загрози (дрони, ракети, КАБ, авіація) та їх рух за даними моніторингу.
//  Репозиторій: https://github.com/NSwest/ukraine-alerts-widget
//  Цей файл згенеровано tools/build.py — правте src/widget.src.jsx
// ─────────────────────────────────────────────────────────────

// ===== НАЛАШТУВАННЯ =====
const HOME = 'Львівська область'     // ваша область: підсвічена, її статус у заголовку
const ALERTS_IN_UA_TOKEN = ''        // токен з https://alerts.in.ua/api-request — дає жовтий/червоний рівні,
                                     // тривоги по районах і громадах та типи загроз. Без нього — лише області.
const CHANNELS = ['kpszsu', 'eRadarrua', 'war_monitor']  // публічні Telegram-канали моніторингу
const THREAT_MINUTES = 30            // скільки хвилин показувати ціль після останньої згадки
const TG_CACHE_SECONDS = 30          // як часто перечитувати Telegram (секунди)
const DEFAULT_SIZE = 'L'             // M, L або XL
// ========================

export const refreshFrequency = 10 * 1000   // 10 секунд

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'
const tgCmd = c => `f="/tmp/ua-alerts-tg-${c}.html"; ` +
  `if [ ! -s "$f" ] || [ $(( $(date +%s) - $(stat -f %m "$f" 2>/dev/null || echo 0) )) -gt ${TG_CACHE_SECONDS} ]; then ` +
  `curl -s -m 8 -A '${UA}' 'https://t.me/s/${c}' -o "$f.tmp" && mv "$f.tmp" "$f"; fi; ` +
  `echo '###TG ${c}'; tr '\\n' ' ' < "$f" | grep -o '<div class="tgme_widget_message_wrap.*'; echo`

export const command = [
  `echo '###ALERTS'; curl -s -m 8 'https://ubilling.net.ua/aerialalerts/'; echo`,
  ALERTS_IN_UA_TOKEN
    ? `echo '###DETAIL'; curl -s -m 8 -H 'Authorization: Bearer ${ALERTS_IN_UA_TOKEN}' 'https://api.alerts.in.ua/v1/alerts/active.json'; echo`
    : '',
  ...CHANNELS.map(tgCmd),
].filter(Boolean).join('; ')

/*__GEO__*/

// ----- довідники -----
const OBL_INDEX = {}
GEO.O.forEach((o, i) => { OBL_INDEX[o.n] = i })
const UB_NAME = { 'Севастополь': 'м. Севастополь' }
const HOME_IDX = OBL_INDEX[HOME]
const shortObl = n => n === 'Автономна Республіка Крим' ? 'АР Крим' : n.replace(' область', '')
const RAY_INDEX = {}
GEO.R.forEach((r, i) => { RAY_INDEX[r.o + '|' + r.n.toLowerCase()] = i })
const HROM_INDEX = {}
GEO.Hm.forEach((h, i) => { HROM_INDEX[GEO.R[h.r].o + '|' + h.n.toLowerCase()] = i })

const HOME_LABEL = {
  'Львівська область': 'Львівщина', 'Волинська область': 'Волинь', 'Закарпатська область': 'Закарпаття',
  'Івано-Франківська область': 'Прикарпаття', 'Тернопільська область': 'Тернопільщина', 'Рівненська область': 'Рівненщина',
  'Хмельницька область': 'Хмельниччина', 'Чернівецька область': 'Буковина', 'Житомирська область': 'Житомирщина',
  'Вінницька область': 'Вінниччина', 'Київська область': 'Київщина', 'м. Київ': 'Київ', 'Одеська область': 'Одещина',
  'Харківська область': 'Харківщина', 'Дніпропетровська область': 'Дніпропетровщина',
}[HOME] || shortObl(HOME)

// регіональні назви («на Одещині») → область
const REGION_STEMS = [
  ['вінниччин', 'Вінницька'], ['волин', 'Волинська'], ['дніпропетровщин', 'Дніпропетровська'], ['донеччин', 'Донецька'],
  ['житомирщин', 'Житомирська'], ['закарпат', 'Закарпатська'], ['запоріжжі', 'Запорізька'], ['запорізьк', 'Запорізька'],
  ['франківщин', 'Івано-Франківська'], ['прикарпат', 'Івано-Франківська'], ['київщин', 'Київська'], ['кіровоградщин', 'Кіровоградська'],
  ['луганщин', 'Луганська'], ['львівщин', 'Львівська'], ['миколаївщин', 'Миколаївська'], ['одещин', 'Одеська'],
  ['полтавщин', 'Полтавська'], ['рівненщин', 'Рівненська'], ['сумщин', 'Сумська'], ['тернопільщин', 'Тернопільська'],
  ['харківщин', 'Харківська'], ['херсонщин', 'Херсонська'], ['хмельниччин', 'Хмельницька'], ['черкащин', 'Черкаська'],
  ['буковин', 'Чернівецька'], ['чернігівщин', 'Чернігівська'],
].map(([s, o]) => [s, OBL_INDEX[o + ' область']])

// ----- населені пункти: пошук за основою слова (відмінки) -----
const ENDINGS = ['ського', 'ському', 'ським', 'ська', 'ську', 'ській', 'ий', 'ій', 'ого', 'ому', 'им', 'ою', 'ею', 'ія', 'ію', 'ії', 'ям', 'ам',
  'а', 'я', 'у', 'ю', 'і', 'ї', 'е', 'є', 'о', 'и']
const stem = w => {
  for (const e of ENDINGS) if (w.length - e.length >= 4 && w.endsWith(e)) return w.slice(0, -e.length)
  return w
}
const PLACE_BY_STEM = {}
for (const [name, list] of Object.entries(GEO.G)) {
  const st = name.split(/[ -]/).length > 1 ? name : stem(name)
  if (st.length < 4) continue
  if (!PLACE_BY_STEM[st]) PLACE_BY_STEM[st] = { name, list }
}
const STOP = new Set(['чорн', 'червон', 'жовт', 'азовськ', 'шахед', 'реактив', 'ракет', 'балістик', 'напрям', 'курс', 'район', 'груп', 'півн', 'півден', 'захід', 'схід', 'області', 'област'])

// типи загроз
const KINDS = {
  drone: { label: 'Ударні БпЛА', re: /бпла|шахед|мопед|🛵|дрон|герань|гербер/ },
  jet: { label: 'Реактивні БпЛА', re: /реактивн|рбпла|🏍/ },
  missile: { label: 'Крилаті ракети', re: /крилат|ракет|\bкр\b|калібр|х-101|х-59|х-69|🚀/ },
  ballistic: { label: 'Балістика', re: /баліст|іскандер|кн-23|кинджал/ },
  kab: { label: 'КАБ', re: /\bкаб|керован.{0,5}авіабомб/ },
  aircraft: { label: 'Авіація', re: /міг-31|ту-95|ту-22|ту-160|су-34|су-35|тактичн.{0,5}авіац|✈️/ },
}
const kindOf = t => {
  for (const k of ['ballistic', 'missile', 'kab', 'aircraft', 'jet', 'drone']) if (KINDS[k].re.test(t)) return k
  return null
}
const DIRS = { 'північн': 0, 'північно-східн': 45, 'східн': 90, 'південно-східн': 135, 'південн': 180, 'південно-західн': 225, 'західн': 270, 'північно-західн': 315 }
const FROM = { 'півночі': 180, 'північного сходу': 225, 'сходу': 270, 'південного сходу': 315, 'півдня': 0, 'південного заходу': 45, 'заходу': 90, 'північного заходу': 135 }
const bearing = (a, b) => (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI + 360) % 360

// знаходить населені пункти та області у рядку, з позицією в тексті
const findPlaces = (line, oblHint) => {
  const low = line.toLowerCase().replace(/[ʼ’`]/g, "'")
  const hits = []
  const re = /[а-яґєії'][а-яґєії'\-]{2,}/g
  let m
  const words = []
  while ((m = re.exec(low))) words.push({ w: m[0], i: m.index })
  for (let j = 0; j < words.length; j++) {
    const w = words[j].w
    for (const [st, oi] of REGION_STEMS) if (w.startsWith(st)) { hits.push({ i: words[j].i, o: oi, xy: GEO.O[oi].c, region: true }); break }
    const cands = []
    if (j + 1 < words.length) cands.push(w + ' ' + words[j + 1].w)
    cands.push(w)
    for (const c of cands) {
      const st = c.includes(' ') ? c : stem(c)
      const rec = PLACE_BY_STEM[st] || PLACE_BY_STEM[c]
      if (!rec || STOP.has(st)) continue
      let best = rec.list[0]
      if (oblHint != null) { const f = rec.list.find(p => p[3] === oblHint); if (f) best = f }
      hits.push({ i: words[j].i, o: best[3], xy: [best[0], best[1]], name: rec.name, pop: best[2] })
      break
    }
  }
  return hits
}

const SIDE = { 'півночі': [0, -1], 'півдні': [0, 1], 'заході': [-1, 0], 'сході': [1, 0], 'північному заході': [-.7, -.7],
  'північному сході': [.7, -.7], 'південному заході': [-.7, .7], 'південному сході': [.7, .7], 'центрі': [0, 0] }
const DIR_WORDS = { 'північ': 0, 'північний схід': 45, 'схід': 90, 'південний схід': 135, 'південь': 180, 'південний захід': 225, 'захід': 270, 'північний захід': 315 }
const firstAfter = (all, idx, maxGap) => all.find(h => h.i >= idx && h.i - idx <= maxGap)

const parseLine = (line, t, ch) => {
  const low = line.toLowerCase().replace(/[ʼ’`]/g, "'")
  const kind = kindOf(low)
  if (!kind) return []
  const rough = findPlaces(line)
  if (!rough.length) return []
  const anchor = rough.find(h => h.region) || rough.filter(h => h.pop >= 50000).sort((a, b) => b.pop - a.pop)[0]
  const all = findPlaces(line, anchor ? anchor.o : null)
  let m
  // ціль: «курс(ом) на X», «в напрямку X», «→ X»
  let target = null
  const toRe = /(курсом на|курс на|курс -|курс —|в напрямку|у напрямку|напрямок на|напрямок|летить на|рухається на|→|->)\s*/g
  while ((m = toRe.exec(low))) { const h = firstAfter(all, m.index + m[0].length, 4); if (h) { target = h; break } }
  // звідки: «з X»
  let origin = null
  const fromRe = /(^|\s)(з|із|зі|від)\s+/g
  while ((m = fromRe.exec(low))) { const h = firstAfter(all, m.index + m[0].length, 2); if (h && h !== target) { origin = h; break } }
  // де зараз: «повз/біля/над/в районі X» або «на півдні X»
  let pos = null
  const nearRe = /(повз|біля|над|в районі|у районі|через|поблизу|на околиці|в межах|у межах)\s+/g
  while ((m = nearRe.exec(low))) { const h = firstAfter(all, m.index + m[0].length, 3); if (h && h !== target) { pos = { ...h }; break } }
  if (!pos) {
    const sideRe = /(?:на|в|у)\s+(північному заході|північному сході|південному заході|південному сході|півночі|півдні|заході|сході|центрі)\s+/g
    while ((m = sideRe.exec(low))) {
      const h = firstAfter(all, m.index + m[0].length, 2)
      if (h && h !== target) { const sv = SIDE[m[1]]; pos = { ...h, xy: [h.xy[0] + sv[0] * 32, h.xy[1] + sv[1] * 32] }; break }
    }
  }
  if (!pos && origin && target) pos = { ...origin, xy: [(origin.xy[0] * 2 + target.xy[0]) / 3, (origin.xy[1] * 2 + target.xy[1]) / 3] }
  if (!pos) pos = origin || all.find(h => h !== target) || target
  if (!pos) return []
  // напрямок руху
  let head = null
  const dm = low.match(/курс\S*\s*(?:на\s+)?[-–—:]?\s*(північний захід|північний схід|південний захід|південний схід|північ|південь|захід|схід)(?![а-яії])/)
  if (dm) head = DIR_WORDS[dm[1]]
  if (head == null) {
    const dm2 = low.match(/(північно-східн|північно-західн|південно-східн|південно-західн|північн|південн|західн|східн)\S*\s+(?:курс|напрям)/) ||
      low.match(/курс\S*\s*[-–—:]?\s*(північно-східн|північно-західн|південно-східн|південно-західн|північн|південн|західн|східн)/)
    if (dm2) head = DIRS[dm2[1]]
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  if (head == null && target && dist(pos.xy, target.xy) > 8) head = bearing(pos.xy, target.xy)
  if (head == null && origin && dist(origin.xy, pos.xy) > 8) head = bearing(origin.xy, pos.xy)
  if (head == null) {
    const fm = low.match(/з (північного сходу|північного заходу|південного сходу|південного заходу|півночі|півдня|сходу|заходу)/)
    if (fm) head = FROM[fm[1]]
  }
  const nm = low.match(/(\d+)\s*[хx×]\s/) || low.match(/(\d+)\s*(шахед|бпла|ракет)/)
  const n = nm ? Math.min(99, +nm[1]) : (/груп/.test(low) ? 5 : 1)
  return [{ kind, xy: pos.xy, o: pos.o, head, t, n, ch, place: pos.name ? pos.name[0].toUpperCase() + pos.name.slice(1) : shortObl(GEO.O[pos.o].n), text: line }]
}

const parseTG = out => {
  const res = []
  const parts = out.split('###TG ').slice(1)
  for (const p of parts) {
    const ch = (p.match(/^\S+/) || [''])[0]
    const doc = new DOMParser().parseFromString(p.slice(ch.length), 'text/html')
    doc.querySelectorAll('.tgme_widget_message').forEach(msg => {
      const txt = msg.querySelector('.tgme_widget_message_text')
      const time = msg.querySelector('time[datetime]')
      if (!txt || !time) return
      txt.querySelectorAll('br').forEach(b => b.replaceWith('\n'))
      const t = new Date(time.getAttribute('datetime'))
      if (Date.now() - t > THREAT_MINUTES * 60000) return
      for (const line of (txt.textContent || '').split('\n')) if (line.trim()) res.push(...parseLine(line.trim(), t, ch))
    })
  }
  // прибираємо дублі: та сама ціль у тому ж місці — лишаємо найсвіжішу
  res.sort((a, b) => b.t - a.t)
  const kept = []
  for (const r of res) {
    if (kept.some(k => k.kind === r.kind && Math.hypot(k.xy[0] - r.xy[0], k.xy[1] - r.xy[1]) < 22)) continue
    kept.push(r)
  }
  return kept
}

// ----- розбір тривог -----
const section = (out, tag) => {
  const i = out.indexOf('###' + tag)
  if (i < 0) return null
  const rest = out.slice(i + tag.length + 3)
  const j = rest.indexOf('###')
  return (j < 0 ? rest : rest.slice(0, j)).trim()
}
const tryJSON = s => { try { return JSON.parse(s) } catch (e) { return null } }
const lvl = a => (a.alert_level === 'yellow' ? 'Y' : 'R')
const up = (map, k, v) => { if (map[k] !== 'R') map[k] = v }

const THREAT_LABEL = {
  drones: 'Ударні БпЛА', guided_aerial_bombs: 'КАБ', ballistic_missiles: 'Балістика', cruise_missiles: 'Крилаті ракети',
  unspecified_missiles: 'Ракети', mig31k_departure: 'Зліт МіГ-31К', tactic_aircraft_activity: 'Тактична авіація',
  strategic_aircraft_activity: 'Стратегічна авіація', air_defense: 'Робота ППО', unknown: 'Загроза',
}

const parseAlerts = (ub, det) => {
  const obl = {}, ray = {}, hrom = {}, threats = {}
  let mode = null
  if (det && Array.isArray(det.alerts)) {
    mode = 'detail'
    for (const a of det.alerts) {
      const oi = OBL_INDEX[a.location_oblast] != null ? OBL_INDEX[a.location_oblast] : OBL_INDEX[a.location_title]
      if (oi == null) continue
      const L = a.alert_type === 'air_raid' ? lvl(a) : 'R'
      const title = (a.location_title || '').toLowerCase()
      if (a.location_type === 'oblast' || OBL_INDEX[a.location_title] != null) up(obl, oi, L)
      else if (a.location_type === 'raion') {
        const ri = RAY_INDEX[oi + '|' + title.replace(/ район$/, '')]
        if (ri != null) up(ray, ri, L)
      } else if (a.location_type === 'hromada') {
        const hi = HROM_INDEX[oi + '|' + title.replace(/ (територіальна|міська|селищна|сільська) громада$/, '').replace(/ громада$/, '')]
        if (hi != null) up(hrom, hi, L)
      } else if (a.location_type === 'city') {
        const g = GEO.G[title.replace(/^м\. /, '')]
        const p = g && (g.find(x => x[3] === oi) || g[0])
        if (p) up(hrom, p[4], L)
      }
      for (const th of (a.threats || [])) {
        const k = th.threat_type || 'unknown'
        if (!threats[k]) threats[k] = { level: th.level, obl: new Set() }
        if (th.level === 'red') threats[k].level = 'red'
        threats[k].obl.add(oi)
      }
    }
  } else if (ub && ub.states) {
    mode = 'oblast'
    for (const [k, v] of Object.entries(ub.states)) {
      const oi = OBL_INDEX[UB_NAME[k] || k]
      if (oi != null && v.alertnow) obl[oi] = 'R'
    }
    if (obl[OBL_INDEX['м. Севастополь']]) obl[OBL_INDEX['Автономна Республіка Крим']] = 'R'
  }
  return { obl, ray, hrom, threats, mode }
}

// ----- іконки загроз (вершина вгору = на північ) -----
const ICON = {
  drone: 'M0-11L10 5 3 3 0 8-3 3-10 5Z',
  jet: 'M0-12L3-4 10 3 10 6 2 3 2 7 5 10-5 10-2 7-2 3-10 6-10 3-3-4Z',
  missile: 'M0-12L2.5-7 2.5 5 6 10-6 10-2.5 5-2.5-7Z',
  ballistic: 'M0-13L3-8 3 6 6 11-6 11-3 6-3-8Z',
  kab: 'M0-9C3-9 4-5 4 0L4 4 7 8-7 8-4 4-4 0C-4-5-3-9 0-9Z',
  aircraft: 'M0-12L2-4 11 1 11 3 2 1 1 8 4 11-4 11-1 8-2 1-11 3-11 1-2-4Z',
}

// ----- стан між оновленнями -----
let lastGood = null, homeSince = null, prevHome = undefined
const store = {
  get(k, d) { try { const v = localStorage.getItem('ua_alerts_' + k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('ua_alerts_' + k, JSON.stringify(v)) } catch (e) {} },
}
const SIZES = { M: 480, L: 680, XL: 900 }

const onDragStart = e => {
  if (e.button !== 0 || e.target.closest('button')) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY
  const mv = ev => { el.style.left = Math.max(0, r.left + ev.clientX - sx) + 'px'; el.style.top = Math.max(0, r.top + ev.clientY - sy) + 'px'; el.style.right = 'auto' }
  const upF = () => {
    window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', upF)
    const f = el.getBoundingClientRect(); store.set('pos', { left: Math.round(f.left), top: Math.round(f.top) })
  }
  window.addEventListener('mousemove', mv); window.addEventListener('mouseup', upF)
}
const setSize = (k, e) => {
  e.stopPropagation(); store.set('size', k)
  const el = e.currentTarget.closest('.card'); el.style.width = SIZES[k] + 'px'
  el.querySelectorAll('.sz').forEach(b => b.classList.toggle('on', b.dataset.k === k))
}
const resetPos = e => {
  e.stopPropagation(); store.set('pos', null)
  const el = e.currentTarget.closest('.card'); el.style.left = 'auto'; el.style.right = '24px'; el.style.top = '40px'
}

const LABEL_FIX = { 'Хмельницька область': [12, 28], 'Тернопільська область': [-8, 6], 'Київська область': [-22, 34],
  'Черкаська область': [0, 12], 'Вінницька область': [0, 8] }
const labelXY = o => { const f = LABEL_FIX[o.n] || [0, 0]; return [o.c[0] + f[0], o.c[1] + f[1]] }

const hhmm = d => d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })

// ----- рендер -----
export const render = ({ output }) => {
  const out = output || ''
  const ub = tryJSON(section(out, 'ALERTS') || '')
  const det = ALERTS_IN_UA_TOKEN ? tryJSON(section(out, 'DETAIL') || '') : null
  let A = parseAlerts(ub, det)
  if (A.mode) lastGood = { A, t: new Date() }
  else if (lastGood) A = lastGood.A
  const targets = out.includes('###TG') ? parseTG(out) : []

  const homeObl = A.obl[HOME_IDX]
  const homePart = !homeObl && (Object.keys(A.ray).some(i => GEO.R[i].o === HOME_IDX) || Object.keys(A.hrom).some(i => GEO.R[GEO.Hm[i].r].o === HOME_IDX))
  const homeState = homeObl || (homePart ? 'P' : null)
  if (prevHome !== undefined && homeState && !prevHome) homeSince = new Date()
  if (!homeState) homeSince = null
  prevHome = homeState
  const homeThreat = targets.filter(t => t.o === HOME_IDX)

  const oblAlert = i => A.obl[i] || null
  const oblLevel = {}
  const bump = (o, v) => { if (oblLevel[o] !== 'R') oblLevel[o] = v }
  Object.entries(A.obl).forEach(([i, v]) => { if (+i !== OBL_INDEX['м. Севастополь']) bump(+i, v) })
  Object.entries(A.ray).forEach(([i, v]) => bump(GEO.R[i].o, v))
  Object.entries(A.hrom).forEach(([i, v]) => bump(GEO.R[GEO.Hm[i].r].o, v))
  const counts = { R: 0, Y: 0 }
  Object.values(oblLevel).forEach(v => { counts[v]++ })
  const affected = Object.keys(oblLevel)

  const byKind = {}
  targets.forEach(t => { byKind[t.kind] = (byKind[t.kind] || 0) + t.n })

  const pos = store.get('pos', null)
  const size = store.get('size', DEFAULT_SIZE)
  const style = { width: (SIZES[size] || SIZES.L) + 'px', top: (pos ? pos.top : 40) + 'px' }
  if (pos) { style.left = pos.left + 'px'; style.right = 'auto' } else style.right = '24px'

  const cls = homeObl === 'R' ? 'red' : homeObl === 'Y' ? 'yellow' : homePart ? 'part' : homeThreat.length ? 'watch' : 'calm'
  const statusText = homeObl === 'R' ? 'ПОВІТРЯНА ТРИВОГА' : homeObl === 'Y' ? 'Загроза (жовтий рівень)' : homePart ? 'Тривога в частині області'
    : homeThreat.length ? 'Ціль у вашій області' : 'Тиша'
  const fillOf = s => (s === 'Y' ? 'var(--yellow)' : 'var(--red)')
  const now = Date.now()

  const threatRows = []
  if (A.mode === 'detail') {
    Object.entries(A.threats).forEach(([k, v]) => threatRows.push({ label: THREAT_LABEL[k] || k, level: v.level, extra: v.obl.size + ' обл.' }))
  }
  Object.entries(byKind).forEach(([k, n]) => {
    if (!threatRows.some(r => r.label === KINDS[k].label)) threatRows.push({ label: KINDS[k].label, level: k === 'drone' || k === 'jet' ? 'yellow' : 'red', extra: '≈' + n })
  })

  return (
    <div className={'card ' + cls} style={style} onMouseDown={onDragStart}>
      <div className="head">
        <div>
          <div className="loc">{HOME_LABEL}</div>
          <div className="status">{statusText}{homeSince ? <span className="since"> з {hhmm(homeSince)}</span> : null}</div>
        </div>
        <div className="sum">
          <div>Областей з тривогою: <b>{affected.length}</b></div>
          <div><b className="r">● {counts.R}</b> червоний · <b className="y">● {counts.Y}</b> жовтий · цілей: <b>{targets.length}</b></div>
        </div>
      </div>

      <svg viewBox={`0 0 ${GEO.W} ${GEO.H}`} className="map">
        <g className="ray">{GEO.R.map((r, i) => <path key={i} d={r.d} />)}</g>
        <g className="alerts">
          {Object.entries(A.obl).map(([i, v]) => <path key={'o' + i} d={GEO.O[i].d} fill={fillOf(v)} />)}
          {Object.entries(A.ray).filter(([i]) => !oblAlert(GEO.R[i].o)).map(([i, v]) => <path key={'r' + i} d={GEO.R[i].d} fill={fillOf(v)} />)}
          {Object.entries(A.hrom).filter(([i]) => !oblAlert(GEO.R[GEO.Hm[i].r].o) && !A.ray[GEO.Hm[i].r]).map(([i, v]) => <path key={'h' + i} d={GEO.Hm[i].d} fill={fillOf(v)} />)}
        </g>
        <g className="obl">{GEO.O.map((o, i) => <path key={i} d={o.d} />)}</g>
        {HOME_IDX != null ? <path className="home" d={GEO.O[HOME_IDX].d} /> : null}
        <g className="labels">
          {GEO.O.map((o, i) => o.n.startsWith('м. ') ? null :
            <text key={i} x={labelXY(o)[0]} y={labelXY(o)[1]}>{shortObl(o.n)}</text>)}
          <text x={GEO.O[OBL_INDEX['м. Київ']].c[0] + 4} y={GEO.O[OBL_INDEX['м. Київ']].c[1] - 9} className="city">м. Київ</text>
        </g>
        <g className="targets">
          {targets.map((t, i) => {
            const age = (now - t.t) / 60000
            const op = Math.max(0.35, 1 - age / THREAT_MINUTES)
            return (
              <g key={i} transform={`translate(${t.xy[0]} ${t.xy[1]})`} opacity={op} className={'tg ' + t.kind}>
                <title>{`${KINDS[t.kind].label}: ${t.place} · ${hhmm(t.t)} (@${t.ch})\n${t.text}`}</title>
                {t.head == null ? <circle r="15" className="halo" /> : null}
                <g transform={`rotate(${t.head == null ? 0 : t.head}) scale(1.55)`}><path d={ICON[t.kind]} /></g>
                {t.n > 1 ? <text x="13" y="-9" className="n">{t.n}</text> : null}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="threats">
        {threatRows.length ? threatRows.map((r, i) =>
          <span key={i} className={'chip ' + (r.level === 'red' ? 'cr' : 'cy')}>{r.label} <i>{r.extra}</i></span>)
          : <span className="chip calmchip">Активних загроз у моніторингу немає</span>}
      </div>

      <div className="foot">
        <span>
          <i className="lg" style={{ background: 'var(--red)' }} />тривога
          <i className="lg" style={{ background: 'var(--yellow)' }} />дрони (жовтий)
          {A.mode !== 'detail' ? <span className="hint"> · райони й жовтий рівень — з токеном alerts.in.ua</span> : null}
        </span>
        <span className="right">
          {A.mode ? 'оновлено ' + hhmm(new Date()) : lastGood ? 'дані на ' + hhmm(lastGood.t) : "немає зв'язку"}
          <span className="ctl">
            {Object.keys(SIZES).map(k => <button key={k} data-k={k} className={'sz' + (k === size ? ' on' : '')} onClick={e => setSize(k, e)}>{k}</button>)}
            <button className="sz" title="Повернути на місце" onClick={resetPos}>↺</button>
          </span>
        </span>
      </div>
    </div>
  )
}

export const className = `
  position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased; color: #e9edf3;

  .card { position: fixed; pointer-events: auto; box-sizing: border-box; padding: 14px 16px 10px;
    background: #141a24; border-radius: 22px; border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35); cursor: grab; user-select: none;
    --red: #b8433f; --yellow: #d6a21e; --land: #363e4d; --edge: #262c38; }
  .card.red { border-color: rgba(229,72,77,0.75); box-shadow: 0 0 0 2px rgba(229,72,77,0.35), 0 10px 30px rgba(0,0,0,0.35); }
  .card.yellow, .card.part { border-color: rgba(214,162,30,0.7); }
  .card.watch { border-color: rgba(214,162,30,0.45); }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
  .loc { font-size: 13px; font-weight: 600; color: #9aa6b6; letter-spacing: .2px; }
  .status { font-size: 24px; font-weight: 600; letter-spacing: -.3px; margin-top: 1px; }
  .red .status { color: #ff6b62; } .yellow .status, .part .status, .watch .status { color: #f0bd3a; } .calm .status { color: #8fd19e; }
  .since { font-size: 14px; font-weight: 500; color: #c7ced8; }
  .sum { text-align: right; font-size: 12px; color: #aab4c2; line-height: 1.5; }
  .sum b.r { color: #ff6b62; } .sum b.y { color: #f0bd3a; }

  .map { width: 100%; display: block; }
  .ray path { fill: var(--land); stroke: var(--edge); stroke-width: .6; }
  .alerts path { stroke: none; opacity: .95; }
  .obl path { fill: none; stroke: #11161e; stroke-width: 2; stroke-linejoin: round; }
  .home { fill: none; stroke: rgba(255,255,255,0.85); stroke-width: 2.4; stroke-linejoin: round; }
  .labels text { fill: #f1f4f8; font-size: 15px; font-weight: 500; text-anchor: middle; dominant-baseline: middle;
    paint-order: stroke; stroke: rgba(10,14,20,0.55); stroke-width: 3px; }
  .labels text.city { font-size: 12px; text-anchor: start; }
  .tg path { fill: #fff; stroke: #0b0f15; stroke-width: 1.3; stroke-linejoin: round; }
  .tg.missile path, .tg.ballistic path { fill: #ff6b62; }
  .tg.kab path { fill: #ffb347; }
  .tg .halo { fill: rgba(255,255,255,0.12); stroke: rgba(255,255,255,0.5); stroke-dasharray: 3 3; }
  .tg .n { fill: #fff; font-size: 13px; font-weight: 700; paint-order: stroke; stroke: #0b0f15; stroke-width: 3px; }

  .threats { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 6px; }
  .chip { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.06); }
  .chip i { font-style: normal; opacity: .75; margin-left: 3px; }
  .chip.cr { background: rgba(184,67,63,0.28); color: #ffb3ad; }
  .chip.cy { background: rgba(214,162,30,0.22); color: #f5d27a; }
  .chip.calmchip { color: #8fa0b3; }

  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #8b97a7; }
  .lg { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin: 0 4px 0 8px; vertical-align: -1px; }
  .lg:first-child { margin-left: 0; }
  .hint { opacity: .8; }
  .right { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .ctl { display: inline-flex; gap: 3px; opacity: 0; transition: opacity .15s; }
  .card:hover .ctl { opacity: 1; }
  .sz { font: 600 10px -apple-system, sans-serif; color: #dfe5ee; background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 1px 5px; cursor: pointer; }
  .sz.on { background: rgba(255,255,255,0.3); }
`
