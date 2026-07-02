import { useState } from 'react'
import { ChevronDown, ChevronRight, Activity, Radio, Sliders, Clock, Layers, Mic, Fingerprint } from 'lucide-react'
import type { DomainResult, AIArtifact } from '../services/api'

interface DomainCardProps {
  domain: DomainResult
}

const ICONS: Record<string, typeof Activity> = {
  spectral: Activity, spatial: Radio, production: Sliders,
  temporal: Clock, structural: Layers, vocal: Mic, watermark: Fingerprint,
}

const DESCRIPTIONS: Record<string, string> = {
  spectral: 'Frequency-domain analysis of neural synthesis artifacts',
  spatial: 'Stereo imaging and phase coherence analysis',
  production: 'Mixing and mastering quality metrics',
  temporal: 'Transient sharpness and rhythmic integrity',
  structural: 'Musical form and compositional coherence',
  vocal: 'Vocal synthesis artifact detection',
  watermark: 'AI provenance watermark detection',
}

const TIER_STYLES: Record<number, string> = {
  1: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  2: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  3: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  4: 'bg-white/[0.05] text-gray-500 border-white/[0.08]',
}

const TIER_LABELS: Record<number, string> = {
  1: 'Definitive', 2: 'Strong', 3: 'Moderate', 4: 'Weak',
}

function scoreColor(s: number) {
  if (s >= 0.65) return { bar: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-red-400' }
  if (s >= 0.35) return { bar: 'bg-gradient-to-r from-amber-500 to-yellow-500', text: 'text-amber-400' }
  return { bar: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-emerald-400' }
}

function severityBadge(s: string) {
  const m: Record<string, string> = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    none: 'bg-white/[0.03] text-gray-600 border-white/[0.06]',
  }
  return m[s] || m.none
}

function formatName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function ArtifactRow({ a }: { a: AIArtifact }) {
  const pct = Math.round(a.probability * 100)
  const barColor = a.probability >= 0.65 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
    a.probability >= 0.35 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
    'bg-gradient-to-r from-emerald-500 to-green-500'

  return (
    <div className={`px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 transition-colors ${a.detected ? 'bg-white/[0.02]' : ''}`}>
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.detected ? 'bg-red-400 shadow-sm shadow-red-400/30' : 'bg-gray-700'}`} />
          <span className="text-sm font-medium text-gray-200 truncate">{formatName(a.name)}</span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${TIER_STYLES[a.tier] || TIER_STYLES[3]}`}>
            {TIER_LABELS[a.tier] || 'Moderate'}
          </span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${severityBadge(a.severity)}`}>
            {a.severity}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-[130px]">
          <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
          <span className="text-[11px] text-gray-500 font-mono w-8 text-right tabular-nums">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed ml-4">{a.description}</p>
      {a.value !== null && a.value !== undefined && (
        <p className="text-[11px] text-gray-600 ml-4 mt-1 font-mono">
          Measured: {typeof a.value === 'number' ? a.value.toLocaleString() : a.value}
        </p>
      )}
    </div>
  )
}

export default function DomainCard({ domain }: DomainCardProps) {
  const [expanded, setExpanded] = useState(domain.active && domain.score > 0.2)
  const Icon = ICONS[domain.domain] || Activity
  const scorePct = Math.round(domain.score * 100)
  const detectedCount = domain.artifacts.filter(a => a.detected).length
  const colors = scoreColor(domain.score)

  if (!domain.active) {
    return (
      <div className="glass rounded-2xl p-4 opacity-40 border-white/[0.04]">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-gray-600" />
          <div className="flex-1">
            <h3 className="text-xs font-medium text-gray-600">{domain.display_name}</h3>
            <p className="text-[10px] text-gray-700 mt-0.5">Inactive &mdash; requires deeper analysis</p>
          </div>
          <span className="text-[10px] text-gray-700 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.04]">Skipped</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border-white/[0.06] overflow-hidden glass-hover">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <Icon className={`w-4 h-4 ${colors.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-200">{domain.display_name}</h3>
            {detectedCount > 0 && (
              <span className="text-[10px] font-semibold bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/20">
                {detectedCount} hit{detectedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5">{DESCRIPTIONS[domain.domain] || ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${scorePct}%`, transition: 'width 0.8s ease' }} />
          </div>
          <span className={`text-sm font-bold min-w-[36px] text-right ${colors.text} tabular-nums`}>
            {scorePct}%
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {expanded && domain.artifacts.length > 0 && (
        <div className="border-t border-white/[0.05]">
          {domain.artifacts.map((a) => (
            <ArtifactRow key={a.name} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}
