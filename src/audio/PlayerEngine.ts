import * as Tone from 'tone'
import { masterBus } from './masterBus'

export class PlayerEngine {
  private pan: Tone.Panner
  private delay: Tone.FeedbackDelay
  private reverb: Tone.Reverb
  private vol: Tone.Volume
  private player: Tone.Player
  private loadedUrl: string | null = null

  constructor() {
    this.pan = new Tone.Panner(0)
    this.pan.connect(masterBus)

    this.delay = new Tone.FeedbackDelay('8n', 0.3)
    this.delay.wet.value = 0
    this.delay.connect(this.pan)

    this.reverb = new Tone.Reverb(1.5)
    this.reverb.wet.value = 0
    this.reverb.connect(this.delay)

    this.vol = new Tone.Volume(0)
    this.vol.connect(this.reverb)

    this.player = new Tone.Player({ loop: true }).connect(this.vol)
  }

  setVolume(db: number) { this.vol.volume.value = db }
  setPan(value: number) { this.pan.pan.value = value }
  setEffects(reverbWet: number, delayWet: number) {
    this.reverb.wet.value = reverbWet
    this.delay.wet.value = delayWet
  }

  async ensureLoaded(url: string) {
    if (this.loadedUrl === url) return
    this.loadedUrl = url
    try {
      await this.player.load(url)
    } catch {
      // If loading fails silently continue
    }
  }

  /** Called when transport starts. Sync player to transport. */
  syncToTransport(startOffset = 0) {
    if (!this.player.loaded) return
    try {
      this.player.unsync()
      this.player.sync().start(startOffset)
    } catch {
      // ignore
    }
  }

  stop() {
    try {
      this.player.unsync()
      this.player.stop()
    } catch {
      // ignore
    }
  }

  dispose() {
    this.player.dispose()
    this.vol.dispose()
    this.reverb.dispose()
    this.delay.dispose()
    this.pan.dispose()
  }
}
