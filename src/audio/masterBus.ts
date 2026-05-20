import * as Tone from 'tone'

// Master bus: all track engines connect here instead of Destination
const masterVol = new Tone.Volume(0)
const masterLimiter = new Tone.Limiter(-1)
masterVol.connect(masterLimiter)
masterLimiter.toDestination()

export const masterBus = masterVol

export function setMasterVolume(db: number) {
  masterVol.volume.value = db
}
