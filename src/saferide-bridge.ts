// Connects the SafeRide page (public/saferide/app.js, plain JS) to the Way Out channel.
// SafeRide -> `sr:report` window event -> `report` to the control room.
// Control room `crowds` (Way Out hotspots + everyone's reports) -> `sr:crowds` window event -> SafeRide alerts.
import './saferide.css' // design tokens (+ Tailwind utilities without Preflight)
import { connect } from './realtime'
import type { Report } from './types'

let sessionId = sessionStorage.getItem('wayout.session')
if (!sessionId) {
  sessionId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
  sessionStorage.setItem('wayout.session', JSON.stringify(sessionId))
} else sessionId = JSON.parse(sessionId) as string

const hello = () => rt.send('hello', { sessionId: sessionId!, trainKey: null })
const rt = connect('rider', hello)

addEventListener('sr:report', (e) => rt.send('report', { ...(e as CustomEvent<Omit<Report, 'sessionId'>>).detail, sessionId: sessionId! }))
rt.on('crowds', ({ crowds }) => dispatchEvent(new CustomEvent('sr:crowds', { detail: crowds })))

hello()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && hello())
