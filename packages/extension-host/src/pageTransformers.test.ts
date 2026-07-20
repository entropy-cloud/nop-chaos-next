import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  registerPageTransformer,
  unregisterPageTransformer,
  getPageTransformers,
  applyPageTransformers,
  clearPageTransformers,
} from './pageTransformers'

beforeEach(() => {
  clearPageTransformers()
})

describe('registerPageTransformer', () => {
  it('inserts transformers in ascending order', () => {
    registerPageTransformer({ id: 'b', order: 10, transform: () => undefined })
    registerPageTransformer({ id: 'a', order: 1, transform: () => undefined })
    registerPageTransformer({ id: 'c', order: 5, transform: () => undefined })

    const ids = getPageTransformers().map((r) => r.id)
    expect(ids).toEqual(['a', 'c', 'b'])
  })

  it('preserves registration order for same order value', () => {
    registerPageTransformer({ id: 'first', order: 5, transform: () => undefined })
    registerPageTransformer({ id: 'second', order: 5, transform: () => undefined })
    registerPageTransformer({ id: 'third', order: 5, transform: () => undefined })

    const ids = getPageTransformers().map((r) => r.id)
    expect(ids).toEqual(['first', 'second', 'third'])
  })

  it('defaults order to 100 when not specified', () => {
    registerPageTransformer({ id: 'low', order: 50, transform: () => undefined })
    registerPageTransformer({ id: 'default', transform: () => undefined })
    registerPageTransformer({ id: 'high', order: 200, transform: () => undefined })

    const ids = getPageTransformers().map((r) => r.id)
    expect(ids).toEqual(['low', 'default', 'high'])
  })
})

describe('unregisterPageTransformer', () => {
  it('removes a registered transformer by id', () => {
    registerPageTransformer({ id: 'keep', order: 1, transform: () => undefined })
    registerPageTransformer({ id: 'remove', order: 2, transform: () => undefined })
    registerPageTransformer({ id: 'stay', order: 3, transform: () => undefined })

    unregisterPageTransformer('remove')

    const ids = getPageTransformers().map((r) => r.id)
    expect(ids).toEqual(['keep', 'stay'])
  })

  it('does nothing when id does not exist', () => {
    registerPageTransformer({ id: 'only', transform: () => undefined })
    unregisterPageTransformer('nonexistent')
    expect(getPageTransformers()).toHaveLength(1)
  })
})

describe('getPageTransformers', () => {
  it('returns a read-only snapshot', () => {
    registerPageTransformer({ id: 'a', transform: () => undefined })
    const snapshot = getPageTransformers()
    registerPageTransformer({ id: 'b', transform: () => undefined })
    expect(snapshot).toHaveLength(1)
  })

  it('returns empty array when nothing registered', () => {
    expect(getPageTransformers()).toHaveLength(0)
  })
})

describe('applyPageTransformers', () => {
  it('chains transformers sequentially, passing output to next', async () => {
    const calls: number[] = []
    registerPageTransformer({
      id: 'step1',
      order: 1,
      transform: (s: Record<string, unknown>) => {
        calls.push(1)
        return { ...s, step1: true }
      },
    })
    registerPageTransformer({
      id: 'step2',
      order: 2,
      transform: (s: Record<string, unknown>) => {
        calls.push(2)
        return { ...s, step2: true }
      },
    })

    const result = await applyPageTransformers({ initial: true }, { schemaPath: '/test', pageType: 'amis' })
    expect(calls).toEqual([1, 2])
    expect(result).toEqual({ initial: true, step1: true, step2: true })
  })

  it('keeps input unchanged when transformer returns undefined', async () => {
    registerPageTransformer({
      id: 'noop',
      transform: () => undefined,
    })

    const input = { key: 'value' }
    const result = await applyPageTransformers(input, { schemaPath: '/test', pageType: 'flux' })
    expect(result).toBe(input)
  })

  it('skips a throwing transformer and continues with next', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerPageTransformer({
      id: 'thrower',
      order: 1,
      transform: () => { throw new Error('boom') },
    })
    registerPageTransformer({
      id: 'catcher',
      order: 2,
      transform: (s: Record<string, unknown>) => ({ ...s, recovered: true }),
    })

    const result = await applyPageTransformers({ start: true }, { schemaPath: '/test', pageType: 'amis' })
    expect(result).toEqual({ start: true, recovered: true })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('thrower'),
    )

    warnSpy.mockRestore()
  })

  it('returns original schema when all transformers throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerPageTransformer({
      id: 'fail1',
      order: 1,
      transform: () => { throw new Error('fail1') },
    })
    registerPageTransformer({
      id: 'fail2',
      order: 2,
      transform: () => { throw new Error('fail2') },
    })

    const input = { original: true }
    const result = await applyPageTransformers(input, { schemaPath: '/test', pageType: 'flux' })
    expect(result).toEqual(input)
    expect(warnSpy).toHaveBeenCalledTimes(2)

    warnSpy.mockRestore()
  })

  it('supports async transformers', async () => {
    registerPageTransformer({
      id: 'async',
      order: 1,
      transform: async (s: Record<string, unknown>) => {
        const data = await Promise.resolve({ async: true })
        return { ...s, ...data }
      },
    })

    const result = await applyPageTransformers({}, { schemaPath: '/test', pageType: 'amis' })
    expect(result).toEqual({ async: true })
  })

  it('preserves generic type inference through applyPageTransformers', async () => {
    interface CustomSchema {
      title: string
      items: number[]
    }

    registerPageTransformer({
      id: 'custom',
      transform: (schema: Record<string, unknown>) => {
        const items = (schema as Record<string, unknown>).items as number[] ?? []
        return { ...schema, items: [...items, 99] }
      },
    })

    const input: CustomSchema = { title: 'test', items: [1, 2, 3] }
    const result = await applyPageTransformers<CustomSchema>(input, { schemaPath: '/test', pageType: 'flux' })
    expect(result).toEqual({ title: 'test', items: [1, 2, 3, 99] })
  })
})
