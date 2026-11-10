// One channel `wayout` for everyone. Supabase Broadcast when env vars are set; otherwise a
// BroadcastChannel fallback that only reaches tabs in the same browser (local dev, laptop-only demo).
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { EventName, Events, Role } from './types'

type Envelope<E extends EventName> = Events[E] & { role: Role }
type Handler = (event: EventName, payload: Envelope<EventName>) => void

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const transport = url && key ? 'supabase' : 'local'
// Optional ?room=x (before the #) gives a separate channel, e.g. for tests or a second team.
const room = new URLSearchParams(location.search).get('room')
const topic = room ? `wayout-${room.replace(/[^\w-]/g, '')}` : 'wayout'

const handlers = new Set<Handler>()
const deliver = (event: EventName, payload: Envelope<EventName>) => handlers.forEach((h) => h(event, payload))
let sendRaw: (event: EventName, payload: object) => void
let onReconnect: (() => void) | null = null

if (transport === 'supabase') {
  const client = createClient(url!, key!)
  let channel!: RealtimeChannel
  let ready = false
  const queue: [EventName, object][] = []
  const subscribe = () => {
    ready = false
    channel = client.channel(topic, { config: { broadcast: { self: false } } })
    for (const e of ['tap', 'fine', 'action', 'demo', 'hello', 'crowds'] as EventName[]) {
      channel.on('broadcast', { event: e }, (m) => deliver(e, m.payload as Envelope<EventName>))
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true
        queue.splice(0).forEach(([e, p]) => sendRaw(e, p))
        onReconnect?.()
      }
    })
  }
  subscribe()
  sendRaw = (event, payload) => {
    if (!ready) return void queue.push([event, payload])
    void channel.send({ type: 'broadcast', event, payload })
  }
  // Phones drop the websocket when locked: rebuild the channel when the page becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || channel.state === 'joined') return
    void client.removeChannel(channel).then(subscribe)
  })
} else {
  const bc = new BroadcastChannel(topic)
  bc.onmessage = (m) => deliver(m.data.event, m.data.payload)
  sendRaw = (event, payload) => bc.postMessage({ event, payload })
}

// Each tab plays one role and ignores events sent by its own role.
export function connect(role: Role, reconnected?: () => void) {
  onReconnect = reconnected ?? null
  return {
    send<E extends EventName>(event: E, payload: Events[E]) {
      sendRaw(event, { ...payload, role })
    },
    on<E extends EventName>(event: E, cb: (p: Events[E]) => void) {
      const h: Handler = (e, p) => {
        if (e === event && p.role !== role) cb(p as unknown as Events[E])
      }
      handlers.add(h)
      return () => void handlers.delete(h)
    },
  }
}
