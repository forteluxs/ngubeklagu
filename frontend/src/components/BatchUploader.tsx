import { useState, useRef } from 'react'
import { Upload, FileAudio, CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react'
import { analyzeAudioStream, type AnalysisDepth, type AnalysisResult } from '../services/api'

export interface BatchItem {
  id: string
  file: File
  status: 'pending' | 'analyzing' | 'completed' | 'error'
  progressPercent: number
  progressMessage: string
  result?: AnalysisResult
  error?: string
}

interface Props {
  depth: AnalysisDepth
  items: BatchItem[]
  setItems: React.Dispatch<React.SetStateAction<BatchItem[]>>
  onSelectResult: (result: AnalysisResult, file: File) => void
}

export default function BatchUploader({ depth, items, setItems, onSelectResult }: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)


  const handleFilesChosen = (files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)
    const newItems: BatchItem[] = fileArray.map((file, idx) => ({
      id: `${file.name}_${Date.now()}_${idx}`,
      file,
      status: 'pending',
      progressPercent: 0,
      progressMessage: 'Queued',
    }))
    setItems((prev) => [...prev, ...newItems])
  }

  const startBatch = async () => {
    if (items.length === 0 || isProcessing) return
    setIsProcessing(true)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.status === 'completed') continue

      // Update status to analyzing
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'analyzing', progressPercent: 5, progressMessage: 'Starting...' }
            : it
        )
      )

      try {
        const res = await analyzeAudioStream(item.file, depth, (pct, msg) => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, progressPercent: pct, progressMessage: msg }
                : it
            )
          )
        })

        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'completed',
                  progressPercent: 100,
                  progressMessage: 'Complete',
                  result: res,
                }
              : it
          )
        )
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Analysis failed'
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', progressMessage: 'Failed', error: errMsg }
              : it
          )
        )
      }
    }

    setIsProcessing(false)
  }

  const clearBatch = () => {
    if (isProcessing) return
    setItems([])
  }

  return (
    <div className="space-y-4">
      {/* Drop zone / selector */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac"
        onChange={(e) => handleFilesChosen(e.target.files)}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        className="glass rounded-2xl p-8 border-2 border-dashed border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.02] transition cursor-pointer text-center space-y-3 group"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 group-hover:scale-110 transition duration-300">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Upload Multiple Audio Files</h3>
          <p className="text-xs text-gray-500 mt-1">Select multiple WAV, MP3, FLAC files to process in queue</p>
        </div>
      </div>

      {/* Queue items */}
      {items.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4 border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Batch Queue ({items.filter((i) => i.status === 'completed').length}/{items.length})
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={clearBatch}
                disabled={isProcessing}
                className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 transition"
              >
                Clear Queue
              </button>
              <button
                onClick={startBatch}
                disabled={isProcessing || items.every((i) => i.status === 'completed')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isProcessing ? 'Processing Batch...' : 'Start Batch Analysis'}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.result) onSelectResult(item.result, item.file)
                }}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  item.result ? 'cursor-pointer hover:border-indigo-500/40 bg-white/[0.02]' : 'bg-white/[0.01]'
                } border-white/[0.05]`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileAudio className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-200 truncate">{item.file.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono pl-2">{item.progressPercent}%</span>
                    </div>
                    {item.status === 'analyzing' && (
                      <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === 'pending' && <span className="text-[10px] text-gray-500 font-mono">Queued</span>}
                  {item.status === 'analyzing' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-emerald-400 font-bold font-mono">
                        {item.result?.overall_score.toFixed(0)}% AI
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                  {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
