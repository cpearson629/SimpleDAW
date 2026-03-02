import { useDAWStore } from '../../../store/useDAWStore'
import { DrumRow } from './DrumRow'
import type { DrumTrack, DrumVoice, Section } from '../../../types'

const VOICES: DrumVoice[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom']

interface DrumEditorProps {
  track: DrumTrack
  section: Section
}

export function DrumEditor({ track, section }: DrumEditorProps) {
  const { state } = useDAWStore()
  const totalSteps = section.bars * 16

  // Show playhead only when playing this section
  const sectionIdx = state.sections.findIndex(s => s.id === section.id)
  const showPlayhead = state.transport.isPlaying && state.transport.currentSectionIdx === sectionIdx
  const currentStep = showPlayhead ? state.transport.currentStep : -1

  return (
    <div className="drum-editor">
      <div className="editor-title">Drum Step Sequencer — {track.name}</div>
      <div className="drum-grid">
        <div className="drum-step-numbers">
          <span className="drum-row-label" />
          <div className="drum-steps">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={[
                  'step-number',
                  i % 4 === 0 ? 'step-number--beat' : '',
                  i % 16 === 0 && i > 0 ? 'step-number--bar-start' : '',
                ].join(' ')}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        {VOICES.map(voice => (
          <DrumRow
            key={voice}
            track={track}
            section={section}
            voice={voice}
            currentStep={currentStep}
          />
        ))}
      </div>
    </div>
  )
}
