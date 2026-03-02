import * as Tone from 'tone'
import type { DAWState, Section } from '../types'
import { DrumEngine } from './DrumEngine'
import { MidiEngine } from './MidiEngine'
import { PlayerEngine } from './PlayerEngine'

class AudioEngine {
  private stateRef: DAWState | null = null
  private repeatEventId: number | null = null
  private metronomeSynth: Tone.Synth | null = null
  private drumEngines = new Map<string, DrumEngine>()
  private midiEngines = new Map<string, MidiEngine>()
  private playerEngines = new Map<string, PlayerEngine>()
  private onStepChange: ((sectionIdx: number, step: number) => void) | null = null
  private initialized = false
  private arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }

  setOnStepChange(cb: (sectionIdx: number, step: number) => void) {
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

    const transport = Tone.getTransport()
    this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }

    this.repeatEventId = transport.scheduleRepeat((time) => {
      const st = this.stateRef
      if (!st) return
      const sections = st.sections
      if (!sections.length) return

      // Bounds check
      if (this.arrangementPos.sectionIdx >= sections.length) {
        this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }
      }

      const { sectionIdx, loopIdx, step } = this.arrangementPos
      const section = sections[sectionIdx]
      const totalSteps = section.bars * 16

      // Fire audio for current step
      this.fireSectionStep(time, step, section, st)

      // Notify UI via Draw
      Tone.getDraw().schedule(() => {
        this.onStepChange?.(sectionIdx, step)
      }, time)

      // Advance position
      const nextStep = step + 1
      if (nextStep >= totalSteps) {
        const nextLoop = loopIdx + 1
        if (nextLoop >= section.loopCount) {
          this.arrangementPos = {
            sectionIdx: (sectionIdx + 1) % sections.length,
            loopIdx: 0,
            step: 0,
          }
        } else {
          this.arrangementPos = { sectionIdx, loopIdx: nextLoop, step: 0 }
        }
      } else {
        this.arrangementPos = { sectionIdx, loopIdx, step: nextStep }
      }
    }, '16n')

    transport.start()
  }

  stop() {
    const transport = Tone.getTransport()
    if (this.repeatEventId !== null) {
      transport.clear(this.repeatEventId)
      this.repeatEventId = null
    }
    transport.stop()
    transport.position = 0 as unknown as Tone.Unit.Time
    this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }

    for (const engine of this.playerEngines.values()) {
      engine.stop()
    }
  }

  private fireSectionStep(time: number, step: number, section: Section, state: DAWState) {
    for (const track of state.tracks) {
      if (track.muted) continue

      if (track.type === 'drum') {
        const engine = this.drumEngines.get(track.id)
        const pattern = section.drumPatterns[track.id]
        if (engine && pattern) engine.fireStep(time, step, pattern)
      } else if (track.type === 'midi') {
        const engine = this.midiEngines.get(track.id)
        const notes = section.midiNotes[track.id] ?? []
        if (engine) engine.fireStep(time, step, notes)
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

  /** Record one full pass through all sections and return the audio blob. */
  async exportAudio(state: DAWState): Promise<Blob> {
    await Tone.start()
    this.init()
    this.stateRef = state

    const transport = Tone.getTransport()

    // Connect a recorder to the master output
    const recorder = new Tone.Recorder()
    Tone.getDestination().connect(recorder)

    // Reset arrangement position and set up the repeat callback (same as play())
    this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }

    if (this.repeatEventId !== null) {
      transport.clear(this.repeatEventId)
      this.repeatEventId = null
    }

    this.repeatEventId = transport.scheduleRepeat((time) => {
      const st = this.stateRef
      if (!st) return
      const sections = st.sections
      if (!sections.length) return

      if (this.arrangementPos.sectionIdx >= sections.length) {
        this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }
      }

      const { sectionIdx, loopIdx, step } = this.arrangementPos
      const section = sections[sectionIdx]
      const totalSteps = section.bars * 16

      this.fireSectionStep(time, step, section, st)

      Tone.getDraw().schedule(() => {
        this.onStepChange?.(sectionIdx, step)
      }, time)

      const nextStep = step + 1
      if (nextStep >= totalSteps) {
        const nextLoop = loopIdx + 1
        if (nextLoop >= section.loopCount) {
          this.arrangementPos = {
            sectionIdx: (sectionIdx + 1) % sections.length,
            loopIdx: 0,
            step: 0,
          }
        } else {
          this.arrangementPos = { sectionIdx, loopIdx: nextLoop, step: 0 }
        }
      } else {
        this.arrangementPos = { sectionIdx, loopIdx, step: nextStep }
      }
    }, '16n')

    // Calculate total duration for one pass
    const totalSteps = state.sections.reduce((sum, s) => sum + s.bars * 16 * s.loopCount, 0)
    const sixteenthSec = (60 / state.transport.bpm) / 4
    const totalSeconds = totalSteps * sixteenthSec + 1.5 // +1.5s tail for reverb

    recorder.start()
    transport.start()

    await new Promise<void>(resolve => setTimeout(resolve, totalSeconds * 1000))

    // Stop transport and clear event
    if (this.repeatEventId !== null) {
      transport.clear(this.repeatEventId)
      this.repeatEventId = null
    }
    transport.stop()
    transport.position = 0 as unknown as Tone.Unit.Time
    this.arrangementPos = { sectionIdx: 0, loopIdx: 0, step: 0 }

    // Collect recording
    const blob = await recorder.stop()
    recorder.dispose()

    return blob
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
