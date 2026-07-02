import { useState } from 'react'
import { AudioLines, Loader2, AlertCircle, Activity } from 'lucide-react'
import FileUploader from './components/FileUploader'
import DepthSelector from './components/DepthSelector'
import AnalysisResults from './components/AnalysisResults'
import { analyzeAudioStream, type AnalysisDepth, type AnalysisResult } from './services/api'

type AppState = 'idle' | 'analyzing' | 'results' | 'error'

const DEPTH_MESSAGES: Record<AnalysisDepth, { title: string; subtitle: string }> = {
  quick: {
    title: 'Running Quick Analysis',
    subtitle: 'Spectral, spatial, and production checks in progress...',
  },
  standard: {
    title: 'Running Standard Analysis',
    subtitle: 'Full analysis including temporal integrity checks...',
  },
  deep: {
    title: 'Running Deep Forensic Analysis',
    subtitle: 'Structural, vocal, and watermark detection active...',
  },
}

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [depth, setDepth] = useState<AnalysisDepth>('standard')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string>('')

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    setError('')
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setError('')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setState('analyzing')
    setError('')
    setResult(null)
    setProgressPercent(5)
    setProgressMessage('Initializing analysis stream...')

    try {
      const res = await analyzeAudioStream(selectedFile, depth, (pct, msg) => {
        setProgressPercent(pct)
        setProgressMessage(msg)
      })
      setResult(res)
      setState('results')
    } catch (err: unknown) {
      let message = 'An unexpected error occurred'
      if (err instanceof Error) {
        if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
          message = 'Cannot connect to backend. Ensure server is running.'
        } else {
          message = err.message
        }
      }
      setError(message)
      setState('error')
    }
  }


  const handleReset = () => {
    setState('idle')
    setSelectedFile(null)
    setResult(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-mesh bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <AudioLines className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-100 tracking-tight">
                NgubekLagu
              </h1>
              <span className="text-[10px] text-gray-600 font-medium">
                AI Detection Engine
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              {state === 'analyzing' ? 'Processing...' : 'Ready'}
            </span>
            <span className="text-gray-800">v0.2</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Results state */}
        {state === 'results' && result && (
          <div className="animate-fade-in-up">
            <AnalysisResults result={result} onReset={handleReset} />
          </div>
        )}

        {/* Analyzing state */}
        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-28 gap-8 animate-fade-in-up">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center border border-indigo-500/30">
                <Activity className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <div className="absolute -inset-3 rounded-2xl border border-indigo-500/20 animate-spin-slow" />
            </div>

            <div className="text-center space-y-3 max-w-md w-full px-4">
              <h2 className="text-xl font-semibold text-gray-100">
                {DEPTH_MESSAGES[depth].title}
              </h2>
              
              {/* Live Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-400 truncate pr-2">
                    {progressMessage || DEPTH_MESSAGES[depth].subtitle}
                  </span>
                  <span className="font-mono text-indigo-400 font-bold tabular-nums">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/[0.05] border border-white/[0.08] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out shadow-lg shadow-indigo-500/20"
                    style={{ width: `${Math.max(progressPercent, 4)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Processing signal matrices across 7 forensic domains...</span>
              </div>
            </div>
          </div>
        )}


        {/* Idle / Error state */}
        {(state === 'idle' || state === 'error') && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Hero */}
            <div className="text-center py-6 space-y-3">
              <h2 className="text-3xl font-bold text-gray-100 tracking-tight">
                AI Audio Detection
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
                Forensic signal analysis across 7 independent domains to detect
                AI-generated music with probabilistic scoring and confidence estimation.
              </p>
            </div>

            {/* Upload */}
            <div className="max-w-xl mx-auto">
              <FileUploader
                onFileSelected={handleFileSelected}
                selectedFile={selectedFile}
                onClear={handleClearFile}
              />
            </div>

            {/* Depth + Analyze */}
            {selectedFile && (
              <div className="max-w-xl mx-auto animate-fade-in-up">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-[0.15em] font-semibold mb-2.5">
                      Analysis Depth
                    </label>
                    <DepthSelector value={depth} onChange={setDepth} />
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                      text-white font-medium rounded-xl transition-all duration-200
                      flex items-center justify-center gap-2 text-sm
                      shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25"
                  >
                    <AudioLines className="w-4 h-4" />
                    Analyze Audio
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {state === 'error' && error && (
              <div className="max-w-xl mx-auto animate-fade-in-up">
                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-300">Analysis Failed</h3>
                    <p className="text-xs text-red-400/70 mt-1 leading-relaxed">{error}</p>
                    <button
                      onClick={() => { setState('idle'); setError(''); }}
                      className="text-xs text-red-400/80 hover:text-red-300 mt-2 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Domain grid */}
            <div className="max-w-3xl mx-auto pt-4">
              <p className="text-center text-[11px] text-gray-600 uppercase tracking-[0.15em] font-semibold mb-5">
                Detection Domains
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                {[
                  { name: 'Spectral', desc: 'Frequency', depth: 'quick' },
                  { name: 'Spatial', desc: 'Stereo', depth: 'quick' },
                  { name: 'Production', desc: 'Dynamics', depth: 'quick' },
                  { name: 'Temporal', desc: 'Rhythm', depth: 'standard' },
                  { name: 'Structural', desc: 'Form', depth: 'deep' },
                  { name: 'Vocal', desc: 'Voice', depth: 'deep' },
                  { name: 'Watermark', desc: 'Provenance', depth: 'deep' },
                ].map((d) => {
                  const active =
                    depth === 'deep' ||
                    (depth === 'standard' && d.depth !== 'deep') ||
                    (depth === 'quick' && d.depth === 'quick')
                  return (
                    <div
                      key={d.name}
                      className={`rounded-xl px-3 py-3 text-center border transition-all duration-500 ${
                        active
                          ? 'glass border-white/[0.08] text-gray-300'
                          : 'bg-white/[0.01] border-white/[0.03] text-gray-700'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? 'text-gray-200' : 'text-gray-700'}`}>
                        {d.name}
                      </p>
                      <p className="text-[10px] mt-1 opacity-60">{d.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] mt-16">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-gray-700">
          <span>NgubekLagu v0.2</span>
          <span>17 checks · 7 domains · Signal-level forensic analysis</span>
        </div>
      </footer>
    </div>
  )
}
