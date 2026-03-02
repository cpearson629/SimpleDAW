import { useRef } from 'react'
import { useDAWStore } from '../../../store/useDAWStore'
import { useMicRecorder } from '../../../hooks/useMicRecorder'
import { WaveformDisplay } from './WaveformDisplay'
import type { RecordedTrack } from '../../../types'

interface RecordedEditorProps {
  track: RecordedTrack
}

export function RecordedEditor({ track }: RecordedEditorProps) {
  const { dispatch } = useDAWStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startRecording, stopRecording } = useMicRecorder()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const arrayBuffer = await file.arrayBuffer()
    const audioCtx = new AudioContext()
    const buffer = await audioCtx.decodeAudioData(arrayBuffer)

    dispatch({ type: 'SET_RECORDED_AUDIO', id: track.id, audioUrl: url, audioBuffer: buffer })
  }

  const handleRecord = async () => {
    if (track.isRecording) {
      dispatch({ type: 'SET_RECORDING', id: track.id, isRecording: false })
      const result = await stopRecording()
      if (result) {
        dispatch({
          type: 'SET_RECORDED_AUDIO',
          id: track.id,
          audioUrl: result.url,
          audioBuffer: result.buffer,
        })
      }
    } else {
      dispatch({ type: 'SET_RECORDING', id: track.id, isRecording: true })
      await startRecording()
    }
  }

  return (
    <div className="recorded-editor">
      <div className="editor-toolbar">
        <span className="editor-title">Audio Track — {track.name}</span>
      </div>

      <div className="recorded-controls">
        <button
          className="file-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Import File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg,audio/ogg,audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button
          className={`record-btn ${track.isRecording ? 'record-btn--recording' : ''}`}
          onClick={handleRecord}
          title={track.isRecording ? 'Stop recording' : 'Record from microphone'}
        >
          {track.isRecording ? '⏹ Stop' : '● Record'}
        </button>

        {track.audioBuffer && (
          <div className="start-offset-control">
            <label className="midi-label">Start offset (s)</label>
            <input
              type="number"
              className="bpm-input"
              min={0}
              max={track.audioBuffer.duration}
              step={0.1}
              value={track.startOffset}
              onChange={e =>
                dispatch({ type: 'SET_START_OFFSET', id: track.id, startOffset: Number(e.target.value) })
              }
            />
          </div>
        )}
      </div>

      <WaveformDisplay audioBuffer={track.audioBuffer} />

      {track.audioBuffer && (
        <div className="audio-info">
          Duration: {track.audioBuffer.duration.toFixed(2)}s &nbsp;|&nbsp;
          Sample rate: {track.audioBuffer.sampleRate} Hz &nbsp;|&nbsp;
          Channels: {track.audioBuffer.numberOfChannels}
        </div>
      )}

      {!track.audioBuffer && !track.isRecording && (
        <div className="recorded-placeholder">
          Import an audio file or record from your microphone.
        </div>
      )}
    </div>
  )
}
