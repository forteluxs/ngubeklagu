import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// --- Types ---

export type AnalysisDepth = 'quick' | 'standard' | 'deep'

export interface AIArtifact {
  name: string
  detected: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  value: number | null
  description: string
  probability: number
  domain: string
  weight: number
  tier: 1 | 2 | 3 | 4 // 1=definitive, 2=strong, 3=moderate, 4=weak
}

export interface DomainResult {
  domain: string
  display_name: string
  score: number
  active: boolean
  weight: number
  artifacts: AIArtifact[]
}

export interface ModelFingerprint {
  predicted_model: string
  confidence: 'low' | 'medium' | 'high'
  confidence_score: number
  model_probabilities: Record<string, number>
  signature_traits: string[]
  description: string
}

export interface AnalysisResult {
  // Scan metadata
  scan_id: string
  analyzed_at: string
  tool_version: string

  // Audio properties
  filename: string
  duration_seconds: number
  sample_rate: number
  channels: number
  peak_db: number
  rms_db: number

  // AI detection scoring
  overall_score: number
  confidence: 'low' | 'medium' | 'high'
  confidence_value: number
  depth_used: string

  // Domain-grouped results
  domain_results: DomainResult[]

  // Flat artifact list
  ai_artifacts: AIArtifact[]
  overall_ai_likelihood: 'unknown' | 'unlikely' | 'possible' | 'likely'

  // Legacy quick-access fields
  high_freq_cutoff_hz: number | null
  stereo_correlation: number | null

  // AI Model Fingerprinting
  model_fingerprint?: ModelFingerprint | null
}


// --- API Methods ---

export async function analyzeAudioStream(
  file: File,
  depth: AnalysisDepth = 'standard',
  onProgress?: (percent: number, message: string) => void
): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/analyze-stream?depth=${depth}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(errText || `Server error ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('ReadableStream not supported')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: AnalysisResult | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const payload = JSON.parse(line)
        if (payload.type === 'progress') {
          onProgress?.(payload.percent, payload.message)
        } else if (payload.type === 'result') {
          finalResult = payload.data as AnalysisResult
        } else if (payload.type === 'error') {
          throw new Error(payload.message)
        }
      } catch (err) {
        console.warn('NDJSON parse error', err)
      }
    }
  }

  if (buffer.trim()) {
    try {
      const payload = JSON.parse(buffer)
      if (payload.type === 'result') {
        finalResult = payload.data as AnalysisResult
      }
    } catch (_) {}
  }

  if (!finalResult) {
    throw new Error('Analysis completed without returning result data')
  }

  return finalResult
}

export async function analyzeAudio(
  file: File,
  depth: AnalysisDepth = 'standard'
): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post<AnalysisResult>(
    `/analyze?depth=${depth}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min timeout for deep analysis
    }
  )
  return data
}

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get('/health')
  return data
}

