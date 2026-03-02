import { useDAWStore } from '../../../store/useDAWStore'
import { audioEngine } from '../../../audio/AudioEngine'
import type { MidiTrack, MidiNote } from '../../../types'

// Pitches from B5 (83) down to C2 (36) — 48 rows
const PITCHES = Array.from({ length: 48 }, (_, i) => 83 - i)
const STEPS = Array.from({ length: 16 }, (_, i) => i)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_NOTES = new Set([1, 3, 6, 8, 10]) // C#, D#, F#, G#, A#

function midiToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pitch % 12]}${octave}`
}

function isBlack(pitch: number): boolean {
  return BLACK_NOTES.has(pitch % 12)
}

function isC(pitch: number): boolean {
  return pitch % 12 === 0
}

interface PianoRollProps {
  track: MidiTrack
}

export function PianoRoll({ track }: PianoRollProps) {
  const { state, dispatch } = useDAWStore()
  const currentStep = state.transport.currentStep

  const noteSet = new Map<string, MidiNote>()
  for (const note of track.notes) {
    noteSet.set(`${note.pitch}-${note.step}`, note)
  }

  const handleCellClick = (pitch: number, step: number) => {
    const key = `${pitch}-${step}`
    const existing = noteSet.get(key)
    if (existing) {
      dispatch({ type: 'REMOVE_MIDI_NOTE', id: track.id, noteId: existing.id })
    } else {
      const note: MidiNote = {
        id: `note-${Date.now()}-${Math.random()}`,
        pitch,
        step,
        duration: '16n',
        velocity: 0.8,
      }
      dispatch({ type: 'ADD_MIDI_NOTE', id: track.id, note })
    }
  }

  const handleKeyClick = (pitch: number) => {
    audioEngine.getMidiEngine(track.id)?.previewNote(pitch)
  }

  return (
    <div className="piano-roll">
      {/* Step header */}
      <div className="piano-roll-header">
        <div className="piano-key-spacer" />
        <div className="pr-steps-header">
          {STEPS.map(s => (
            <div
              key={s}
              className={`pr-step-label ${state.transport.isPlaying && currentStep === s ? 'pr-step-label--current' : ''} ${s % 4 === 0 ? 'pr-step-label--beat' : ''}`}
            >
              {s + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Piano roll rows */}
      <div className="piano-roll-body">
        {PITCHES.map(pitch => {
          const black = isBlack(pitch)
          const cNote = isC(pitch)
          return (
            <div key={pitch} className={`pr-row ${black ? 'pr-row--black' : 'pr-row--white'}`}>
              {/* Piano key */}
              <button
                className={`piano-key ${black ? 'piano-key--black' : 'piano-key--white'}`}
                onClick={() => handleKeyClick(pitch)}
                title={midiToName(pitch)}
              >
                {(cNote || pitch === 83) && (
                  <span className="piano-key-label">{midiToName(pitch)}</span>
                )}
              </button>

              {/* Step cells */}
              <div className="pr-cells">
                {STEPS.map(step => {
                  const active = noteSet.has(`${pitch}-${step}`)
                  const isCurrent = state.transport.isPlaying && currentStep === step
                  return (
                    <div
                      key={step}
                      className={[
                        'pr-cell',
                        active ? 'pr-cell--active' : '',
                        isCurrent ? 'pr-cell--current' : '',
                        step % 4 === 0 ? 'pr-cell--beat' : '',
                        black ? 'pr-cell--black-row' : '',
                      ].join(' ')}
                      onClick={() => handleCellClick(pitch, step)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
