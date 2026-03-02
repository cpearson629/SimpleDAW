import { useDAWStore } from '../../store/useDAWStore'
import { DrumEditor } from './drum/DrumEditor'
import { MidiEditor } from './midi/MidiEditor'
import { RecordedEditor } from './recorded/RecordedEditor'

export function EditorPanel() {
  const { state } = useDAWStore()
  const track = state.tracks.find(t => t.id === state.selectedTrackId)

  if (!track) {
    return (
      <div className="editor-panel editor-panel--empty">
        <span>Select a track to edit.</span>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      {track.type === 'drum' && <DrumEditor track={track} />}
      {track.type === 'midi' && <MidiEditor track={track} />}
      {track.type === 'recorded' && <RecordedEditor track={track} />}
    </div>
  )
}
