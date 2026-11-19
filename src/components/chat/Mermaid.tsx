import { useEffect, useRef, useState } from 'react'

// A ```mermaid block of an answer, drawn once its fence closes; mermaid loads
// on the first one. A block that does not parse shows its source.

let loading: Promise<typeof import('mermaid').default> | null = null
let count = 0

const dark = () => {
  const t = document.documentElement.dataset.theme
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}

export function Mermaid({ code, open }: { code: string; open: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (open) return
    const run = { live: true }
    loading ??= import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark() ? 'dark' : 'neutral', fontFamily: 'inherit' })
      return m.default
    })
    loading
      .then((mermaid) => mermaid.render(`answer-mermaid-${++count}`, code))
      .then(({ svg }) => {
        if (run.live && box.current) box.current.innerHTML = svg
      })
      .catch(() => run.live && setFailed(true))
    return () => {
      run.live = false
    }
  }, [code, open])
  if (open || failed) return <Code text={code} />
  return <div ref={box} className="overflow-x-auto rounded-md bg-surface-container-lowest p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" role="img" aria-label="Sơ đồ" />
}

/** A fenced code block. */
export function Code({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-surface-container px-3 py-2 font-mono text-body-small">
      <code>{text}</code>
    </pre>
  )
}
