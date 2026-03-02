import { useDAWStore } from '../../../store/useDAWStore'
import { StepButton } from '../../common/StepButton'
import type { DrumVoice, DrumTrack, Section } from '../../../types'

const VOICE_LABELS: Record<DrumVoice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
  openhat: 'Open Hat',
  clap: 'Clap',
  tom: 'Tom',
}

const VOICE_COLORS: Record<DrumVoice, string> = {
  kick: '#e05252',
  snare: '#e09352',
  hihat: '#d4e052',
  openhat: '#52d075',
  clap: '#52a0e0',
  tom: '#a052e0',
}

interface DrumRowProps {
  track: DrumTrack
  section: Section
  voice: DrumVoice
  currentStep: number
}

export function DrumRow({ track, section, voice, currentStep }: DrumRowProps) {
  const { dispatch } = useDAWStore()
  const totalSteps = section.bars * 16
  const allSteps = section.drumPatterns[track.id]?.[voice] ?? []
  // Slice to totalSteps so we respect current bar count (data may be longer if bars were reduced)
  const steps = allSteps.slice(0, totalSteps)

  return (
    <div className="drum-row">
      <span className="drum-row-label" style={{ color: VOICE_COLORS[voice] }}>
        {VOICE_LABELS[voice]}
      </span>
      <div className="drum-steps">
        {steps.map((active, i) => (
          <StepButton
            key={i}
            active={active}
            current={currentStep === i}
            beat={i % 4 === 0}
            barStart={i % 16 === 0 && i > 0}
            color={VOICE_COLORS[voice]}
            onClick={() => dispatch({
              type: 'TOGGLE_DRUM_STEP',
              id: track.id,
              sectionId: section.id,
              voice,
              step: i,
            })}
          />
        ))}
      </div>
    </div>
  )
}
