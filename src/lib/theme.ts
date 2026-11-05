import { useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const key = 'console-theme'

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(key)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(choice: ThemeChoice) {
  if (choice === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', choice)
}

/** Applies the saved theme before the first render. */
export function applySavedTheme() {
  apply(read())
}

/** The theme choice, kept in this browser: system, light or dark. */
export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(read)
  useEffect(() => {
    apply(choice)
    try {
      if (choice === 'system') localStorage.removeItem(key)
      else localStorage.setItem(key, choice)
    } catch {
      // Private windows may refuse storage; the choice lasts the page.
    }
  }, [choice])
  return [choice, setChoice]
}
