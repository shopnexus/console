/** The server's password rules for next, against the email and the password it replaces. */
export function passwordRules(next: string, again: string, email: string, current: string, currentLabel: string): [string, boolean][] {
  return [
    ['12 characters or more', next.length >= 12 && next.length <= 128],
    ['Not your email', next !== '' && next.toLowerCase() !== email.trim().toLowerCase()],
    [currentLabel, next !== '' && next !== current],
    ['Both fields match', next !== '' && next === again],
  ]
}
