(() => {
'use strict';

// =================================================================== constants
const MODE_LABEL = { UBAHN: 'U-Bahn', SBAHN: 'S-Bahn', TRAM: 'Tram', METROBUS: 'MetroBus', BUS: 'Bus' };
const MODE_GLYPH = { UBAHN: ['U', '#0065AE'], SBAHN: ['S', '#408335'], TRAM: ['T', '#E3000F'], METROBUS: ['M', '#D3762B'], BUS: ['B', '#325868'] };
// MVG / S-Bahn München line colours (MVG API lineBackgroundColor + Traewelling line-colors dataset)
const LSTYLE = {
  U1: { bg: '#52822f' }, U2: { bg: '#c20831' }, U3: { bg: '#ec6725' }, U4: { bg: '#00a984' }, U5: { bg: '#bc7a00' }, U6: { bg: '#0065ae' },
  U7: { bg: '#52822f', bg2: '#c20831' }, U8: { bg: '#c20831', bg2: '#ec6725' },
  S1: { bg: '#1fbce6' }, S2: { bg: '#79b833' }, S3: { bg: '#962a85' }, S4: { bg: '#e41f28' }, S5: { bg: '#00527f' }, S6: { bg: '#008f5c' },
  S7: { bg: '#8a372f' }, S8: { bg: '#2d2b29', fg: '#ffcd01' }, S20: { bg: '#f05972' },
  '12': { bg: '#95348b' }, '14': { bg: '#e5007d' }, '16': { bg: '#0065ad' }, '17': { bg: '#8b563e' }, '18': { bg: '#0aa537' }, '19': { bg: '#e3000f' },
  '20': { bg: '#10bae7' }, '21': { bg: '#bb7900' }, '23': { bg: '#bbcf00' }, '25': { bg: '#f1909c' }, '27': { bg: '#f7a600' },
  '28': { bg: '#ffffff', fg: '#f7a600', line: '#f7a600', hollow: true },
  N17: { bg: '#8b563e' }, N19: { bg: '#e3000f' }, N20: { bg: '#10bae7' }, N27: { bg: '#f7a600' },
};
const lineColor = l => (LSTYLE[l] ? (LSTYLE[l].line || LSTYLE[l].bg) : '#5B6B7C');
const MODES = ['UBAHN', 'SBAHN', 'TRAM', 'METROBUS', 'BUS'];
const BASIC_TRAMS = ['16', '17', '18', '19', '20', '21', '25', '27'];
const DARK_COLOR = { S8: '#D6D1C4' };
const CENTER = [11.575, 48.137];
const BOUNDS = [[10.95, 47.80], [12.15, 48.50]];
const DEMO_POS = [11.5775, 48.1424]; // Odeonsplatz
const PREVIEW = /claude|anthropic/i.test(location.hostname);
const KEY_F = 'saferide.filters.v2', KEY_P = 'saferide.profile.v1', KEY_R = 'saferide.myreports.v1';
const SPEED = { UBAHN: 34 / 3.6, SBAHN: 54 / 3.6, TRAM: 19 / 3.6 };
const DWELL = { UBAHN: 25, SBAHN: 35, TRAM: 18 };
const SEV_COLOR = { 1: '#D9B200', 2: '#E08A00', 3: '#D21F3C' };
const KIND = {
  report: { label: 'Meldung', short: 'Meldung' },
  disruption: { label: 'Störung', short: 'Verkehr' },
  construction: { label: 'Baustelle', short: 'Baustelle' },
  news: { label: 'Nachrichten', short: 'News' },
  weather: { label: 'Wetter', short: 'Wetter' },
};
const MAP_THEME = {
  light: { land: '#E7EBEE', outside: '#DCE1E5', boundary: '#C3CBD3', water: '#A9C8DE', park: '#D3E0D0', place: '#7D8995', halo: '#E7EBEE', casing: '#E7EBEE',
           stFill: '#FFFFFF', stStroke: '#1B2733', label: '#1B2733', labelHalo: 'rgba(255,255,255,.92)', glow: 0, routeCase: '#FFFFFF' },
  dark:  { land: '#101922', outside: '#0A1118', boundary: '#233140', water: '#173048', park: '#13241D', place: '#5D6C7C', halo: '#101922', casing: '#101922',
           stFill: '#101922', stStroke: '#D8E0E8', label: '#D8E0E8', labelHalo: 'rgba(16,25,34,.92)', glow: .22, routeCase: '#0A1118' },
};
const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8.5" opacity=".35"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v15M4 15l4 4 4-4M16 20V5M12 9l4-4 4 4"/></svg>',
  walk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3M11 8l-3 2-1 3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3 19c.6-3 2.6-4.8 5-4.8s4.4 1.8 5 4.8M11 19c.6-3 2.6-4.8 5-4.8s4.4 1.8 5 4.8"/></svg>',
  disruption: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M8 21l2-4M16 21l-2-4M5 11h14"/><circle cx="9" cy="14" r=".7" fill="currentColor"/><circle cx="15" cy="14" r=".7" fill="currentColor"/></svg>',
  construction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 4h5l4 16h-13z"/><path d="M8 11h8M6.8 16h10.4M3 20h18"/></svg>',
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 01-2-2z"/><path d="M17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5M8 16h3"/></svg>',
};

// =================================================================== state
const FDEF = { view: 'basic', modes: { UBAHN: true, SBAHN: true, TRAM: true, METROBUS: true, BUS: true }, custom: [], stations: true, vehicles: true, zones: true };
const PDEF = { home: null, preferred: [], avoided: [], routeDefault: 'safe', maxExtra: 15, sources: { report: true, disruption: true, construction: true, news: true },
               tracking: false, style: 'auto', proxyUrl: '', demo: true };
const loadJSON = (k, d) => { try { const s = JSON.parse(localStorage.getItem(k) || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return JSON.parse(JSON.stringify(d)); };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
let F = Object.assign({}, FDEF, loadJSON(KEY_F, FDEF)); F.modes = Object.assign({}, FDEF.modes, F.modes || {});
let P = Object.assign({}, PDEF, loadJSON(KEY_P, PDEF)); P.sources = Object.assign({}, PDEF.sources, P.sources || {});
let MYREPORTS = loadJSON(KEY_R, []); if (!Array.isArray(MYREPORTS)) MYREPORTS = [];
function sanitizeState() {
  const strs = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string'))] : [];
  const bool = (v, d) => typeof v === 'boolean' ? v : d;
  P.preferred = strs(P.preferred); P.avoided = strs(P.avoided); P.home = typeof P.home === 'string' ? P.home : null;
  if (!['safe', 'fast'].includes(P.routeDefault)) P.routeDefault = 'safe';
  if (![5, 10, 15, 20].includes(P.maxExtra)) P.maxExtra = 15;
  if (!['auto', 'light', 'dark'].includes(P.style)) P.style = 'auto';
  if (typeof P.proxyUrl !== 'string') P.proxyUrl = '';
  P.tracking = bool(P.tracking, false); P.demo = bool(P.demo, true);
  const src = P.sources && typeof P.sources === 'object' ? P.sources : {}; P.sources = {}; for (const k in PDEF.sources) P.sources[k] = bool(src[k], true);
  const md = F.modes && typeof F.modes === 'object' ? F.modes : {}; F.modes = {}; for (const k in FDEF.modes) F.modes[k] = bool(md[k], true);
  if (!['basic', 'all', 'custom'].includes(F.view)) F.view = 'basic';
  F.custom = strs(F.custom); for (const k of ['stations', 'vehicles', 'zones']) F[k] = bool(F[k], true);
  MYREPORTS = MYREPORTS.filter(r => r && typeof r === 'object' && typeof r.id === 'string' && typeof r.to === 'number' && typeof r.from === 'number');
}
sanitizeState();
const saveF = () => saveJSON(KEY_F, F), saveP = () => saveJSON(KEY_P, P);

let LINES = [], LINE = {}, STATIONS = null, PD = [], ST = {}, STOPS_AT = {}, NEAR = {};
let map = null, selected = null, theme = 'light', cardRefresh = null, openSheetId = null;
let SHARED = []; // reports + Way Out hotspots from the control room (src/saferide/main.tsx)
let ALERTS = [], WEATHER = null, SOURCES = { mvg: 'loading', news: 'loading', weather: 'loading' }, alertsUpdated = null;
let ROUTE = { from: null, to: null, mode: null, results: null, chosen: null, trip: null };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const metres = (a, b) => { const k = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180); return Math.hypot((b[0] - a[0]) * k * 111320, (b[1] - a[1]) * 110540); };
const bearing = (a, b) => { const k = Math.cos(a[1] * Math.PI / 180); return (Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180 / Math.PI + 360) % 360; };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(msg, ms = 3400) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); }
// Timetables and clocks always run on Munich time, whatever time zone the phone is set to
const TZ = 'Europe/Berlin';
let tzCache = { at: -1e15, off: 0 };
function tzOff(ms = Date.now()) {
  if (Math.abs(ms - tzCache.at) < 600000) return tzCache.off;
  let off;
  try {
    const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms))) p[x.type] = +x.value;
    off = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  } catch (e) { off = -new Date(ms).getTimezoneOffset() * 60000; }
  tzCache = { at: ms, off }; return off;
}
const mz = (ms = Date.now()) => new Date(ms + tzOff(ms)); // read with getUTC…()
const mzHour = (ms = Date.now()) => mz(ms).getUTCHours();
function secOfDay(ms = Date.now()) { const d = mz(ms); return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() + d.getUTCMilliseconds() / 1000; }
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
const clock = ms => { try { return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }); } catch (e) { return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } };
const mins = s => Math.max(0, Math.round(s / 60));
function ago(ms) { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} Min` : `vor ${Math.round(m / 60)} Std`; }
function badgeStyle(l) {
  const st = LSTYLE[l]; if (!st) return 'background:#5B6B7C;color:#fff';
  const bg = st.bg2 ? `linear-gradient(135deg, ${st.bg} 0 50%, ${st.bg2} 50% 100%)` : st.bg;
  return `background:${bg};color:${st.fg || '#fff'}${st.hollow ? `;box-shadow:inset 0 0 0 2px ${st.fg}` : ''}`;
}
function badge(l, size = '') { const L = LINE[l]; return `<span class="badge ${L ? L.mode : ''} ${size}" style="${badgeStyle(l)}">${esc(l)}</span>`; }
const stName = id => (ST[id] ? ST[id].name : id);
function setHTML(el, html) { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

// =================================================================== data
let GLYPHS = {};
async function loadData() {
  // the single-file build embeds everything in window.SR_DATA, so it also works when opened straight from a folder
  const inl = window.SR_DATA || {};
  const get = name => inl[name] ? Promise.resolve(inl[name]) : fetch(`data/${name}.json`).then(r => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); });
  const [lines, stations, patterns, base, glyphs] = await Promise.all(['lines', 'stations', 'patterns', 'base', 'glyphs'].map(get));
  GLYPHS = glyphs;
  for (const f of lines.features) {
    const p = f.properties, ls = LSTYLE[p.line] || {};
    p.color = lineColor(p.line); p.colorDark = DARK_COLOR[p.line] || p.color;
    if (ls.bg2) p.color2 = ls.bg2; if (ls.hollow) p.hollow = true;
    let bb = [180, 90, -180, -90];
    for (const ls of f.geometry.coordinates) for (const [x, y] of ls) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
    const L = { line: p.line, mode: p.mode, color: p.color, color2: p.color2 || null, fg: ls.fg || '#FFFFFF', hollow: !!ls.hollow, colorDark: p.colorDark, night: !!p.night, bbox: bb, patterns: [] };
    LINES.push(L); LINE[p.line] = L;
  }
  for (const f of stations.features) {
    const p = f.properties; if (/_(UBAHN|TRAM)$/.test(p.id)) continue;
    const [lng, lat] = f.geometry.coordinates;
    ST[p.id] = { id: p.id, name: p.name, lines: p.lines, lng, lat, rank: p.rank, modes: p.modes };
  }
  patterns.forEach((p, i) => {
    const L = LINE[p.line]; if (!L) return;
    L.patterns.push(p);
    for (const dir of [0, 1]) {
      const coords = dir ? p.coords.slice().reverse() : p.coords;
      const stopD = dir ? p.stopD.map(d => p.length - d).reverse() : p.stopD;
      const names = dir ? p.stations.slice().reverse() : p.stations;
      const ids = dir ? p.stationIds.slice().reverse() : p.stationIds;
      const cum = [0];
      for (let k = 1; k < coords.length; k++) cum.push(cum[k - 1] + metres(coords[k - 1], coords[k]));
      const sd = stopD.map(d => d * (cum[cum.length - 1] / (p.length || 1)));
      const v = SPEED[p.mode], dw = DWELL[p.mode], arr = [0], dep = [0];
      let t = 0;
      for (let k = 1; k < sd.length; k++) { t += Math.max(30, (sd[k] - sd[k - 1]) / v); arr.push(t); if (k < sd.length - 1) t += dw; dep.push(t); }
      let bb = [180, 90, -180, -90];
      for (const [x, y] of coords) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
      PD.push({ i: PD.length, line: p.line, mode: p.mode, night: p.night, color: p.color, coords, cum, sd, names, ids, arr, dep, T: t, to: names[names.length - 1], bb,
                phase: hash(p.line + dir) % 3600 });
    }
  });
  PD.forEach(pd => pd.ids.forEach((sid, k) => { (STOPS_AT[sid] = STOPS_AT[sid] || []).push({ pi: pd.i, k }); }));
  const ids = Object.keys(ST);
  for (const a of ids) { NEAR[a] = []; for (const b of ids) if (a !== b) { const m = metres([ST[a].lng, ST[a].lat], [ST[b].lng, ST[b].lat]); if (m < 380) NEAR[a].push({ sid: b, m }); } }
  for (const L of LINES) {
    L.stationCount = new Set(L.patterns.flatMap(p => p.stationIds)).size;
    L.termini = L.patterns.length > 1 ? `${L.patterns[0].stations[0]} ↔ ${L.patterns.map(p => p.stations[p.stations.length - 1]).join(' / ')}`
      : `${L.patterns[0].stations[0]} ↔ ${L.patterns[0].stations[L.patterns[0].stations.length - 1]}`;
  }
  STATIONS = stations;
  return { lines, stations, base };
}
function stationByName(n) { const k = n.toLowerCase(); return Object.values(ST).find(s => s.name.toLowerCase() === k) || null; }

// =================================================================== schedule + vehicles
function headwayMin(L, date = new Date()) {
  const z = mz(date.getTime()), h = z.getUTCHours() + z.getUTCMinutes() / 60, dow = z.getUTCDay(), wkNight = (dow === 6 || dow === 0) && h < 5;
  if (L.night) return (h >= 1.25 && h < 5) ? 30 : null;
  if (h >= 1.5 && h < 4.5) return (wkNight && L.mode === 'SBAHN') ? 60 : null;
  if (L.mode === 'UBAHN') return (h >= 6 && h < 20) ? 5 : (h >= 20 || h < 1) ? 10 : 20;
  if (L.mode === 'SBAHN') return (h >= 5.5 && h < 23.5) ? 20 : 40;
  return (h >= 6 && h < 20) ? 10 : (h >= 20 || h < 1) ? 15 : 20;
}
function posAlong(pd, d) {
  const c = pd.cum; let a = 0, b = c.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (c[m] <= d) a = m; else b = m - 1; }
  const i = Math.min(a, c.length - 2), seg = c[i + 1] - c[i] || 1, t = Math.max(0, Math.min(1, (d - c[i]) / seg));
  const p0 = pd.coords[i], p1 = pd.coords[i + 1];
  return { lng: p0[0] + (p1[0] - p0[0]) * t, lat: p0[1] + (p1[1] - p0[1]) * t, brg: bearing(p0, p1) };
}
function posAt(pd, e) {
  const { arr, dep, sd } = pd;
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m] <= e) lo = m; else hi = m - 1; }
  const k = lo; let d, atStop = false, next = Math.min(k + 1, arr.length - 1);
  if (e < dep[k] || k === arr.length - 1) { d = sd[k]; atStop = true; next = k; }
  else { const f = (e - dep[k]) / (arr[k + 1] - dep[k]); d = sd[k] + (f * f * (3 - 2 * f) * .6 + f * .4) * (sd[k + 1] - sd[k]); }
  return Object.assign(posAlong(pd, d), { next, atStop, d });
}
let vehCount = 0, VEH = new Map();
function computeVehicles(vis) {
  const now = Date.now(), t = secOfDay(now), feats = [], keep = new Map(), hw = {};
  for (const pd of PD) {
    if (!vis.has(pd.line)) continue;
    if (!(pd.line in hw)) { const m = headwayMin(LINE[pd.line]); hw[pd.line] = m ? m * 60 : 0; }
    const H = hw[pd.line]; if (!H) continue;
    const ph = pd.phase % H, jMax = Math.floor((t - ph) / H), jMin = Math.ceil((t - pd.T - ph) / H);
    for (let j = jMin; j <= jMax; j++) {
      const D = ph + j * H, e = t - D; if (e < 0 || e > pd.T) continue;
      const p = posAt(pd, e), id = `${pd.i}:${j}`;
      keep.set(id, { pd, e, p, eAt: ms => secOfDay(ms) - D });
      feats.push({ type: 'Feature', properties: { vid: id, line: pd.line, mode: pd.mode, brg: Math.round(p.brg) }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
    }
  }
  if (Loc.demo) {
    const dm = Loc.demo, e = dm.eAt(now);
    if (e >= 0 && e <= dm.pd.T) {
      const p = posAt(dm.pd, e);
      keep.set('demo', { pd: dm.pd, e, p, eAt: dm.eAt, demo: true });
      feats.push({ type: 'Feature', properties: { vid: 'demo', line: dm.pd.line, mode: dm.pd.mode, brg: Math.round(p.brg) }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
    }
  }
  VEH = keep; vehCount = feats.length;
  return { type: 'FeatureCollection', features: feats };
}
function nextDeparture(pd, k, tSec) {
  const m = headwayMin(LINE[pd.line], new Date(Date.now() + (tSec - secOfDay()) * 1000)); if (!m) return null;
  const H = m * 60, ph = pd.phase % H, off = pd.dep[k];
  return ph + Math.ceil((tSec - off - ph) / H) * H + off;
}
function nextDepartures(sid, limit = 2) {
  const t = secOfDay(), rows = [];
  for (const { pi, k } of (STOPS_AT[sid] || [])) {
    const pd = PD[pi]; if (k === pd.ids.length - 1) continue;
    const first = nextDeparture(pd, k, t); if (first == null) continue;
    const H = headwayMin(LINE[pd.line]) * 60, times = [];
    for (let n = 0; n < limit; n++) times.push(first + n * H - t);
    rows.push({ line: pd.line, to: pd.to, times });
  }
  rows.sort((a, b) => a.times[0] - b.times[0]);
  const seen = new Set();
  return rows.filter(r => { const k = r.line + r.to; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
}

// =================================================================== monitoring
function tonight(h, mi) { const now = Date.now(), z = mz(now); let t = Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), h, mi) - tzOff(now); if (z.getUTCHours() < 6 && h >= 12) t -= 864e5; return t; }
function demoAlerts() {
  const now = Date.now(), m = 60000;
  return [
    { id: 'demo-r1', kind: 'report', sev: 3, title: 'Große Gruppe, aggressiv', body: '25+ Personen am U-Bahnsteig. Von 3 Personen bestätigt.', stations: ['Sendlinger Tor'], r: 260, from: now - 12 * m, to: now + 33 * m, source: 'Meldung', demo: true },
    { id: 'demo-r2', kind: 'report', sev: 2, title: 'Mittlere Gruppe, belästigt Leute', body: '10 bis 25 Personen am Ausgang Bayerstraße.', stations: ['Hauptbahnhof'], r: 260, from: now - 26 * m, to: now + 19 * m, source: 'Meldung', demo: true },
    { id: 'demo-r3', kind: 'report', sev: 1, title: 'Kleine Gruppe, laut', body: '5 bis 10 Personen am S-Bahnsteig.', stations: ['Ostbahnhof'], r: 240, from: now - 8 * m, to: now + 37 * m, source: 'Meldung', demo: true },
    { id: 'demo-n2', kind: 'news', sev: 2, title: 'Polizeieinsatz am Karlsplatz (Stachus)', body: 'Die Polizei ist nach einer Schlägerei im Sperrengeschoss vor Ort. Meide den Bereich, wenn du kannst.', stations: ['Karlsplatz'], r: 320, from: now - 35 * m, to: now + 60 * m, source: 'Polizeimeldung', demo: true },
    { id: 'demo-d1', kind: 'disruption', sev: 1, title: 'U2 und U8: bis zu 10 Minuten Verspätung', body: 'Nach einem Notarzteinsatz am Hauptbahnhof. Die Züge fahren wieder.', lines: ['U2', 'U8'], delay: 300, from: now - 18 * m, to: now + 40 * m, source: 'MVG', demo: true },
    { id: 'demo-c1', kind: 'construction', sev: 2, title: 'U3: Sendlinger Tor ↔ Implerstraße Ersatzverkehr mit Bussen', body: 'Sanierungsarbeiten. Ersatzbusse alle 5 Minuten, plane 10 Minuten mehr ein. Die U6 fährt normal.', lines: ['U3'], segment: { lines: ['U3'], a: 'Sendlinger Tor', b: 'Implerstr.' }, from: now - 3 * 864e5, to: now + 14 * 864e5, source: 'MVG', demo: true },
    { id: 'demo-c2', kind: 'construction', sev: 2, title: 'S-Bahn-Stammstrecke Pasing ↔ Ostbahnhof ab 22:00 gesperrt', body: 'Nachtarbeiten auf der Stammstrecke. Nimm U4/U5 oder Ersatzbusse. S-Bahnen enden in Pasing oder am Ostbahnhof.', lines: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S8'], segment: { lines: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S8'], a: 'Pasing', b: 'Ostbahnhof' }, from: tonight(22, 0), to: tonight(22, 0) + 7.5 * 3600e3, source: 'MVG', demo: true },
    { id: 'demo-n1', kind: 'news', sev: 2, title: 'FC-Bayern-Heimspiel endet gegen 22:30', body: 'Rund 75.000 Fans verlassen die Allianz Arena. Bis etwa 23:45 Gedränge in Fröttmaning und volle U6-Züge Richtung Münchner Freiheit.', lines: ['U6'], stations: ['Fröttmaning', 'Münchner Freiheit'], r: 420, from: tonight(22, 15), to: tonight(23, 45), source: 'Veranstaltungskalender', demo: true },
  ];
}
function wmo(code) {
  if (code == null) return ['Unbekannt', 'cloud'];
  if (code === 0) return ['Klar', 'clear']; if (code <= 2) return ['Teils bewölkt', 'partly']; if (code === 3) return ['Bedeckt', 'cloud'];
  if (code <= 48) return ['Nebel', 'fog']; if (code <= 57) return ['Nieselregen', 'rain']; if (code <= 65) return [code >= 65 ? 'Starkregen' : code >= 63 ? 'Regen' : 'Leichter Regen', 'rain'];
  if (code <= 67) return ['Eisregen', 'rain']; if (code <= 77) return ['Schnee', 'snow']; if (code <= 82) return ['Regenschauer', 'rain']; if (code <= 86) return ['Schneeschauer', 'snow'];
  return ['Gewitter', 'storm'];
}
function demoWeather() {
  const d = new Date(), set = sunsetApprox(d);
  return { live: false, temp: 6, code: 61, text: 'Leichter Regen', kind: 'rain', wind: 14, raining: true, rainUntil: tonight(23, 0), sunset: set };
}
function sunsetApprox(d) {
  // NOAA-style approximation, good to a few minutes for Munich
  const lat = 48.137 * Math.PI / 180, lng = 11.575;
  const z = mz(d.getTime()), day0 = Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate()), doy = Math.round((day0 - Date.UTC(z.getUTCFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (doy - 1);
  const eq = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  const decl = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl));
  const setUTCmin = 720 - 4 * (lng - ha * 180 / Math.PI) - eq;
  const u = day0 + setUTCmin * 60000;
  return u;
}
async function fetchJSON(url, ms = 8000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(String(r.status)); return await r.json(); } finally { clearTimeout(t); }
}
async function loadWeather() {
  try {
    const j = await fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=48.137&longitude=11.575&current=temperature_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation,weather_code&daily=sunset&forecast_hours=12&timezone=Europe%2FBerlin&timeformat=unixtime');
    const c = j.current || {}, [text, kind] = wmo(c.weather_code), raining = (c.precipitation || 0) > 0.05 || kind === 'rain' || kind === 'storm';
    let rainUntil = null;
    if (typeof c.temperature_2m !== 'number') throw new Error('no weather');
    if (raining && j.hourly && Array.isArray(j.hourly.precipitation)) { const i = j.hourly.precipitation.findIndex(p => p < 0.05); if (i > 0 && +j.hourly.time[i]) rainUntil = j.hourly.time[i] * 1000; }
    const sunset = j.daily && j.daily.sunset && +j.daily.sunset[0] ? j.daily.sunset[0] * 1000 : sunsetApprox(new Date());
    SOURCES.weather = 'live';
    return { live: true, temp: Math.round(c.temperature_2m), code: c.weather_code, text, kind, wind: Math.round(c.wind_speed_10m || 0), raining, rainUntil, sunset };
  } catch (e) {
    // the claude.ai preview can't reach Open-Meteo, so it shows example weather; a hosted copy says it has none
    if (PREVIEW) { SOURCES.weather = 'demo'; return demoWeather(); }
    SOURCES.weather = 'off';
    return { live: false, unknown: true, temp: null, text: 'Keine Wetterdaten', kind: 'cloud', wind: 0, raining: false, rainUntil: null, sunset: sunsetApprox(new Date()) };
  }
}
function matchStations(text) {
  const t = ' ' + text.toLowerCase().replace(/straße/g, 'str.').replace(/strasse/g, 'str.') + ' ';
  const hits = [];
  for (const s of Object.values(ST).sort((a, b) => b.name.length - a.name.length)) {
    const n = s.name.toLowerCase(); if (n.length < 5) continue;
    if (t.includes(n) && !hits.some(h => h.name.toLowerCase().includes(n))) hits.push(s);
  }
  return hits.slice(0, 4);
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' };
function plain(html) {
  return String(html == null ? '' : html).replace(/<br\s*\/?>|<\/(p|li|div)>/gi, ' ').replace(/<\/?[a-z!][^>]*>/gi, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => { try { return e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m); } catch (x) { return m; } })
    .replace(/\s+/g, ' ').trim();
}
const toMs = v => typeof v === 'number' ? v : (v ? Date.parse(v) : NaN);
function parseMvg(list) {
  const now = Date.now(), out = [];
  for (const m of (Array.isArray(list) ? list : [])) {
    if (!m || typeof m !== 'object') continue;
    const from = toMs(m.validFrom) || toMs(m.publication) || now, to = toMs(m.validTo) || (from + 6 * 3600e3);
    if (to < now || from > now + 18 * 3600e3) continue;
    const title = plain(m.title), desc = plain(m.description).slice(0, 600), txt = `${title} ${desc}`;
    const allLines = [...new Set((Array.isArray(m.lines) ? m.lines : []).map(l => l && String(l.label || '').trim()).filter(Boolean))];
    const lines = allLines.filter(l => LINE[l]), named = matchStations(title);
    // keep what touches the U-Bahn, S-Bahn and tram network on the map; bus-only notices wait for the bus layer
    if (allLines.length ? !lines.length : !named.length) continue;
    const type = String(m.type || '').toUpperCase();
    const planned = type === 'SCHEDULE_CHANGE' || (type !== 'INCIDENT' && /bauarbeit|baustelle|sanier|gleisarbeit|modernisier|ersatzverkehr/i.test(txt));
    const kind = planned ? 'construction' : 'disruption';
    let segment = null;
    if (/ersatzverkehr|gesperrt|sperrung|unterbrochen|unterbrechung|kein (zug|u-bahn|s-bahn|tram)verkehr|kein zugverkehr|nicht befahren/i.test(txt)) {
      const sm = /^(?:[^:]*:\s*)?(.+?)\s*(?:<>|↔|–|—|\s-\s)\s*(.+?)(?::|$)/.exec(title)
        || /zwischen\s+(.+?)\s+und\s+(.+?)(?=\s+(?:ist|sind|fahr|verkehr|wegen|kommt|gibt|besteht|derzeit|bis|ab|kein|nur)\b|[,.:;()]|$)/i.exec(txt);
      if (sm) { const a = matchStations(sm[1])[0], b = matchStations(sm[2])[0]; if (a && b && a !== b) segment = { lines, a: a.name, b: b.name }; }
    }
    const sev = /unterbrochen|unterbrechung|gesperrt|kein zugverkehr|ausfall|fällt aus|fallen aus|polizei|notarzt|feuerwehr/i.test(txt) ? 2 : 1;
    out.push({ id: 'mvg-' + hash(title + from), kind, sev, title: title || 'MVG-Meldung', body: desc, lines: allLines, segment,
               stations: segment ? [] : named.map(s => s.name), r: 220, delay: kind === 'disruption' ? sev * 180 : 0,
               from, to, source: 'MVG', live: true });
  }
  // most severe and newest first; long-running notices never crowd out what matters tonight
  return out.sort((a, b) => (b.sev - a.sev) || (a.kind === b.kind ? 0 : a.kind === 'disruption' ? -1 : 1) || (b.from - a.from)).slice(0, 25);
}
function parseNews(items) {
  const now = Date.now(), out = [];
  for (const it of (Array.isArray(items) ? items : [])) {
    const txt = `${it.title || ''} ${it.summary || ''}`;
    if (!/polizei|einsatz|schläger|angriff|überfall|belästig|messer|demo|kundgebung|spiel|fans|veranstaltung|sperrung|feuerwehr|evaku/i.test(txt)) continue;
    const pub = it.published ? new Date(it.published).getTime() : now;
    if (now - pub > 6 * 3600e3) continue;
    const st = matchStations(txt);
    const sev = /schläger|angriff|messer|überfall|belästig|evaku/i.test(txt) ? 3 : 2;
    out.push({ id: 'news-' + hash(it.title || ''), kind: 'news', sev, title: it.title, body: (it.summary || '').slice(0, 220), link: it.link,
               stations: st.map(s => s.name), r: 350, from: pub, to: pub + 3 * 3600e3, source: it.source || 'News', live: true });
  }
  return out;
}
async function loadMonitoring() {
  const demo = P.demo ? demoAlerts() : [];
  const proxy = (P.proxyUrl || '').trim().replace(/\/$/, '');
  const mvgP = (async () => {
    try { return parseMvg(await fetchJSON('https://www.mvg.de/api/bgw-pt/v3/messages')); }
    catch (e) { if (proxy) { try { return parseMvg(await fetchJSON(proxy + '?src=mvg-messages')); } catch (e2) {} } return null; }
  })();
  const newsP = proxy ? fetchJSON(proxy + '?src=news').then(parseNews).catch(() => null) : Promise.resolve(null);
  const [mvg, news, wx] = await Promise.all([mvgP, newsP, loadWeather()]);
  SOURCES.mvg = mvg ? 'live' : (P.demo ? 'demo' : 'off');
  SOURCES.news = news ? 'live' : (P.demo ? 'demo' : 'off');
  WEATHER = wx;
  const keepDemo = a => (a.kind === 'report') || (a.kind === 'news' && !news) || ((a.kind === 'disruption' || a.kind === 'construction') && !mvg);
  ALERTS = [...demo.filter(keepDemo), ...(mvg || []), ...(news || []), ...MYREPORTS.filter(r => r.to > Date.now()), ...SHARED];
  alertsUpdated = Date.now();
  refreshAlertsEverywhere();
}
function activeNow(a, t = Date.now()) { return a.from <= t && t <= a.to; }
function alertZones(t = Date.now(), forRouting = false) {
  const z = [];
  for (const a of ALERTS) {
    if (!activeNow(a, t)) continue;
    if (forRouting && !P.sources[a.kind]) continue;
    if (a.at) z.push({ id: a.id, kind: a.kind, sev: a.sev, lng: a.at[0], lat: a.at[1], r: a.r || 250, title: a.title });
    for (const n of (a.stations || [])) { const s = stationByName(n); if (s) z.push({ id: a.id, kind: a.kind, sev: a.sev, lng: s.lng, lat: s.lat, r: a.r || 250, title: a.title, sid: s.id }); }
  }
  return z;
}
function closures(t = Date.now()) {
  const out = [];
  for (const a of ALERTS) {
    if (!a.segment || !activeNow(a, t)) continue;
    const A = stationByName(a.segment.a), B = stationByName(a.segment.b); if (!A || !B) continue;
    for (const pd of PD) {
      if (!a.segment.lines.includes(pd.line)) continue;
      const ka = pd.ids.indexOf(A.id), kb = pd.ids.indexOf(B.id); if (ka < 0 || kb < 0) continue;
      out.push({ pi: pd.i, k1: Math.min(ka, kb), k2: Math.max(ka, kb), line: pd.line, alert: a.id });
    }
  }
  return out;
}
function lineDelays(t = Date.now()) { const d = {}; for (const a of ALERTS) if (a.delay && activeNow(a, t)) for (const l of (a.lines || [])) d[l] = (d[l] || 0) + a.delay; return d; }

// =================================================================== routing
class Heap { constructor() { this.a = []; } push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; } }

function routingContext(mode, t0, extra = {}) {
  const pen = {}, zonesBySid = {};
  const avoid = new Set(P.avoided), prefer = new Set(P.preferred);
  if (mode === 'safe') {
    for (const z of alertZones(Date.now() + Math.max(0, t0 - secOfDay()) * 1000, true)) {
      for (const s of Object.values(ST)) {
        if (metres([s.lng, s.lat], [z.lng, z.lat]) > z.r) continue;
        const p = pen[s.id] = pen[s.id] || { wait: 0, pass: 0, walk: 0 };
        p.wait += z.sev * 300; p.pass += z.sev * 100; p.walk += z.sev * 240;
        (zonesBySid[s.id] = zonesBySid[s.id] || new Set()).add(z.id);
      }
    }
  }
  const closed = new Set();
  for (const c of closures()) for (let k = c.k1; k < c.k2; k++) closed.add(`${c.pi}:${k}`);
  const rain = WEATHER && WEATHER.raining;
  return { mode, t0, pen, avoid, prefer, closed, delays: lineDelays(), walkFactor: mode === 'safe' ? (rain ? 1.35 : 1.15) : 1, exclude: extra.exclude || new Set(), zonesBySid };
}

function findRoute(origin, destSid, ctx) {
  // origin: {sid} or {lng,lat}
  const dist = new Map(), prev = new Map(), heap = new Heap();
  const relax = (node, cost, from, via) => { if (cost < (dist.get(node) ?? Infinity)) { dist.set(node, cost); prev.set(node, { from, via }); heap.push([cost, node]); } };
  const safe = ctx.mode === 'safe';
  const hw = {}; const H = l => (l in hw) ? hw[l] : (hw[l] = (headwayMin(LINE[l]) || 0) * 60);
  const penAt = (sid, key) => safe ? ((ctx.pen[sid] && ctx.pen[sid][key]) || 0) + (ctx.avoid.has(sid) ? (key === 'pass' ? 900 : 3600) : 0) : 0;
  const boardCost = (sid, pd, first) => {
    const h = H(pd.line); if (!h || ctx.exclude.has(pd.line)) return Infinity;
    let c = Math.min(h / 2, 600) + (ctx.delays[pd.line] || 0) + (first ? 0 : (safe && ctx.prefer.has(sid) ? 90 : 180));
    return c + penAt(sid, 'wait');
  };
  // origin edges
  const starts = [];
  if (origin.onboard) {
    const ob = origin.onboard, pd = PD[ob.pi];
    if (!ctx.exclude.has(pd.line)) relax(`r:${ob.pi}:${ob.k}`, ob.eta, 'o', { type: 'onboard', pi: ob.pi, k: ob.k });
    relax('h:' + pd.ids[ob.k], ob.eta + penAt(pd.ids[ob.k], 'wait') * .4, 'o', { type: 'exit', pi: ob.pi, k: ob.k });
  } else if (origin.sid) { starts.push({ sid: origin.sid, walk: 0 }); for (const n of NEAR[origin.sid] || []) starts.push({ sid: n.sid, walk: n.m }); }
  else {
    const cand = Object.values(ST).map(s => ({ sid: s.id, walk: metres([origin.lng, origin.lat], [s.lng, s.lat]) })).filter(x => x.walk < 1500).sort((a, b) => a.walk - b.walk).slice(0, 8);
    starts.push(...cand);
  }
  for (const s of starts) {
    const w = s.walk / 1.25 * ctx.walkFactor + (s.walk ? penAt(s.sid, 'walk') : 0);
    const ofrom = origin.sid || origin;
    if (s.sid === destSid) relax('h:' + destSid, w, 'o', { type: 'walk', from: ofrom, to: s.sid, m: s.walk });
    for (const { pi, k } of STOPS_AT[s.sid] || []) {
      const pd = PD[pi]; if (k >= pd.ids.length - 1) continue;
      const c = boardCost(s.sid, pd, true); if (!isFinite(c)) continue;
      relax(`r:${pi}:${k}`, w + c, 'o', { type: 'board', sid: s.sid, walk: s.walk });
    }
  }
  const target = 'h:' + destSid;
  while (heap.size) {
    const [d, node] = heap.pop();
    if (d > (dist.get(node) ?? Infinity)) continue;
    if (node === target) break;
    if (node[0] === 'r') {
      const [, pis, ks] = node.split(':'); const pi = +pis, k = +ks, pd = PD[pi];
      if (k + 1 < pd.ids.length && !ctx.closed.has(`${pi}:${k}`)) relax(`r:${pi}:${k + 1}`, d + (pd.arr[k + 1] - pd.arr[k]) + penAt(pd.ids[k + 1], 'pass'), node, { type: 'ride' });
      if (k > 0) relax('h:' + pd.ids[k], d + penAt(pd.ids[k], 'wait') * .4, node, { type: 'alight' });
    } else {
      const sid = node.slice(2);
      for (const { pi, k } of STOPS_AT[sid] || []) {
        const pd = PD[pi]; if (k >= pd.ids.length - 1) continue;
        const c = boardCost(sid, pd, false); if (isFinite(c)) relax(`r:${pi}:${k}`, d + c, node, { type: 'board', sid });
      }
      for (const n of NEAR[sid] || []) relax('h:' + n.sid, d + n.m / 1.25 * ctx.walkFactor + 60 + penAt(n.sid, 'walk'), node, { type: 'walk', from: sid, to: n.sid, m: n.m });
    }
  }
  if (!dist.has(target)) return null;
  // reconstruct
  const chain = []; let cur = target;
  while (cur && cur !== 'o') { const p = prev.get(cur); chain.push({ node: cur, ...p }); cur = p ? p.from : null; }
  chain.reverse();
  const legs = [];
  for (const c of chain) {
    const v = c.via;
    if (v.type === 'walk') { legs.push({ type: 'walk', from: v.from, to: v.to, m: v.m }); continue; }
    if (v.type === 'board') {
      if (c.from === 'o' && v.walk) legs.push({ type: 'walk', from: origin.sid || origin, to: v.sid, m: v.walk });
      const [, pi, k] = c.node.split(':'); legs.push({ type: 'ride', pi: +pi, k1: +k, k2: +k }); continue;
    }
    if (v.type === 'onboard' || v.type === 'exit') { legs.push({ type: 'ride', pi: v.pi, k1: v.k, k2: v.k, onboard: true, eta: origin.onboard.eta }); continue; }
    if (v.type === 'ride') { const [, , k] = c.node.split(':'); legs[legs.length - 1].k2 = +k; }
  }
  return timeRoute(legs.filter(l => l.type === 'walk' ? l.m > 15 : (l.onboard || l.k2 > l.k1)), ctx);
}
function timeRoute(legs, ctx) {
  let t = ctx.t0; const t0 = t; let walkM = 0;
  for (const l of legs) {
    if (l.type === 'walk') { l.dep = t; t += l.m / 1.25 + 30; l.arr = t; walkM += l.m; continue; }
    const pd = PD[l.pi];
    if (l.onboard) { l.dep = t; l.arr = t + l.eta + (pd.arr[l.k2] - pd.arr[l.k1]); }
    else { const dep = nextDeparture(pd, l.k1, t + 40); if (dep == null) return null; l.dep = dep + (ctx.delays[pd.line] || 0) * .5; l.arr = l.dep + (pd.arr[l.k2] - pd.dep[l.k1]); }
    l.line = pd.line; l.to = pd.to; l.stops = l.k2 - l.k1;
    l.fromSid = pd.ids[l.k1]; l.toSid = pd.ids[l.k2]; t = l.arr;
  }
  const sids = new Set();
  for (const l of legs) if (l.type === 'ride') { const pd = PD[l.pi]; for (let k = l.k1; k <= l.k2; k++) sids.add(pd.ids[k]); } else { if (typeof l.to === 'string') sids.add(l.to); if (typeof l.from === 'string') sids.add(l.from); }
  return { legs, t0, dur: t - t0, arrive: t, walkM, transfers: Math.max(0, legs.filter(l => l.type === 'ride').length - 1), sids };
}
function routeZones(r) {
  const out = new Map();
  const zones = alertZones(Date.now(), true);
  for (const sid of r.sids) { const s = ST[sid]; if (!s) continue;
    for (const z of zones) if (metres([s.lng, s.lat], [z.lng, z.lat]) <= z.r) out.set(z.id, z);
  }
  const avoided = [...r.sids].filter(s => P.avoided.includes(s));
  const lines = new Set(r.legs.filter(l => l.type === 'ride').map(l => l.line));
  const disr = ALERTS.filter(a => activeNow(a) && a.delay && (a.lines || []).some(l => lines.has(l)));
  return { zones: [...out.values()], avoided, disr };
}
function planRoutes(origin, destSid) {
  const t0 = secOfDay();
  const fast = findRoute(origin, destSid, routingContext('fast', t0));
  const safe = findRoute(origin, destSid, routingContext('safe', t0));
  if (!fast && !safe) return null;
  const same = fast && safe && JSON.stringify(fast.legs.map(l => [l.type, l.pi, l.k1, l.k2])) === JSON.stringify(safe.legs.map(l => [l.type, l.pi, l.k1, l.k2]));
  return { fast, safe: safe || fast, same };
}

// =================================================================== location tracking
const Loc = { mode: 'off', status: 'off', buf: [], last: null, watch: null, speed: 0, match: null, cands: [], override: null, demo: null, estimated: false, err: null, follow: false, vehicleSince: 0, lastAnalyze: 0 };
function locStart(userInitiated) {
  if (Loc.mode === 'demo') locStopDemo();
  if (!navigator.geolocation) { locFail('Dieser Browser kann keinen Standort teilen.'); return; }
  if (window.isSecureContext === false) { locFail('Standort geht nur über eine sichere Adresse (https://). Öffne SafeRide über den https-Link oder probier die Demo-Fahrt.'); return; }
  Loc.mode = 'gps'; Loc.status = 'locating'; Loc.err = null; renderTrack();
  try {
    Loc.watch = navigator.geolocation.watchPosition(pos => {
      if (Loc.mode !== 'gps') return;
      const c = pos.coords;
      // some phones report odd timestamps; fall back to the arrival time
      const ts = +pos.timestamp, t = ts && Math.abs(ts - Date.now()) < 60000 ? ts : Date.now();
      if (!isFinite(c.latitude) || !isFinite(c.longitude)) return;
      pushFix({ t, lng: c.longitude, lat: c.latitude, acc: c.accuracy || 30, speed: (c.speed == null || isNaN(c.speed)) ? null : c.speed });
    }, err => {
      if (Loc.mode !== 'gps') return;
      if (err.code === 1) locFail(window.self !== window.top ? 'Diese Vorschau darf deinen Standort nicht nutzen. Öffne SafeRide unter seiner eigenen Adresse oder probier die Demo-Fahrt.' : 'Standortzugriff wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen, damit SafeRide sieht, in welchem Zug du bist.');
      else { Loc.err = 'Noch kein GPS-Signal. Unter der Erde ist das normal.'; renderTrack(); }
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  } catch (e) { locFail('Diese Vorschau darf deinen Standort nicht nutzen. Probier die Demo-Fahrt.'); }
  if (userInitiated) { P.tracking = true; saveP(); }
}
function locFail(msg) { if (Loc.watch != null) try { navigator.geolocation.clearWatch(Loc.watch); } catch (e) {} Loc.watch = null; Loc.mode = 'off'; Loc.status = 'error'; Loc.err = msg; renderTrack(); }
function locStop() {
  if (Loc.watch != null) try { navigator.geolocation.clearWatch(Loc.watch); } catch (e) {}
  locStopDemo(true);
  Object.assign(Loc, { mode: 'off', status: 'off', watch: null, buf: [], last: null, rough: false, match: null, cands: [], override: null, estimated: false, err: null, follow: false });
  P.tracking = false; saveP(); updateMe(); renderTrack(); $('#btnLocate').classList.remove('on');
}
function pushFix(f) {
  // fixes worse than ±250 m (wifi/cell guesses indoors) jump around and would look like a moving train; show them, don't analyse them
  Loc.rough = f.acc > 250;
  if (!Loc.rough) { Loc.buf.push(f); const cut = Date.now() - 180000; while (Loc.buf.length && Loc.buf[0].t < cut) Loc.buf.shift(); }
  Loc.last = f; Loc.estimated = false; if (Loc.status === 'locating') Loc.status = 'unknown';
  updateMe(); if (!Loc.rough) analyze(); else renderTrack();
  if (Loc.follow && map && inArea([f.lng, f.lat])) map.easeTo({ center: [f.lng, f.lat], duration: reduced() ? 0 : 600 });
}
function project(pd, pt) {
  // nearest point on polyline: returns {dist, along}
  if (pt[0] < pd.bb[0] - .01 || pt[0] > pd.bb[2] + .01 || pt[1] < pd.bb[1] - .01 || pt[1] > pd.bb[3] + .01) return null;
  const k = Math.cos(pt[1] * Math.PI / 180) * 111320, ky = 110540;
  let best = { dist: Infinity, along: 0 };
  for (let i = 0; i < pd.coords.length - 1; i++) {
    const a = pd.coords[i], b = pd.coords[i + 1];
    const ax = (a[0] - pt[0]) * k, ay = (a[1] - pt[1]) * ky, bx = (b[0] - pt[0]) * k, by = (b[1] - pt[1]) * ky;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2));
    const x = ax + t * dx, y = ay + t * dy, d = Math.hypot(x, y);
    if (d < best.dist) best = { dist: d, along: pd.cum[i] + t * (pd.cum[i + 1] - pd.cum[i]) };
  }
  return best;
}
function matchVehicle(fixes) {
  let best = null;
  for (const [vid, v] of VEH) {
    const last = fixes[fixes.length - 1];
    if (metres([v.p.lng, v.p.lat], [last.lng, last.lat]) > 450) continue;
    // a train passing the other way can sit close for a few seconds; it only counts if we move the way it runs
    const first = fixes[0];
    if (metres([first.lng, first.lat], [last.lng, last.lat]) > 40) { const a = project(v.pd, [first.lng, first.lat]), b = project(v.pd, [last.lng, last.lat]); if (a && b && b.along < a.along) continue; }
    let sum = 0;
    for (const f of fixes) { const e = v.eAt(f.t); if (e < 0 || e > v.pd.T) { sum += 999; continue; } const p = posAt(v.pd, e); sum += metres([p.lng, p.lat], [f.lng, f.lat]); }
    const avg = sum / fixes.length;
    if (avg < 140 && (!best || avg < best.avg)) best = { vid, v, avg };
  }
  if (!best) return null;
  const v = best.v, p = posAt(v.pd, v.eAt(Date.now()));
  return { method: 'vehicle', vid: best.vid, pd: v.pd, line: v.pd.line, to: v.pd.to, next: p.atStop ? p.next : p.next, atStop: p.atStop, eta: Math.max(0, v.pd.arr[p.next] - v.eAt(Date.now())), conf: best.avg < 60 ? 'high' : 'medium' };
}
function matchLine(fixes) {
  const res = [];
  for (const pd of PD) {
    let sum = 0, ok = true; const al = [];
    for (const f of fixes) { const pr = project(pd, [f.lng, f.lat]); if (!pr || pr.dist > 160) { ok = false; break; } sum += pr.dist; al.push(pr.along); }
    if (!ok) continue;
    const prog = al[al.length - 1] - al[0];
    if (prog < 40) continue;
    res.push({ pd, score: sum / fixes.length, along: al[al.length - 1] });
  }
  res.sort((a, b) => a.score - b.score);
  const seen = new Set(), cands = [];
  for (const r of res) { const k = r.pd.line + '>' + r.pd.to; if (seen.has(k)) continue; seen.add(k); cands.push(r); }
  return cands.slice(0, 4);
}
function lineMatchInfo(c, how) {
  const pd = c.pd; let k = pd.sd.findIndex(d => d > c.along + 25); if (k < 0) k = pd.sd.length - 1;
  return { method: how, pd, line: pd.line, to: pd.to, next: k, along: c.along, eta: Math.max(0, (pd.sd[k] - c.along) / SPEED[pd.mode]), conf: how === 'you' ? 'you' : 'medium' };
}
function analyze() {
  const now = Date.now(), b = Loc.buf; if (!b.length) return;
  const recent = b.filter(f => now - f.t <= 30000);
  let v = 0;
  if (recent.length >= 2) { const a = recent[0], z = recent[recent.length - 1], dt = (z.t - a.t) / 1000; if (dt >= 3) v = metres([a.lng, a.lat], [z.lng, z.lat]) / dt; }
  if (Loc.last.speed != null) v = recent.length >= 2 ? (v + Loc.last.speed) / 2 : Loc.last.speed;
  const kmh = v * 3.6; Loc.speed = kmh;
  let st = kmh < 1.8 ? 'still' : kmh < 8 ? 'walking' : kmh > 13 ? 'vehicle' : (Loc.status === 'vehicle' ? 'vehicle' : 'walking');
  if (st === 'vehicle') Loc.vehicleSince = Loc.vehicleSince || now; else if (now - (Loc.lastVehicleAt || 0) > 90000) Loc.vehicleSince = 0;
  const since = st === 'vehicle' && Loc.vehicleSince ? Loc.vehicleSince - 6000 : 0;
  const fixes = b.filter(f => now - f.t <= 75000 && f.t >= since);
  const pick = fixes.length > 8 ? fixes.filter((f, i) => i % Math.ceil(fixes.length / 8) === 0 || i === fixes.length - 1) : fixes;
  let m = null;
  if (st === 'vehicle' && pick.length >= 3) {
    Loc.lastVehicleAt = now;
    m = matchVehicle(pick);
    const lc = matchLine(pick);
    if (Loc.override) {
      const o = lc.find(c => c.pd.line === Loc.override.line && c.pd.to === Loc.override.to);
      if (o) m = lineMatchInfo(o, 'you'); else if (now - Loc.override.at > 120000) Loc.override = null;
    }
    if (!m && lc.length) {
      const distinct = lc.length === 1 || lc[1].score > lc[0].score * 1.8 + 25;
      if (distinct) m = lineMatchInfo(lc[0], 'line');
      else Loc.cands = lc.slice(0, 3).map(c => ({ line: c.pd.line, to: c.pd.to }));
    }
    if (m) Loc.cands = [];
  } else if (Loc.match && now - (Loc.lastVehicleAt || 0) < 90000 && st === 'still') {
    // stopped at a station while on board: keep the match
    m = Loc.match; st = 'vehicle';
  }
  if (st !== 'vehicle') { Loc.cands = []; }
  Loc.match = m; Loc.status = st;
  renderTrack();
}
function estimateTick() {
  if (Loc.mode === 'off' || !Loc.last) return;
  const gap = Date.now() - Loc.last.t;
  if (gap > 15000 && Loc.match) {
    Loc.estimated = true;
    let pos = null;
    if (Loc.match.method === 'vehicle' && VEH.has(Loc.match.vid)) { const v = VEH.get(Loc.match.vid); const e = v.eAt(Date.now()); pos = posAt(v.pd, e); Loc.match.next = pos.next; Loc.match.eta = Math.max(0, v.pd.arr[pos.next] - e); }
    else if (Loc.match.along != null) { const pd = Loc.match.pd; const d = Math.min(pd.cum[pd.cum.length - 1], Loc.match.along + SPEED[pd.mode] * 0.75 * gap / 1000); pos = posAlong(pd, d); }
    if (pos) updateMe([pos.lng, pos.lat], true);
    renderTrack();
  }
}
function startDemoRide() {
  if (Loc.watch != null) try { navigator.geolocation.clearWatch(Loc.watch); } catch (e) {}
  const pd = PD.find(p => p.line === 'U3' && p.to === 'Moosach'); if (!pd) return;
  const k0 = pd.names.indexOf('Odeonsplatz'), kTunnelA = pd.names.indexOf('Universität'), kTunnelB = pd.names.indexOf('Münchner Freiheit');
  const t0 = Date.now(), e0 = pd.arr[k0] - 40, speed = 3;
  Object.assign(Loc, { mode: 'demo', status: 'locating', buf: [], last: null, match: null, cands: [], override: null, err: null, watch: null, follow: true, vehicleSince: 0, lastVehicleAt: 0 });
  Loc.demo = { pd, k0, t0, e0, speed, eAt: ms => e0 + (ms - t0) / 1000 * speed, tunnel: [kTunnelA, kTunnelB] };
  const st = ST[pd.ids[k0]];
  map.flyTo({ center: [st.lng, st.lat], zoom: 14.2, duration: reduced() ? 0 : 1200 });
  clearInterval(Loc.demoTimer);
  Loc.demoTimer = setInterval(() => {
    const dm = Loc.demo; if (!dm) return;
    const now = Date.now(), e = dm.eAt(now);
    if (e > dm.pd.T + 5) { locStopDemo(); toast('Demo-Fahrt in Moosach beendet.'); return; }
    let lng, lat;
    if (e < dm.pd.arr[dm.k0]) { lng = st.lng + 0.00012; lat = st.lat - 0.00008; }
    else {
      const p = posAt(dm.pd, e);
      const kNow = p.atStop ? p.next : p.next - 1;
      if (kNow >= dm.tunnel[0] && kNow < dm.tunnel[1] && !p.atStop) return; // simulated loss of GPS in the tunnel
      lng = p.lng; lat = p.lat;
    }
    const n = () => (Math.random() - .5) * 0.00014;
    pushFix({ t: now, lng: lng + n(), lat: lat + n() * .7, acc: 12 + Math.random() * 10, speed: null });
  }, 1000);
  closeSheet(); closeCard(); renderTrack();
  toast('Demo-Fahrt: Du wartest am Odeonsplatz und fährst dann mit der U3 Richtung Moosach, in 3-facher Geschwindigkeit.', 4800);
}
function locStopDemo(silent) {
  clearInterval(Loc.demoTimer); Loc.demoTimer = null;
  if (Loc.demo) { Loc.demo = null; if (!silent) { Object.assign(Loc, { mode: 'off', status: 'off', buf: [], last: null, match: null, cands: [], estimated: false, follow: false }); updateMe(); renderTrack(); } }
}
function myPosition() { return Loc.last ? [Loc.last.lng, Loc.last.lat] : null; }
// SafeRide covers the MVG network; anything more than 5 km from every station counts as outside
function inArea(p) { return !!(p && nearestStation(p, 5000)); }

// =================================================================== map
function W(t, s, u) { return ['match', ['get', 'mode'], 'TRAM', t, 'SBAHN', s, 'UBAHN', u, t]; }
const WSTOPS = [[9, .7, 1.3, 1.5], [12, 1.7, 2.6, 3], [14, 3, 4.4, 5], [17, 6.5, 8.5, 10]];
const widthExpr = (k, add = 0) => ['interpolate', ['exponential', 1.5], ['zoom'], ...WSTOPS.flatMap(([z, t, s, u]) => [z, W(t * k + add, s * k + add, u * k + add)])];
const LINE_W = widthExpr(1), CASE_W = widthExpr(1, 2.2), GLOW_W = widthExpr(3.4), GLOW_BLUR = widthExpr(1.8);
const MPP = 104450; // metres per pixel at zoom 0, Munich latitude (512 px tiles)
const metreRadius = prop => ['interpolate', ['exponential', 2], ['zoom'], 8, ['*', prop, 256 / MPP], 18, ['*', prop, 262144 / MPP]];
const EMPTY = { type: 'FeatureCollection', features: [] };

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
const TILES = { light: ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', lightRef: ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
                dark: ESRI + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', darkRef: ESRI + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}' };
let STREETS = false;
async function probeStreets() {
  try {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(TILES.light.replace('{z}', '12').replace('{y}', '1421').replace('{x}', '2179'), { signal: c.signal, mode: 'cors' });
    clearTimeout(t); if (!r.ok) throw new Error(String(r.status));
    STREETS = true; SOURCES.streets = 'live'; addStreetLayers();
  } catch (e) { STREETS = false; SOURCES.streets = 'off'; }
}
function addStreetLayers() {
  if (!map || map.getSource('esri-light')) return;
  const attribution = 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors';
  for (const [id, url] of [['esri-light', TILES.light], ['esri-light-ref', TILES.lightRef], ['esri-dark', TILES.dark], ['esri-dark-ref', TILES.darkRef]])
    map.addSource(id, { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 16, attribution });
  map.addLayer({ id: 'streets-light', type: 'raster', source: 'esri-light', paint: { 'raster-fade-duration': 150 } }, 'mask');
  map.addLayer({ id: 'streets-dark', type: 'raster', source: 'esri-dark', paint: { 'raster-fade-duration': 150 } }, 'mask');
  map.addLayer({ id: 'streets-light-ref', type: 'raster', source: 'esri-light-ref', minzoom: 12.5 }, 'zones-fill');
  map.addLayer({ id: 'streets-dark-ref', type: 'raster', source: 'esri-dark-ref', minzoom: 12.5 }, 'zones-fill');
  for (const id of ['mask', 'parks', 'lakes', 'river', 'places']) map.setLayoutProperty(id, 'visibility', 'none');
  applyStreetStyle();
}
function applyStreetStyle() {
  if (!STREETS || !map || !map.getLayer('streets-light')) return;
  const dark = theme === 'dark', focus = focusOn();
  const show = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  show('streets-light', !dark); show('streets-light-ref', !dark); show('streets-dark', dark); show('streets-dark-ref', dark);
  for (const id of ['streets-light', 'streets-dark']) map.setPaintProperty(id, 'raster-opacity', focus ? 1 : .78);
  for (const id of ['streets-light-ref', 'streets-dark-ref']) map.setPaintProperty(id, 'raster-opacity', focus ? 1 : .7);
}
// walking paths along real streets (FOSSGIS OSRM foot profile); straight line when unreachable
const WALK = new Map();
const legPt = x => typeof x === 'string' ? [ST[x].lng, ST[x].lat] : [x.lng, x.lat];
const walkKey = (a, b) => `${a[0].toFixed(5)},${a[1].toFixed(5)};${b[0].toFixed(5)},${b[1].toFixed(5)}`;
async function fetchWalk(a, b) {
  const k = walkKey(a, b); if (WALK.has(k)) return WALK.get(k);
  WALK.set(k, null);
  try {
    const j = await fetchJSON(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`, 7000);
    const r = j.routes && j.routes[0]; if (!r) throw new Error('no route');
    const v = { coords: r.geometry.coordinates, m: r.distance, s: r.duration }; WALK.set(k, v); SOURCES.walk = 'live'; return v;
  } catch (e) { WALK.set(k, false); SOURCES.walk = 'off'; return false; }
}
function registerGlyphs() {
  maplibregl.addProtocol('glyphs', async (params) => {
    const m = /^glyphs:\/\/([^/]+)\/(\d+-\d+)/.exec(params.url);
    const font = m ? decodeURIComponent(m[1]).split(',')[0].trim() : '';
    if (!m || m[2] !== '0-255' || !GLYPHS[font]) return { data: new ArrayBuffer(0) };
    const bin = atob(GLYPHS[font]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return { data: u.buffer };
  });
}
function buildStyle(d) {
  const T = MAP_THEME[theme];
  const src = data => ({ type: 'geojson', data });
  return {
    version: 8, glyphs: 'glyphs://{fontstack}/{range}',
    sources: { mask: src(d.base.mask), boundary: src(d.base.boundary), water: src(d.base.water), parks: src(d.base.parks), places: src(d.base.places),
               lines: src(d.lines), stations: src(d.stations), closures: src(EMPTY), zones: src(EMPTY), route: src(EMPTY), routestops: src(EMPTY), me: src(EMPTY), vehicles: src(EMPTY) },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': T.land } },
      { id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': T.outside, 'fill-opacity': .9 } },
      { id: 'parks', type: 'fill', source: 'parks', paint: { 'fill-color': T.park, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, .6, 14, .9] } },
      { id: 'lakes', type: 'fill', source: 'water', filter: ['==', ['get', 'kind'], 'lake'], paint: { 'fill-color': T.water } },
      { id: 'river', type: 'line', source: 'water', filter: ['==', ['get', 'kind'], 'river'], layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': T.water, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 9, 1.2, 12, 3, 15, 14, 17, 40] } },
      { id: 'boundary', type: 'line', source: 'boundary', paint: { 'line-color': T.boundary, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
      { id: 'places', type: 'symbol', source: 'places', minzoom: 10.5, filter: ['any', ['==', ['get', 'rank'], 1], ['>=', ['zoom'], 12.2]],
        layout: { 'text-field': ['get', 'name'], 'text-font': ['NotoItalic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 14], 'text-letter-spacing': .04, 'text-padding': 8 },
        paint: { 'text-color': T.place, 'text-halo-color': T.halo, 'text-halo-width': 1.5, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 1, 15.5, 0] } },
      { id: 'zones-fill', type: 'circle', source: 'zones', paint: { 'circle-radius': metreRadius(['get', 'r']), 'circle-color': ['get', 'color'], 'circle-opacity': .13,
        'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.4, 'circle-stroke-opacity': .55, 'circle-pitch-alignment': 'map' } },
      { id: 'lines-glow', type: 'line', source: 'lines', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'colorDark'], 'line-width': GLOW_W, 'line-blur': GLOW_BLUR, 'line-opacity': T.glow } },
      { id: 'lines-casing', type: 'line', source: 'lines', layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['match', ['get', 'mode'], 'TRAM', 1, 'SBAHN', 2, 3] }, paint: { 'line-color': T.casing, 'line-width': CASE_W } },
      { id: 'lines-day', type: 'line', source: 'lines', filter: ['all', ['!', ['get', 'night']], ['!', ['has', 'hollow']]], layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['match', ['get', 'mode'], 'TRAM', 1, 'SBAHN', 2, 3] }, paint: { 'line-color': ['get', 'color'], 'line-width': LINE_W } },
      { id: 'lines-split', type: 'line', source: 'lines', filter: ['has', 'color2'], layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', 'color2'], 'line-width': LINE_W, 'line-dasharray': [1.2, 1.2] } },
      { id: 'lines-hollow', type: 'line', source: 'lines', filter: ['has', 'hollow'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': widthExpr(.42), 'line-gap-width': widthExpr(.6) } },
      { id: 'lines-night', type: 'line', source: 'lines', filter: ['get', 'night'], layout: { 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': widthExpr(.75), 'line-dasharray': [1.4, 1.2], 'line-offset': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 1.6, 13, 3.4, 15, 5.5, 17, 10] } },
      { id: 'closures', type: 'line', source: 'closures', layout: { 'line-cap': 'butt' }, paint: { 'line-color': '#5A6878', 'line-width': widthExpr(1.3, 1), 'line-dasharray': [.6, .6] } },
      { id: 'route-case', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': T.routeCase, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 13] } },
      { id: 'route-line', type: 'line', source: 'route', filter: ['!=', ['get', 'walk'], true], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8] } },
      { id: 'route-walk', type: 'line', source: 'route', filter: ['==', ['get', 'walk'], true], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#5A6878', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 4.5], 'line-dasharray': [.2, 1.6] } },
      { id: 'st-major', type: 'circle', source: 'stations', filter: ['>=', ['get', 'rank'], 3],
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, ['match', ['get', 'rank'], 4, 2.6, 1.6], 13, ['match', ['get', 'rank'], 4, 6, 4.2], 16, ['match', ['get', 'rank'], 4, 9, 7]],
                 'circle-color': T.stFill, 'circle-stroke-color': T.stStroke, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2] } },
      { id: 'st-minor', type: 'circle', source: 'stations', minzoom: 11.5, filter: ['<', ['get', 'rank'], 3],
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.5, 1.6, 14, 3.4, 16, 5.5], 'circle-color': T.stFill, 'circle-stroke-color': T.stStroke, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11.5, .8, 14, 1.6] } },
      { id: 'st-pref', type: 'circle', source: 'stations', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 12], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#23955F', 'circle-stroke-width': 2.5 } },
      { id: 'st-avoid', type: 'circle', source: 'stations', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 12], 'circle-color': 'rgba(210,31,60,.12)', 'circle-stroke-color': '#D21F3C', 'circle-stroke-width': 2.5 } },
      { id: 'routestops', type: 'circle', source: 'routestops', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4.5, 15, 8], 'circle-color': '#FFFFFF', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 3 } },
      { id: 'me-acc', type: 'circle', source: 'me', paint: { 'circle-radius': metreRadius(['get', 'acc']), 'circle-color': '#2E6BE6', 'circle-opacity': .12, 'circle-pitch-alignment': 'map' } },
      { id: 'me-dot', type: 'circle', source: 'me', paint: { 'circle-radius': 8, 'circle-color': ['case', ['get', 'est'], '#8DA6D9', '#2E6BE6'], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } },
    ],
  };
}
function addDynamicLayers() {
  const s = 2;
  for (const L of LINES) {
    const size = 40 * s, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.translate(size / 2, size / 2); g.beginPath();
    g.arc(0, 0, 12 * s, -Math.PI / 2 + .62, -Math.PI / 2 - .62 + Math.PI * 2); g.lineTo(0, -18.5 * s); g.closePath();
    const st = LSTYLE[L.line] || {};
    if (st.bg2) { const gr = g.createLinearGradient(-12 * s, -12 * s, 12 * s, 12 * s); gr.addColorStop(0, st.bg); gr.addColorStop(.5, st.bg); gr.addColorStop(.5, st.bg2); gr.addColorStop(1, st.bg2); g.fillStyle = gr; }
    else g.fillStyle = st.hollow ? '#FFFFFF' : L.color;
    g.fill(); g.lineWidth = 2.2 * s; g.strokeStyle = st.hollow ? st.fg : '#FFFFFF'; g.stroke();
    map.addImage('veh-' + L.line, g.getImageData(0, 0, size, size), { pixelRatio: s });
  }
  // zone kind icons
  const glyph = {
    report: g => { g.beginPath(); g.arc(-4, -3, 3, 0, 7); g.arc(4, -3, 3, 0, 7); g.fill(); g.beginPath(); g.ellipse(-4, 6, 5, 4, 0, Math.PI, 0); g.ellipse(4, 6, 5, 4, 0, Math.PI, 0); g.fill(); },
    disruption: g => { g.fillRect(-1.6, -8, 3.2, 10); g.beginPath(); g.arc(0, 6.5, 1.9, 0, 7); g.fill(); },
    construction: g => { g.beginPath(); g.moveTo(-3, -8); g.lineTo(3, -8); g.lineTo(7, 8); g.lineTo(-7, 8); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-5, -1, 10, 2.4); },
    news: g => { g.fillRect(-7, -7, 14, 14); g.fillStyle = '#fff'; g.fillRect(-4.5, -4, 9, 2); g.fillRect(-4.5, 0, 9, 1.6); g.fillRect(-4.5, 3, 6, 1.6); },
  };
  for (const k of Object.keys(glyph)) for (const sev of [1, 2, 3]) {
    const size = 30 * s, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.translate(size / 2, size / 2); g.scale(s, s);
    g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fillStyle = SEV_COLOR[sev]; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.scale(.82, .82); glyph[k](g);
    map.addImage(`z-${k}-${sev}`, g.getImageData(0, 0, size, size), { pixelRatio: s });
  }
  map.addLayer({ id: 'veh-dot', type: 'circle', source: 'vehicles', maxzoom: 12.6,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.2, 12.6, 4.6], 'circle-color': ['match', ['get', 'line'], ...LINES.flatMap(L => [L.line, L.color]), '#888'],
             'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, .8, 12.6, 1.4] } }, 'me-acc');
  map.addLayer({ id: 'veh-icon', type: 'symbol', source: 'vehicles', minzoom: 12.6,
    layout: { 'icon-image': ['concat', 'veh-', ['get', 'line']], 'icon-rotate': ['get', 'brg'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12.6, .78, 16, 1.05], 'text-field': ['get', 'line'], 'text-font': ['NotoMedium'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 12.6, 8.5, 16, 11.5], 'text-allow-overlap': true, 'text-ignore-placement': true, 'symbol-sort-key': ['match', ['get', 'mode'], 'TRAM', 1, 'SBAHN', 2, 3] },
    paint: { 'text-color': ['match', ['get', 'line'], ...LINES.flatMap(L => [L.line, L.fg]), '#FFFFFF'] } }, 'me-acc');
  const T = MAP_THEME[theme];
  const lbl = (id, filter, minzoom, size) => ({ id, type: 'symbol', source: 'stations', minzoom, filter,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['NotoMedium'], 'text-size': size, 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': .75, 'text-justify': 'auto',
              'text-max-width': 9, 'text-padding': 3, 'symbol-sort-key': ['-', 10, ['get', 'rank']] },
    paint: { 'text-color': T.label, 'text-halo-color': T.labelHalo, 'text-halo-width': 1.6 } });
  map.addLayer(lbl('lbl-major', ['>=', ['get', 'rank'], 3], 11.8, ['interpolate', ['linear'], ['zoom'], 12, 11.5, 16, 14.5]));
  map.addLayer(lbl('lbl-minor', ['<', ['get', 'rank'], 3], 14, ['interpolate', ['linear'], ['zoom'], 14, 11, 16, 13]));
  map.addLayer({ id: 'zones-icon', type: 'symbol', source: 'zones', minzoom: 10.5,
    layout: { 'icon-image': ['concat', 'z-', ['get', 'kind'], '-', ['to-string', ['get', 'sev']]], 'icon-size': ['interpolate', ['linear'], ['zoom'], 10.5, .7, 15, 1], 'icon-allow-overlap': true, 'symbol-sort-key': ['-', 5, ['get', 'sev']] } });
}

