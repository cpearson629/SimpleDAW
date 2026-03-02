import { useState } from 'react'
import { useDAWStore } from '../../store/useDAWStore'
import type { Track } from '../../types'

const TYPE_LABELS: Record<Track['type'], string> = {
  drum: 'DRUM',
  midi: 'MIDI',
  recorded: 'AUDIO',
}

const TYPE_COLORS: Record<Track['type'], string> = {
  drum: '#e05252',
  midi: '#52a0e0',
  recorded: '#52d075',
}

interface TrackRowProps {
  track: Track
  isSelected: boolean
}

export function TrackRow({ track, isSelected }: TrackRowProps) {
  const { dispatch } = useDAWStore()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(track.name)

  const commitName = () => {
    setEditing(false)
    if (draftName.trim()) dispatch({ type: 'SET_TRACK_NAME', id: track.id, name: draftName.trim() })
    else setDraftName(track.name)
  }

  return (
    <div
      className={`track-row ${isSelected ? 'track-row--selected' : ''}`}
      onClick={() => dispatch({ type: 'SELECT_TRACK', id: track.id })}
    >
      <span
        className="track-type-badge"
        style={{ backgroundColor: TYPE_COLORS[track.type] }}
      >
        {TYPE_LABELS[track.type]}
      </span>

      {editing ? (
        <input
          className="track-name-input"
          value={draftName}
          autoFocus
          onChange={e => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditing(false); setDraftName(track.name) } }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="track-name"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
          title="Double-click to rename"
        >
          {track.name}
        </span>
      )}

      <div className="track-controls">
        <input
          type="range"
          className="track-volume"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
          onChange={e => dispatch({ type: 'SET_TRACK_VOLUME', id: track.id, volume: Number(e.target.value) })}
          onClick={e => e.stopPropagation()}
        />

        <button
          className={`mute-btn ${track.muted ? 'mute-btn--active' : ''}`}
          title={track.muted ? 'Unmute' : 'Mute'}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_TRACK_MUTED', id: track.id, muted: !track.muted }) }}
        >
          {track.muted ? 'M' : 'M'}
        </button>

        <button
          className="delete-btn"
          title="Delete track"
          onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_TRACK', id: track.id }) }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
