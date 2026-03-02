import { useEffect, useRef } from 'react'
import { useDAWStore } from '../store/useDAWStore'
import { audioEngine } from './AudioEngine'

/**
 * Bridge between React state and the AudioEngine singleton.
 * Mount this once at the App level.
 */
export function useAudioEngine() {
  const { state, dispatch } = useDAWStore()
  const prevPlayingRef = useRef(false)

  // Register step-change callback once
  useEffect(() => {
    audioEngine.setOnStepChange((step) => {
      dispatch({ type: 'SET_CURRENT_STEP', step })
    })
  }, [dispatch])

  // Keep engine in sync with state every render
  useEffect(() => {
    audioEngine.syncState(state)
  }, [state])

  // Handle play/stop transitions
  useEffect(() => {
    const wasPlaying = prevPlayingRef.current
    const isPlaying = state.transport.isPlaying

    if (isPlaying && !wasPlaying) {
      audioEngine.play(state)
    } else if (!isPlaying && wasPlaying) {
      audioEngine.stop()
    }
    prevPlayingRef.current = isPlaying
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transport.isPlaying])
}
