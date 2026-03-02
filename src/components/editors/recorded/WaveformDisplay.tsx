import { useEffect, useRef } from 'react'

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null
}

export function WaveformDisplay({ audioBuffer }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)

    if (!audioBuffer) {
      ctx.strokeStyle = '#333'
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      return
    }

    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / W)
    const amp = H / 2

    ctx.strokeStyle = '#52a0e0'
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let x = 0; x < W; x++) {
      let min = 1, max = -1
      for (let j = 0; j < step; j++) {
        const sample = data[x * step + j] ?? 0
        if (sample < min) min = sample
        if (sample > max) max = sample
      }
      ctx.moveTo(x, amp + min * amp)
      ctx.lineTo(x, amp + max * amp)
    }

    ctx.stroke()
  }, [audioBuffer])

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={600}
      height={80}
    />
  )
}
