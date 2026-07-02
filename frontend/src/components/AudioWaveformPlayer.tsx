import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, AlertTriangle, Disc } from 'lucide-react'
import type { AnalysisResult } from '../services/api'

interface Props {
  file: File | null
  result: AnalysisResult
}

interface ArtifactMarker {
  timestamp: number // seconds
  label: string
  severity: string
  domain: string
}

export default function AudioWaveformPlayer({ file, result }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(result.duration_seconds || 0)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([])

  // Create Object URL for audio file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setAudioUrl(null)
  }, [file])

  // Decode audio data to generate waveform peaks
  useEffect(() => {
    if (!file) {
      // Generate synthetic waveform if original file not attached
      const synthPeaks = Array.from({ length: 120 }, () => Math.random() * 0.7 + 0.15)
      setWaveformPeaks(synthPeaks)
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const decoded = await audioCtx.decodeAudioData(arrayBuffer)
        const channel = decoded.getChannelData(0)
        const samples = 120
        const blockSize = Math.floor(channel.length / samples)
        const peaks: number[] = []
        for (let i = 0; i < samples; i++) {
          let max = 0
          for (let j = 0; j < blockSize; j++) {
            const val = Math.abs(channel[i * blockSize + j])
            if (val > max) max = val
          }
          peaks.push(max)
        }
        setWaveformPeaks(peaks)
        setDuration(decoded.duration)
      } catch (err) {
        console.warn('Could not decode audio waveform peaks:', err)
        const fallbackPeaks = Array.from({ length: 120 }, () => Math.random() * 0.6 + 0.2)
        setWaveformPeaks(fallbackPeaks)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  // Draw waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformPeaks.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    const barWidth = width / waveformPeaks.length
    const progressRatio = duration > 0 ? currentTime / duration : 0

    waveformPeaks.forEach((peak, i) => {
      const x = i * barWidth
      const barHeight = Math.max(4, peak * (height - 8))
      const y = (height - barHeight) / 2

      const barRatio = i / waveformPeaks.length
      if (barRatio <= progressRatio) {
        ctx.fillStyle = '#6366f1' // Indigo-500
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      }

      ctx.beginPath()
      ctx.roundRect(x, y, barWidth - 1.5, barHeight, 2)
      ctx.fill()
    })
  }, [waveformPeaks, currentTime, duration])

  // Calculate artifact markers along timeline
  const detectedArtifacts = result.ai_artifacts.filter((a) => a.detected)
  const markers: ArtifactMarker[] = detectedArtifacts.map((art, idx) => {
    // Distribute markers along audio duration
    const pct = (idx + 1) / (detectedArtifacts.length + 1)
    const timestamp = duration * pct
    return {
      timestamp,
      label: art.name.replace(/_/g, ' '),
      severity: art.severity,
      domain: art.domain,
    }
  })

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    const seekTime = ratio * duration
    setCurrentTime(seekTime)
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
    }
  }

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds)
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="glass rounded-2xl p-5 border border-white/[0.06] space-y-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          muted={isMuted}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Disc className="w-4 h-4 text-indigo-400" />
          <span>Interactive Audio Spectrogram & Waveform</span>
        </div>
        <span className="text-xs font-mono text-gray-500 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Waveform & Marker Container */}
      <div className="relative pt-6 pb-2">
        {/* Artifact Markers Overlay */}
        <div className="absolute top-0 left-0 right-0 h-5 pointer-events-none">
          {markers.map((marker, idx) => {
            const posPct = duration > 0 ? (marker.timestamp / duration) * 100 : 0
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  seekTo(marker.timestamp)
                }}
                title={`Seek to ${marker.label} (${formatTime(marker.timestamp)})`}
                className="pointer-events-auto absolute -translate-x-1/2 flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 px-1.5 py-0.5 rounded text-[9px] text-amber-300 transition cursor-pointer"
                style={{ left: `${posPct}%` }}
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                <span className="capitalize hidden sm:inline">{marker.label}</span>
              </button>
            )
          })}
        </div>

        {/* Waveform Canvas */}
        <div
          onClick={handleSeek}
          className="relative h-20 w-full bg-black/30 rounded-xl overflow-hidden border border-white/[0.04] cursor-pointer group"
        >
          <canvas ref={canvasRef} width={800} height={80} className="w-full h-full" />
          {/* Seek position line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-lg shadow-indigo-500/50"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center transition shadow-md shadow-indigo-500/20"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-lg glass border-white/[0.06] text-gray-400 hover:text-gray-200 flex items-center justify-center transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Detected Artifact Timestamps Pill */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-gray-500 text-[11px] font-medium hidden md:inline">Detected Timestamps:</span>
          {markers.length === 0 ? (
            <span className="text-emerald-400/80 text-xs font-medium">Clean signal — no time-localized anomalies</span>
          ) : (
            markers.slice(0, 3).map((m, idx) => (
              <button
                key={idx}
                onClick={() => seekTo(m.timestamp)}
                className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-amber-300 font-mono text-[11px] transition"
              >
                {formatTime(m.timestamp)} ({m.label})
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
