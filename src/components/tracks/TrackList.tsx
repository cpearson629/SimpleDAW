import { useState } from 'react'
import { useDAWStore } from '../../store/useDAWStore'
import { TrackRow } from './TrackRow'
import type { Track } from '../../types'

export function TrackList() {
  const { state, dispatch } = useDAWStore()
  const [showAddMenu, setShowAddMenu] = useState(false)

  const addTrack = (trackType: Track['type']) => {
    dispatch({ type: 'ADD_TRACK', trackType })
    setShowAddMenu(false)
  }

  return (
    <div className="track-list">
      <div className="track-list-header">
        <span className="track-list-title">TRACKS</span>
        <div className="add-track-wrapper">
          <button
            className="add-track-btn"
            onClick={() => setShowAddMenu(v => !v)}
          >
            + Add Track
          </button>
          {showAddMenu && (
            <div className="add-track-menu">
              <button onClick={() => addTrack('drum')}>Drum</button>
              <button onClick={() => addTrack('midi')}>MIDI</button>
              <button onClick={() => addTrack('recorded')}>Audio</button>
            </div>
          )}
        </div>
      </div>

      <div className="track-list-body">
        {state.tracks.length === 0 && (
          <div className="track-list-empty">
            No tracks yet. Click &ldquo;+ Add Track&rdquo; to get started.
          </div>
        )}
        {state.tracks.map(track => (
          <TrackRow
            key={track.id}
            track={track}
            isSelected={state.selectedTrackId === track.id}
          />
        ))}
      </div>
    </div>
  )
}
