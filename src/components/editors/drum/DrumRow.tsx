import { useDAWStore } from '../../../store/useDAWStore'
import { StepButton } from '../../common/StepButton'
import type { DrumVoice, DrumTrack } from '../../../types'

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
  voice: DrumVoice
  currentStep: number
}

export function DrumRow({ track, voice, currentStep }: DrumRowProps) {
  const { dispatch } = useDAWStore()
  const steps = track.voices[voice]

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
            color={VOICE_COLORS[voice]}
            onClick={() => dispatch({ type: 'TOGGLE_DRUM_STEP', id: track.id, voice, step: i })}
          />
        ))}
      </div>
    </div>
  )
}
