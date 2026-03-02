import * as Tone from 'tone'
import type { MidiNote, MidiSynthType } from '../types'

type EffectNode = Tone.JCReverb | Tone.Chorus

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPolySynth = Tone.PolySynth<any>

export class MidiEngine {
  private vol: Tone.Volume
  private synth: AnyPolySynth
  private effects: EffectNode[] = []
  private currentSynthType: MidiSynthType = 'synth'

  constructor() {
    this.vol = new Tone.Volume(0).toDestination()
    this.synth = new Tone.PolySynth(Tone.Synth).connect(this.vol)
  }

  setVolume(db: number) {
    this.vol.volume.value = db
  }

  setSynthType(type: MidiSynthType) {
    if (type === this.currentSynthType) return
    this.synth.dispose()
    for (const effect of this.effects) effect.dispose()
    this.effects = []
    this.currentSynthType = type

    switch (type) {
      case 'amsynth':
        this.synth = new Tone.PolySynth(Tone.AMSynth).connect(this.vol)
        break

      case 'fmsynth':
        this.synth = new Tone.PolySynth(Tone.FMSynth).connect(this.vol)
        break

      case 'pluck': {
        const reverb = new Tone.JCReverb(0.3).connect(this.vol)
        this.effects = [reverb]
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
        }).connect(reverb)
        break
      }

      case 'pad': {
        const chorus = new Tone.Chorus(4, 2.5, 0.5).start().connect(this.vol)
        const reverb = new Tone.JCReverb(0.5).connect(chorus)
        this.effects = [reverb, chorus]
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.8, decay: 0.2, sustain: 0.8, release: 1.5 },
        }).connect(reverb)
        break
      }

      case 'bass':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.3 },
        }).connect(this.vol)
        break

      case 'lead':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.2 },
        }).connect(this.vol)
        break

      case 'bell': {
        const reverb = new Tone.JCReverb(0.7).connect(this.vol)
        this.effects = [reverb]
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 1.5, sustain: 0.01, release: 1.0 },
        }).connect(reverb)
        break
      }

      case 'keys':
        this.synth = new Tone.PolySynth(Tone.DuoSynth).connect(this.vol)
        break

      case 'organ':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine8' },
          envelope: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.1 },
        }).connect(this.vol)
        break

      default:
        this.synth = new Tone.PolySynth(Tone.Synth).connect(this.vol)
    }
  }

  /** Preview a single note (used when clicking piano keys) */
  previewNote(pitch: number) {
    const freq = Tone.Frequency(pitch, 'midi').toFrequency()
    this.synth.triggerAttackRelease(freq, '8n')
  }

  fireStep(time: number, step: number, notes: MidiNote[]) {
    for (const note of notes) {
      if (note.step === step) {
        const freq = Tone.Frequency(note.pitch, 'midi').toFrequency()
        this.synth.triggerAttackRelease(freq, note.duration, time, note.velocity)
      }
    }
  }

  dispose() {
    this.synth.dispose()
    for (const effect of this.effects) effect.dispose()
    this.vol.dispose()
  }
}
