import { useDAWStore } from '../../store/useDAWStore'
import { DrumEditor } from './drum/DrumEditor'
import { MidiEditor } from './midi/MidiEditor'
import { RecordedEditor } from './recorded/RecordedEditor'

export function EditorPanel() {
  const { state } = useDAWStore()
  const track = state.tracks.find(t => t.id === state.selectedTrackId)
  const section = state.sections.find(s => s.id === state.currentSectionId) ?? state.sections[0]

  if (!track) {
    return (
      <div className="editor-panel editor-panel--empty">
        <span>Select a track to edit.</span>
      </div>
    )
  }

  return (
    <div className="editor-panel">
      {track.type === 'drum' && section && <DrumEditor track={track} section={section} />}
      {track.type === 'midi' && section && <MidiEditor track={track} section={section} />}
      {track.type === 'recorded' && <RecordedEditor track={track} />}
    </div>
  )
}
