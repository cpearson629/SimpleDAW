import React from 'react'

interface StepButtonProps {
  active: boolean
  current: boolean  // step playhead
  beat: boolean     // first step of a beat group (every 4)
  onClick: () => void
  color?: string
}

export function StepButton({ active, current, beat, onClick, color }: StepButtonProps) {
  return (
    <button
      className={[
        'step-btn',
        active ? 'step-btn--active' : '',
        current ? 'step-btn--current' : '',
        beat ? 'step-btn--beat' : '',
      ].join(' ')}
      style={active && color ? { '--step-color': color } as React.CSSProperties : undefined}
      onClick={onClick}
      aria-pressed={active}
    />
  )
}
