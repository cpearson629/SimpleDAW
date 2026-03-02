import { useDAWStore } from '../../../store/useDAWStore'
import { StepButton } from '../../common/StepButton'
import { audioEngine } from '../../../audio/AudioEngine'
import type { MidiTrack, Section } from '../../../types'

function midiToName(pitch: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(pitch / 12) - 1
  return `${names[pitch % 12]}${octave}`
}

const PITCH_OPTIONS = Array.from({ length: 48 }, (_, i) => 36 + i).reverse()

interface MidiStepSeqProps {
  track: MidiTrack
  section: Section
}

export function MidiStepSeq({ track, section }: MidiStepSeqProps) {
  const { state, dispatch } = useDAWStore()
  const totalSteps = section.bars * 16

  // Show playhead only when playing this section
  const sectionIdx = state.sections.findIndex(s => s.id === section.id)
  const showPlayhead = state.transport.isPlaying && state.transport.currentSectionIdx === sectionIdx
  const displayStep = showPlayhead ? state.transport.currentStep : -1

  const sectionNotes = section.midiNotes[track.id] ?? []
  // Show all steps covered by notes at this pitch (multi-step notes fill multiple buttons)
  const activeSteps = new Set<number>()
  for (const n of sectionNotes) {
    if (n.pitch !== track.stepSeqPitch) continue
    for (let s = n.step; s < n.step + n.durationSteps && s < totalSteps; s++) {
      activeSteps.add(s)
    }
  }

  const handlePitchChange = (pitch: number) => {
    dispatch({ type: 'SET_MIDI_STEP_PITCH', id: track.id, pitch })
    audioEngine.getMidiEngine(track.id)?.previewNote(pitch)
  }

  return (
    <div className="midi-stepseq">
      <div className="midi-stepseq-header">
        <label className="midi-label">Pitch</label>
        <select
          className="midi-select"
          value={track.stepSeqPitch}
          onChange={e => handlePitchChange(Number(e.target.value))}
        >
          {PITCH_OPTIONS.map(p => (
            <option key={p} value={p}>{midiToName(p)}</option>
          ))}
        </select>
      </div>

      <div className="midi-steps-row">
        {Array.from({ length: totalSteps }, (_, i) => (
          <StepButton
            key={i}
            active={activeSteps.has(i)}
            current={displayStep === i}
            beat={i % 4 === 0}
            barStart={i % 16 === 0 && i > 0}
            color="#52a0e0"
            onClick={() => dispatch({
              type: 'TOGGLE_MIDI_STEP',
              id: track.id,
              sectionId: section.id,
              step: i,
              pitch: track.stepSeqPitch,
            })}
          />
        ))}
      </div>
    </div>
  )
}