function wantedTheme() { if (P.style === 'light' || P.style === 'dark') return P.style; const h = mzHour(); return (h >= 20 || h < 6) ? 'dark' : 'light'; }
function applyTheme() {
  theme = wantedTheme(); document.documentElement.dataset.mode = theme;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = theme === 'dark' ? '#0E1620' : '#F4F6F8';
  if (!map || !map.getLayer('lbl-major')) return;
  const T = MAP_THEME[theme], sp = (l, k, v) => map.setPaintProperty(l, k, v);
  sp('bg', 'background-color', T.land); sp('mask', 'fill-color', T.outside); sp('boundary', 'line-color', T.boundary); sp('parks', 'fill-color', T.park);
  sp('lakes', 'fill-color', T.water); sp('river', 'line-color', T.water); sp('places', 'text-color', T.place); sp('places', 'text-halo-color', T.halo);
  sp('lines-casing', 'line-color', T.casing); sp('route-case', 'line-color', T.routeCase);
  const col = theme === 'dark' ? ['get', 'colorDark'] : ['get', 'color'];
  sp('lines-glow', 'line-color', col); sp('lines-glow', 'line-opacity', T.glow); sp('lines-day', 'line-color', col); sp('lines-night', 'line-color', col); sp('lines-hollow', 'line-color', col);
  for (const id of ['st-major', 'st-minor']) { sp(id, 'circle-color', T.stFill); sp(id, 'circle-stroke-color', T.stStroke); }
  for (const id of ['lbl-major', 'lbl-minor']) { sp(id, 'text-color', T.label); sp(id, 'text-halo-color', T.labelHalo); }
  applyStreetStyle();
}

