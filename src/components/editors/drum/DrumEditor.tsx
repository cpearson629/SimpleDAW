import { useDAWStore } from '../../../store/useDAWStore'
import { DrumRow } from './DrumRow'
import type { DrumTrack, DrumVoice } from '../../../types'

const VOICES: DrumVoice[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom']

interface DrumEditorProps {
  track: DrumTrack
}

export function DrumEditor({ track }: DrumEditorProps) {
  const { state } = useDAWStore()
  const currentStep = state.transport.currentStep

  return (
    <div className="drum-editor">
      <div className="editor-title">Drum Step Sequencer — {track.name}</div>
      <div className="drum-grid">
        <div className="drum-step-numbers">
          <span className="drum-row-label" />
          <div className="drum-steps">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={`step-number ${i % 4 === 0 ? 'step-number--beat' : ''}`}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        {VOICES.map(voice => (
          <DrumRow
            key={voice}
            track={track}
            voice={voice}
            currentStep={state.transport.isPlaying ? currentStep : -1}
          />
        ))}
      </div>
    </div>
  )
}
