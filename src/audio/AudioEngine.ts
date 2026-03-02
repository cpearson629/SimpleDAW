import * as Tone from 'tone'
import type { DAWState } from '../types'
import { DrumEngine } from './DrumEngine'
import { MidiEngine } from './MidiEngine'
import { PlayerEngine } from './PlayerEngine'

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

class AudioEngine {
  private stateRef: DAWState | null = null
  private sequence: Tone.Sequence<number> | null = null
  private metronomeSynth: Tone.Synth | null = null
  private drumEngines = new Map<string, DrumEngine>()
  private midiEngines = new Map<string, MidiEngine>()
  private playerEngines = new Map<string, PlayerEngine>()
  private onStepChange: ((step: number) => void) | null = null
  private initialized = false

  setOnStepChange(cb: (step: number) => void) {
    this.onStepChange = cb
  }

  private init() {
    if (this.initialized) return
    this.initialized = true

    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.05 },
      volume: -6,
    }).toDestination()

    this.sequence = new Tone.Sequence<number>(
      (time, step) => {
        const state = this.stateRef
        if (!state) return
        this.fireStep(time, step, state)
        Tone.getDraw().schedule(() => {
          this.onStepChange?.(step)
        }, time)
      },
      STEPS,
      '16n'
    )
    this.sequence.start(0)
  }

  /** Called on every React state change to keep the engine in sync. */
  syncState(state: DAWState) {
    this.stateRef = state

    const transport = Tone.getTransport()
    if (Math.abs(transport.bpm.value - state.transport.bpm) > 0.01) {
      transport.bpm.value = state.transport.bpm
    }

    this.syncTrackEngines(state)
  }

  async play(state: DAWState) {
    await Tone.start()
    this.init()
    this.stateRef = state

    // Sync player engines before transport starts
    for (const track of state.tracks) {
      if (track.type === 'recorded' && track.audioUrl && !track.muted) {
        const engine = this.getOrCreatePlayerEngine(track.id)
        await engine.ensureLoaded(track.audioUrl)
        engine.syncToTransport(track.startOffset)
      }
    }

    Tone.getTransport().start()
  }

  stop() {
    Tone.getTransport().stop()
    Tone.getTransport().position = 0 as unknown as Tone.Unit.Time

    for (const engine of this.playerEngines.values()) {
      engine.stop()
    }
  }

  private fireStep(time: number, step: number, state: DAWState) {
    for (const track of state.tracks) {
      if (track.muted) continue

      if (track.type === 'drum') {
        const engine = this.drumEngines.get(track.id)
        if (engine) engine.fireStep(time, step, track.voices)
      } else if (track.type === 'midi') {
        const engine = this.midiEngines.get(track.id)
        if (engine) engine.fireStep(time, step, track.notes)
      }
      // Recorded tracks are handled by the synced Tone.Player
    }

    if (state.transport.metronomeOn && step % 4 === 0) {
      this.metronomeSynth?.triggerAttackRelease('G6', '32n', time)
    }
  }

  private syncTrackEngines(state: DAWState) {
    const ids = new Set(state.tracks.map(t => t.id))

    for (const track of state.tracks) {
      const volDb = track.muted ? -Infinity : linearToDb(track.volume)

      if (track.type === 'drum') {
        const engine = this.getOrCreateDrumEngine(track.id)
        engine.setVolume(volDb)
      } else if (track.type === 'midi') {
        const engine = this.getOrCreateMidiEngine(track.id)
        engine.setVolume(volDb)
        engine.setSynthType(track.synthType)
      } else if (track.type === 'recorded') {
        const engine = this.getOrCreatePlayerEngine(track.id)
        engine.setVolume(volDb)
        if (track.audioUrl) {
          // Fire-and-forget async load
          engine.ensureLoaded(track.audioUrl)
        }
      }
    }

    // Dispose engines for deleted tracks
    for (const [id, engine] of this.drumEngines) {
      if (!ids.has(id)) { engine.dispose(); this.drumEngines.delete(id) }
    }
    for (const [id, engine] of this.midiEngines) {
      if (!ids.has(id)) { engine.dispose(); this.midiEngines.delete(id) }
    }
    for (const [id, engine] of this.playerEngines) {
      if (!ids.has(id)) { engine.dispose(); this.playerEngines.delete(id) }
    }
  }

  getMidiEngine(trackId: string): MidiEngine | undefined {
    return this.midiEngines.get(trackId)
  }

  private getOrCreateDrumEngine(id: string) {
    if (!this.drumEngines.has(id)) this.drumEngines.set(id, new DrumEngine())
    return this.drumEngines.get(id)!
  }
  private getOrCreateMidiEngine(id: string) {
    if (!this.midiEngines.has(id)) this.midiEngines.set(id, new MidiEngine())
    return this.midiEngines.get(id)!
  }
  private getOrCreatePlayerEngine(id: string) {
    if (!this.playerEngines.has(id)) this.playerEngines.set(id, new PlayerEngine())
    return this.playerEngines.get(id)!
  }
}

function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity
  return 20 * Math.log10(linear)
}

export const audioEngine = new AudioEngine()
