import { describe, expect, it } from 'vitest'
import { advanceReveal, arrivalOf, countAt, markThreadOpened, revealEnd, splitFigure } from './motion'

describe('advanceReveal', () => {
  it('eases the speed toward the backlog over the lag and never moves slower than the floor', () => {
    const first = advanceReveal(600, { progress: 0, speed: 0 }, 16)
    expect(first.speed).toBeGreaterThan(0)
    expect(first.speed).toBeLessThan(1000)
    // The floor: 40 chars a second even while the speed is still easing up.
    expect(first.progress).toBeGreaterThanOrEqual((40 * 16) / 1000)
    expect(advanceReveal(5, { progress: 0, speed: 0 }, 16).progress).toBeCloseTo((40 * 16) / 1000, 5)
    let r = first
    for (let i = 0; i < 200; i++) r = advanceReveal(600, r, 16)
    expect(r.progress).toBe(600)
    expect(r.speed).toBe(0)
  })

  it('stops at the end of the text', () => {
    expect(advanceReveal(10, { progress: 9.9, speed: 500 }, 64).progress).toBe(10)
    expect(advanceReveal(10, { progress: 10, speed: 500 }, 16)).toEqual({ progress: 10, speed: 0 })
  })
})

describe('revealEnd', () => {
  it('never cuts a Vietnamese vowel from its combining tone mark', () => {
    // "Ừ" written as U + horn + grave: cutting after U would show it bare.
    const text = 'Rừa'
    expect(revealEnd(text, 2)).toBe(4)
    expect(revealEnd(text, 1)).toBe(1)
  })

  it('never cuts a surrogate pair', () => {
    const text = 'a😀b'
    expect(revealEnd(text, 2)).toBe(3)
  })
})

describe('arrivalOf', () => {
  it('draws what mounts while a thread opens still, and enters an id once', () => {
    markThreadOpened(1000)
    expect(arrivalOf('t1', 1500)).toBe(false)
    expect(arrivalOf('t2', 2000)).toBe(true)
    expect(arrivalOf('t2', 2100)).toBe(false)
    expect(arrivalOf(undefined, 1200, true)).toBe(true)
  })
})

describe('counting', () => {
  it('counts linearly over a second', () => {
    expect(countAt(0, 86, 500)).toBe(43)
    expect(countAt(0, 86, 2000)).toBe(86)
  })

  it('splits a figure into its number and the text around it', () => {
    expect(splitFigure('41%')).toEqual({ before: '', n: 41, decimals: 0, after: '%' })
    expect(splitFigure('6.2 h')).toEqual({ before: '', n: 6.2, decimals: 1, after: ' h' })
    expect(splitFigure('$142.30')).toEqual({ before: '$', n: 142.3, decimals: 2, after: '' })
    expect(splitFigure('New')).toBeUndefined()
  })
})
