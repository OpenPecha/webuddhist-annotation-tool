import { useEffect, useState, useRef } from "react"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import { textApi } from "@/api/text"
import { Button } from "@/components/ui/button"

/** Strip script tags and event handlers so diplomatic XML can be rendered safely. */
function sanitizeDiplomaticHtml(html: string): string {
  if (!html) return ""
  let out = html
  out = out.replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  out = out.replaceAll(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
  out = out.replaceAll(/\s*on\w+\s*=\s*[^\s>]+/gi, "")
  return out
}

interface DiplomaticTextPanelProps {
  textId: number | undefined
  isVisible: boolean
  onDiplomaticSaved?: () => void
}

export function DiplomaticTextPanel({
  textId,
  isVisible,
  onDiplomaticSaved,
}: DiplomaticTextPanelProps) {
  const [diplomaticText, setDiplomaticText] = useState<string | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [teiFile, setTeiFile] = useState<File | null>(null)
  const [parsedContent, setParsedContent] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<Error | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isVisible || textId === undefined) {
      setDiplomaticText(undefined)
      setError(null)
      setParsedContent(null)
      setTeiFile(null)
      setParseError(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    textApi
      .getDiplomaticText(textId)
      .then((res) => {
        if (!cancelled) {
          const value = res.diplomatic_text ?? null
          setDiplomaticText(value)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isVisible, textId])

  const canAdd = !isLoading && !error && (diplomaticText === null || diplomaticText === "")
  const hasContent = diplomaticText != null && diplomaticText !== ""

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isXml =
      file.type === "text/xml" ||
      file.type === "application/xml" ||
      file.name.toLowerCase().endsWith(".xml")
    if (!isXml) {
      setParseError(new Error("Please select a TEI XML file (.xml)"))
      e.target.value = ""
      return
    }
    setTeiFile(file)
    setParsedContent(null)
    setParseError(null)
    e.target.value = ""
    setIsParsing(true)
    textApi
      .parseDiplomaticFromTei(file)
      .then((res) => {
        const content = res.diplomatic_text ?? ""
        setParsedContent(content)
        if (textId !== undefined && content !== undefined) {
          setIsSaving(true)
          setError(null)
          textApi
            .updateText(textId, { diplomatic_text: content })
            .then(() => {
              setDiplomaticText(content)
              setTeiFile(null)
              setParsedContent(null)
              onDiplomaticSaved?.()
            })
            .catch((err) => {
              setError(err instanceof Error ? err : new Error(String(err)))
            })
            .finally(() => setIsSaving(false))
        }
      })
      .catch((err) => {
        setParseError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => setIsParsing(false))
  }

  const handleReupload = () => {
    setTeiFile(null)
    setParsedContent(null)
    setParseError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const handleResetDiplomatic = () => {
    if (textId === undefined) return
    setIsResetting(true)
    setError(null)
    textApi
      .updateText(textId, { diplomatic_text: "" })
      .then(() => {
        setDiplomaticText("")
        setTeiFile(null)
        setParsedContent(null)
        setParseError(null)
        onDiplomaticSaved?.()
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => setIsResetting(false))
  }

  if (!isVisible) return null

  return (
    <div className="flex flex-col flex-shrink-0 h-[45vh] min-h-[200px] border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-800">Diplomatic transcription</h2>
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AiOutlineLoading3Quarters className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">Loading diplomatic text…</p>
          </div>
        )}
        {error && (
          <p className="text-red-600 text-sm py-4">
            {error.message}
          </p>
        )}
        {canAdd && (
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-slate-600 text-sm mb-2">Upload a TEI XML file. The <code className="text-xs bg-slate-100 px-1 rounded">&lt;text&gt;…&lt;/text&gt;</code> section is saved as-is; tags like hi, add, unclear, decoration are shown with styling.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!teiFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose TEI XML file
              </Button>
            )}
            {teiFile && isParsing && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <AiOutlineLoading3Quarters className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Parsing {teiFile.name}…</p>
              </div>
            )}
            {teiFile && !isParsing && parseError && (
              <div className="flex flex-col gap-2">
                <p className="text-red-600 text-sm">{parseError.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleReupload}>
                  Re-upload
                </Button>
              </div>
            )}
            {teiFile && !isParsing && parsedContent !== null && !parseError && isSaving && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <AiOutlineLoading3Quarters className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Saving to database…</p>
              </div>
            )}
          </div>
        )}
        {hasContent && (
          <div className="flex flex-col flex-1 min-h-0">
            <style>{`
              .diplomatic-view { white-space: pre-wrap; font-family: inherit; font-size: 0.875rem; line-height: 1.625; color: rgb(30 41 59); }
              .diplomatic-view hi { text-decoration: line-through; color: rgb(100 116 139); }
              .diplomatic-view add { text-decoration: underline; text-underline-offset: 2px; color: rgb(22 101 52); }
              .diplomatic-view unclear { border-bottom: 1px dotted rgb(148 163 184); font-style: italic; color: rgb(71 85 105); }
              .diplomatic-view decoration { color: rgb(148 163 184); font-weight: 500; }
            `}</style>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-2 mb-2 border-b border-slate-200 text-xs text-slate-600 shrink-0">
              <span className="font-medium text-slate-500">Tags:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-amber-300 shrink-0" style={{ backgroundColor: "#fde68a" }} aria-hidden />
                <span>add (place)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-slate-300 shrink-0" style={{ backgroundColor: "#e2e8f0" }} aria-hidden />
                <span>hi (style)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-slate-400 shrink-0" style={{ backgroundColor: "#9ca3af" }} aria-hidden />
                <span>unclear</span>
              </span>
            </div>
            <div
              className="diplomatic-view flex-1 overflow-auto min-h-0"
              dangerouslySetInnerHTML={{ __html: sanitizeDiplomaticHtml(diplomaticText ?? "") }}
            />
            <div className="mt-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDiplomatic}
                disabled={isResetting}
              >
                {isResetting ? "Resetting…" : "Reset diplomatic and upload again"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