function baseSet() {
  if (F.view === 'custom') return new Set(F.custom);
  if (F.view === 'all') return new Set(LINES.map(l => l.line));
  return new Set(LINES.filter(l => l.mode === 'UBAHN' || l.mode === 'SBAHN' || l.mode === 'METROBUS' || (l.mode === 'TRAM' && BASIC_TRAMS.includes(l.line))).map(l => l.line));
}
function visibleSet() { return new Set([...baseSet()].filter(l => LINE[l] && F.modes[LINE[l].mode])); }

function focusOn() { return !!(ROUTE.trip && ROUTE.trip.focus); }
function shownLines() { return focusOn() ? new Set(ROUTE.trip.lines) : visibleSet(); }
function applyFilters() {
  if (!map || !map.getLayer('lbl-major')) return;
  const focus = focusOn(), vis = shownLines(), lf = ['in', ['get', 'line'], ['literal', [...vis]]];
  map.setFilter('lines-casing', lf); map.setFilter('lines-glow', lf);
  map.setFilter('lines-day', ['all', lf, ['!', ['get', 'night']], ['!', ['has', 'hollow']]]); map.setFilter('lines-night', ['all', lf, ['get', 'night']]);
  map.setFilter('lines-split', ['all', lf, ['has', 'color2']]); map.setFilter('lines-hollow', ['all', lf, ['has', 'hollow']]);
  const tripS = focus ? new Set(ROUTE.trip.sids) : null;
  const ids = STATIONS.features.filter(f => focus ? tripS.has(String(f.properties.id).replace(/_(UBAHN|TRAM)$/, '')) : f.properties.lines.some(l => vis.has(l))).map(f => f.properties.id), sf = ['in', ['get', 'id'], ['literal', ids]];
  map.setFilter('st-major', ['all', ['>=', ['get', 'rank'], 3], sf]); map.setFilter('st-minor', ['all', ['<', ['get', 'rank'], 3], sf]);
  map.setFilter('lbl-major', ['all', ['>=', ['get', 'rank'], 3], sf]); map.setFilter('lbl-minor', ['all', ['<', ['get', 'rank'], 3], sf]);
  map.setFilter('st-pref', ['in', ['get', 'id'], ['literal', P.preferred]]); map.setFilter('st-avoid', ['in', ['get', 'id'], ['literal', P.avoided]]);
  const vv = (ids2, on) => ids2.forEach(id => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
  vv(['st-major', 'st-minor', 'lbl-major', 'lbl-minor'], F.stations || focus); vv(['veh-dot', 'veh-icon'], F.vehicles || focus); vv(['zones-fill', 'zones-icon', 'closures'], F.zones || focus);
  vv(['st-pref', 'st-avoid'], !focus);
  applyHighlight(); applyStreetStyle(); tick(true); syncFilterUI(); saveF();
  if (vis.size === 0 && !focus) toast('Keine Linien ausgewählt. Öffne die Filter und wähle welche aus.');
}
function applyHighlight() {
  if (!map || !map.getLayer('veh-icon')) return;
  const sel = selected && selected.type === 'line' ? selected.id : null;
  if (focusOn() && !sel) {
    for (const id of ['lines-day', 'lines-night', 'lines-split', 'lines-hollow']) map.setPaintProperty(id, 'line-opacity', .3);
    map.setPaintProperty('lines-casing', 'line-opacity', .3);
    for (const [id, k] of [['veh-icon', 'icon-opacity'], ['veh-icon', 'text-opacity'], ['veh-dot', 'circle-opacity'], ['veh-dot', 'circle-stroke-opacity']]) map.setPaintProperty(id, k, 1);
    for (const id of ['st-major', 'st-minor']) { map.setPaintProperty(id, 'circle-opacity', 1); map.setPaintProperty(id, 'circle-stroke-opacity', 1); }
    for (const id of ['lbl-major', 'lbl-minor']) map.setPaintProperty(id, 'text-opacity', 1);
    return;
  }
  const op = (a, b) => sel ? ['case', ['==', ['get', 'line'], sel], a, b] : a;
  for (const id of ['lines-day', 'lines-night', 'lines-split', 'lines-hollow']) map.setPaintProperty(id, 'line-opacity', op(1, .18));
  map.setPaintProperty('lines-casing', 'line-opacity', op(1, .4)); map.setPaintProperty('veh-icon', 'icon-opacity', op(1, .25)); map.setPaintProperty('veh-icon', 'text-opacity', op(1, .25));
  map.setPaintProperty('veh-dot', 'circle-opacity', op(1, .2)); map.setPaintProperty('veh-dot', 'circle-stroke-opacity', op(1, .2));
  const on = sel ? ['case', ['in', sel, ['get', 'lines']], 1, .25] : 1;
  for (const id of ['st-major', 'st-minor']) { map.setPaintProperty(id, 'circle-opacity', on); map.setPaintProperty(id, 'circle-stroke-opacity', on); }
  for (const id of ['lbl-major', 'lbl-minor']) map.setPaintProperty(id, 'text-opacity', on);
}
function updateZonesLayer() {
  if (!map || !map.getSource('zones')) return;
  const z = alertZones();
  map.getSource('zones').setData({ type: 'FeatureCollection', features: z.map(q => ({ type: 'Feature', properties: { id: q.id, kind: q.kind, sev: q.sev, r: q.r, color: SEV_COLOR[q.sev] }, geometry: { type: 'Point', coordinates: [q.lng, q.lat] } })) });
  const cl = closures();
  map.getSource('closures').setData({ type: 'FeatureCollection', features: cl.filter((c, i) => cl.findIndex(o => o.line === c.line && o.alert === c.alert) === i).map(c => ({ type: 'Feature', properties: { line: c.line, alert: c.alert }, geometry: { type: 'LineString', coordinates: subLine(PD[c.pi], PD[c.pi].sd[c.k1], PD[c.pi].sd[c.k2]) } })) });
}
function subLine(pd, d1, d2) {
  const out = [], a = posAlong(pd, d1); out.push([a.lng, a.lat]);
  for (let i = 0; i < pd.coords.length; i++) if (pd.cum[i] > d1 && pd.cum[i] < d2) out.push(pd.coords[i]);
  const b = posAlong(pd, d2); out.push([b.lng, b.lat]); return out;
}
function updateMe(est, isEst) {
  if (!map || !map.getSource('me')) return;
  const p = est || myPosition();
  map.getSource('me').setData(p ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { acc: isEst ? 120 : (Loc.last ? Math.min(Loc.last.acc, 200) : 30), est: !!isEst }, geometry: { type: 'Point', coordinates: p } }] } : EMPTY);
}
let lastTick = 0;
function tick(force) {
  const t = performance.now(); if (!force && (t - lastTick < 80 || document.hidden)) return; lastTick = t;
  if (!map || !map.getSource('vehicles')) return;
  const show = F.vehicles || focusOn();
  map.getSource('vehicles').setData(show || Loc.demo ? computeVehicles(show ? shownLines() : new Set()) : EMPTY);
}
function loop() { tick(false); requestAnimationFrame(loop); }

