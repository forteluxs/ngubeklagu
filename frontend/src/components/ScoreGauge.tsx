import { ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react'

interface ScoreGaugeProps {
  score: number
  confidence: string
  likelihood: string
}

export default function ScoreGauge({ score, confidence, likelihood }: ScoreGaugeProps) {
  const size = 200
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const theme = score >= 65
    ? { stroke: 'url(#gaugeRed)', text: 'text-red-400', bg: 'from-red-500/[0.06] to-red-600/[0.02]', ring: 'from-red-500/60 to-rose-600' }
    : score >= 35
      ? { stroke: 'url(#gaugeYellow)', text: 'text-amber-400', bg: 'from-amber-500/[0.06] to-yellow-600/[0.02]', ring: 'from-amber-500/60 to-yellow-600' }
      : { stroke: 'url(#gaugeGreen)', text: 'text-emerald-400', bg: 'from-emerald-500/[0.06] to-green-600/[0.02]', ring: 'from-emerald-500/60 to-green-600' }

  const likelihoodConfig = {
    likely: { label: 'Likely AI', Icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/[0.08] border-red-500/20' },
    possible: { label: 'Inconclusive', Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/[0.08] border-amber-500/20' },
    unlikely: { label: 'Likely Human', Icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08] border-emerald-500/20' },
    unknown: { label: 'Unknown', Icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-500/[0.08] border-gray-500/20' },
  }[likelihood] || { label: 'Unknown', Icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-500/[0.08] border-gray-500/20' }

  const confidenceBadge = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }[confidence] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'

  const LikelyIcon = likelihoodConfig.Icon

  return (
    <div className={`glass rounded-3xl p-8 flex flex-col items-center gap-6 bg-gradient-to-br ${theme.bg} border-2 border-white/[0.06]`}>
      {/* SVG Gauge with centered text */}
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90 drop-shadow-lg">
          <defs>
            <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="gaugeYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gaugeGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle
            stroke="rgba(255,255,255,0.04)"
            fill="none"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={theme.stroke}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Centered text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[42px] font-extrabold tracking-tight ${theme.text}`}>
            {score.toFixed(0)}
          </span>
          <span className="text-[10px] text-gray-500 font-medium tracking-[0.15em] uppercase">
            AI Score %
          </span>
        </div>
      </div>

      {/* Likelihood */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${likelihoodConfig.bg}`}>
        <LikelyIcon className={`w-4 h-4 ${likelihoodConfig.color}`} />
        <span className={`text-sm font-semibold ${likelihoodConfig.color}`}>
          {likelihoodConfig.label}
        </span>
      </div>

      {/* Confidence */}
      <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 rounded-lg border ${confidenceBadge}`}>
        {confidence} Confidence
      </div>
    </div>
  )
}
