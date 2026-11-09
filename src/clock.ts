// The app clock. Real time in free mode; during a scenario the virtual time is frozen until the
// demo panel moves it, so the train never drives past Münchner Freiheit mid-pitch.
let frozen: number | null = null
const subs = new Set<() => void>()

export const now = () => frozen ?? Date.now()
export const isVirtual = () => frozen !== null
export function setVirtual(t: number | null) {
  frozen = t
  subs.forEach((f) => f())
}
export const onClock = (f: () => void) => (subs.add(f), () => void subs.delete(f))
