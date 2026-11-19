import { useState } from 'react'

type DraftOpts = { digits: number; decimals?: boolean }
type Draft = { value: string; onChange: (e: { target: { value: string } }) => void; onBlur: () => void }

/**
 * The text of a number field that saves when it loses focus, and only when
 * the number changed. With min, the field always holds a number: blank reads
 * as min and the text is tidied on blur. Without it, blank means unset.
 */
export function useNumberDraft(value: number, onSave: (n: number) => void, o: DraftOpts & { min: number }): Draft
export function useNumberDraft(value: number | undefined, onSave: (n: number | undefined) => void, o: DraftOpts): Draft
export function useNumberDraft(value: number | undefined, onSave: (n: never) => void, { digits, decimals = true, min }: DraftOpts & { min?: number }): Draft {
  const [v, setV] = useState(value === undefined ? '' : String(value))
  const save = onSave as (n: number | undefined) => void
  return {
    value: v,
    onChange: (e) => setV(e.target.value.replace(decimals ? /[^\d.]/g : /\D/g, '').slice(0, digits)),
    onBlur: () => {
      const n = min === undefined ? (v === '' ? undefined : Number(v)) : Math.max(min, Number(v) || 0)
      if (n !== value) save(n)
      if (min !== undefined) setV(String(n))
    },
  }
}
