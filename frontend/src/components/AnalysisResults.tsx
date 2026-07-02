import { FileAudio, RotateCcw, Download } from 'lucide-react'
import type { AnalysisResult } from '../services/api'
import ScoreGauge from './ScoreGauge'
import DomainCard from './DomainCard'
import AudioInfo from './AudioInfo'
import ModelFingerprintCard from './ModelFingerprintCard'

interface Props {
  result: AnalysisResult
  onReset: () => void
}

export default function AnalysisResults({ result, onReset }: Props) {
  const activeDomains = result.domain_results.filter(d => d.active)
  const inactiveDomains = result.domain_results.filter(d => !d.active)
  const sortedActive = [...activeDomains].sort((a, b) => b.score - a.score)

  const handleExport = () => {
    const data = { ...result, export_metadata: { exported_at: new Date().toISOString(), version: '1.0' } }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const base = result.filename.replace(/\.[^/.]+$/, '')
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const a = document.createElement('a')
    a.href = url; a.download = `${base}_analysis_${ts}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <FileAudio className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-100 truncate">{result.filename}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="text-gray-400 font-medium">{result.depth_used}</span> depth
              <span className="mx-2 text-gray-700">&middot;</span>
              <span className="font-mono text-gray-600">{result.scan_id.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass border-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass border-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition text-sm font-medium">
            <RotateCcw className="w-4 h-4" /> New Scan
          </button>
        </div>
      </div>

      {/* Audio info */}
      <AudioInfo result={result} />

      {/* Main results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: score + summary + fingerprint */}
        <div className="lg:col-span-1 space-y-4">
          <ScoreGauge
            score={result.overall_score}
            confidence={result.confidence}
            likelihood={result.overall_ai_likelihood}
          />

          {result.model_fingerprint && (
            <ModelFingerprintCard fingerprint={result.model_fingerprint} />
          )}


          {/* Summary card */}
          <div className="glass rounded-2xl p-5 space-y-3.5 border-white/[0.06]">
            <h4 className="text-[11px] text-gray-500 uppercase tracking-[0.15em] font-semibold">Scan Summary</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Domains</span>
                <span className="text-gray-200 font-medium tabular-nums">
                  {activeDomains.length}<span className="text-gray-600">/{result.domain_results.length}</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Artifacts</span>
                <span className="text-gray-200 font-medium tabular-nums">
                  {result.ai_artifacts.filter(a => a.detected).length}
                  <span className="text-gray-600">/{result.ai_artifacts.length}</span>
                </span>
              </div>
              {result.high_freq_cutoff_hz && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">HF Cutoff</span>
                  <span className="text-gray-200 font-medium tabular-nums">
                    {(result.high_freq_cutoff_hz / 1000).toFixed(1)} kHz
                  </span>
                </div>
              )}
              {result.stereo_correlation !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stereo Corr</span>
                  <span className="text-gray-200 font-medium tabular-nums">
                    {result.stereo_correlation?.toFixed(3)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Confidence</span>
                <span className="text-gray-200 font-medium tabular-nums">
                  {(result.confidence_value * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: domain cards */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-[0.15em] font-semibold ml-1">
            Domain Analysis
          </h3>
          {sortedActive.map(d => (
            <DomainCard key={d.domain} domain={d} />
          ))}
          {inactiveDomains.length > 0 && (
            <>
              <h3 className="text-[11px] text-gray-600 uppercase tracking-[0.15em] font-semibold ml-1 mt-6">
                Inactive
              </h3>
              {inactiveDomains.map(d => (
                <DomainCard key={d.domain} domain={d} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
