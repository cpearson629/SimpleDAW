import { useState } from 'react'
import { useDAWStore } from '../../store/useDAWStore'
import { audioEngine } from '../../audio/AudioEngine'

export function TransportBar() {
  const { state, dispatch } = useDAWStore()
  const { isPlaying, bpm, metronomeOn } = state.transport
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = async () => {
    if (exporting || isPlaying) return
    setExporting(true)
    setExportProgress(0)

    const totalSteps = state.sections.reduce((sum, s) => sum + s.bars * 16 * s.loopCount, 0)
    const totalMs = (totalSteps * (60 / bpm) / 4 + 1.5) * 1000

    const startTime = Date.now()
    const interval = setInterval(() => {
      setExportProgress(Math.min((Date.now() - startTime) / totalMs, 0.95))
    }, 100)

    try {
      const blob = await audioEngine.exportAudio(state)
      clearInterval(interval)
      setExportProgress(1)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.webm'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      clearInterval(interval)
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <div className="transport-bar">
      <div className="transport-left">
        <span className="app-title">SimpleDAW</span>
      </div>

      <div className="transport-center">
        <button
          className={`transport-btn ${isPlaying ? 'transport-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: !isPlaying })}
          disabled={exporting}
          title="Play / Pause (Space)"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="transport-btn"
          onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: false })}
          disabled={!isPlaying || exporting}
          title="Stop"
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
          disabled={exporting}
          title="Toggle Metronome"
        >
          𝅘𝅥𝅮
        </button>
      </div>

      <div className="transport-right">
        <button
          className={`export-btn ${exporting ? 'export-btn--active' : ''}`}
          onClick={handleExport}
          disabled={exporting || isPlaying}
          title={isPlaying ? 'Stop playback before exporting' : 'Export arrangement as audio'}
        >
          {exporting ? (
            <span className="export-btn-inner">
              <span
                className="export-progress-bar"
                style={{ width: `${exportProgress * 100}%` }}
              />
              <span className="export-btn-label">Exporting…</span>
            </span>
          ) : (
            '⬇ Export'
          )}
        </button>
      </div>
    </div>
  )
}
