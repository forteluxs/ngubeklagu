import { useState } from 'react'
import { History, X, Search, Trash2, Clock, FileAudio, ArrowRight } from 'lucide-react'
import {
  getScanHistory,
  removeFromHistory,
  clearScanHistory,
  type HistoryItem,
} from '../services/historyStore'
import type { AnalysisResult } from '../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectResult: (result: AnalysisResult) => void
}

export default function ScanHistoryModal({ isOpen, onClose, onSelectResult }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>(() => getScanHistory())
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = removeFromHistory(id)
    setHistory(updated)
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scan history?')) {
      const updated = clearScanHistory()
      setHistory(updated)
    }
  }

  const filtered = history.filter((item) => {
    const term = search.toLowerCase()
    return (
      item.filename.toLowerCase().includes(term) ||
      (item.predicted_model && item.predicted_model.toLowerCase().includes(term))
    )
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl border border-white/[0.08] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Scan History</h3>
              <p className="text-xs text-gray-500">Stored locally in browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg glass border-white/[0.06] text-gray-400 hover:text-gray-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past scans by filename or model..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <Clock className="w-8 h-8 text-gray-600 mx-auto opacity-50" />
              <p className="text-xs">No scan history found</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isLikely = item.likelihood === 'likely'
              const isPossible = item.likelihood === 'possible'
              const badgeClass = isLikely
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : isPossible
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult(item.result)
                    onClose()
                  }}
                  className="group glass rounded-xl p-3.5 border-white/[0.05] hover:border-indigo-500/30 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 group-hover:text-indigo-400 transition flex-shrink-0">
                      <FileAudio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-200 truncate group-hover:text-indigo-300 transition">
                        {item.filename}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(item.timestamp).toLocaleString()} &middot; {item.duration.toFixed(1)}s
                        {item.predicted_model && ` · ${item.predicted_model}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${badgeClass}`}>
                      {item.overall_score.toFixed(0)}% AI
                    </span>
                    <button
                      onClick={(e) => handleRemove(item.id, e)}
                      title="Delete scan"
                      className="text-gray-600 hover:text-red-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 transition" />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