let DRAWN = null;
function drawRoute(r, noFit) {
  DRAWN = r;
  if (!map || !map.getSource('route')) return;
  if (!r) { map.getSource('route').setData(EMPTY); map.getSource('routestops').setData(EMPTY); return; }
  const feats = [], stops = [];
  const ptOf = legPt;
  for (const l of r.legs) {
    if (l.type === 'walk') {
      const a = ptOf(l.from), b = ptOf(l.to), w = WALK.get(walkKey(a, b));
      if (w === undefined) fetchWalk(a, b).then(v => { if (v && DRAWN === r) drawRoute(r, true); if (v && ROUTE.trip) tripTick(); });
      feats.push({ type: 'Feature', properties: { walk: true, color: '#5A6878' }, geometry: { type: 'LineString', coordinates: w ? [a, ...w.coords, b] : [a, b] } }); continue;
    }
    const pd = PD[l.pi], color = lineColor(pd.line);
    feats.push({ type: 'Feature', properties: { walk: false, color }, geometry: { type: 'LineString', coordinates: subLine(pd, pd.sd[l.k1], pd.sd[l.k2]) } });
    for (const k of [l.k1, l.k2]) { const s = ST[pd.ids[k]]; stops.push({ type: 'Feature', properties: { color }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } }); }
  }
  map.getSource('route').setData({ type: 'FeatureCollection', features: feats });
  map.getSource('routestops').setData({ type: 'FeatureCollection', features: stops });
  let bb = [180, 90, -180, -90];
  for (const f of feats) for (const [x, y] of f.geometry.coordinates) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
  if (!noFit) map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: { top: 140, bottom: Math.min(420, innerHeight * .5), left: 40, right: 40 }, maxZoom: 15, duration: reduced() ? 0 : 900 });
}

// =================================================================== UI: sheets, cards
function setCardH() { const c = $('#card'), t = $('#trip'); const ch = c.classList.contains('open') ? c.offsetHeight + 6 : 0; const th = ROUTE.trip && !ch && !openSheetId ? t.offsetHeight + 6 : 0; document.documentElement.style.setProperty('--card-h', Math.max(ch, th) + 'px'); document.body.classList.toggle('card-open', ch > 0); }
const cardRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setCardH) : null;
function openCard(html) { const c = $('#card'); c.innerHTML = html; c.classList.add('open'); c.scrollTop = 0; setCardH(); if (cardRO) { cardRO.observe(c); cardRO.observe($('#trip')); } }
function closeCard() { $('#card').classList.remove('open'); selected = null; cardRefresh = null; setCardH(); applyHighlight(); }
const closeX = `<button class="closebtn" type="button" data-cardclose aria-label="Schließen">${ICON.close}</button>`;

const TAB_OF = { filters: 'map', route: 'route', alerts: 'alerts', report: 'report', profile: 'map', panic: 'map', track: 'map' };
function openSheet(id) {
  closeCard();
  $$('.sheet.open').forEach(s => { if (s.id !== 'sheet-picker') s.classList.remove('open'); });
  const s = $('#sheet-' + id); if (!s) return;
  if (id === 'panic') { panicCache.key = null; dropPin(); }
  ({ route: renderRouteSheet, alerts: renderAlerts, report: renderReport, profile: renderProfile, panic: renderPanic, track: renderTrackSheet }[id] || (() => {}))();
  s.classList.add('open'); s.querySelector('.body').scrollTop = 0; $('#scrim').classList.add('on');
  openSheetId = id; document.body.classList.add('sheet-open'); document.body.classList.toggle('panic-open', id === 'panic'); setTab(TAB_OF[id] || 'map');
  setTimeout(() => { const f = s.querySelector('[data-close]'); if (f) f.focus({ preventScroll: true }); }, 60);
}
function closeSheet() {
  $$('.sheet.open').forEach(s => { s.classList.remove('open'); s.style.transform = ''; });
  // the escape-route sheet belongs to an active emergency: closing it returns to the Way Out overlay
  if (openSheetId === 'panic') dispatchEvent(new CustomEvent('sr:emergency-open'));
  $('#scrim').classList.remove('on'); openSheetId = null; setTab('map'); document.body.classList.remove('sheet-open', 'panic-open', 'picker-open'); setCardH();
}
function setTab(t) { $$('.tabs button').forEach(b => b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')); }
function enableDrag(sheet) {
  const h = sheet.querySelector('.handle'); let y0 = null, dy = 0;
  h.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; h.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
  h.addEventListener('pointermove', e => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = innerWidth >= 720 ? `translate(-50%, ${dy}px)` : `translateY(${dy}px)`; });
  const end = () => { if (y0 === null) return; sheet.style.transition = ''; sheet.style.transform = ''; if (dy > 90) { sheet.id === 'sheet-picker' ? closePicker() : closeSheet(); } y0 = null; };
  h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
}

// ---------- station picker
let pickCb = null;
function openPicker(title, cb, opts = {}) {
  pickCb = cb; $('#pkTitle').textContent = title; $('#pickInput').value = ''; renderPick('', opts);
  pickOpts = opts; $('#sheet-picker').classList.add('open'); document.body.classList.add('picker-open');
  if (!openSheetId) $('#scrim').classList.add('on');
  setTimeout(() => $('#pickInput').focus({ preventScroll: true }), 250);
}
let pickOpts = {};
function closePicker() { $('#sheet-picker').classList.remove('open'); document.body.classList.remove('picker-open'); if (!openSheetId) $('#scrim').classList.remove('on'); }
function renderPick(q, opts = pickOpts) {
  q = q.trim().toLowerCase();
  let list = Object.values(ST);
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.name.toLowerCase().replace(/str\.$/, 'straße').includes(q)).sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || b.rank - a.rank || a.name.localeCompare(b.name));
  else list = list.filter(s => s.rank >= 4).sort((a, b) => a.name.localeCompare(b.name));
  const quick = (opts.quick || []).map(x => `<button class="result" type="button" data-pick="${esc(x.id)}">${x.icon || ICON.pin}<span><span class="nm">${esc(x.label)}</span><br><span class="t">${esc(x.sub || '')}</span></span></button>`).join('');
  $('#pickResults').innerHTML = (q ? '' : quick) + list.slice(0, 30).map(s => `<button class="result" type="button" data-pick="${esc(s.id)}"><span class="nm">${esc(s.name)}</span><span class="ln">${s.lines.filter(l => !l.startsWith('N')).slice(0, 5).map(l => badge(l, 'xs')).join('')}</span></button>`).join('')
    + (q && !list.length ? `<p class="note">Keine Haltestelle passt zu „${esc(q)}“.</p>` : '');
}

