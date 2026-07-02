import { Zap, Settings, Search } from 'lucide-react'
import type { AnalysisDepth } from '../services/api'

interface DepthSelectorProps {
  value: AnalysisDepth
  onChange: (depth: AnalysisDepth) => void
}

const OPTIONS: { value: AnalysisDepth; label: string; time: string; description: string; Icon: typeof Zap }[] = [
  { value: 'quick', label: 'Quick', time: '~5s', description: 'Spectral, spatial, and basic production checks', Icon: Zap },
  { value: 'standard', label: 'Standard', time: '~15s', description: 'Adds temporal analysis and reverb tail detection', Icon: Settings },
  { value: 'deep', label: 'Deep', time: '~45s', description: 'Full analysis: structure, vocals, and watermark', Icon: Search },
]

export default function DepthSelector({ value, onChange }: DepthSelectorProps) {
  return (
    <div className="flex gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05]">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        const Icon = opt.Icon
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.description}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-all duration-200
              ${isSelected
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                : 'text-gray-500 hover:text-gray-400 border border-transparent hover:bg-white/[0.03]'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{opt.label}</span>
            <span className={`text-[10px] font-mono opacity-60 ${isSelected ? 'text-indigo-400/70' : ''}`}>
              {opt.time}
            </span>
          </button>
        )
      })}
    </div>
  )
}
