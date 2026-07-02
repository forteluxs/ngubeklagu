import { Clock, Waves, Radio, Volume2 } from 'lucide-react'
import type { AnalysisResult } from '../services/api'

interface AudioInfoProps {
  result: AnalysisResult
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioInfo({ result }: AudioInfoProps) {
  const items = [
    { Icon: Clock, label: 'Duration', value: fmtDuration(result.duration_seconds) },
    { Icon: Waves, label: 'Sample Rate', value: `${(result.sample_rate / 1000).toFixed(1)} kHz` },
    { Icon: Radio, label: 'Channels', value: result.channels === 2 ? 'Stereo' : 'Mono' },
    { Icon: Volume2, label: 'Peak / RMS', value: `${result.peak_db} / ${result.rms_db} dB` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ Icon, label, value }) => (
        <div key={label} className="glass rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-gray-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium">{label}</span>
          </div>
          <p className="text-sm font-semibold text-gray-200 tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}
