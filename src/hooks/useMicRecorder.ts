import { useRef, useCallback } from 'react'

interface UseMicRecorderResult {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<{ url: string; buffer: AudioBuffer } | null>
}

export function useMicRecorder(): UseMicRecorderResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start()
  }, [])

  const stopRecording = useCallback(async (): Promise<{ url: string; buffer: AudioBuffer } | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return null

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const arrayBuffer = await blob.arrayBuffer()
        const audioCtx = new AudioContext()
        const buffer = await audioCtx.decodeAudioData(arrayBuffer)
        resolve({ url, buffer })

        // Clean up stream
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      recorder.stop()
    })
  }, [])

  return { startRecording, stopRecording }
}
