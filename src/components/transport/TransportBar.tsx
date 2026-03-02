import { useDAWStore } from '../../store/useDAWStore'

export function TransportBar() {
  const { state, dispatch } = useDAWStore()
  const { isPlaying, bpm, metronomeOn } = state.transport

  return (
    <div className="transport-bar">
      <div className="transport-left">
        <span className="app-title">SimpleDAW</span>
      </div>

      <div className="transport-center">
        <button
          className={`transport-btn ${isPlaying ? 'transport-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: !isPlaying })}
          title="Play / Pause (Space)"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="transport-btn"
          onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: false })}
          title="Stop"
          disabled={!isPlaying}
        >
          ⏹
        </button>

        <div className="bpm-control">
          <label className="bpm-label">BPM</label>
          <input
            type="number"
            className="bpm-input"
            value={bpm}
            min={40}
            max={240}
            onChange={e => dispatch({ type: 'SET_BPM', bpm: Number(e.target.value) })}
          />
        </div>

        <button
          className={`transport-btn metronome-btn ${metronomeOn ? 'transport-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_METRONOME' })}
          title="Toggle Metronome"
        >
          𝅘𝅥𝅮
        </button>
      </div>

      <div className="transport-right" />
    </div>
  )
}
