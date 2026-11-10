# SafeRide München

SafeRide ist die Karte für Fahrgäste: Sie plant sichere Routen, begleitet die Fahrt und hat einen Notfall-Modus.
Ursprünglich war SafeRide eine einzelne `index.html` (`saferide-munich_1.zip`). Heute ist es die zweite Seite der Way-Out-App.
Die Entscheidungen dazu stehen in `idea.md` §12, Abschnitt „SafeRide merge“.

## Aufruf

- Handys öffnen: `/saferide.html?room=<raum>`. `?room` ist optional und muss vor dem `#` stehen, wie bei Way Out.
- **Notfall** öffnet Way Out als Overlay direkt in SafeRide, ohne Seitenwechsel (Entscheidungen: idea.md §12 „One app“).
  - Die Leitstelle wird sofort informiert: per Tap, sobald der Zug bekannt ist, und per Notfall-Pin, wenn der Standort an ist. 8 Sekunden lang gibt es „Rückgängig“.
  - Oben steht „110 anrufen“, darunter die Rückmeldung der Leitstelle, die Way-Out-Optionen, „Andere Verbindung“ (SafeRides Fluchtroute) und die Gründe. Navigation und „Mir geht's gut“ laufen im selben Overlay.
  - **Welcher Zug:** Bei einem Leitstellen-Szenario steht er in der Fahrleiste unter der Topbar und als Linien-Badge auf der Karte. Sonst kommt er aus einer laufenden SafeRide-Fahrt, die per MVG-Namenssuche in eine echte Route übersetzt wird.
- `#/rider` ist die eigenständige Way-Out-Ansicht (Fallback und Tests). Das Luna-Fenster der Leitstelle zeigt SafeRide.
- Leitstelle: `/` (mit `?demo` oder der Taste `d` für das Demo-Panel).

## Dateien

| Datei | Inhalt |
|---|---|
| `saferide.html` | Markup, zweiter Vite-Entry (`vite.config.ts` → `input`) |
| `public/saferide/app.js` | App-Code (Vanilla JS, IIFE): Routing, Ortung, Karte, Meldungen, Notfall |
| `public/saferide/app.css` | Styles (inkl. MapLibre-CSS) |
| `public/saferide/maplibre.js` | MapLibre GL JS 5.24, unverändert |
| `public/saferide/data.js` | Netzdaten (`window.SR_DATA`: Linien, Haltestellen, Fahrmuster, Basiskarte, Glyphen) |
| `public/saferide/pwa.js` | Web-App-Manifest (zum Startbildschirm hinzufügen) |
| `src/saferide/main.tsx` | Way-Out-Schicht in SafeRide: Kanal (`useRide`), Notfall-Overlay, Fahrleiste, Zug-Marker |
| `src/tokens.css` | Design-Tokens (hell/dunkel, Schrift, Farben), gemeinsam für SafeRide und Way Out |
| `supabase/functions/monitor/` | Optionaler Proxy für RSS-News, **nicht deployt** |

## Verbindung mit Way Out

- SafeRide (`app.js`) und die Way-Out-Schicht sprechen über Window-Events: `sr:report`, `sr:crowds`, `sr:emergency`, `sr:emergency-open`, `sr:escape`, `sr:unpin`, `sr:trip` und `sr:train`. Die Liste steht oben in `src/saferide/main.tsx`.
- Eine Meldung oder ein Notfall-Pin löst `sr:report` aus. Daraus wird das Event `report` an die Leitstelle.
  - Die Leitstelle zeigt die Meldung als Marker.
  - Aggressive und belästigende Gruppen sowie Notfall-Pins gehen als `unsafe` in `crowds` ein, laute Gruppen als `busy`.
- Die Leitstelle verteilt `crowds` (Way-Out-Hotspots und alle Meldungen). Daraus wird `sr:crowds`, und SafeRide zeigt die Einträge als Hinweise an. Sichere Routen fahren um diese Hinweise herum.
- Meldungen laufen in Echtzeit ab: nach 45 Minuten, ein Notfall-Pin nach 15 Minuten. „Rückgängig“ beendet sie sofort. Ein Szenario-Start oder -Ende in der Leitstelle löscht alle geteilten Meldungen.

## Was live ist und was Demo

| Quelle | Stand |
|---|---|
| Wetter (Open-Meteo) | Live |
| MVG-Störungen und Baustellen | Live (MVG `/messages` erlaubt CORS `*`), sonst Demo |
| News und Veranstaltungen | Demo (live nur mit deployter `monitor`-Function und `NEWS_FEEDS`) |
| Meldungen | Live über die Leitstelle; zusätzlich Demo-Beispiele |
| Fahrzeugpositionen | Nach Fahrplan simuliert |
| Stadtplan | Esri Light/Dark Gray Canvas |
| Fußwege | OpenStreetMap-Fußrouting (routing.openstreetmap.de, FOSSGIS) |

Demo-Beispiele sind mit „Demo-Daten“ markiert. Abschalten kannst du sie unter Profil > Datenquellen.
Esri-Kacheln und das FOSSGIS-Routing sind nur für Prototypen frei. Vor einem öffentlichen Start brauchen sie einen bezahlten Dienst.

## Hinweise zum Testen

- Standort gibt es nur über HTTPS oder `localhost`. Ohne Standort bietet der Notfall-Modus die Demo-Fahrt auf der U3 an.
- Zeiten laufen immer auf Münchner Zeit.
- e2e: `SEPARATE=1 npm run e2e [url]` prüft Meldungen, Rückkanal, Reset, das Notfall-Overlay (inkl. Navigation, Andere Verbindung, Rückgängig), Fahrleiste, Fahrt-Mapping und das Luna-Fenster.
