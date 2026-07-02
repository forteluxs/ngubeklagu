import { useState, useCallback, useRef } from 'react'
import { Upload, FileAudio, X, Music } from 'lucide-react'

interface FileUploaderProps {
  onFileSelected: (file: File) => void
  selectedFile: File | null
  onClear: () => void
}

const SUPPORTED_FORMATS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma']
const ACCEPT = SUPPORTED_FORMATS.map(ext => `audio/${ext.slice(1)}`).join(',') + ',' + SUPPORTED_FORMATS.join(',')

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploader({ onFileSelected, selectedFile, onClear }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return SUPPORTED_FORMATS.includes(ext)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && validateFile(file)) onFileSelected(file)
    },
    [onFileSelected, validateFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && validateFile(file)) onFileSelected(file)
      e.target.value = ''
    },
    [onFileSelected, validateFile],
  )

  if (selectedFile) {
    return (
      <div
        className="glass rounded-2xl p-4 flex items-center gap-4 glass-hover"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
        </div>
        <button
          onClick={onClear}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isHovering
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-white/[0.03] text-gray-600 hover:text-gray-400 border border-white/[0.04]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer
        transition-all duration-300 group
        ${isDragging
          ? 'border-indigo-400/50 bg-indigo-500/[0.06] scale-[1.01]'
          : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        className="hidden"
      />
      <div className="space-y-3">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isDragging ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-white/[0.03] border border-white/[0.06] group-hover:bg-white/[0.05]'
        }`}>
          <Upload className={`w-6 h-6 transition-colors duration-300 ${
            isDragging ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-500'
          }`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">
            {isDragging ? 'Drop your file' : 'Drop audio file or click to browse'}
          </p>
          <p className="text-xs text-gray-600 mt-1.5">
            {SUPPORTED_FORMATS.map(f => f.slice(1).toUpperCase()).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  )
}
