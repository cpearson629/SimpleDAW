import { useState, useEffect } from 'react'
import { useDAWStore } from '../../../store/useDAWStore'
import { audioEngine } from '../../../audio/AudioEngine'
import type { MidiTrack, MidiNote, Section } from '../../../types'

const PITCHES = Array.from({ length: 48 }, (_, i) => 83 - i)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_NOTES = new Set([1, 3, 6, 8, 10])

function midiToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pitch % 12]}${octave}`
}

function isBlack(pitch: number): boolean { return BLACK_NOTES.has(pitch % 12) }
function isC(pitch: number): boolean { return pitch % 12 === 0 }

type CoverageEntry = { note: MidiNote; isStart: boolean; isLast: boolean }

interface PianoRollProps {
  track: MidiTrack
  section: Section
}

export function PianoRoll({ track, section }: PianoRollProps) {
  const { state, dispatch } = useDAWStore()
  const totalSteps = section.bars * 16
  const STEPS = Array.from({ length: totalSteps }, (_, i) => i)

  // Playhead visibility
  const sectionIdx = state.sections.findIndex(s => s.id === section.id)
  const showPlayhead = state.transport.isPlaying && state.transport.currentSectionIdx === sectionIdx
  const displayStep = showPlayhead ? state.transport.currentStep : -1

  // Drag state: null when idle, set when creating a note by dragging
  const [drag, setDrag] = useState<{ pitch: number; startStep: number; endStep: number } | null>(null)

  // Commit drag on mouseup anywhere on the page
  useEffect(() => {
    if (!drag) return
    const onMouseUp = () => {
      const note: MidiNote = {
        id: `note-${Date.now()}-${Math.random()}`,
        pitch: drag.pitch,
        step: drag.startStep,
        durationSteps: drag.endStep - drag.startStep + 1,
        velocity: 0.8,
      }
      dispatch({ type: 'ADD_MIDI_NOTE', id: track.id, sectionId: section.id, note })
      setDrag(null)
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [drag, dispatch, track.id, section.id])

  // Build coverage map: "pitch-step" → { note, isStart, isLast }
  const sectionNotes = section.midiNotes[track.id] ?? []
  const coverageMap = new Map<string, CoverageEntry>()
  for (const note of sectionNotes) {
    for (let s = note.step; s < note.step + note.durationSteps && s < totalSteps; s++) {
      coverageMap.set(`${note.pitch}-${s}`, {
        note,
        isStart: s === note.step,
        isLast: s === note.step + note.durationSteps - 1,
      })
    }
  }

  const handleCellMouseDown = (pitch: number, step: number, e: React.MouseEvent) => {
    e.preventDefault()
    const covered = coverageMap.get(`${pitch}-${step}`)
    if (covered) {
      // Click on existing note → delete it
      dispatch({ type: 'REMOVE_MIDI_NOTE', id: track.id, sectionId: section.id, noteId: covered.note.id })
    } else {
      // Start drag to create a note
      setDrag({ pitch, startStep: step, endStep: step })
    }
  }

  const handleCellMouseEnter = (pitch: number, step: number) => {
    if (drag && drag.pitch === pitch && step > drag.startStep) {
      setDrag({ ...drag, endStep: step })
    }
  }

  const handleKeyClick = (pitch: number) => {
    audioEngine.getMidiEngine(track.id)?.previewNote(pitch)
  }

  return (
    <div className="piano-roll" onMouseLeave={() => { /* keep drag alive when leaving */ }}>
      {/* Step header */}
      <div className="piano-roll-header">
        <div className="piano-key-spacer" />
        <div className="pr-steps-header">
          {STEPS.map(s => (
            <div
              key={s}
              className={[
                'pr-step-label',
                showPlayhead && displayStep === s ? 'pr-step-label--current' : '',
                s % 4 === 0 ? 'pr-step-label--beat' : '',
                s % 16 === 0 && s > 0 ? 'pr-step-label--bar-start' : '',
              ].join(' ')}
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
              <button
                className={`piano-key ${black ? 'piano-key--black' : 'piano-key--white'}`}
                onClick={() => handleKeyClick(pitch)}
                title={midiToName(pitch)}
              >
                {(cNote || pitch === 83) && (
                  <span className="piano-key-label">{midiToName(pitch)}</span>
                )}
              </button>

              <div className="pr-cells">
                {STEPS.map(step => {
                  const covered = coverageMap.get(`${pitch}-${step}`)
                  const isDragPreview = drag?.pitch === pitch && step >= drag.startStep && step <= drag.endStep
                  const isCurrent = showPlayhead && displayStep === step

                  // Determine note shape classes for multi-step notes
                  let noteShapeClass = ''
                  if (covered && !isDragPreview) {
                    if (covered.note.durationSteps === 1) {
                      noteShapeClass = '' // single-step: use plain active style
                    } else if (covered.isStart) {
                      noteShapeClass = 'pr-cell--note-start'
                    } else if (covered.isLast) {
                      noteShapeClass = 'pr-cell--note-end'
                    } else {
                      noteShapeClass = 'pr-cell--note-mid'
                    }
                  }

                  return (
                    <div
                      key={step}
                      className={[
                        'pr-cell',
                        covered && !isDragPreview ? 'pr-cell--active' : '',
                        isDragPreview ? 'pr-cell--drag-preview' : '',
                        isCurrent ? 'pr-cell--current' : '',
                        step % 4 === 0 ? 'pr-cell--beat' : '',
                        step % 16 === 0 && step > 0 ? 'pr-cell--bar-start' : '',
                        black ? 'pr-cell--black-row' : '',
                        noteShapeClass,
                      ].join(' ')}
                      onMouseDown={e => handleCellMouseDown(pitch, step, e)}
                      onMouseEnter={() => handleCellMouseEnter(pitch, step)}
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
