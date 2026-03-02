export type DrumVoice = 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom'

export interface BaseTrack {
  id: string
  name: string
  volume: number   // 0–1 linear
  muted: boolean
}

export interface DrumTrack extends BaseTrack {
  type: 'drum'
  voices: Record<DrumVoice, boolean[]>   // 16 steps each
}

export interface MidiNote {
  id: string
  pitch: number    // MIDI note number 36–83
  step: number     // 0–15
  duration: string // e.g. '8n', '16n'
  velocity: number // 0–1
}

export interface MidiTrack extends BaseTrack {
  type: 'midi'
  editorMode: 'pianoroll' | 'stepseq'
  notes: MidiNote[]
  stepSeqPitch: number   // MIDI note used in stepseq mode
  synthType: 'synth' | 'amsynth' | 'fmsynth'
}

export interface RecordedTrack extends BaseTrack {
  type: 'recorded'
  audioUrl: string | null
  audioBuffer: AudioBuffer | null
  isRecording: boolean
  startOffset: number   // seconds
}

export type Track = DrumTrack | MidiTrack | RecordedTrack

export interface TransportState {
  isPlaying: boolean
  bpm: number
  metronomeOn: boolean
  currentStep: number
}

export interface DAWState {
  transport: TransportState
  tracks: Track[]
  selectedTrackId: string | null
}
