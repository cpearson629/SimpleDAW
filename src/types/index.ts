export type DrumVoice = 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom'

export type MidiSynthType =
  'synth' | 'amsynth' | 'fmsynth' | 'pluck' | 'pad' |
  'bass' | 'lead' | 'bell' | 'keys' | 'organ'

export interface BaseTrack {
  id: string
  name: string
  volume: number   // 0–1 linear
  muted: boolean
}

export interface DrumTrack extends BaseTrack {
  type: 'drum'
}

export interface MidiNote {
  id: string
  pitch: number        // MIDI note number 36–83
  step: number         // 0–(totalSteps-1)
  durationSteps: number // length in 16th-note steps (1 = one 16th note)
  velocity: number     // 0–1
}

export interface MidiTrack extends BaseTrack {
  type: 'midi'
  editorMode: 'pianoroll' | 'stepseq'
  stepSeqPitch: number   // MIDI note used in stepseq mode
  synthType: MidiSynthType
}

export interface RecordedTrack extends BaseTrack {
  type: 'recorded'
  audioUrl: string | null
  audioBuffer: AudioBuffer | null
  isRecording: boolean
  startOffset: number   // seconds
}

export type Track = DrumTrack | MidiTrack | RecordedTrack

export interface Section {
  id: string
  name: string
  bars: 1 | 2 | 4 | 8         // total steps = bars * 16
  loopCount: number             // how many times to play before advancing (1–16)
  drumPatterns: Record<string, Record<DrumVoice, boolean[]>>  // trackId → voice → steps
  midiNotes: Record<string, MidiNote[]>                       // trackId → notes
}

export interface TransportState {
  isPlaying: boolean
  bpm: number
  metronomeOn: boolean
  currentStep: number
  currentSectionIdx: number
}

export interface DAWState {
  transport: TransportState
  tracks: Track[]
  selectedTrackId: string | null
  sections: Section[]
  currentSectionId: string | null
}
