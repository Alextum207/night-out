// SafeRide Munich: "monitor" edge function (Supabase / Deno)
//
// The browser cannot call the MVG API or most RSS feeds directly (no CORS headers),
// so the app asks this function instead.
//
//   GET /functions/v1/monitor?src=mvg-messages  -> MVG disruption + construction messages (raw MVG JSON)
//   GET /functions/v1/monitor?src=news          -> [{ title, summary, link, published, source }]
//
// Secrets / env:
//   NEWS_FEEDS  comma-separated RSS or Atom URLs, e.g. police press releases and local news
//
// Deploy:
//   supabase functions deploy monitor --no-verify-jwt
//   supabase secrets set NEWS_FEEDS="https://example.org/feed.xml,https://example.com/rss"
// Then paste https://<project>.supabase.co/functions/v1/monitor into
// SafeRide > Profile > Data sources > For developers.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MVG_MESSAGES = "https://www.mvg.de/api/bgw-pt/v3/messages";
const TTL_MS = { "mvg-messages": 2 * 60_000, news: 5 * 60_000 } as const;

const cache = new Map<string, { at: number; body: string }>();

async function fetchText(url: string, ms = 10_000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "SafeRideMunich/0.1 (prototype)" } });
    if (!r.ok) throw new Error(`${url} answered ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

function clean(s = ""): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? clean(m[1]) : "";
}
function parseFeed(xml: string, source: string) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi), ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  return items.map((it) => {
    const linkAttr = /<link[^>]*href="([^"]+)"/i.exec(it);
    return {
      title: tag(it, "title"),
      summary: tag(it, "description") || tag(it, "summary") || tag(it, "content"),
      link: tag(it, "link") || (linkAttr ? linkAttr[1] : ""),
      published: tag(it, "pubDate") || tag(it, "updated") || tag(it, "published") || tag(it, "dc:date"),
      source,
    };
  }).filter((x) => x.title);
}

async function load(src: string): Promise<string> {
  if (src === "mvg-messages") {
    const body = await fetchText(MVG_MESSAGES);
    JSON.parse(body); // fail loudly on a non-JSON answer
    return body;
  }
  if (src === "news") {
    const feeds = (Deno.env.get("NEWS_FEEDS") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const all = await Promise.allSettled(feeds.map(async (u) => parseFeed(await fetchText(u), new URL(u).hostname)));
    const items = all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return JSON.stringify(items.slice(0, 200));
  }
  throw new Error("unknown src");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const src = new URL(req.url).searchParams.get("src") || "";
  if (!(src in TTL_MS)) {
    return new Response(JSON.stringify({ error: "Use ?src=mvg-messages or ?src=news" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const hit = cache.get(src);
  if (hit && Date.now() - hit.at < TTL_MS[src as keyof typeof TTL_MS]) {
    return new Response(hit.body, { headers: { ...CORS, "Content-Type": "application/json", "X-Cache": "hit" } });
  }
  try {
    const body = await load(src);
    cache.set(src, { at: Date.now(), body });
    return new Response(body, { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    if (hit) return new Response(hit.body, { headers: { ...CORS, "Content-Type": "application/json", "X-Cache": "stale" } });
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
