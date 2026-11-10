# SafeRide Munich

`index.html` is the whole app in one file: map library, network data and map font are built in.
No other files are needed.

## How to open it

- **On your computer:** double-click `index.html`. It opens in your browser and works right away.
- **On your phone:** put it on any HTTPS host (below) and open the link. Phones need a real
  web address for location tracking.

## Quick ways to host

- **Netlify Drop:** open app.netlify.com/drop and drag the folder with `index.html` onto the page. You get an HTTPS link in seconds.
- **GitHub Pages:** push `index.html` to a repo, then Settings > Pages > deploy from branch.
- **Lovable:** put `index.html` into the project's `public/` folder, e.g. `public/saferide.html`, and open `/saferide.html`.

Location only works over HTTPS (or `localhost`, or a file opened on a desktop browser). The
phone asks for permission the first time you tap "Turn on location".

**Install it like an app:** open the HTTPS link on the phone, then Share > Add to Home Screen
(iPhone) or the menu > Add to Home screen (Android). It opens full screen with its own icon.

## Things to know when you test

- **Testing on your phone over Wi-Fi** (`http://192.168.x.x:8000`) shows the map, but location
  is blocked because the address isn't HTTPS. The app says so. Use the Netlify link instead.
- **Lovable's preview window** blocks location too, because it runs the page inside a frame.
  The app shows an "Open SafeRide in a new tab" button for this.
- **Demo examples** (example reports, alerts and news, all marked "Demo data") fill the app
  while live data isn't connected. For real-world testing, switch them off in
  Profile > Data sources > Show demo examples.
- **Times always run on Munich time**, even if the phone or laptop is set to another time zone.
- **No connection:** the map, network, routing and Panic Mode keep working; weather shows
  "No weather data" and walks are drawn as straight lines.

## What is live and what is demo

| Source | Without proxy | With the `monitor` proxy |
|---|---|---|
| Weather (Open-Meteo) | Live ("No weather data" when offline) | Live |
| MVG disruptions + construction | Live only if MVG allows the browser call, otherwise demo | Live; only notices for U-Bahn, S-Bahn and tram lines on the map |
| News + events | Demo | Live from your `NEWS_FEEDS` |
| Community reports | Demo + your own reports on this phone | Phase 2 (Supabase realtime) |
| Vehicle positions | Simulated from timetables | Simulated until geOps is connected (Phase 4) |
| Street map (every street, with names) | Live: Esri Light/Dark Gray Canvas raster tiles | Live |
| Walking paths to stations | Live: OpenStreetMap foot routing (routing.openstreetmap.de, FOSSGIS) | Live |

Every demo item is marked "Demo data" in the app. Inside the claude.ai preview the street
map and walking paths can't load (the preview blocks map tiles and outside calls), so you only
see the simplified basemap and straight walking lines there.

Before a public launch: the Esri basemap and the FOSSGIS routing server are free for
prototypes but have usage terms. For production, switch to a paid tile/routing plan
(e.g. MapTiler, Stadia, or your own OSRM/Valhalla).

## Line colours

Line colours follow MVG's network plans: U-Bahn (U7 and U8 shown as split badges), S-Bahn
(S8 with yellow text), trams (28 as an outlined badge), night trams in their day colour.
MetroBus is orange and city buses dark blue-grey, used once bus routes are added.

## Proxy (Supabase edge function)

`supabase/functions/monitor/index.ts` forwards the MVG messages API and merges RSS feeds.

```
supabase functions deploy monitor --no-verify-jwt
supabase secrets set NEWS_FEEDS="<rss url 1>,<rss url 2>"
```

Then in the app: Profile > Data sources > For developers > paste
`https://<project>.supabase.co/functions/v1/monitor` > Save.

## Files

- `index.html` – the whole app (UI, routing, tracking, monitoring, MapLibre GL JS 5.24, network
  data for U-Bahn, S-Bahn and trams incl. night trams, simplified basemap, map font)
- `supabase/functions/monitor/` – optional data proxy for live MVG messages and news
