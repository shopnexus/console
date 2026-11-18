import { useState } from 'react'
import IconArrow from '~icons/material-symbols-light/arrow-forward-rounded'
import IconCheck from '~icons/material-symbols-light/check-rounded'
import type { Answers } from '../../lib/agent'
import type { ClarifyQuestion } from '../../lib/run'
import { Btn } from '../ui'

function defaults(questions: ClarifyQuestion[]): Answers {
  return Object.fromEntries(questions.map((q) => [q.id, q.default ?? (q.kind === 'multi' ? [] : (q.options[0]?.id ?? ''))]))
}

/** The agent's clarifying questions as numbered cards of options; Continue sends the answers and the run goes on. */
export function ClarifyCard({ questions, onAnswer, busy }: { questions: ClarifyQuestion[]; onAnswer: (a: Answers) => void; busy: boolean }) {
  const [answers, setAnswers] = useState<Answers>(() => defaults(questions))
  const picked = (q: ClarifyQuestion, id: string) => {
    const a = answers[q.id]
    return Array.isArray(a) ? a.includes(id) : a === id
  }
  const pick = (q: ClarifyQuestion, id: string) =>
    setAnswers((a) => {
      if (q.kind === 'single') return { ...a, [q.id]: id }
      const cur = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : []
      return { ...a, [q.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
    })
  const done = (q: ClarifyQuestion) => {
    const a = answers[q.id]
    return Array.isArray(a) ? a.length > 0 : !!a
  }
  return (
    <section className="animate-rise overflow-hidden rounded-4xl border border-hairline bg-surface-container-lowest shadow-soft">
      <div className="space-y-5 p-5">
        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="mb-2.5 flex items-center gap-2 text-title-small">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-label-small ${done(q) ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                {i + 1}
              </span>
              {q.label}
              {q.kind === 'multi' && <span className="text-body-small font-normal text-on-surface-variant">Pick any</span>}
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {q.options.map((o) => {
                const on = picked(q, o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={q.kind === 'single' ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    onClick={() => pick(q, o.id)}
                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left ${on ? 'border-primary/50 bg-primary/4' : 'border-hairline bg-surface-container-lowest hover:bg-surface-container-low'}`}
                  >
                    {q.kind === 'multi' ? (
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] ${on ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant'}`}>
                        {on && <IconCheck width={14} height={14} />}
                      </span>
                    ) : (
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-outline-variant'}`}>
                        {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                    )}
                    <span className="leading-tight">
                      <span className="block text-label-medium">{o.label}</span>
                      {o.hint && <span className="mt-0.5 block text-body-small text-on-surface-variant">{o.hint}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-hairline bg-surface-container-low/60 px-4 py-3">
        <Btn kind="primary" big disabled={busy || !questions.every(done)} onClick={() => onAnswer(answers)} icon={<IconArrow width={17} height={17} />}>
          Continue
        </Btn>
        <Btn disabled={busy} onClick={() => onAnswer(defaults(questions))}>
          Use defaults
        </Btn>
      </div>
    </section>
  )
}
