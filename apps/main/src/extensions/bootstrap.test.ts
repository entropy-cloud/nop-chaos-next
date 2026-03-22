import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { LoadedExtension } from '@nop-chaos/shared'
import i18n from '../config/i18n'
import { loadExtensionI18nFromBaseUrl } from './bootstrap'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../config/i18n', () => ({
  default: {
    addResourceBundle: vi.fn()
  },
  initializeI18n: vi.fn().mockResolvedValue(undefined)
}))

describe('loadExtensionI18nFromBaseUrl', () => {
  const mockAddResourceBundle = vi.mocked(i18n.addResourceBundle)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads i18n resources from baseUrl for each language', async () => {
    const enResource = { greeting: 'Hello' }
    const frResource = { greeting: 'Bonjour' }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(enResource)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(frResource)
      })

    const loaded: LoadedExtension[] = [
      {
        source: { id: 'test-ext', entry: 'https://cdn.example.com/ext.js' },
        extension: {
          id: 'test-extension',
          i18n: {
            baseUrl: 'https://cdn.example.com/locales',
            languages: ['en-US', 'fr-FR']
          }
        }
      }
    ]

    await loadExtensionI18nFromBaseUrl(loaded)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.example.com/locales/en-US/translation.json')
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.example.com/locales/fr-FR/translation.json')

    expect(mockAddResourceBundle).toHaveBeenCalledTimes(2)
    expect(mockAddResourceBundle).toHaveBeenCalledWith('en-US', 'translation', enResource, true, true)
    expect(mockAddResourceBundle).toHaveBeenCalledWith('fr-FR', 'translation', frResource, true, true)
  })

  it('skips extensions without i18n config', async () => {
    const loaded: LoadedExtension[] = [
      {
        source: { id: 'test-ext', entry: 'https://cdn.example.com/ext.js' },
        extension: {
          id: 'test-extension'
        }
      }
    ]

    await loadExtensionI18nFromBaseUrl(loaded)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockAddResourceBundle).not.toHaveBeenCalled()
  })

  it('handles fetch failure gracefully', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    const loaded: LoadedExtension[] = [
      {
        source: { id: 'test-ext', entry: 'https://cdn.example.com/ext.js' },
        extension: {
          id: 'test-extension',
          i18n: {
            baseUrl: 'https://cdn.example.com/locales',
            languages: ['en-US']
          }
        }
      }
    ]

    await loadExtensionI18nFromBaseUrl(loaded)

    expect(mockAddResourceBundle).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load i18n for test-extension language en-US: 404')
    )

    consoleWarn.mockRestore()
  })

  it('handles network error gracefully', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const loaded: LoadedExtension[] = [
      {
        source: { id: 'test-ext', entry: 'https://cdn.example.com/ext.js' },
        extension: {
          id: 'test-extension',
          i18n: {
            baseUrl: 'https://cdn.example.com/locales',
            languages: ['en-US']
          }
        }
      }
    ]

    await loadExtensionI18nFromBaseUrl(loaded)

    expect(mockAddResourceBundle).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load i18n for test-extension language en-US: Network error')
    )

    consoleWarn.mockRestore()
  })

  it('supports relative baseUrl', async () => {
    const resource = { greeting: 'Hello' }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(resource)
    })

    const loaded: LoadedExtension[] = [
      {
        source: { id: 'test-ext', entry: 'https://cdn.example.com/ext.js' },
        extension: {
          id: 'test-extension',
          i18n: {
            baseUrl: './locales',
            languages: ['en-US']
          }
        }
      }
    ]

    await loadExtensionI18nFromBaseUrl(loaded)

    expect(mockFetch).toHaveBeenCalledWith('./locales/en-US/translation.json')
    expect(mockAddResourceBundle).toHaveBeenCalledWith('en-US', 'translation', resource, true, true)
  })
})
