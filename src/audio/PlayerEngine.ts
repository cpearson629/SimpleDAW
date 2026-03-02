import * as Tone from 'tone'

export class PlayerEngine {
  private vol: Tone.Volume
  private player: Tone.Player
  private loadedUrl: string | null = null

  constructor() {
    this.vol = new Tone.Volume(0).toDestination()
    this.player = new Tone.Player({ loop: true }).connect(this.vol)
  }

  setVolume(db: number) {
    this.vol.volume.value = db
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
  }
}
