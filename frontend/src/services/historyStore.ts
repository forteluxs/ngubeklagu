import type { AnalysisResult } from './api'

const STORAGE_KEY = 'ngubeklagu_scan_history'
const MAX_HISTORY_ITEMS = 50

export interface HistoryItem {
  id: string
  timestamp: string
  filename: string
  duration: number
  overall_score: number
  likelihood: string
  predicted_model?: string
  result: AnalysisResult
}

export function getScanHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse scan history', e)
    return []
  }
}

export function saveToHistory(result: AnalysisResult): HistoryItem[] {
  try {
    const history = getScanHistory()
    const newItem: HistoryItem = {
      id: result.scan_id,
      timestamp: result.analyzed_at || new Date().toISOString(),
      filename: result.filename,
      duration: result.duration_seconds,
      overall_score: result.overall_score,
      likelihood: result.overall_ai_likelihood,
      predicted_model: result.model_fingerprint?.predicted_model,
      result,
    }

    // Avoid duplicate scan_id
    const filtered = history.filter((h) => h.id !== result.scan_id)
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (e) {
    console.error('Failed to save to scan history', e)
    return getScanHistory()
  }
}

export function removeFromHistory(id: string): HistoryItem[] {
  try {
    const history = getScanHistory()
    const updated = history.filter((h) => h.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (e) {
    console.error('Failed to remove item from history', e)
    return getScanHistory()
  }
}

export function clearScanHistory(): HistoryItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear scan history', e)
  }
  return []
}
