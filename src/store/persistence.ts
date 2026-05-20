import type { DAWState } from '../types'

const KEY = 'simpledaw-v1'

export function saveToLocalStorage(state: DAWState) {
  const serializable = {
    ...state,
    tracks: state.tracks.map(t =>
      t.type === 'recorded' ? { ...t, audioBuffer: null } : t
    ),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(serializable))
  } catch { /* quota exceeded */ }
}

export function loadFromLocalStorage(): Partial<DAWState> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<DAWState>
  } catch {
    return null
  }
}
