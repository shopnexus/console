import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { aliasOf, type AiModel, modelsFor, settingsFailure } from './settings'

describe('aliasOf', () => {
  it('makes a LiteLLM alias from a Vietnamese or English name', () => {
    expect(aliasOf('Trợ lý Đổi trả')).toBe('tro-ly-doi-tra')
    expect(aliasOf('  Weekly brief!! ')).toBe('weekly-brief')
  })
})

describe('modelsFor', () => {
  it('keeps the models that carry every required tag and counts the rest', () => {
    const m = (model: string, tags: string[]): AiModel => ({ model, tags, providers: [], agents: [] })
    const { fit, hidden } = modelsFor([m('a', ['Chat', 'Tool use']), m('baai/bge-m3', ['Embedding']), m('c', ['Chat'])], ['Chat', 'Tool use'])
    expect(fit.map((x) => x.model)).toEqual(['a'])
    expect(hidden).toBe(2)
  })
})

describe('settingsFailure', () => {
  it('names the refusals the settings endpoints give', () => {
    expect(settingsFailure(new ApiError(409, 'ai_provider_in_use', ''))).toBe('An agent still runs on this provider.')
    expect(settingsFailure(new ApiError(409, 'ai_agent_app_fixed', ''))).toMatch(/app agent/)
    expect(settingsFailure(new ApiError(400, 'something_new', ''))).toBe('That did not save.')
  })
})