// ---------- top: conditions pill
function wxIcon(kind, night) {
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const moon = '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>';
  const cloud = '<path d="M7 18h10a4 4 0 00.5-8A6 6 0 006 11a3.5 3.5 0 001 7z"/>';
  const body = { clear: night ? moon : sun, partly: cloud, cloud, fog: '<path d="M4 9h16M3 13h18M5 17h14"/>', rain: '<path d="M7 14h10a4 4 0 00.5-8A6 6 0 006 7a3.5 3.5 0 001 7z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
    snow: '<path d="M7 14h10a4 4 0 00.5-8A6 6 0 006 7a3.5 3.5 0 001 7z"/><path d="M8 18h.01M12 19h.01M16 18h.01"/>', storm: '<path d="M7 14h10a4 4 0 00.5-8A6 6 0 006 7a3.5 3.5 0 001 7z"/><path d="M12 15l-2 4h4l-2 4"/>' }[kind] || cloud;
  return `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
function activeAlerts() { return ALERTS.filter(a => activeNow(a)); }
function renderFocusChip() {
  const tr = ROUTE.trip, el = $('#focusChip'); if (!tr) { setHTML(el, ''); return; }
  setHTML(el, `<span>${tr.focus ? 'Nur deine Linien' : 'Alle Linien'}</span><span class="bs">${tr.lines.map(l => badge(l, 'xs')).join('')}</span><button type="button" data-act="focustoggle">${tr.focus ? 'Alle zeigen' : 'Fokus'}</button>`);
}
function renderCond() {
  renderFocusChip();
  const el = $('#cond');
  if (!WEATHER) { el.innerHTML = '<span class="w">Lage wird geprüft…</span>'; return; }
  const night = Date.now() > WEATHER.sunset || mzHour() < 6;
  const act = activeAlerts(), hot = act.some(a => a.sev === 3);
  el.innerHTML = `<span class="w">${WEATHER.unknown ? '<span class="tx">Keine Wetterdaten</span>' : `${wxIcon(WEATHER.kind, night)}<b>${WEATHER.temp}°</b><span class="tx">${esc(WEATHER.text)}</span>`}</span><span class="sep"></span>
    <span class="a"><span class="n ${hot ? 'hot' : ''}">${act.length}</span>${act.length === 1 ? 'Hinweis' : 'Hinweise'}</span>`;
  const tc = $('#tabCount'); tc.hidden = !act.length; tc.textContent = act.length; tc.style.background = hot ? 'var(--danger)' : '';
}
function refreshAlertsEverywhere() { renderCond(); updateZonesLayer(); if (openSheetId === 'alerts') renderAlerts(); if (openSheetId === 'profile') renderProfile(); }

// ---------- tracking pill + sheet
function trackText() {
  if (Loc.mode === 'off') {
    if (Loc.status === 'error') return { l1: 'Standort nicht verfügbar', l2: 'Tippen für die Demo-Fahrt', live: false };
    return { l1: 'Standort ist aus', l2: 'Tippen, um deinen Zug zu erkennen', live: false };
  }
  if (Loc.status === 'locating') return { l1: 'Suche dich…', l2: Loc.mode === 'demo' ? 'Demo-Fahrt' : 'Warte auf GPS', live: true };
  if (myPosition() && !inArea(myPosition())) return { l1: 'Du bist außerhalb von München', l2: 'Routen starten am Odeonsplatz, bis du zurück bist', live: true };
  const near = nearestStation(myPosition(), 160);
  const m = Loc.match;
  if (Loc.status === 'vehicle' && m) {
    const nxt = m.pd.names[m.next];
    const when = m.eta < 50 ? 'jetzt' : `${mins(m.eta)} Min`;
    return { badge: m.line, l1: `Richtung ${m.to}`, l2: `${m.atStop ? 'An' : 'Nächster Halt'} ${nxt}${m.atStop ? '' : ', ' + when}${Loc.estimated ? ', geschätzt' : ''}`, live: true };
  }
  if (Loc.status === 'vehicle') return { l1: `Unterwegs mit ${Math.round(Loc.speed)} km/h`, l2: Loc.cands.length ? 'Welche Linie fährst du? Tippen zum Auswählen' : 'Linie wird erkannt…', live: true };
  if (Loc.status === 'walking') return { l1: near ? `Zu Fuß bei ${near.name}` : 'Zu Fuß', l2: tripHint() || (Loc.mode === 'demo' ? 'Demo-Fahrt' : 'Standort ist live'), live: true };
  if (Loc.rough && Loc.mode === 'gps') return { l1: 'Standort ist ungenau', l2: `±${Math.round(Loc.last.acc)} m. Geh ins Freie oder warte auf GPS`, live: true };
  return { l1: near ? `An ${near.name}` : 'Stehst still', l2: tripHint() || (Loc.mode === 'demo' ? 'Demo-Fahrt, warte auf die U3' : 'Standort ist live'), live: true };
}
function tripHint() {
  const r = ROUTE.trip; if (!r) return '';
  const t = secOfDay(); const leg = r.legs.find(l => l.arr > t);
  if (!leg) return 'Fahrt: Du solltest angekommen sein';
  if (leg.type === 'walk') return `Fahrt: zu Fuß nach ${stName(typeof leg.to === 'string' ? leg.to : '')}`;
  return `Fahrt: ${leg.line} um ${clock(Date.now() + (leg.dep - t) * 1000)} ab ${stName(leg.fromSid)}`;
}
function nearestStation(p, maxM = 200) { if (!p) return null; let best = null; for (const s of Object.values(ST)) { const m = metres(p, [s.lng, s.lat]); if (m < maxM && (!best || m < best.m)) best = { ...s, m }; } return best; }
function renderTrack() {
  const t = trackText();
  setHTML($('#btnTrack'), `<span class="ico ${t.live ? 'live' : ''}">${t.badge ? badge(t.badge, 'xs') : ICON.dot.replace('<svg', '<svg class="i"')}</span><span class="txt"><span class="l1">${esc(t.l1)}</span><span class="l2">${esc(t.l2)}</span></span>`);
  $('#btnLocate').classList.toggle('on', Loc.follow);
  if (openSheetId === 'track') renderTrackSheet();
  if (openSheetId === 'panic') renderPanic();
}
function renderTrackSheet() {
  const b = $('#trackBody'), m = Loc.match, t = trackText();
  if (!b.querySelector('#trkStatus')) b.innerHTML = '<div id="trkStatus"></div><div id="trkErr"></div><div id="trkCands"></div><div id="trkKv"></div><div class="group" id="trkBtns"></div><p class="note">SafeRide liest deinen Standort etwa einmal pro Sekunde, solange die App offen ist, und behält die letzten 3 Minuten auf diesem Handy, um Tempo und Linie zu erkennen. Nichts wird hochgeladen. Im Tunnel fällt GPS oft aus; dann bewegt SafeRide dich nach Fahrplan entlang deiner Linie und markiert den Standort als geschätzt.</p>';
  const on = Loc.mode !== 'off';
  const statusLabel = { off: 'Aus', error: 'Nicht verfügbar', locating: 'Suche', still: 'Steht still', walking: 'Zu Fuß', vehicle: 'Im Fahrzeug', unknown: 'Suche' }[Loc.status] || Loc.status;
  setHTML($('#trkStatus'), on ? `<div class="escape">${m && Loc.status === 'vehicle' ? `<div class="big">${badge(m.line, 'lg')} Richtung ${esc(m.to)}</div><div class="why">${esc(t.l2)}</div>` : `<div class="big" style="font-size:22px">${esc(t.l1)}</div><div class="why">${esc(t.l2)}</div>`}</div>` : '');
  setHTML($('#trkErr'), Loc.err ? `<div class="banner">${ICON.info}<span>${esc(Loc.err)}</span></div>${window.self !== window.top ? `<a class="btn block" href="${esc(location.href)}" target="_blank" rel="noopener" style="margin-top:10px;text-decoration:none">SafeRide in neuem Tab öffnen</a>` : ''}` : '');
  setHTML($('#trkCands'), Loc.cands.length ? `<div class="group"><h3>Welche Linie fährst du?</h3><p>Mehrere Linien teilen sich diese Strecke. Wähle deine, damit der Notfall-Modus weiß, wo du bist.</p>
      <div class="results">${Loc.cands.map(c => `<button class="result" type="button" data-iam="${esc(c.line)}|${esc(c.to)}">${badge(c.line, 'sm')}<span class="nm">Richtung ${esc(c.to)}</span></button>`).join('')}</div></div>` : '');
  setHTML($('#trkKv'), on ? `<dl class="kv"><dt>Quelle</dt><dd>${Loc.mode === 'demo' ? 'Demo-Fahrt (simuliertes GPS)' : 'Handy-GPS'}</dd><dt>Status</dt><dd>${statusLabel}</dd>
      <dt>Tempo</dt><dd>${Math.round(Loc.speed)} km/h</dd><dt>Genauigkeit</dt><dd>${Loc.last ? '±' + Math.round(Loc.last.acc) + ' m' : '–'}</dd>
      <dt>Letzte Ortung</dt><dd>${Loc.last ? ago(Loc.last.t) : '–'}${Loc.estimated ? ', Standort nach Fahrplan geschätzt' : ''}</dd>
      <dt>Erkennung</dt><dd>${m ? ({ vehicle: 'Fahrzeug erkannt', line: 'Linie erkannt', you: 'Von dir gewählt' }[m.method]) : 'Noch keine'}</dd></dl>` : '');
  setHTML($('#trkBtns'), `${on ? `<button class="btn block" type="button" data-loc="stop">Ortung beenden</button>` : `<button class="btn primary block" type="button" data-loc="start">Standort einschalten</button>`}
      ${Loc.mode !== 'demo' ? `<button class="btn block" type="button" data-loc="demo">Demo-Fahrt mit der U3 starten</button>` : ''}
      ${ROUTE.trip ? `<button class="btn block" type="button" data-act="endtrip">Fahrt beenden</button>` : ''}`);
}

// ---------- line / station / vehicle / zone cards
function lineCard(l) {
  const L = LINE[l]; if (!L) return; selected = { type: 'line', id: l }; applyHighlight();
  const hw = headwayMin(L), active = [...VEH.values()].filter(v => v.pd.line === l).length;
  const solo = F.view === 'custom' && F.custom.length === 1 && F.custom[0] === l;
  const issues = activeAlerts().filter(a => (a.lines || []).includes(l));
  openCard(`<div class="head">${badge(l, 'lg')}<div class="titles"><h3 id="cardTitle">${esc(L.termini)}</h3><div class="sub">${MODE_LABEL[L.mode]}${L.night ? ', Nachtlinie' : ''}</div></div>${closeX}</div>
    <div class="facts"><span><b>${L.stationCount}</b> Haltestellen</span><span>${hw ? `Gerade alle <b>${hw} Min</b>` : 'Fährt gerade nicht'}</span>${F.vehicles && visibleSet().has(l) ? `<span><b>${active}</b> unterwegs</span>` : ''}</div>
    ${issues.map(a => `<div class="flag mid" style="margin-top:10px">${ICON.warn}<span>${esc(a.title)}</span></div>`).join('')}
    <div class="btns">${solo ? `<button class="btn primary" type="button" data-act="showbasic">Wieder alle Linien zeigen</button>` : `<button class="btn primary" type="button" data-act="solo" data-line="${esc(l)}">Nur ${esc(l)} zeigen</button>`}
      <button class="btn" type="button" data-act="fit" data-line="${esc(l)}">Linie zeigen</button></div>`);
}
function stationCard(sid) {
  const s = ST[sid]; if (!s) return; selected = { type: 'station', id: sid }; applyHighlight();
  const render = () => {
    const deps = nextDepartures(sid), pref = P.preferred.includes(sid), avo = P.avoided.includes(sid);
    const z = alertZones().filter(q => metres([s.lng, s.lat], [q.lng, q.lat]) <= q.r);
    const rows = deps.slice(0, 5).map(r => `<div class="dep">${badge(r.line, 'sm')}<span class="to">${esc(r.to)}</span><span class="mins">${r.times.map(x => mins(x)).map((m, i) => i ? `<small>${m}</small>` : (m === 0 ? 'jetzt' : `${m} Min`)).join(' <small>dann</small> ')}</span></div>`).join('');
    return `<div class="head"><div class="titles"><h3 id="cardTitle">${esc(s.name)}</h3><div class="badges" style="margin-top:8px">${s.lines.map(l => badge(l, 'sm')).join('')}</div></div>${closeX}</div>
      ${z.map(q => `<div class="flag ${q.sev === 3 ? 'bad' : 'mid'}" style="margin-top:10px">${ICON.warn}<span>${esc(q.title)}</span></div>`).join('')}
      ${avo ? `<div class="flag bad" style="margin-top:10px">${ICON.warn}<span>Du meidest diese Haltestelle. Sichere Routen fahren drumherum.</span></div>` : ''}
      ${deps.length ? `<div class="deps">${rows}</div>` : `<p class="note" style="margin-top:12px">Gerade keine Abfahrten.</p>`}
      <div class="btns"><button class="btn primary" type="button" data-act="routeto" data-sid="${esc(sid)}">Route hierher</button>
        <button class="btn" type="button" data-act="pref" data-sid="${esc(sid)}" aria-pressed="${pref}">${pref ? 'Bevorzugt' : 'Bevorzugen'}</button>
        <button class="btn" type="button" data-act="avoid" data-sid="${esc(sid)}" aria-pressed="${avo}">${avo ? 'Gemieden' : 'Meiden'}</button></div>
      ${deps.length ? '<span class="sim">Abfahrten nach Fahrplan simuliert</span>' : ''}`;
  };
  openCard(render());
  cardRefresh = () => { if (selected && selected.type === 'station' && selected.id === sid) { const c = $('#card'), st = c.scrollTop; c.innerHTML = render(); c.scrollTop = st; } };
}
function vehicleCard(vid) {
  if (!VEH.get(vid)) return; selected = { type: 'vehicle', id: vid }; applyHighlight();
  const render = () => {
    const cur = VEH.get(vid);
    if (!cur) return `<div class="head"><div class="titles"><h3 id="cardTitle">Diese Fahrt ist zu Ende</h3></div>${closeX}</div>`;
    const pd = cur.pd, k = cur.p.next, secs = Math.max(0, pd.arr[k] - cur.e);
    const where = cur.p.atStop ? `Hält an <b>${esc(pd.names[k])}</b>` : `Nächster Halt: <b>${esc(pd.names[k])}</b>, ${secs < 50 ? 'in unter einer Minute' : `in ${mins(secs)} Min`}`;
    return `<div class="head">${badge(pd.line, 'lg')}<div class="titles"><h3 id="cardTitle">Richtung ${esc(pd.to)}</h3><div class="sub">${where}</div></div>${closeX}</div><span class="sim">${cur.demo ? 'Deine Demo-Fahrt' : 'Simulierte Position'}</span>`;
  };
  openCard(render());
  cardRefresh = () => { if (selected && selected.type === 'vehicle' && selected.id === vid) $('#card').innerHTML = render(); };
}
function alertCard(id) {
  const a = ALERTS.find(x => x.id === id); if (!a) return; selected = { type: 'alert', id };
  openCard(`<div class="head"><div class="titles"><div class="sub" style="margin:0 0 4px">${KIND[a.kind].label}</div><h3 id="cardTitle">${esc(a.title)}</h3></div>${closeX}</div>
    ${a.body ? `<p class="note" style="margin-top:8px;color:var(--ink)">${esc(a.body)}</p>` : ''}
    <div class="facts">${(a.lines || []).filter(l => LINE[l]).map(l => badge(l, 'sm')).join('')}<span>${whenText(a)}</span></div>
    <div class="facts" style="margin-top:8px"><span class="tag ${a.demo ? 'demo' : ''}">${a.demo ? 'Demo-Daten' : esc(a.source)}</span>${a.mine ? '<span class="tag mine">Deine Meldung</span>' : ''}</div>`);
}
function whenText(a) {
  const now = Date.now();
  if (a.kind === 'report') return `Gemeldet ${ago(a.from)}`;
  if (a.from > now) return `Ab ${clock(a.from)}`;
  if (a.to - now > 36 * 3600e3) return `Seit ${new Date(a.from).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', timeZone: TZ })}`;
  return `Bis ${clock(a.to)}`;
}

// ---------- alerts sheet
let alertFilter = 'all';
function renderAlerts() {
  const b = $('#alertsBody'); if (!b) return;
  $('#aMeta').textContent = alertsUpdated ? `Aktualisiert ${clock(alertsUpdated)}` : '';
  const now = Date.now();
  const list = ALERTS.filter(a => a.to > now && a.from < now + 18 * 3600e3).sort((x, y) => (activeNow(y) - activeNow(x)) || (y.sev - x.sev) || (y.from - x.from));
  const groups = [['all', 'Alle'], ['report', 'Meldungen'], ['disruption', 'Verkehr'], ['construction', 'Baustellen'], ['news', 'News']];
  const count = k => k === 'all' ? list.length : list.filter(a => a.kind === k).length;
  const shown = alertFilter === 'all' ? list : list.filter(a => a.kind === alertFilter);
  const homeLines = P.home && ST[P.home] ? new Set(ST[P.home].lines) : null;
  const w = WEATHER, night = w && (now > w.sunset || mzHour() < 6);
  const wxLine = w ? (w.raining ? `Regen${w.rainUntil ? ` bis etwa ${clock(w.rainUntil)}` : ''}. Bahnhöfe und Unterführungen werden voller, darum halten sichere Routen Fußwege kurz.` : (night ? `Dunkel seit ${clock(w.sunset)}. Sichere Routen bevorzugen gut besuchte Haltestellen.` : `Dunkel ab ${clock(w.sunset)}.`)) : '';
  const anyDemo = list.some(a => a.demo) || (w && !w.live && !w.unknown);
  b.innerHTML = `
    ${w && !w.unknown ? `<div class="wx"><div class="big">${wxIcon(w.kind, night)}${w.temp}°</div><div class="t1">${esc(w.text)}, Wind ${w.wind} km/h</div><div class="t2">${esc(wxLine)}${w.live ? '' : ' <span class="tag demo">Demo-Daten</span>'}</div></div>` : ''}
    <div class="chiprow scroll" role="group" aria-label="Hinweise filtern">${groups.map(([k, l]) => `<button class="chip plain" type="button" data-afilter="${k}" aria-pressed="${alertFilter === k}">${l} <span style="opacity:.7">${count(k)}</span></button>`).join('')}</div>
    <div class="alist">${shown.length ? shown.map(a => {
      const mine = homeLines && ((a.lines || []).some(l => homeLines.has(l)) || (a.stations || []).some(n => { const s = stationByName(n); return s && s.lines.some(l => homeLines.has(l)); }));
      return `<button class="al" type="button" data-alert="${esc(a.id)}" style="--sevc:${SEV_COLOR[a.sev]}">
        <div class="top1">${ICON[a.kind].replace('<svg', '<svg class="i"')}${KIND[a.kind].label}<span class="when">${whenText(a)}</span></div>
        <div class="tt">${esc(a.title)}</div>${a.body ? `<div class="bd">${esc(a.body)}</div>` : ''}
        <div class="ft">${(a.lines || []).filter(l => LINE[l]).slice(0, 7).map(l => badge(l, 'xs')).join('')}${!activeNow(a) ? '<span class="tag later">Später heute</span>' : ''}${mine ? '<span class="tag mine">Auf deinem Heimweg</span>' : ''}
          <span class="src">${a.demo ? '<span class="tag demo">Demo-Daten</span>' : esc(a.source)}</span></div></button>`; }).join('') : `<p class="note">Gerade nichts zu melden.</p>`}</div>
    ${anyDemo ? `<div class="banner">${ICON.info}<span>Einträge mit „Demo-Daten“ sind Beispiele. Live-MVG-Meldungen, News und Wetter laden, wenn SafeRide unter seiner eigenen Adresse läuft. Den Status findest du im Profil unter Datenquellen.</span></div>` : ''}`;
}

// ---------- route sheet + card
function onboardOrigin() { const m = Loc.match; if (Loc.status !== 'vehicle' || !m || !m.pd) return null; return { onboard: { pi: m.pd.i, k: Math.max(1, m.next), eta: Math.max(20, m.eta || 0), line: m.line } }; }
function originLabel() { if (ROUTE.from && ROUTE.from.sid) return stName(ROUTE.from.sid); const ob = onboardOrigin(); if (ob) return `Mein Standort (in der ${Loc.match.line} Richtung ${Loc.match.to})`; const p = myPosition(); return p ? (inArea(p) ? 'Mein Standort' : 'Odeonsplatz (du bist außerhalb von München)') : 'Odeonsplatz (Standort ist aus)'; }
function originObj() { if (ROUTE.from && ROUTE.from.sid) return ROUTE.from; const ob = onboardOrigin(); if (ob) return ob; let p = myPosition(); if (!inArea(p)) p = DEMO_POS; return { lng: p[0], lat: p[1] }; }
function renderRouteSheet() {
  const b = $('#routeBody'); const mode = ROUTE.mode || P.routeDefault;
  const quick = [];
  if (P.home && ST[P.home]) quick.push(`<button class="chip" type="button" data-rquick="${esc(P.home)}">${ICON.pin.replace('<svg', '<svg width="18" height="18"')}Zuhause</button>`);
  for (const sid of P.preferred.slice(0, 4)) if (ST[sid] && sid !== P.home) quick.push(`<button class="chip" type="button" data-rquick="${esc(sid)}">${esc(ST[sid].name)}</button>`);
  let res = '';
  if (ROUTE.to) {
    const R = ROUTE.results;
    if (!R) res = `<p class="note">Gerade keine Verbindung gefunden. Manche Linien fahren nachts nicht.</p>`;
    else {
      const opts = R.same ? [['safe', R.safe, 'Am sichersten und schnellsten']] : (mode === 'safe' ? [['safe', R.safe, 'Am sichersten'], ['fast', R.fast, 'Am schnellsten']] : [['fast', R.fast, 'Am schnellsten'], ['safe', R.safe, 'Am sichersten']]);
      res = `<div class="group">${opts.filter(o => o[1]).map(([k, r, label]) => optionCard(k, r, label, R)).join('')}</div>`;
    }
  }
  b.innerHTML = `
    <div class="fieldstack">
      <button class="field" type="button" data-rfield="from">${ICON.dot}<span><span class="lbl">Von</span><span class="val">${esc(originLabel())}</span></span></button>
      <button class="field" type="button" data-rfield="to">${ICON.pin}<span><span class="lbl">Nach</span><span class="val ${ROUTE.to ? '' : 'empty'}">${ROUTE.to ? esc(stName(ROUTE.to)) : 'Haltestelle wählen'}</span></span></button>
      ${ROUTE.to ? `<button class="swap" type="button" data-rswap aria-label="Start und Ziel tauschen">${ICON.swap}</button>` : ''}
    </div>
    ${quick.length ? `<div class="chiprow">${quick.join('')}</div>` : (P.home ? '' : `<p class="note">Leg im Profil deine Heimhaltestelle fest, dann planst du den Heimweg mit einem Tipp.</p>`)}
    <div class="seg wide" role="group" aria-label="Routenwahl"><button type="button" data-rmode="safe" aria-pressed="${mode === 'safe'}">Am sichersten</button><button type="button" data-rmode="fast" aria-pressed="${mode === 'fast'}">Am schnellsten</button></div>
    ${res}`;
}
function legSummary(r) { return r.legs.map(l => l.type === 'walk' ? `<span class="walkbadge" title="Zu Fuß">${ICON.walk}</span>` : badge(l.line, 'sm')).join('<span class="ar">›</span>'); }
function optionCard(k, r, label, R) {
  const z = routeZones(r), other = k === 'safe' ? R.fast : R.safe;
  const flags = [];
  if (k === 'safe' && !R.same && other) {
    const oz = routeZones(other);
    const avoidedNames = oz.zones.filter(q => !z.zones.some(x => x.id === q.id)).map(q => q.title);
    if (avoidedNames.length) flags.push(`<div class="flag good">${ICON.shield}<span>Meidet ${esc(avoidedNames.slice(0, 2).join(' und '))}${avoidedNames.length > 2 ? ` und ${avoidedNames.length - 2} weitere` : ''}</span></div>`);
    const extra = Math.round((r.dur - other.dur) / 60);
    if (extra > 0) flags.push(`<div class="flag ${extra > P.maxExtra ? 'bad' : 'mid'}">${ICON.info}<span>${extra} Min länger als die schnellste${extra > P.maxExtra ? `, mehr als dein Limit von ${P.maxExtra} Min` : ''}</span></div>`);
  }
  if (z.zones.length) flags.push(`<div class="flag ${z.zones.some(q => q.sev === 3) ? 'bad' : 'mid'}">${ICON.warn}<span>Führt vorbei an ${esc(z.zones.slice(0, 2).map(q => q.title).join(' und '))}</span></div>`);
  if (z.avoided.length) flags.push(`<div class="flag bad">${ICON.warn}<span>Nutzt ${esc(z.avoided.map(stName).join(', '))}, die du meidest</span></div>`);
  if (!z.zones.length && !z.avoided.length && k === 'safe') flags.push(`<div class="flag good">${ICON.shield}<span>Keine Meldungen oder Problemzonen auf dem Weg</span></div>`);
  for (const d of z.disr.slice(0, 1)) flags.push(`<div class="flag mid">${ICON.info}<span>${esc(d.title)}</span></div>`);
  const sel = ROUTE.chosen === k;
  return `<button class="opt" type="button" data-ropt="${k}" aria-pressed="${sel}">
    <div class="h"><b>${mins(r.dur)} Min</b><span class="k">${label}</span><span class="arr">Ankunft ${clock(Date.now() + r.dur * 1000)}</span></div>
    <div class="legs">${legSummary(r)}</div>
    <div class="note">${r.transfers === 0 ? 'Ohne Umstieg' : r.transfers === 1 ? '1 Umstieg' : `${r.transfers} Umstiege`}${r.walkM > 50 ? `, ${Math.round(r.walkM / 10) * 10} m zu Fuß` : ''}</div>
    ${flags.join('')}</button>`;
}
function computeRoutes() { ROUTE.results = ROUTE.to ? planRoutes(originObj(), ROUTE.to) : null; ROUTE.chosen = null; }
function routeCard(k) {
  const R = ROUTE.results; if (!R) return; const r = k === 'fast' ? R.fast : R.safe; if (!r) return;
  ROUTE.chosen = k; selected = { type: 'route' }; drawRoute(r);
  const steps = tripSteps(r, ROUTE.to).map(st => { const v = stepView(st, null, true); return `<div class="step">${v.icon}<span>${v.ins}${v.sub ? `<br><span class="sx">${v.sub}</span>` : ''}</span><span class="tm">${v.time || ''}</span></div>`; }).join('');
  openCard(`<div class="head"><div class="titles"><h3 id="cardTitle">${k === 'safe' && !R.same ? 'Sicherste Route' : R.same ? 'Am sichersten und schnellsten' : 'Schnellste Route'}, ${mins(r.dur)} Min</h3><div class="sub">Ankunft ${clock(Date.now() + r.dur * 1000)}</div></div>${closeX}</div>
    <div class="steps">${steps}</div>
    <div class="btns stick"><button class="btn primary" type="button" data-act="trip" data-k="${k}">Fahrt starten</button><button class="btn" type="button" data-act="routeopts">Andere Optionen</button></div>
    <span class="sim">Zeiten nach Fahrplan simuliert</span>`);
}

// =================================================================== trip guidance
const COMPASS = ['nach Norden', 'nach Nordosten', 'nach Osten', 'nach Südosten', 'nach Süden', 'nach Südwesten', 'nach Westen', 'nach Nordwesten'];
const compass = (a, b) => COMPASS[Math.round(bearing(a, b) / 45) % 8];
const stLL = sid => [ST[sid].lng, ST[sid].lat];
const absClock = sec => clock(Date.now() + (sec - secOfDay()) * 1000);
const inMin = sec => { const m = Math.round((sec - secOfDay()) / 60); return m <= 0 ? 'jetzt' : `in ${m} Min`; };
const WALKIC = `<span class="walkic">${ICON.walk.replace('width="18" height="18"', '')}</span>`;
function tripSteps(r, dest) {
  const steps = [];
  r.legs.forEach((l, i) => {
    if (l.type === 'walk') { if (typeof l.to === 'string') steps.push({ kind: 'walk', from: l.from, toSid: l.to, m: l.m, start: l.dep, end: l.arr, leg: i }); return; }
    if (l.onboard && l.stops === 0) { steps.push({ kind: 'exit', line: l.line, dir: l.to, pi: l.pi, toSid: l.toSid, start: l.dep, end: l.arr, leg: i }); return; }
    if (!l.onboard) steps.push({ kind: 'board', line: l.line, dir: l.to, pi: l.pi, atSid: l.fromSid, k1: l.k1, dep: l.dep, start: steps.length ? steps[steps.length - 1].end : r.t0, end: l.dep, leg: i });
    steps.push({ kind: 'ride', line: l.line, dir: l.to, pi: l.pi, toSid: l.toSid, k1: l.k1, k2: l.k2, stops: l.stops, onboard: !!l.onboard, start: l.dep, end: l.arr, leg: i });
  });
  steps.push({ kind: 'arrive', toSid: dest, start: r.arrive, end: Infinity });
  return steps;
}
function stepView(st, live, preview) {
  const p = preview ? null : myPosition();
  if (st.kind === 'walk') {
    const wv = st.from ? WALK.get(walkKey(legPt(st.from), stLL(st.toSid))) : null, viaStreets = !!(wv && wv.coords);
    const m = p ? metres(p, stLL(st.toSid)) : viaStreets ? wv.m : st.m, dir = p && m > 25 ? ` ${compass(p, stLL(st.toSid))}` : '';
    return { icon: WALKIC, ins: `Zu Fuß nach ${esc(stName(st.toSid))}`, sub: `${Math.max(10, Math.round(m / 10) * 10)} m${dir}, etwa ${Math.max(1, Math.round(m / 1.25 / 60))} Min${viaStreets && !preview ? ', folge der gepunkteten Linie' : ''}`, short: `zu Fuß nach <b>${esc(stName(st.toSid))}</b>`, time: absClock(st.start) };
  }
  if (st.kind === 'board') {
    const dep = st.depNext || st.dep, near = p && metres(p, stLL(st.atSid)) < 160;
    return { icon: badge(st.line, 'lg'), ins: `Nimm die ${esc(st.line)} Richtung ${esc(st.dir)}`,
      sub: preview ? `Ab ${esc(stName(st.atSid))}` : `${near ? 'Du bist an ' : 'Ab '}${esc(stName(st.atSid))}, Abfahrt <b>${absClock(dep)}</b> ${inMin(dep)}${st.depNext ? ' (die nächste)' : ''}`,
      short: `${badge(st.line, 'xs')} Richtung ${esc(st.dir)} um <b>${absClock(dep)}</b>`, time: absClock(dep) };
  }
  if (st.kind === 'ride' || st.kind === 'exit') {
    const to = esc(stName(st.toSid));
    if (st.kind === 'exit') return { icon: badge(st.line, 'lg'), ins: `Steig aus an ${to}`, sub: `Nächster Halt${live && live.eta > 40 ? `, in etwa ${mins(live.eta)} Min` : ''}`, short: `aussteigen an <b>${to}</b>`, act: true, time: absClock(st.end) };
    if (preview) return { icon: badge(st.line, 'lg'), ins: `${st.onboard ? 'Bleib sitzen bis' : 'Steig aus an'} ${to}`, sub: `${st.stops} ${st.stops === 1 ? 'Halt' : 'Halte'}`, short: '', time: absClock(st.end) };
    let left = st.stops, nextName = null, atStop = false, eta = null;
    if (live && live.pd) {
      const iTo = live.pd.ids.indexOf(st.toSid);
      if (iTo >= 0) { atStop = !!live.atStop; left = Math.max(0, iTo - live.next + (atStop ? 0 : 1)); nextName = live.pd.names[live.next]; eta = live.eta; }
    }
    if (left <= 0) return { icon: badge(st.line, 'lg'), ins: `Jetzt aussteigen an ${to}`, sub: 'Die Türen sind an deinem Halt offen', short: `aussteigen an <b>${to}</b>`, act: true, time: absClock(st.end) };
    if (left === 1) return { icon: badge(st.line, 'lg'), ins: `Steig aus an ${to}`, sub: `Nächster Halt${eta != null && eta > 40 ? `, in etwa ${mins(eta)} Min` : ''}`, short: `aussteigen an <b>${to}</b>`, act: true, time: absClock(st.end) };
    return { icon: badge(st.line, 'lg'), ins: `${st.onboard ? 'Bleib sitzen bis' : 'Fahr bis'} ${to}`, sub: `Noch <b>${left}</b> Halte${nextName ? `, nächster: ${esc(nextName)}` : ''}${live && live.est ? ' (nach Fahrplan)' : ''}`, short: `aussteigen an <b>${to}</b>`, time: absClock(st.end) };
  }
  return { icon: `<span class="walkic">${ICON.pin.replace('<svg', '<svg width="24" height="24"')}</span>`, ins: `Du bist in ${esc(stName(st.toSid))} angekommen`, sub: 'Wenn du beendest, zeigt die Karte wieder alle Linien.', short: `Ankunft in <b>${esc(stName(st.toSid))}</b>`, time: absClock(st.start) };
}
function startTrip(r, dest, kind) {
  const lines = [...new Set(r.legs.filter(l => l.type === 'ride').map(l => l.line))];
  const prevView = ROUTE.trip ? ROUTE.trip.prevView : (map ? { center: map.getCenter().toArray(), zoom: map.getZoom() } : null);
  ROUTE.trip = { prevView, r, dest, kind, steps: tripSteps(r, dest), cur: 0, focus: true, lines, sids: [...r.sids], known: new Set(routeZones(r).zones.map(z => z.id)), dismissed: new Set(), lastKey: null, live: null, off: null };
  document.body.classList.add('trip-on');
  closeSheet(); closeCard(); selected = null; drawRoute(r); applyFilters(); renderCond();
  if (Loc.mode !== 'off') Loc.follow = true;
  const w0 = ROUTE.trip.steps[0];
  if (w0 && w0.kind === 'walk' && map) {
    const f0 = r.legs[w0.leg].from, a = myPosition() || (typeof f0 === 'string' ? stLL(f0) : f0 && f0.lng != null ? [f0.lng, f0.lat] : null), b = stLL(w0.toSid);
    if (a) setTimeout(() => map.fitBounds([[Math.min(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.max(a[1], b[1])]], { padding: { top: 160, bottom: 300, left: 60, right: 60 }, maxZoom: 16.5, duration: reduced() ? 0 : 900 }), 950);
  }
  if (!STREETS && !startTrip.noted) { startTrip.noted = true; setTimeout(() => toast(PREVIEW ? 'Stadtplan und Fußwege laden, wenn SafeRide unter seiner eigenen Adresse läuft. Diese Vorschau kann keine Kartenkacheln laden.' : 'Der Stadtplan hat nicht geladen, darum sind Fußwege gerade Linien. Prüf deine Verbindung.', 5200), 1200); }
  tripTick(); setTimeout(setCardH, 50);
  // Way Out maps this trip to an MVG route (first boarding stop -> destination) so Notfall knows the train.
  const ride = r.legs.find(l => l.type === 'ride');
  if (ride) dispatchEvent(new CustomEvent('sr:trip', { detail: { from: stName(ride.fromSid), to: stName(dest) } }));
}
function endTrip(msg) {
  const tr = ROUTE.trip; if (!tr) return;
  ROUTE.trip = null; ROUTE.chosen = null; selected = null; Loc.follow = false; dispatchEvent(new CustomEvent('sr:trip', { detail: null }));
  document.body.classList.remove('trip-on'); closeCard(); drawRoute(null); applyFilters(); renderCond(); renderTrack(); renderModeRail(); setCardH();
  if (tr.prevView && map) map.flyTo({ center: tr.prevView.center, zoom: tr.prevView.zoom, duration: reduced() ? 0 : 800 });
  if (msg) toast(msg);
}
function remainingSids(tr) {
  const out = new Set();
  for (const st of tr.steps.slice(tr.cur)) {
    if (st.kind === 'walk' || st.kind === 'arrive' || st.kind === 'exit') out.add(st.toSid);
    if (st.kind === 'board') out.add(st.atSid);
    if (st.kind === 'ride') { const pd = PD[st.pi]; for (let k = st.k1; k <= st.k2; k++) out.add(pd.ids[k]); }
  }
  return out;
}
function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern || [180, 80, 180]); } catch (e) {} }
function tripTick() {
  const tr = ROUTE.trip; if (!tr) return;
  const steps = tr.steps, now = secOfDay(), p = myPosition(), tracking = Loc.mode !== 'off' && !!Loc.last;
  const m = Loc.status === 'vehicle' ? Loc.match : null;
  let cur = tr.cur; tr.live = null; tr.off = null;
  if (tracking) {
    if (m && m.pd) {
      const i = steps.findIndex((x, j) => j >= tr.cur && (x.kind === 'ride' || x.kind === 'exit') && x.line === m.line && x.dir === m.to);
      if (i >= 0) { cur = i; tr.live = { pd: m.pd, next: m.next, eta: m.eta, atStop: m.atStop }; }
      else tr.off = m;
    } else if (p) {
      let x = steps[cur];
      if (x && (x.kind === 'ride' || x.kind === 'exit') && metres(p, stLL(x.toSid)) < 230) { cur++; x = steps[cur]; }
      if (x && x.kind === 'walk' && metres(p, stLL(x.toSid)) < 120) { cur++; x = steps[cur]; }
      const iB = steps.findIndex((y, j) => j >= cur && y.kind === 'board');
      if (iB > cur && metres(p, stLL(steps[iB].atSid)) < 150 && steps.slice(cur, iB).every(y => y.kind === 'walk')) cur = iB;
      if (steps[cur] && steps[cur].kind === 'arrive') {}
      else if (metres(p, stLL(tr.dest)) < 150 && Loc.status !== 'vehicle') cur = steps.length - 1;
    }
  } else {
    const i = steps.findIndex((y, j) => j >= tr.cur && y.end > now);
    cur = i < 0 ? steps.length - 1 : i;
    const y = steps[cur];
    if (y && y.kind === 'ride' && !y.onboard) { const pd = PD[y.pi], e = pd.dep[y.k1] + (now - y.start); if (e >= pd.dep[y.k1]) { const q = posAt(pd, e); tr.live = { pd, next: q.next, eta: Math.max(0, pd.arr[q.next] - e), atStop: q.atStop, est: true }; } }
  }
  tr.cur = Math.min(Math.max(tr.cur, cur), steps.length - 1);
  const st = steps[tr.cur];
  if (st.kind === 'board' && (st.depNext || st.dep) < now - 25 && !(m && m.line === st.line)) { const nd = nextDeparture(PD[st.pi], st.k1, now + 20); if (nd != null) st.depNext = nd; }
  const v = stepView(st, tr.live, false);
  const key = tr.cur + (v.act ? ':act' : '');
  if (tr.lastKey !== key) { if (tr.lastKey != null) buzz(v.act ? [250, 100, 250, 100, 250] : [150]); tr.lastKey = key; }
  // new problems on the rest of the way
  const rem = remainingSids(tr);
  tr.newZone = null;
  for (const z of alertZones(Date.now(), true)) {
    if (tr.known.has(z.id) || tr.dismissed.has(z.id)) continue;
    for (const sid of rem) { const s2 = ST[sid]; if (s2 && metres([s2.lng, s2.lat], [z.lng, z.lat]) <= z.r) { tr.newZone = z; break; } }
    if (tr.newZone) break;
  }
  if (st.kind === 'arrive' && now - st.start > 120) { endTrip('Du bist angekommen. Die Karte zeigt wieder alle Linien.'); return; }
  renderTrip(v);
}
function renderTrip(v) {
  const tr = ROUTE.trip; if (!tr) return;
  const st = tr.steps[tr.cur]; v = v || stepView(st, tr.live, false);
  setHTML($('#tripDest'), `Nach <b style="color:var(--ink)">${esc(stName(tr.dest))}</b>, Ankunft ${absClock(tr.r.arrive)}`);
  let banner = '';
  if (tr.off) banner = `<div class="tbanner"><span>Du bist in der <b>${esc(tr.off.line)}</b> Richtung ${esc(tr.off.to)}, die nicht zu dieser Route gehört.</span><div class="btns" style="margin:0"><button class="btn primary" type="button" data-act="replan">Von hier neu planen</button></div></div>`;
  else if (tr.newZone) banner = `<div class="tbanner"><span>Neu auf deinem Weg: <b>${esc(tr.newZone.title)}</b>${tr.newZone.sid ? ` an ${esc(stName(tr.newZone.sid))}` : ''}.</span><div class="btns" style="margin:0"><button class="btn primary" type="button" data-act="replan">Sicherere Route zeigen</button><button class="btn" type="button" data-act="dismisszone" data-z="${esc(tr.newZone.id)}">Route behalten</button></div></div>`;
  setHTML($('#tripBanner'), banner);
  setHTML($('#tripNow'), `<div class="now ${v.act ? 'act' : ''}"><span class="ic">${v.icon}</span><span class="ins">${v.ins}</span><span class="sub">${v.sub}</span></div>${st.kind === 'arrive' ? '<div class="btns" style="margin:4px 0 8px"><button class="btn primary" type="button" data-act="endtrip">Fahrt beenden</button></div>' : ''}`);
  const nx = tr.steps[tr.cur + 1];
  setHTML($('#tripNext'), nx ? `<div class="tnext"><span>Dann ${stepView(nx, null, true).short || stepView(nx, null, true).ins}</span></div>` : '');
  setHTML($('#tripSteps'), tr.steps.map((x, i) => { const w = stepView(x, null, true); return `<div class="ts ${i < tr.cur ? 'done' : i === tr.cur ? 'cur' : ''}">${x.kind === 'walk' || x.kind === 'arrive' ? `<span class="walkbadge">${x.kind === 'walk' ? ICON.walk : ICON.pin.replace('<svg', '<svg width="18" height="18"')}</span>` : badge(x.line, 'xs')}<span>${w.ins}</span><span class="tm">${w.time || ''}</span></div>`; }).join(''));
  setCardH();
}
function replanTrip() {
  const tr = ROUTE.trip; if (!tr) return;
  const origin = onboardOrigin() || (myPosition() ? { lng: myPosition()[0], lat: myPosition()[1] } : (() => { const st = tr.steps[tr.cur]; const sid = st.atSid || st.toSid; return { sid }; })());
  const r = findRoute(origin, tr.dest, routingContext('safe', secOfDay()));
  if (!r) { toast('Gerade keine andere Verbindung gefunden.'); return; }
  const old = tr.r.arrive;
  startTrip(r, tr.dest, 'safe');
  const d = Math.round((r.arrive - old) / 60);
  toast(`Route aktualisiert${d > 0 ? `, ${d} Min später` : d < 0 ? `, ${-d} Min früher` : ''}.`);
}

