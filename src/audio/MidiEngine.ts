import * as Tone from 'tone'
import type { MidiNote, MidiTrack } from '../types'

export class MidiEngine {
  private vol: Tone.Volume
  private synth: Tone.PolySynth
  private currentSynthType: MidiTrack['synthType'] = 'synth'

  constructor() {
    this.vol = new Tone.Volume(0).toDestination()
    this.synth = new Tone.PolySynth(Tone.Synth).connect(this.vol)
  }

  setVolume(db: number) {
    this.vol.volume.value = db
  }

  setSynthType(type: MidiTrack['synthType']) {
    if (type === this.currentSynthType) return
    this.synth.dispose()
    this.currentSynthType = type

    if (type === 'amsynth') {
      this.synth = new Tone.PolySynth(Tone.AMSynth).connect(this.vol)
    } else if (type === 'fmsynth') {
      this.synth = new Tone.PolySynth(Tone.FMSynth).connect(this.vol)
    } else {
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
    this.vol.dispose()
  }
}
