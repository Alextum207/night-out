// Phone heading in degrees (0 = north), or null when there is no compass / no permission.
import { useEffect, useState } from 'react'

type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }
type Ev = DeviceOrientationEvent & { webkitCompassHeading?: number }

// iOS asks for permission; must be called inside a tap.
export function requestCompass() {
  const D = (globalThis as { DeviceOrientationEvent?: DOE }).DeviceOrientationEvent
  if (typeof D?.requestPermission === 'function') void D.requestPermission().catch(() => {})
}

export function useHeading(): number | null {
  const [h, setH] = useState<number | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      const o = e as Ev
      if (typeof o.webkitCompassHeading === 'number') setH(o.webkitCompassHeading) // iOS
      else if (o.absolute && o.alpha !== null) setH((360 - o.alpha) % 360) // Android
    }
    addEventListener('deviceorientationabsolute', on)
    addEventListener('deviceorientation', on)
    return () => { removeEventListener('deviceorientationabsolute', on); removeEventListener('deviceorientation', on) }
  }, [])
  return h
}
