import * as Tone from 'tone'
import type { DrumVoice } from '../types'

export class DrumEngine {
  private vol: Tone.Volume
  private kick: Tone.MembraneSynth
  private snare: Tone.NoiseSynth
  private hihat: Tone.MetalSynth
  private openhat: Tone.MetalSynth
  private clap: Tone.NoiseSynth
  private tom: Tone.MembraneSynth

  constructor() {
    this.vol = new Tone.Volume(0).toDestination()

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    }).connect(this.vol)

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).connect(this.vol)

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(this.vol)
    this.hihat.volume.value = -6

    this.openhat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(this.vol)
    this.openhat.volume.value = -6

    this.clap = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    }).connect(this.vol)

    this.tom = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.5 },
    }).connect(this.vol)
  }

  setVolume(db: number) {
    this.vol.volume.value = db
  }

  fireStep(time: number, step: number, voices: Record<DrumVoice, boolean[]>) {
    if (voices.kick[step])    this.kick.triggerAttackRelease('C1', '8n', time)
    if (voices.snare[step])   this.snare.triggerAttackRelease('16n', time)
    if (voices.hihat[step])   this.hihat.triggerAttackRelease('C5', '16n', time)
    if (voices.openhat[step]) this.openhat.triggerAttackRelease('C5', '4n', time)
    if (voices.clap[step])    this.clap.triggerAttackRelease('16n', time)
    if (voices.tom[step])     this.tom.triggerAttackRelease('G2', '8n', time)
  }

  dispose() {
    this.kick.dispose()
    this.snare.dispose()
    this.hihat.dispose()
    this.openhat.dispose()
    this.clap.dispose()
    this.tom.dispose()
    this.vol.dispose()
  }
}
