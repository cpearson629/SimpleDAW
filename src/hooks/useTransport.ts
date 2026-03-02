import { useEffect } from 'react'
import { useDAWStore } from '../store/useDAWStore'

/**
 * Registers the spacebar shortcut to toggle play/pause.
 */
export function useTransport() {
  const { state, dispatch } = useDAWStore()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        dispatch({ type: 'SET_PLAYING', isPlaying: !state.transport.isPlaying })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.transport.isPlaying, dispatch])
}
