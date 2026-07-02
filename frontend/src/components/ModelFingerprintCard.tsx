import { Cpu, Fingerprint, Sparkles, CheckCircle2 } from 'lucide-react'
import type { ModelFingerprint } from '../services/api'

interface Props {
  fingerprint: ModelFingerprint
}

export default function ModelFingerprintCard({ fingerprint }: Props) {
  const isHuman = fingerprint.predicted_model.toLowerCase().includes('human')

  const badgeColors = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[fingerprint.confidence] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-indigo-500/20 bg-indigo-950/10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -right-12 -top-12 w-36 h-36 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[11px] text-gray-400 uppercase tracking-[0.15em] font-semibold">
              AI Generator Fingerprint
            </h4>
            <p className="text-xs text-gray-500">Model Architecture Classification</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize flex items-center gap-1 ${badgeColors}`}>
          <Sparkles className="w-3 h-3" /> {fingerprint.confidence} Confidence
        </span>
      </div>

      {/* Primary Prediction */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Predicted Source Model</span>
          <span className="text-xs font-mono text-indigo-300 font-semibold tabular-nums">
            {(fingerprint.confidence_score * 100).toFixed(0)}% Match
          </span>
        </div>
        <div className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <Cpu className={`w-5 h-5 ${isHuman ? 'text-emerald-400' : 'text-indigo-400'}`} />
          <span>{fingerprint.predicted_model}</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed pt-1">
          {fingerprint.description}
        </p>
      </div>

      {/* Probabilities Breakdown */}
      <div className="space-y-2">
        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          Model Probability Distribution
        </span>
        <div className="space-y-2 pt-1">
          {Object.entries(fingerprint.model_probabilities)
            .sort(([, a], [, b]) => b - a)
            .map(([model, prob]) => (
              <div key={model} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">{model}</span>
                  <span className="text-gray-400 tabular-nums font-mono">{(prob * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      model === fingerprint.predicted_model
                        ? isHuman ? 'bg-emerald-500' : 'bg-indigo-500'
                        : 'bg-gray-600/50'
                    }`}
                    style={{ width: `${Math.max(prob * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Signature Traits */}
      {fingerprint.signature_traits.length > 0 && (
        <div className="pt-2 border-t border-white/[0.05] space-y-2">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
            Key Signature Traits Matched
          </span>
          <ul className="space-y-1.5 text-xs text-gray-300">
            {fingerprint.signature_traits.map((trait, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