// ---------- report
let REP = { size: null, intensity: null };
function renderReport() {
  const b = $('#reportBody'), p = myPosition(), near = nearestStation(p || map.getCenter().toArray(), 300);
  const where = p ? (near ? `An ${near.name}` : 'An deinem Standort') : (near ? `Bei ${near.name} (Kartenmitte)` : 'In der Kartenmitte');
  b.innerHTML = `
    <div class="group"><h3>Wie groß ist die Gruppe?</h3><div class="bigchoices">${[['small', 'Klein', '5–10'], ['medium', 'Mittel', '10–25'], ['large', 'Groß', '25+']].map(([k, l, s]) => `<button type="button" data-rsize="${k}" aria-pressed="${REP.size === k}">${l}<small>${s}</small></button>`).join('')}</div></div>
    <div class="group"><h3>Wie verhalten sie sich?</h3><div class="bigchoices">${[['loud', 'Laut'], ['aggressive', 'Aggressiv'], ['harassing', 'Belästigend']].map(([k, l]) => `<button type="button" data-rint="${k}" aria-pressed="${REP.intensity === k}">${l}</button>`).join('')}</div></div>
    <div class="group"><div class="flag">${ICON.pin.replace('<svg', '<svg width="18" height="18"')}<span>${esc(where)}</span></div>
      <button class="btn primary block" type="button" data-rsend ${REP.size && REP.intensity ? '' : 'disabled style="opacity:.5"'}>Meldung senden</button></div>
    <p class="note">Anonym, nach 45 Minuten gelöscht. Deine Meldung geht an die Leitstelle und an alle anderen SafeRide-Handys, und sichere Routen meiden die Stelle.</p>`;
}
function sendReport() {
  const p = myPosition() || map.getCenter().toArray(), near = nearestStation(p, 300);
  const sev = REP.intensity === 'harassing' || (REP.intensity === 'aggressive' && REP.size !== 'small') ? 3 : REP.intensity === 'aggressive' || REP.size === 'large' ? 2 : 1;
  const sizeTxt = { small: 'Kleine Gruppe', medium: 'Mittlere Gruppe', large: 'Große Gruppe' }[REP.size];
  const intTxt = { loud: 'laut', aggressive: 'aggressiv', harassing: 'belästigend' }[REP.intensity];
  const r = { id: 'me-' + Date.now(), kind: 'report', sev, size: REP.size, intensity: REP.intensity, title: `${sizeTxt}, ${intTxt}`, body: near ? `Von dir gemeldet bei ${near.name}.` : 'Von dir gemeldet.', at: p, r: 250,
              from: Date.now(), to: Date.now() + 45 * 60000, source: 'Deine Meldung', mine: true };
  MYREPORTS.push(r); saveJSON(KEY_R, MYREPORTS); ALERTS.push(r); share(r); REP = { size: null, intensity: null };
  closeSheet(); refreshAlertsEverywhere(); toast('Meldung gesendet. Sichere Routen meiden die Stelle 45 Minuten lang.');
}

