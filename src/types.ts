// Shared contracts for every module. All times are epoch ms.

export type LatLng = [number, number]

export type Stop = {
  id: string // MVG globalId, e.g. de:09162:500
  name: string
  lat: number
  lng: number
  dep: number // planned departure (arrival time for the last stop of a leg)
  escalatorOut: boolean
  elevatorOut: boolean
  platform?: number // MVG track number, used to find the platform in the indoor graph
}

// A crowd on the rider's map. unsafe = reported drunk group / harassment, never a safe place to go.
// id/from/to only for SafeRide reports (real time, epoch ms).
export type Crowd = { lat: number; lng: number; kind: 'busy' | 'unsafe'; label: string; id?: string; from?: number; to?: number }

// SafeRide report (group or panic pin), real time. Undo = same id with to <= now.
export type Report = {
  id: string
  sessionId: string
  lat: number
  lng: number
  size: 'small' | 'medium' | 'large' | null
  intensity: 'loud' | 'aggressive' | 'harassing' | null
  panic: boolean
  title: string
  from: number
  to: number
}

export type Leg = {
  line: string // "U6"
  destination: string // terminus of the train, e.g. "Klinikum Großhadern"
  stops: Stop[] // boarding stop, intermediate stops, alighting stop
  polyline: LatLng[]
}

// Normalized MVG connection. One leg per vehicle; legs.length > 1 means a change.
export type Route = { legs: Leg[] }

export type Position = {
  state: 'platform' | 'train'
  leg: number // index into route.legs of the train you are on / waiting for
  prevStop: Stop | null // train: last stop passed; platform: null
  nextStop: Stop // train: next stop; platform: the station you stand at
  etaMin: number // minutes until nextStop (train) or until departure (platform)
  trainKey: string
  lat: number // interpolated between prevStop and nextStop on the train
  lng: number
}

export type ScenarioId = 'arena' | 'garching'

export type OptionKind = 'stepOut' | 'move' | 'security' | 'nextTrain'
export type Option = { kind: OptionKind; title: string; detail: string; target?: 'wait' | 'security' | 'emergency' | 'frontCar' }

// rider -> control. Re-sent with the same sessionId whenever reasons change.
export type Tap = {
  sessionId: string
  trainKey: string
  line: string
  destination: string
  state: Position['state']
  nextStopId: string
  nextStopName: string
  lat: number
  lng: number
  reasons: string[]
  at: number // virtual clock
}

export type ActionKind = 'security' | 'announce' | 'extraTrain' | 'resolved'
export type Action = {
  target: { trainKey: string } | { sessionId: string }
  kind: ActionKind
  stationId: string
  stationName: string
  text: string
  steps: string[]
  at: number
}

// reset: riders go back to Riding (new scenario). to: only that session (catch-up reply to `hello`).
export type DemoPayload = { scenario: ScenarioId; route: Route; virtualNow: number; reset: boolean; to?: string }

export type Hotspot = {
  trainKey: string
  line: string
  destination: string
  nextStopId: string
  nextStopName: string
  sessions: number
  topReason: string | null
  lat: number
  lng: number
  level: 'single' | 'hotspot'
  lastAt: number
}

export type Role = 'rider' | 'control'

// Realtime events on channel `wayout`.
export type Events = {
  tap: Tap
  fine: { sessionId: string }
  action: Action
  demo: DemoPayload
  hello: { sessionId: string; trainKey: string | null }
  crowds: { crowds: Crowd[] } // control -> riders: reported groups for the rider's map and exit choice
  report: Report // SafeRide -> control
}
export type EventName = keyof Events
