import { createContext, useContext, useReducer } from 'react'
import type { Dispatch } from 'react'
import type {
  DAWState, Track, DrumVoice, DrumTrack, MidiTrack, RecordedTrack,
  MidiNote, Section, MidiSynthType,
} from '../types'

// ── ID generators ────────────────────────────────────────────────────────────

let _trackCounter = 0
let _sectionCounter = 0
function nextTrackId() { return `track-${++_trackCounter}` }
function nextSectionId() { return `section-${++_sectionCounter}` }

// ── Drum helpers ──────────────────────────────────────────────────────────────

const DRUM_VOICES: DrumVoice[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom']

function makeEmptyDrumPattern(bars: number): Record<DrumVoice, boolean[]> {
  const pattern = {} as Record<DrumVoice, boolean[]>
  for (const v of DRUM_VOICES) pattern[v] = Array(bars * 16).fill(false)
  return pattern
}

function makeSection(
  id: string, name: string, bars: 1 | 2 | 4 | 8,
  loopCount: number, tracks: Track[],
): Section {
  const drumPatterns: Section['drumPatterns'] = {}
  const midiNotes: Section['midiNotes'] = {}
  for (const track of tracks) {
    if (track.type === 'drum') drumPatterns[track.id] = makeEmptyDrumPattern(bars)
    else if (track.type === 'midi') midiNotes[track.id] = []
  }
  return { id, name, bars, loopCount, drumPatterns, midiNotes }
}

// ── Track factories ───────────────────────────────────────────────────────────

function makeDrumTrack(name = 'Drum'): DrumTrack {
  return { id: nextTrackId(), name, type: 'drum', volume: 0.8, muted: false }
}

function makeMidiTrack(name = 'MIDI'): MidiTrack {
  return {
    id: nextTrackId(), name, type: 'midi', volume: 0.8, muted: false,
    editorMode: 'stepseq', stepSeqPitch: 60, synthType: 'synth',
  }
}

function makeRecordedTrack(name = 'Audio'): RecordedTrack {
  return {
    id: nextTrackId(), name, type: 'recorded', volume: 0.8, muted: false,
    audioUrl: null, audioBuffer: null, isRecording: false, startOffset: 0,
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'TOGGLE_METRONOME' }
  | { type: 'SET_CURRENT_STEP'; step: number; sectionIdx: number }
  | { type: 'ADD_TRACK'; trackType: 'drum' | 'midi' | 'recorded' }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'SELECT_TRACK'; id: string | null }
  | { type: 'SET_TRACK_NAME'; id: string; name: string }
  | { type: 'SET_TRACK_VOLUME'; id: string; volume: number }
  | { type: 'SET_TRACK_MUTED'; id: string; muted: boolean }
  | { type: 'TOGGLE_DRUM_STEP'; id: string; sectionId: string; voice: DrumVoice; step: number }
  | { type: 'ADD_MIDI_NOTE'; id: string; sectionId: string; note: MidiNote }
  | { type: 'REMOVE_MIDI_NOTE'; id: string; sectionId: string; noteId: string }
  | { type: 'SET_MIDI_EDITOR_MODE'; id: string; mode: MidiTrack['editorMode'] }
  | { type: 'SET_MIDI_SYNTH_TYPE'; id: string; synthType: MidiSynthType }
  | { type: 'SET_MIDI_STEP_PITCH'; id: string; pitch: number }
  | { type: 'TOGGLE_MIDI_STEP'; id: string; sectionId: string; step: number; pitch: number }
  | { type: 'SET_RECORDED_AUDIO'; id: string; audioUrl: string; audioBuffer: AudioBuffer }
  | { type: 'SET_RECORDING'; id: string; isRecording: boolean }
  | { type: 'SET_START_OFFSET'; id: string; startOffset: number }
  | { type: 'ADD_SECTION' }
  | { type: 'REMOVE_SECTION'; id: string }
  | { type: 'SELECT_SECTION'; id: string }
  | { type: 'SET_SECTION_NAME'; id: string; name: string }
  | { type: 'SET_SECTION_BARS'; id: string; bars: 1 | 2 | 4 | 8 }
  | { type: 'SET_SECTION_LOOP_COUNT'; id: string; loopCount: number }

// ── Initial state ─────────────────────────────────────────────────────────────

const defaultSection = makeSection(nextSectionId(), 'Section 1', 2, 1, [])

const initialState: DAWState = {
  transport: { isPlaying: false, bpm: 120, metronomeOn: false, currentStep: 0, currentSectionIdx: 0 },
  tracks: [],
  selectedTrackId: null,
  sections: [defaultSection],
  currentSectionId: defaultSection.id,
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: DAWState, action: Action): DAWState {
  switch (action.type) {

    case 'SET_PLAYING':
      return { ...state, transport: { ...state.transport, isPlaying: action.isPlaying } }

    case 'SET_BPM':
      return { ...state, transport: { ...state.transport, bpm: Math.max(40, Math.min(240, action.bpm)) } }

    case 'TOGGLE_METRONOME':
      return { ...state, transport: { ...state.transport, metronomeOn: !state.transport.metronomeOn } }

    case 'SET_CURRENT_STEP':
      return { ...state, transport: { ...state.transport, currentStep: action.step, currentSectionIdx: action.sectionIdx } }

    case 'ADD_TRACK': {
      let newTrack: Track
      if (action.trackType === 'drum') newTrack = makeDrumTrack()
      else if (action.trackType === 'midi') newTrack = makeMidiTrack()
      else newTrack = makeRecordedTrack()

      // Add empty patterns for new track into every existing section
      const sections = state.sections.map(section => {
        if (newTrack.type === 'drum') {
          return {
            ...section,
            drumPatterns: {
              ...section.drumPatterns,
              [newTrack.id]: makeEmptyDrumPattern(section.bars),
            },
          }
        } else if (newTrack.type === 'midi') {
          return {
            ...section,
            midiNotes: { ...section.midiNotes, [newTrack.id]: [] },
          }
        }
        return section
      })

      return { ...state, tracks: [...state.tracks, newTrack], selectedTrackId: newTrack.id, sections }
    }

    case 'REMOVE_TRACK': {
      const tracks = state.tracks.filter(t => t.id !== action.id)
      const selectedTrackId = state.selectedTrackId === action.id
        ? (tracks[0]?.id ?? null)
        : state.selectedTrackId

      // Remove track patterns from all sections
      const sections = state.sections.map(section => {
        const drumPatterns = { ...section.drumPatterns }
        const midiNotes = { ...section.midiNotes }
        delete drumPatterns[action.id]
        delete midiNotes[action.id]
        return { ...section, drumPatterns, midiNotes }
      })

      return { ...state, tracks, selectedTrackId, sections }
    }

    case 'SELECT_TRACK':
      return { ...state, selectedTrackId: action.id }

    case 'SET_TRACK_NAME':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, name: action.name } : t) }

    case 'SET_TRACK_VOLUME':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, volume: action.volume } : t) }

    case 'SET_TRACK_MUTED':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, muted: action.muted } : t) }

    case 'TOGGLE_DRUM_STEP': {
      return {
        ...state,
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section
          const pattern = section.drumPatterns[action.id]
          if (!pattern) return section
          const voiceSteps = [...pattern[action.voice]]
          voiceSteps[action.step] = !voiceSteps[action.step]
          return {
            ...section,
            drumPatterns: {
              ...section.drumPatterns,
              [action.id]: { ...pattern, [action.voice]: voiceSteps },
            },
          }
        }),
      }
    }

    case 'ADD_MIDI_NOTE': {
      return {
        ...state,
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section
          const existing = section.midiNotes[action.id] ?? []
          const newStart = action.note.step
          const newEnd = action.note.step + action.note.durationSteps - 1
          // Remove any same-pitch notes that overlap the new note's range
          const filtered = existing.filter(n => {
            if (n.pitch !== action.note.pitch) return true
            const nEnd = n.step + n.durationSteps - 1
            return nEnd < newStart || n.step > newEnd
          })
          return {
            ...section,
            midiNotes: { ...section.midiNotes, [action.id]: [...filtered, action.note] },
          }
        }),
      }
    }

    case 'REMOVE_MIDI_NOTE': {
      return {
        ...state,
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section
          const existing = section.midiNotes[action.id] ?? []
          return {
            ...section,
            midiNotes: { ...section.midiNotes, [action.id]: existing.filter(n => n.id !== action.noteId) },
          }
        }),
      }
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
        sections: state.sections.map(section => {
          if (section.id !== action.sectionId) return section
          const existing = section.midiNotes[action.id] ?? []
          // Find any note at this pitch that covers this step (handles multi-step notes)
          const found = existing.find(n =>
            n.pitch === action.pitch &&
            n.step <= action.step &&
            action.step < n.step + n.durationSteps
          )
          let newNotes: MidiNote[]
          if (found) {
            newNotes = existing.filter(n => n.id !== found.id)
          } else {
            const note: MidiNote = {
              id: `note-${Date.now()}-${Math.random()}`,
              pitch: action.pitch,
              step: action.step,
              durationSteps: 1,
              velocity: 0.8,
            }
            newNotes = [...existing, note]
          }
          return {
            ...section,
            midiNotes: { ...section.midiNotes, [action.id]: newNotes },
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

    case 'ADD_SECTION': {
      const name = `Section ${state.sections.length + 1}`
      const newSection = makeSection(nextSectionId(), name, 2, 1, state.tracks)
      return {
        ...state,
        sections: [...state.sections, newSection],
        currentSectionId: newSection.id,
      }
    }

    case 'REMOVE_SECTION': {
      if (state.sections.length <= 1) return state
      const idx = state.sections.findIndex(s => s.id === action.id)
      const sections = state.sections.filter(s => s.id !== action.id)
      let currentSectionId = state.currentSectionId
      if (currentSectionId === action.id) {
        const newIdx = Math.min(idx, sections.length - 1)
        currentSectionId = sections[newIdx]?.id ?? null
      }
      return { ...state, sections, currentSectionId }
    }

    case 'SELECT_SECTION':
      return { ...state, currentSectionId: action.id }

    case 'SET_SECTION_NAME':
      return {
        ...state,
        sections: state.sections.map(s => s.id === action.id ? { ...s, name: action.name } : s),
      }

    case 'SET_SECTION_BARS': {
      return {
        ...state,
        sections: state.sections.map(s => {
          if (s.id !== action.id) return s
          const newSteps = action.bars * 16
          // Extend drum patterns (never shrink stored data)
          const drumPatterns: typeof s.drumPatterns = {}
          for (const [trackId, voicePattern] of Object.entries(s.drumPatterns)) {
            const newVoicePattern = {} as Record<DrumVoice, boolean[]>
            for (const voice of DRUM_VOICES) {
              const oldSteps = voicePattern[voice] ?? []
              newVoicePattern[voice] = newSteps > oldSteps.length
                ? [...oldSteps, ...Array(newSteps - oldSteps.length).fill(false)]
                : oldSteps
            }
            drumPatterns[trackId] = newVoicePattern
          }
          return { ...s, bars: action.bars, drumPatterns }
        }),
      }
    }

    case 'SET_SECTION_LOOP_COUNT':
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === action.id ? { ...s, loopCount: Math.max(1, Math.min(16, action.loopCount)) } : s
        ),
      }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface DAWContextValue {
  state: DAWState
  dispatch: Dispatch<Action>
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
