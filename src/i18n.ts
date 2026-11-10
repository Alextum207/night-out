// UI language for the TS side. The dictionary lives in public/saferide/i18n.js (window.t, keyed by the German text);
// without it (#/rider, Leitstelle, selfcheck) the German key is the text.
type Vars = Record<string, string | number>
type T = (s: string, v?: Vars) => string
const fill: T = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m)) : s)
export const t: T = (s, v) => {
  const g = (globalThis as { t?: T }).t
  return g ? g(s, v) : fill(s, v)
}
export const locale = () => ((globalThis as { SR_LANG?: string }).SR_LANG === 'en' ? 'en-GB' : 'de-DE')
