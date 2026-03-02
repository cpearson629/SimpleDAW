import { createContext, useContext, useReducer } from 'react'
import type { DAWState, Track, DrumVoice, DrumTrack, MidiTrack, RecordedTrack, MidiNote } from '../types'

// ── Default factories ────────────────────────────────────────────────────────

let _trackCounter = 0
function nextId() { return `track-${++_trackCounter}` }

const DRUM_VOICES: DrumVoice[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom']

function makeDrumTrack(name = 'Drum'): DrumTrack {
  const voices = {} as Record<DrumVoice, boolean[]>
  for (const v of DRUM_VOICES) voices[v] = Array(16).fill(false)
  return { id: nextId(), name, type: 'drum', volume: 0.8, muted: false, voices }
}

function makeMidiTrack(name = 'MIDI'): MidiTrack {
  return {
    id: nextId(), name, type: 'midi', volume: 0.8, muted: false,
    editorMode: 'stepseq', notes: [], stepSeqPitch: 60, synthType: 'synth',
  }
}

function makeRecordedTrack(name = 'Audio'): RecordedTrack {
  return {
    id: nextId(), name, type: 'recorded', volume: 0.8, muted: false,
    audioUrl: null, audioBuffer: null, isRecording: false, startOffset: 0,
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'TOGGLE_METRONOME' }
  | { type: 'SET_CURRENT_STEP'; step: number }
  | { type: 'ADD_TRACK'; trackType: 'drum' | 'midi' | 'recorded' }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'SELECT_TRACK'; id: string | null }
  | { type: 'SET_TRACK_NAME'; id: string; name: string }
  | { type: 'SET_TRACK_VOLUME'; id: string; volume: number }
  | { type: 'SET_TRACK_MUTED'; id: string; muted: boolean }
  | { type: 'TOGGLE_DRUM_STEP'; id: string; voice: DrumVoice; step: number }
  | { type: 'ADD_MIDI_NOTE'; id: string; note: MidiNote }
  | { type: 'REMOVE_MIDI_NOTE'; id: string; noteId: string }
  | { type: 'SET_MIDI_EDITOR_MODE'; id: string; mode: MidiTrack['editorMode'] }
  | { type: 'SET_MIDI_SYNTH_TYPE'; id: string; synthType: MidiTrack['synthType'] }
  | { type: 'SET_MIDI_STEP_PITCH'; id: string; pitch: number }
  | { type: 'TOGGLE_MIDI_STEP'; id: string; step: number }
  | { type: 'SET_RECORDED_AUDIO'; id: string; audioUrl: string; audioBuffer: AudioBuffer }
  | { type: 'SET_RECORDING'; id: string; isRecording: boolean }
  | { type: 'SET_START_OFFSET'; id: string; startOffset: number }

// ── Initial state ────────────────────────────────────────────────────────────

const initialState: DAWState = {
  transport: { isPlaying: false, bpm: 120, metronomeOn: false, currentStep: 0 },
  tracks: [],
  selectedTrackId: null,
}

// ── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: DAWState, action: Action): DAWState {
  switch (action.type) {

    case 'SET_PLAYING':
      return { ...state, transport: { ...state.transport, isPlaying: action.isPlaying } }

    case 'SET_BPM':
      return { ...state, transport: { ...state.transport, bpm: Math.max(40, Math.min(240, action.bpm)) } }

    case 'TOGGLE_METRONOME':
      return { ...state, transport: { ...state.transport, metronomeOn: !state.transport.metronomeOn } }

    case 'SET_CURRENT_STEP':
      return { ...state, transport: { ...state.transport, currentStep: action.step } }

    case 'ADD_TRACK': {
      let newTrack: Track
      if (action.trackType === 'drum') newTrack = makeDrumTrack()
      else if (action.trackType === 'midi') newTrack = makeMidiTrack()
      else newTrack = makeRecordedTrack()
      return { ...state, tracks: [...state.tracks, newTrack], selectedTrackId: newTrack.id }
    }

    case 'REMOVE_TRACK': {
      const tracks = state.tracks.filter(t => t.id !== action.id)
      const selectedTrackId = state.selectedTrackId === action.id
        ? (tracks[0]?.id ?? null)
        : state.selectedTrackId
      return { ...state, tracks, selectedTrackId }
    }

    case 'SELECT_TRACK':
      return { ...state, selectedTrackId: action.id }

    case 'SET_TRACK_NAME':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, name: action.name } : t) }

    case 'SET_TRACK_VOLUME':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, volume: action.volume } : t) }

    case 'SET_TRACK_MUTED':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, muted: action.muted } : t) }

    case 'TOGGLE_DRUM_STEP':
      return {
        ...state,
        tracks: state.tracks.map(t => {
          if (t.id !== action.id || t.type !== 'drum') return t
          const voices = { ...t.voices }
          const steps = [...voices[action.voice]]
          steps[action.step] = !steps[action.step]
          voices[action.voice] = steps
          return { ...t, voices }
        }),
      }

    case 'ADD_MIDI_NOTE':
      return {
        ...state,
        tracks: state.tracks.map(t => {
          if (t.id !== action.id || t.type !== 'midi') return t
          // Prevent duplicate at same pitch+step
          const filtered = t.notes.filter(n => !(n.pitch === action.note.pitch && n.step === action.note.step))
          return { ...t, notes: [...filtered, action.note] }
        }),
      }

    case 'REMOVE_MIDI_NOTE':
      return {
        ...state,
        tracks: state.tracks.map(t => {
          if (t.id !== action.id || t.type !== 'midi') return t
          return { ...t, notes: t.notes.filter(n => n.id !== action.noteId) }
        }),
      }

    case 'SET_MIDI_EDITOR_MODE':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'midi' ? { ...t, editorMode: action.mode } : t
        ),
      }

    case 'SET_MIDI_SYNTH_TYPE':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'midi' ? { ...t, synthType: action.synthType } : t
        ),
      }

    case 'SET_MIDI_STEP_PITCH':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'midi' ? { ...t, stepSeqPitch: action.pitch } : t
        ),
      }

    case 'TOGGLE_MIDI_STEP': {
      return {
        ...state,
        tracks: state.tracks.map(t => {
          if (t.id !== action.id || t.type !== 'midi') return t
          const existing = t.notes.find(n => n.pitch === t.stepSeqPitch && n.step === action.step)
          if (existing) {
            return { ...t, notes: t.notes.filter(n => n.id !== existing.id) }
          } else {
            const note: MidiNote = {
              id: `note-${Date.now()}-${Math.random()}`,
              pitch: t.stepSeqPitch,
              step: action.step,
              duration: '16n',
              velocity: 0.8,
            }
            return { ...t, notes: [...t.notes, note] }
          }
        }),
      }
    }

    case 'SET_RECORDED_AUDIO':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'recorded'
            ? { ...t, audioUrl: action.audioUrl, audioBuffer: action.audioBuffer }
            : t
        ),
      }

    case 'SET_RECORDING':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'recorded' ? { ...t, isRecording: action.isRecording } : t
        ),
      }

    case 'SET_START_OFFSET':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.id && t.type === 'recorded' ? { ...t, startOffset: action.startOffset } : t
        ),
      }

    default:
      return state
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

import { createContext as _cc } from 'react'

interface DAWContextValue {
  state: DAWState
  dispatch: React.Dispatch<Action>
}

export const DAWContext = createContext<DAWContextValue>({
  state: initialState,
  dispatch: () => {},
})

export function useDAWStore() {
  return useContext(DAWContext)
}

export function useDAWReducer() {
  return useReducer(reducer, initialState)
}
