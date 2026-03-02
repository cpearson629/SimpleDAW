import { useDAWStore } from '../../../store/useDAWStore'
import { StepButton } from '../../common/StepButton'
import { audioEngine } from '../../../audio/AudioEngine'
import type { MidiTrack } from '../../../types'

// MIDI pitch helpers
function midiToName(pitch: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(pitch / 12) - 1
  return `${names[pitch % 12]}${octave}`
}

// Build options for the pitch selector: C2 (36) to B5 (83)
const PITCH_OPTIONS = Array.from({ length: 48 }, (_, i) => 36 + i).reverse()

interface MidiStepSeqProps {
  track: MidiTrack
}

export function MidiStepSeq({ track }: MidiStepSeqProps) {
  const { state, dispatch } = useDAWStore()
  const currentStep = state.transport.currentStep

  const activeSteps = new Set(
    track.notes.filter(n => n.pitch === track.stepSeqPitch).map(n => n.step)
  )

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
        {Array.from({ length: 16 }, (_, i) => (
          <StepButton
            key={i}
            active={activeSteps.has(i)}
            current={state.transport.isPlaying ? currentStep === i : false}
            beat={i % 4 === 0}
            color="#52a0e0"
            onClick={() => dispatch({ type: 'TOGGLE_MIDI_STEP', id: track.id, step: i })}
          />
        ))}
      </div>
    </div>
  )
}