// ---------- sharing (window events, bridged to the Way Out channel by src/saferide/main.tsx)
function share(a) {
  dispatchEvent(new CustomEvent('sr:report', { detail: { id: a.id, lat: a.at[1], lng: a.at[0], size: a.size || null, intensity: a.intensity || null,
    panic: !!a.pin, title: a.title, from: a.from, to: a.to } }));
}
addEventListener('sr:crowds', e => {
  const mine = new Set(MYREPORTS.map(r => r.id)), now = Date.now();
  SHARED = e.detail.filter(c => !mine.has(c.id)).map(c => ({ id: 'shared-' + (c.id || `${c.lat},${c.lng}`), kind: 'report', sev: c.kind === 'unsafe' ? 3 : 2,
    title: c.label, body: c.id ? 'Von einem anderen Fahrgast gemeldet.' : 'Way-Out-Meldung aus der Leitstelle.', at: [c.lng, c.lat], r: 250,
    from: c.from ?? now, to: c.to ?? now + 45 * 60000, source: 'Leitstelle', shared: true }));
  ALERTS = [...ALERTS.filter(a => !a.shared), ...SHARED];
  if (map) refreshAlertsEverywhere(); // before boot: loadMonitoring picks SHARED up
});

// ---------- panic
// Notfall = Way Out overlay (src/saferide/main.tsx): pin here, control room + options there. This sheet is the escape route.
function startEmergency() {
  closeSheet(); closeCard(); dropPin();
  dispatchEvent(new CustomEvent('sr:emergency', { detail: { pin: !!myPosition() } }));
}
addEventListener('sr:escape', () => openSheet('panic'));
addEventListener('sr:unpin', () => undoPin());
// The control-room scenario train (Way Out): one marker with the line badge; the map flies there when the scenario starts.
let trainMarker = null, mapReady = false, pendingTrain;
function placeTrain(t) {
  if (!t) { if (trainMarker) { trainMarker.remove(); trainMarker = null; } return; }
  if (!trainMarker) { const el = document.createElement('div'); el.className = 'sr-train'; trainMarker = new maplibregl.Marker({ element: el }).setLngLat([t.lng, t.lat]).addTo(map); }
  trainMarker.getElement().innerHTML = badge(t.line, 'lg'); trainMarker.setLngLat([t.lng, t.lat]);
  if (t.fly) map.flyTo({ center: [t.lng, t.lat], zoom: 14, duration: reduced() ? 0 : 900 });
}
// before the map has loaded, keep the latest train (and its fly-to) for the load handler
addEventListener('sr:train', e => { if (mapReady) placeTrain(e.detail); else pendingTrain = e.detail; });
let panicCache = { key: null, html: '' }, PANIC_ALT = null, pinUndo = null;
function dropPin() {
  const p = myPosition(); if (!p) return;
  if (ALERTS.some(a => a.pin && activeNow(a) && metres(a.at, p) < 200)) return;
  const a = { id: 'pin-' + Date.now(), kind: 'report', sev: 3, title: 'Dein Notfall-Pin', body: 'Gesetzt, als du den Notfall-Modus geöffnet hast. Geht an die Leitstelle.', at: p, r: 220,
              from: Date.now(), to: Date.now() + 15 * 60000, source: 'Dein Notfall-Pin', mine: true, pin: true };
  ALERTS.push(a); MYREPORTS.push(a); saveJSON(KEY_R, MYREPORTS); share(a); pinUndo = { id: a.id, until: Date.now() + 8000 }; panicCache.key = null;
  refreshAlertsEverywhere();
}
function undoPin() {
  if (!pinUndo) return; const id = pinUndo.id; pinUndo = null;
  const gone = MYREPORTS.find(a => a.id === id); if (gone) share({ ...gone, to: Date.now() });
  ALERTS = ALERTS.filter(a => a.id !== id); MYREPORTS = MYREPORTS.filter(a => a.id !== id); saveJSON(KEY_R, MYREPORTS); panicCache.key = null;
  refreshAlertsEverywhere(); renderPanic(); toast('Notfall-Pin entfernt.');
}
function panicAltRoute() {
  const tr = ROUTE.trip; if (!tr) return null;
  const m = Loc.status === 'vehicle' ? Loc.match : null;
  let origin, exclude = new Set();
  if (m && m.pd) { origin = { onboard: { pi: m.pd.i, k: Math.max(1, m.next), eta: Math.max(20, m.eta || 0), line: m.line } }; exclude.add(m.line); }
  else {
    const st = tr.steps[tr.cur];
    if (!Loc.last && st && st.kind === 'ride' && tr.live && tr.live.pd) { origin = { onboard: { pi: tr.live.pd.i, k: Math.max(1, tr.live.next), eta: Math.max(20, tr.live.eta), line: st.line } }; exclude.add(st.line); }
    else {
      const pos = myPosition(); const sid = st && (st.atSid || st.toSid);
      origin = pos ? { lng: pos[0], lat: pos[1] } : (sid ? { sid } : { lng: DEMO_POS[0], lat: DEMO_POS[1] });
      const nb = tr.steps.slice(tr.cur).find(x => x.kind === 'board'); if (nb) exclude.add(nb.line);
    }
  }
  let r = findRoute(origin, tr.dest, routingContext('safe', secOfDay(), { exclude }));
  if (!r && exclude.size) r = findRoute(origin, tr.dest, routingContext('safe', secOfDay()));
  return r;
}
function renderPanic() {
  const b = $('#panicBody'), m = Loc.match;
  if (!b.querySelector('#pnEscape')) b.innerHTML = `<a class="call" href="tel:110"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>110 anrufen</a>
    <button class="btn primary block" type="button" data-act="emergency" style="margin:10px 0">Zurück zum Notfall</button>
    <div id="pnPin"></div><div id="pnEscape"></div><p class="note">Bist du gerade in Gefahr, ruf die Polizei unter 110 an.</p>`;
  setHTML($('#pnPin'), pinUndo && pinUndo.until > Date.now() ? `<div class="banner" style="align-items:center">${ICON.pin.replace('<svg', '<svg width="18" height="18"')}<span style="margin-right:auto">Notfall-Pin für 15 Minuten hier gesetzt.</span><button class="txtbtn" type="button" data-act="unpin">Rückgängig</button></div>` : '');
  let html;
  const tr = ROUTE.trip;
  if (tr) {
    const key = ['trip', tr.dest, tr.cur, m && m.line, m && m.next, Loc.status, ALERTS.length, Math.floor(Date.now() / 30000)].join('|');
    if (panicCache.key !== key) {
      const r = panicAltRoute(); PANIC_ALT = r;
      let h;
      if (!r) h = `<div class="escape"><div class="big" style="font-size:20px">Gerade keine andere Verbindung nach ${esc(stName(tr.dest))}</div><div class="why">Geh dorthin, wo Menschen und Licht sind, und ruf 110 an, wenn du dich bedroht fühlst.</div></div>`;
      else {
        const steps = tripSteps(r, tr.dest), first = steps[0], ride = steps.find(x => x.kind === 'board');
        const v1 = stepView(first, null, true);
        // when the escape starts by boarding, the second line says where to get off instead of repeating the boarding
        const after = first === ride ? steps.slice(1).find(x => x.kind === 'board' || x.kind === 'ride') : ride;
        const head = first.kind === 'exit' ? `Steig aus an ${esc(stName(first.toSid))}` : first.kind === 'walk' ? `Zu Fuß nach ${esc(stName(first.toSid))}` : first.kind === 'ride' && first.onboard ? `Bleib sitzen bis ${esc(stName(first.toSid))}`
          : first === ride ? `Nimm ${badge(ride.line, 'sm')} Richtung ${esc(ride.dir)} um ${absClock(ride.dep)}` : v1.ins;
        const z = routeZones(r);
        const zz = z.zones.filter(q => !String(q.id).startsWith('pin-'));
        const why = zz.length ? `Fährt ohne Halt an ${zz.slice(0, 2).map(q => `„${q.title}“`).join(' und ')} vorbei` : 'Keine weiteren Meldungen auf dem Weg';
        const late = r.arrive - tr.r.arrive;
        h = `<div class="escape"><div class="why" style="margin:0">Sicherer Weg nach ${esc(stName(tr.dest))}</div>
          <div class="big">${head}${first.kind === 'exit' && m && m.eta > 30 ? ` <span style="font-weight:600;font-size:18px">in etwa ${Math.max(1, mins(m.eta))} Min</span>` : ''}</div>
          ${after ? `<div class="big" style="font-size:20px;margin-top:8px">${after.kind === 'board' ? `Dann ${badge(after.line, 'sm')} Richtung ${esc(after.dir)} um ${absClock(after.dep)}` : `Steig aus an ${esc(stName(after.toSid))}`}</div>` : ''}
          <div class="legs" style="margin-top:10px">${legSummary(r)}</div>
          <div class="why">${esc(why)}. Ankunft ${absClock(r.arrive)}${late > 60 ? `, ${mins(late)} Min später als geplant` : ''}.</div>
          <div class="btns"><button class="btn primary" type="button" data-act="usealt">Diese Route nehmen</button></div></div>`;
      }
      panicCache = { key, html: h };
    }
    html = panicCache.html;
  } else if (Loc.status === 'vehicle' && m) {
    const exit = m.pd.ids[m.next], key = [m.line, m.to, exit, P.home, ALERTS.length, Math.floor(Date.now() / 30000)].join('|');
    let plan = '';
    if (panicCache.key === key) plan = panicCache.html;
    else {
      if (P.home && ST[P.home] && exit !== P.home) {
        const r = findRoute({ sid: exit }, P.home, routingContext('safe', secOfDay() + m.eta, { exclude: new Set([m.line]) }));
        const first = r && r.legs.find(l => l.type === 'ride');
        if (first) {
          const z = routeZones(r), wait = Math.max(0, mins(first.dep - secOfDay() - m.eta));
          const why = z.zones.length ? `Fährt ohne Halt an ${z.zones.slice(0, 2).map(q => `„${q.title}“`).join(' und ')} vorbei` : 'Keine Meldungen auf dem Weg';
          plan = `<div class="big" style="font-size:20px;margin-top:8px">Dann ${badge(first.line, 'sm')} Richtung ${esc(first.to)} um ${clock(Date.now() + (first.dep - secOfDay()) * 1000)}</div>
            <div class="why">${esc(why)}, ${wait <= 1 ? 'fast keine Wartezeit' : `${wait} Min Wartezeit`}. Zuhause gegen ${clock(Date.now() + (r.arrive - secOfDay()) * 1000)}.</div>`;
        }
      } else if (!P.home) plan = `<div class="why">Leg im Profil deine Heimhaltestelle fest oder starte eine Fahrt, dann sagt dir SafeRide auch, was du danach nimmst.</div>`;
      panicCache = { key, html: plan };
    }
    html = `<div class="escape"><div class="why" style="margin:0">Du bist in der ${esc(m.line)} Richtung ${esc(m.to)}</div>
      <div class="big">Steig aus an ${esc(m.pd.names[m.next])}${m.eta > 30 ? ` <span style="font-weight:600;font-size:18px">in etwa ${Math.max(1, mins(m.eta))} Min</span>` : ''}</div>${plan}</div>`;
  } else if (Loc.mode !== 'off') {
    const near = nearestStation(myPosition(), 400);
    html = `<div class="escape"><div class="big" style="font-size:20px">${near ? `Du bist bei ${esc(near.name)}` : 'Du bist gerade in keinem Fahrzeug'}</div><div class="why">Geh dorthin, wo Menschen und Licht sind. Plan eine sichere Route im Tab Route.</div></div>`;
  } else {
    html = `<div class="escape"><div class="big" style="font-size:20px">Schalte den Standort ein, um eine Fluchtroute zu bekommen</div><div class="why">SafeRide muss wissen, in welchem Zug du bist, um dir zu sagen, wo du aussteigst.</div>
      <div class="btns"><button class="btn primary" type="button" data-loc="start">Standort einschalten</button><button class="btn" type="button" data-loc="demo">Demo-Fahrt</button></div></div>`;
  }
  setHTML($('#pnEscape'), html);
}

