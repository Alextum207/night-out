// UI language (default English, switch in Settings). Keys are the German texts; a missing entry shows German.
// window.t(text, vars) fills {name} placeholders; the static markup is translated once on load.
(() => {
  let lang = 'en';
  try { if (localStorage.getItem('sr.lang') === 'de') lang = 'de'; } catch (e) {}
  const EN = {};
  const fill = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s;
  const t = (s, v) => fill(lang === 'en' && EN[s] != null ? EN[s] : s, v);
  window.SR_LANG = lang; window.SR_EN = EN; window.t = t;
  window.setLang = l => { try { localStorage.setItem('sr.lang', l); } catch (e) {} location.reload(); };
  document.documentElement.lang = lang;
  if (lang !== 'en') return;
  const walk = root => {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = it.nextNode());) { const k = n.nodeValue.trim(); if (k && EN[k] != null) n.nodeValue = n.nodeValue.replace(k, EN[k]); }
    for (const el of root.querySelectorAll('[aria-label],[placeholder],[title]'))
      for (const a of ['aria-label', 'placeholder', 'title']) { const k = el.getAttribute(a); if (k && EN[k] != null) el.setAttribute(a, EN[k]); }
  };
  walk(document.body);
})();
