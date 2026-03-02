import { useDAWStore } from '../../../store/useDAWStore'
import { MidiStepSeq } from './MidiStepSeq'
import { PianoRoll } from './PianoRoll'
import type { MidiTrack } from '../../../types'

interface MidiEditorProps {
  track: MidiTrack
}

export function MidiEditor({ track }: MidiEditorProps) {
  const { dispatch } = useDAWStore()

  return (
    <div className="midi-editor">
      <div className="editor-toolbar">
        <span className="editor-title">MIDI Editor — {track.name}</span>

        <div className="midi-mode-toggle">
          <button
            className={`mode-btn ${track.editorMode === 'stepseq' ? 'mode-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_MIDI_EDITOR_MODE', id: track.id, mode: 'stepseq' })}
          >
            Step Seq
          </button>
          <button
            className={`mode-btn ${track.editorMode === 'pianoroll' ? 'mode-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_MIDI_EDITOR_MODE', id: track.id, mode: 'pianoroll' })}
          >
            Piano Roll
          </button>
        </div>

        <div className="midi-synth-select">
          <label className="midi-label">Synth</label>
          <select
            className="midi-select"
            value={track.synthType}
            onChange={e =>
              dispatch({
                type: 'SET_MIDI_SYNTH_TYPE',
                id: track.id,
                synthType: e.target.value as MidiTrack['synthType'],
              })
            }
          >
            <option value="synth">Basic Synth</option>
            <option value="amsynth">AM Synth</option>
            <option value="fmsynth">FM Synth</option>
          </select>
        </div>
      </div>

      {track.editorMode === 'stepseq' ? (
        <MidiStepSeq track={track} />
      ) : (
        <PianoRoll track={track} />
      )}
    </div>
  )
}