// ---------- profile
function stationPills(list, kind) {
  return `<div class="pills">${list.filter(id => ST[id]).map(id => `<span class="pill"><span class="mk" style="background:${kind === 'avoided' ? 'var(--danger)' : 'var(--ok)'}"></span>${esc(ST[id].name)}<button type="button" data-premove="${kind}|${esc(id)}" aria-label="${esc(ST[id].name)} entfernen">${ICON.close.replace('<svg', '<svg width="16" height="16"')}</button></span>`).join('')}
    <button class="pill add" type="button" data-padd="${kind}">+ Haltestelle hinzufügen</button></div>`;
}
function renderProfile() {
  const b = $('#profileBody'); if (!b) return;
  const srcRow = (name, st, sub) => `<div class="srcrow"><b>${name}</b><span class="state ${st === 'live' ? 'live' : ''}">${st === 'live' ? 'Live' : st === 'loading' ? 'Lädt' : st === 'na' ? 'Nur gehostet' : st === 'line' ? 'Ersatz' : st === 'off' ? 'Nicht verfügbar' : 'Demo-Daten'}</span><small>${sub}</small></div>`;
  b.innerHTML = `
    <div class="group"><h3>Zuhause</h3>
      <button class="field" type="button" data-phome>${ICON.pin}<span><span class="lbl">Heimhaltestelle</span><span class="val ${P.home ? '' : 'empty'}">${P.home && ST[P.home] ? esc(ST[P.home].name) : 'Heimhaltestelle wählen'}</span></span></button>
      <p>Für „Zuhause“ in Route, Hinweise auf deinem Heimweg und die Fluchtroute im Notfall-Modus.</p></div>
    <div class="group"><h3>Bevorzugte Haltestellen</h3>${stationPills(P.preferred, 'preferred')}<p>Sichere Routen steigen hier um, wenn es geht. Auf der Karte mit grünem Ring.</p></div>
    <div class="group"><h3>Gemiedene Haltestellen</h3>${stationPills(P.avoided, 'avoided')}<p>Sichere Routen fahren drumherum, wenn es eine andere Verbindung gibt. Mit rotem Ring.</p></div>
    <div class="group"><h3>Routen</h3>
      <div class="seg wide" role="group" aria-label="Standardroute"><button type="button" data-pdef="safe" aria-pressed="${P.routeDefault === 'safe'}">Sicherste zuerst</button><button type="button" data-pdef="fast" aria-pressed="${P.routeDefault === 'fast'}">Schnellste zuerst</button></div>
      <p>Extrazeit, die du für eine sicherere Route in Kauf nimmst</p>
      <div class="seg wide" role="group" aria-label="Extrazeit">${[5, 10, 15, 20].map(n => `<button type="button" data-pextra="${n}" aria-pressed="${P.maxExtra === n}">+${n} Min</button>`).join('')}</div>
      <div>${[['report', 'Meldungen'], ['disruption', 'Störungen'], ['construction', 'Baustellen'], ['news', 'News und Veranstaltungen']].map(([k, l]) => `<div class="toggle"><label for="ps-${k}">${l} meiden</label><input class="switch" type="checkbox" id="ps-${k}" data-psrc="${k}" ${P.sources[k] ? 'checked' : ''}></div>`).join('')}</div></div>
    <div class="group"><h3>Standort</h3>
      <div><div class="toggle"><label for="pTrack">Standort verfolgen, solange die App offen ist<small>Erkennt deine U-Bahn, Tram oder deinen Bus. Dein Verlauf bleibt auf diesem Handy.</small></label><input class="switch" type="checkbox" id="pTrack" ${Loc.mode === 'gps' || (P.tracking && Loc.mode !== 'demo') ? 'checked' : ''}></div></div>
      <button class="btn block" type="button" data-loc="demo">Demo-Fahrt mit der U3 starten</button></div>
    <div class="group"><h3>Kartenstil</h3>
      <div class="seg wide" role="group" aria-label="Kartenstil">${[['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button type="button" data-style="${k}" aria-pressed="${P.style === k}">${l}</button>`).join('')}</div>
      <p>Auto wechselt von 20:00 bis 06:00 auf dunkel.</p></div>
    <div class="group"><h3>Datenquellen</h3>
      <div>${srcRow('MVG-Störungen und Baustellen', SOURCES.mvg, 'MVG-Meldungs-API, alle 2 Minuten')}${srcRow('News und Veranstaltungen', SOURCES.news, 'RSS-Feeds über deinen Daten-Proxy')}${srcRow('Wetter', SOURCES.weather, 'Open-Meteo, ohne Schlüssel')}${srcRow('Stadtplan', SOURCES.streets === 'live' ? 'live' : PREVIEW ? 'na' : SOURCES.streets === 'off' ? 'off' : 'loading', SOURCES.streets === 'live' ? 'Esri-Karte hell und dunkel mit Straßennamen' : PREVIEW ? 'Braucht eine eigene Adresse; die claude.ai-Vorschau lädt keine Kartenkacheln' : 'Esri-Kartenkacheln haben nicht geladen; prüf die Verbindung')}${srcRow('Fußwege', SOURCES.walk === 'off' ? 'line' : (SOURCES.walk === 'live' || !PREVIEW) ? 'live' : 'na', 'OpenStreetMap-Fußrouting (FOSSGIS); sonst gerade Linie')}
        ${srcRow('Meldungen', 'live', 'Über die Leitstelle mit allen SafeRide-Handys geteilt')}</div>
      <div class="toggle"><label for="pDemo">Demo-Beispiele zeigen<small>Beispielmeldungen und -hinweise, markiert mit „Demo-Daten“, wo noch keine Live-Daten angebunden sind. Für echte Tests ausschalten.</small></label><input class="switch" type="checkbox" id="pDemo" ${P.demo ? 'checked' : ''}></div>
      <details class="dd"><summary>Für Entwickler<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary>
        <div class="inner"><label for="proxyUrl" class="note">Daten-Proxy-URL (Supabase-Edge-Function „monitor“)</label><input class="textin" id="proxyUrl" type="url" placeholder="https://…supabase.co/functions/v1/monitor" value="${esc(P.proxyUrl)}">
        <button class="btn" type="button" data-psaveproxy>Speichern und Daten neu laden</button></div></details></div>
    <div class="group"><h3>Über diese Karte</h3><p>Netzreihenfolge aus Wikipedia via Map::Tube::Muenchen, Haltepositionen aus der Haltestellenliste der Deutschen Bahn, Linienänderungen 2026 aus dem MVV-Fahrplanfeed (CC BY 4.0). Stadtgrenze © OpenStreetMap-Mitwirkende. Fahrzeuge sind simuliert, bis Live-Positionen angebunden sind.</p></div>`;
}

// ---------- filters UI
const GROUPS = [
  { key: 'UBAHN', label: 'U-Bahn', pick: L => L.mode === 'UBAHN' }, { key: 'SBAHN', label: 'S-Bahn', pick: L => L.mode === 'SBAHN' },
  { key: 'TRAM', label: 'Tram', pick: L => L.mode === 'TRAM' && !L.night }, { key: 'NIGHT', label: 'Nachttram', pick: L => L.mode === 'TRAM' && L.night },
  { key: 'METROBUS', label: 'MetroBus', pick: L => L.mode === 'METROBUS' },
];
function buildFilterUI() {
  $('#modeGrid').innerHTML = MODES.map(m => { const has = LINES.some(L => L.mode === m), [g, c] = MODE_GLYPH[m];
    return `<button class="chip" type="button" data-mode="${m}" aria-pressed="${F.modes[m] && has}" ${has ? '' : 'disabled'}><span class="glyph" style="background:${c}">${g}</span>${MODE_LABEL[m]}</button>`; }).join('');
  $('#groups').innerHTML = GROUPS.map(G => { const ls = LINES.filter(G.pick);
    return `<details class="dd"><summary>${G.label}<span class="count" data-count="${G.key}"></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary>
      <div class="inner">${ls.length ? `<div class="row"><button type="button" data-all="${G.key}">Alle wählen</button><button type="button" data-none="${G.key}">Keine</button></div>
      <div class="badges">${ls.map(L => `<button class="linebtn" type="button" data-line="${esc(L.line)}" aria-pressed="false" aria-label="${MODE_LABEL[L.mode]} ${esc(L.line)}">${badge(L.line)}</button>`).join('')}</div>`
      : `<p class="note">Noch keine ${G.label}-Linien in diesen Daten.</p>`}</div></details>`; }).join('');
}
const TRAM_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 3h6M12 3v3M8 21l2-3M16 21l-2-3M6 12h12"/></svg>';
function renderModeRail() {
  const el = $('#modeRail'); if (!el) return;
  setHTML(el, MODES.filter(m => LINES.some(L => L.mode === m)).map(m => { const [g, c] = MODE_GLYPH[m], on = !!F.modes[m];
    return `<button type="button" data-railmode="${m}" aria-pressed="${on}" aria-label="${MODE_LABEL[m]}: ${on ? 'sichtbar, tippen zum Ausblenden' : 'ausgeblendet, tippen zum Einblenden'}" title="${MODE_LABEL[m]}"><span class="g ${m}" style="--c:${c}">${m === 'TRAM' ? TRAM_SVG : g}</span></button>`; }).join(''));
}
function syncFilterUI() {
  renderModeRail();
  const vis = visibleSet(), base = baseSet();
  $$('#viewSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === F.view)));
  $('#viewNote').textContent = F.view === 'all' ? 'Jede Linie in den Daten, auch Nachttrams.' : F.view === 'custom' ? `Du hast ${F.custom.length} Linie${F.custom.length === 1 ? '' : 'n'} gewählt. Wähle Basis oder Alle Linien, um zurückzugehen.` : 'U-Bahn, S-Bahn, MetroBus und die meistgenutzten Trams: 16, 17, 18, 19, 20, 21, 25 und 27.';
  $$('.chip[data-mode]').forEach(c => { if (!c.disabled) c.setAttribute('aria-pressed', String(!!F.modes[c.dataset.mode])); });
  $$('.linebtn').forEach(b => b.setAttribute('aria-pressed', String(base.has(b.dataset.line))));
  for (const G of GROUPS) { const el = $(`[data-count="${G.key}"]`); if (!el) continue; const ls = LINES.filter(G.pick); el.textContent = ls.length ? `${ls.filter(L => vis.has(L.line)).length} von ${ls.length} sichtbar` : 'Noch keine Daten'; }
  $('#tStations').checked = F.stations; $('#tVehicles').checked = F.vehicles; $('#tZones').checked = F.zones;
  $('#btnFilters').classList.toggle('has-dot', F.view !== 'basic' || MODES.some(m => !F.modes[m] && LINES.some(L => L.mode === m)) || !F.stations || !F.vehicles || !F.zones);
}
function renderSearch(q) {
  const box = $('#searchResults'); q = q.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) { box.innerHTML = ''; return; }
  const hits = LINES.filter(L => L.line.toLowerCase().includes(q) || L.termini.toLowerCase().replace(/\s+/g, '').includes(q)).slice(0, 8);
  box.innerHTML = hits.length ? hits.map(L => `<button class="result" type="button" data-result="${esc(L.line)}">${badge(L.line)}<span class="t">${esc(L.termini)}</span></button>`).join('') : `<p class="note">Keine Linie passt zu „${esc(q)}“. Probier eine Nummer wie 19 oder einen Namen wie U6.</p>`;
}
function toggleLine(l) {
  if (F.view !== 'custom') { F.custom = [...baseSet()]; F.view = 'custom'; }
  const s = new Set(F.custom); s.has(l) ? s.delete(l) : s.add(l); F.custom = [...s];
  if (LINE[l] && s.has(l)) F.modes[LINE[l].mode] = true; applyFilters();
}
function fitLine(l) { const L = LINE[l]; if (!L) return; map.fitBounds([[L.bbox[0], L.bbox[1]], [L.bbox[2], L.bbox[3]]], { padding: { top: 140, bottom: 260, left: 40, right: 40 }, maxZoom: 14.5, duration: reduced() ? 0 : 900 }); }
function togglePref(kind, sid) {
  const other = kind === 'preferred' ? 'avoided' : 'preferred';
  if (P[kind].includes(sid)) P[kind] = P[kind].filter(x => x !== sid); else { P[kind].push(sid); P[other] = P[other].filter(x => x !== sid); }
  saveP(); applyFilters();
  if (ROUTE.to) computeRoutes();
}

// =================================================================== events
function bindUI() {
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    const d = t.dataset;
    if (t.hasAttribute('data-hdpanic')) { closePicker(); startEmergency(); return; }
    if (d.view) { F.view = d.view; closeCard(); applyFilters(); return; }
    if (t.matches('.chip[data-mode]')) { F.modes[d.mode] = !F.modes[d.mode]; applyFilters(); return; }
    if (d.railmode) { const m = d.railmode; F.modes[m] = !F.modes[m]; applyFilters(); toast(`${MODE_LABEL[m]} auf der Karte ${F.modes[m] ? 'eingeblendet' : 'ausgeblendet'}.`, 1800); return; }
    if (t.matches('.linebtn')) { toggleLine(d.line); return; }
    if (d.all || d.none) { const G = GROUPS.find(g => g.key === (d.all || d.none)); if (F.view !== 'custom') { F.custom = [...baseSet()]; F.view = 'custom'; }
      const ls = LINES.filter(G.pick).map(L => L.line);
      F.custom = d.all ? [...new Set([...F.custom, ...ls])] : F.custom.filter(l => !ls.includes(l)); if (d.all) LINES.filter(G.pick).forEach(L => F.modes[L.mode] = true); applyFilters(); return; }
    if (d.result) { closeSheet(); lineCard(d.result); fitLine(d.result); return; }
    if (t.hasAttribute('data-close')) { closeSheet(); return; }
    if (t.hasAttribute('data-pickclose')) { closePicker(); return; }
    if (t.hasAttribute('data-cardclose')) { if (selected && selected.type === 'route' && !ROUTE.trip) drawRoute(null); closeCard(); return; }
    if (d.tab) { if (d.tab === 'map') { closeSheet(); closeCard(); } else openSheet(d.tab); return; }
    if (d.pick) { const cb = pickCb; closePicker(); if (cb) cb(d.pick); return; }
    // cards
    if (d.act === 'solo') { F.view = 'custom'; F.custom = [d.line]; F.modes[LINE[d.line].mode] = true; applyFilters(); lineCard(d.line); fitLine(d.line); return; }
    if (d.act === 'showbasic') { F.view = 'basic'; closeCard(); applyFilters(); return; }
    if (d.act === 'fit') { fitLine(d.line); return; }
    if (d.act === 'routeto') { ROUTE.to = d.sid; ROUTE.from = null; computeRoutes(); openSheet('route'); return; }
    if (d.act === 'pref' || d.act === 'avoid') { togglePref(d.act === 'pref' ? 'preferred' : 'avoided', d.sid); stationCard(d.sid); toast(P.avoided.includes(d.sid) ? `${stName(d.sid)} wird in sicheren Routen gemieden.` : P.preferred.includes(d.sid) ? `${stName(d.sid)} ist jetzt bevorzugt.` : `${stName(d.sid)} aus deinen Vorlieben entfernt.`); return; }
    if (d.act === 'trip') { const R = ROUTE.results; startTrip(d.k === 'fast' ? R.fast : R.safe, ROUTE.to, d.k === 'fast' && !R.same ? 'fast' : 'safe'); if (Loc.mode === 'off') toast('Fahrt gestartet. Schalte den Standort ein, damit die Schritte mitlaufen.', 3500); return; }
    if (d.act === 'routeopts') { openSheet('route'); return; }
    if (d.act === 'endtrip') { closeSheet(); endTrip('Fahrt beendet. Die Karte zeigt wieder alle Linien.'); return; }
    if (d.act === 'replan') { replanTrip(); return; }
    if (d.act === 'dismisszone') { if (ROUTE.trip) { ROUTE.trip.dismissed.add(d.z); tripTick(); } return; }
    if (d.act === 'usealt') { if (PANIC_ALT && ROUTE.trip) { const dest = ROUTE.trip.dest; startTrip(PANIC_ALT, dest, 'safe'); panicCache.key = null; toast('Auf die sicherere Route gewechselt.'); } return; }
    if (d.act === 'unpin') { undoPin(); return; }
    if (d.act === 'emergency') { closeSheet(); return; } // closeSheet reopens the overlay
    if (d.act === 'focustoggle') { if (ROUTE.trip) { ROUTE.trip.focus = !ROUTE.trip.focus; applyFilters(); renderCond(); } return; }
    // route sheet
    if (d.rfield) { openPicker(d.rfield === 'from' ? 'Start' : 'Wohin?', sid => { if (sid === '__me') ROUTE.from = null; else if (d.rfield === 'from') ROUTE.from = { sid }; else ROUTE.to = sid; computeRoutes(); renderRouteSheet(); },
      { quick: d.rfield === 'from' ? [{ id: '__me', label: 'Mein Standort', sub: myPosition() ? 'Live-Standort' : 'Demo-Standort am Odeonsplatz', icon: ICON.dot }] : (P.home && ST[P.home] ? [{ id: P.home, label: 'Zuhause', sub: ST[P.home].name }] : []) }); return; }
    if (t.hasAttribute('data-rswap')) { const from = ROUTE.from && ROUTE.from.sid ? ROUTE.from.sid : nearestStation(myPosition() || DEMO_POS, 1500)?.id; if (!from) return; ROUTE.from = { sid: ROUTE.to }; ROUTE.to = from; computeRoutes(); renderRouteSheet(); return; }
    if (d.rquick) { ROUTE.to = d.rquick; computeRoutes(); renderRouteSheet(); return; }
    if (d.rmode) { ROUTE.mode = d.rmode; renderRouteSheet(); return; }
    if (d.ropt) { closeSheet(); routeCard(d.ropt); return; }
    // alerts
    if (d.afilter) { alertFilter = d.afilter; renderAlerts(); return; }
    if (d.alert) { const a = ALERTS.find(x => x.id === d.alert); closeSheet(); if (!a) return;
      const z = alertZones().filter(q => q.id === a.id); const cl = closures().filter(c => c.alert === a.id);
      if (z.length) map.flyTo({ center: [z[0].lng, z[0].lat], zoom: 14, duration: reduced() ? 0 : 900 });
      else if (cl.length) { const pd = PD[cl[0].pi]; const p = posAlong(pd, (pd.sd[cl[0].k1] + pd.sd[cl[0].k2]) / 2); map.flyTo({ center: [p.lng, p.lat], zoom: 13.4, duration: reduced() ? 0 : 900 }); }
      else if ((a.lines || []).length && LINE[a.lines[0]]) fitLine(a.lines[0]);
      alertCard(a.id); return; }
    // report
    if (d.rsize) { REP.size = d.rsize; renderReport(); return; }
    if (d.rint) { REP.intensity = d.rint; renderReport(); return; }
    if (t.hasAttribute('data-rsend')) { if (REP.size && REP.intensity) sendReport(); return; }
    // profile
    if (t.hasAttribute('data-phome')) { openPicker('Heimhaltestelle', sid => { P.home = sid; saveP(); renderProfile(); }); return; }
    if (d.padd) { openPicker(d.padd === 'avoided' ? 'Haltestelle meiden' : 'Bevorzugte Haltestelle', sid => { if (!P[d.padd].includes(sid)) togglePref(d.padd, sid); renderProfile(); }); return; }
    if (d.premove) { const [k, sid] = d.premove.split('|'); P[k] = P[k].filter(x => x !== sid); saveP(); applyFilters(); if (ROUTE.to) computeRoutes(); renderProfile(); return; }
    if (d.pdef) { P.routeDefault = d.pdef; ROUTE.mode = null; saveP(); renderProfile(); return; }
    if (d.pextra) { P.maxExtra = +d.pextra; saveP(); renderProfile(); return; }
    if (d.style) { P.style = d.style; saveP(); applyTheme(); renderProfile(); return; }
    if (t.hasAttribute('data-psaveproxy')) { P.proxyUrl = $('#proxyUrl').value.trim(); saveP(); SOURCES = { ...SOURCES, mvg: 'loading', news: 'loading', weather: 'loading' }; renderProfile(); loadMonitoring(); toast('Gespeichert. Live-Daten werden neu geladen.'); return; }
    // location
    if (d.loc === 'start') { locStart(true); renderTrackSheet(); if (openSheetId === 'panic') renderPanic(); return; }
    if (d.loc === 'stop') { locStop(); renderTrackSheet(); return; }
    if (d.loc === 'demo') { startDemoRide(); return; }
    if (d.iam) { const [line, to] = d.iam.split('|'); Loc.override = { line, to, at: Date.now() }; analyze(); toast(`Alles klar: ${line} Richtung ${to}.`); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'tStations') { F.stations = t.checked; applyFilters(); }
    if (t.id === 'tVehicles') { F.vehicles = t.checked; applyFilters(); }
    if (t.id === 'tZones') { F.zones = t.checked; applyFilters(); }
    if (t.dataset.psrc) { P.sources[t.dataset.psrc] = t.checked; saveP(); if (ROUTE.to) computeRoutes(); }
    if (t.id === 'pDemo') { P.demo = t.checked; saveP(); loadMonitoring().then(() => { if (ROUTE.to) computeRoutes(); }); renderProfile(); }
    if (t.id === 'pTrack') { if (t.checked) locStart(true); else locStop(); setTimeout(renderProfile, 400); }
  });
  $('#btnFilters').addEventListener('click', () => openSheet('filters'));
  $('#btnProfile').addEventListener('click', () => openSheet('profile'));
  $('#cond').addEventListener('click', () => openSheet('alerts'));
  $('#btnPanic').addEventListener('click', startEmergency);
  $('#btnTrack').addEventListener('click', () => openSheet('track'));
  $('#scrim').addEventListener('click', () => { if ($('#sheet-picker').classList.contains('open')) closePicker(); else closeSheet(); });
  $('#btnReset').addEventListener('click', () => { F = JSON.parse(JSON.stringify(FDEF)); $('#lineSearch').value = ''; renderSearch(''); applyFilters(); toast('Filter auf Basis zurückgesetzt.'); });
  $('#lineSearch').addEventListener('input', e => renderSearch(e.target.value));
  $('#pickInput').addEventListener('input', e => renderPick(e.target.value));
  $('#pickInput').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#pickResults [data-pick]'); if (f) f.click(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#sheet-picker').classList.contains('open')) closePicker(); else if (openSheetId) closeSheet(); else closeCard(); } });
  $$('.sheet').forEach(enableDrag);
  $('#btnLocate').addEventListener('click', () => {
    if (Loc.mode === 'off') { openSheet('track'); return; }
    Loc.follow = !Loc.follow; const p = myPosition();
    if (Loc.follow && p && !inArea(p)) { Loc.follow = false; toast('Du bist außerhalb von München, darum bleibt die Karte auf der Stadt.'); }
    else if (Loc.follow && p) map.flyTo({ center: p, zoom: Math.max(map.getZoom(), 14.5), duration: reduced() ? 0 : 900 });
    renderTrack();
  });
}

// =================================================================== boot
async function boot() {
  applyTheme();
  let d;
  try { d = await loadData(); } catch (e) { $('#loading').textContent = location.protocol === 'file:' ? 'Diese Kopie kann ihre Datendateien nicht aus einem Ordner lesen. Bitte über einen Webserver öffnen.' : 'Die Netzdaten konnten nicht geladen werden. Lade die Seite neu.'; console.error(e); return; }
  P.preferred = P.preferred.filter(id => ST[id]); P.avoided = P.avoided.filter(id => ST[id]); if (P.home && !ST[P.home]) P.home = null;
  F.custom = F.custom.filter(l => LINE[l]);
  buildFilterUI(); bindUI(); syncFilterUI(); renderTrack(); renderCond();
  registerGlyphs();
  map = new maplibregl.Map({ container: 'map', style: buildStyle(d), center: CENTER, zoom: 12, minZoom: 9, maxZoom: 17.5, maxBounds: BOUNDS,
    attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, fadeDuration: 150 });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Netz: Wikipedia via Map::Tube::Muenchen, DB-Haltestellenliste, MVV GTFS (CC BY 4.0). Grenze © OpenStreetMap-Mitwirkende' }), 'top-left');
  map.on('load', () => {
    addDynamicLayers(); applyTheme(); applyFilters(); updateZonesLayer(); probeStreets();
    mapReady = true; if (pendingTrain) placeTrain(pendingTrain);
    $('#loading').remove();
    const ab = $('.maplibregl-ctrl-attrib'); if (ab) ab.classList.remove('maplibregl-compact-show');
    requestAnimationFrame(loop);
    setInterval(() => { if (ROUTE.trip) tripTick(); if (openSheetId === 'panic') renderPanic(); if (cardRefresh) cardRefresh(); if (Loc.mode !== 'off') { if (Date.now() - (Loc.lastAnalyze || 0) > 1500) { Loc.lastAnalyze = Date.now(); if (Loc.buf.length) analyze(); } estimateTick(); } else renderTrack(); }, 1000);
    setInterval(() => { renderCond(); updateZonesLayer(); if (P.style === 'auto' && wantedTheme() !== theme) applyTheme(); }, 30000);
    loadMonitoring();
    setInterval(loadMonitoring, 120000);
    if (P.tracking) locStart(false);
  });
  map.on('dragstart', () => { if (Loc.follow) { Loc.follow = false; renderTrack(); } });
  map.on('click', e => {
    const box = [[e.point.x - 14, e.point.y - 14], [e.point.x + 14, e.point.y + 14]];
    const pick = ids => map.queryRenderedFeatures(box, { layers: ids.filter(id => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none') });
    let f = pick(['veh-icon', 'veh-dot']); if (f.length) return vehicleCard(f[0].properties.vid);
    f = pick(['zones-icon']); if (f.length) return alertCard(f[0].properties.id);
    f = pick(['st-major', 'st-minor', 'lbl-major', 'lbl-minor']); if (f.length) return stationCard(String(f[0].properties.id).replace(/_(UBAHN|TRAM)$/, ''));
    f = pick(['lines-day', 'lines-night']);
    if (f.length) { f.sort((a, b) => ({ UBAHN: 0, SBAHN: 1, TRAM: 2 }[a.properties.mode] - { UBAHN: 0, SBAHN: 1, TRAM: 2 }[b.properties.mode])); return lineCard(f[0].properties.line); }
    f = pick(['zones-fill']); if (f.length) return alertCard(f[0].properties.id);
    if (selected && selected.type === 'route' && !ROUTE.trip) drawRoute(null);
    closeCard();
  });
  if (matchMedia('(hover: hover)').matches) map.on('mousemove', e => {
    const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
    const ids = ['veh-icon', 'veh-dot', 'zones-icon', 'st-major', 'st-minor', 'lines-day', 'lines-night'].filter(id => map.getLayer(id));
    map.getCanvas().style.cursor = map.queryRenderedFeatures(box, { layers: ids }).length ? 'pointer' : '';
  });
  window.__sr = { ST, PD, LINE, planRoutes, Loc, ALERTS: () => ALERTS, startDemoRide, get map() { return map; } };
}
boot();
})();
