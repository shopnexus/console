import { describe, expect, it } from 'vitest'
import { matchCommands, parseCommand, recordTabs, stepTab } from './commands'

const cmds = [{ name: 'new' }, { name: 'clear' }, { name: 'reply' }]

describe('parseCommand', () => {
  it('reads a command and what follows it', () => {
    expect(parseCommand('/new  why is it late ', cmds)).toEqual({ name: 'new', arg: 'why is it late' })
    expect(parseCommand('/clear', cmds)).toEqual({ name: 'clear', arg: '' })
    expect(parseCommand('/reply ngắn thôi\nlịch sự', cmds)).toEqual({ name: 'reply', arg: 'ngắn thôi\nlịch sự' })
  })

  it('leaves text that names no command as a question', () => {
    expect(parseCommand('/weekly-brief', cmds)).toBeUndefined()
    expect(parseCommand('is /new a command?', cmds)).toBeUndefined()
    expect(parseCommand('/', cmds)).toBeUndefined()
  })
})

it('matchCommands filters by the start of the name', () => {
  expect(matchCommands(cmds, '').map((c) => c.name)).toEqual(['new', 'clear', 'reply'])
  expect(matchCommands(cmds, 'RE').map((c) => c.name)).toEqual(['reply'])
})

describe('recordTabs', () => {
  const c = (id: string) => ({ id, updated_at: '' })
  it('orders the chats as they were made, drops closed ones and keeps new tabs last', () => {
    expect(recordTabs([c('0193b'), c('0193a'), c('0193c')], new Set(['0193c']), ['draft-1'])).toEqual(['0193a', '0193b', 'draft-1'])
  })
  it('shows a new tab once when the list already has it', () => {
    expect(recordTabs([c('0193a')], new Set(), ['0193a'])).toEqual(['0193a'])
  })
})

it('stepTab wraps at both ends', () => {
  const tabs = ['a', 'b', 'c']
  expect(stepTab(tabs, 'c', 1)).toBe('a')
  expect(stepTab(tabs, 'a', -1)).toBe('c')
  expect(stepTab(tabs, 'x', 1)).toBe('a')
  expect(stepTab([], 'a', 1)).toBeUndefined()
})
