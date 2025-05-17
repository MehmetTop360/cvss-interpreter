import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCvssStore } from '../cvssStore'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'

vi.mock('@/trpc', () => ({
  trpc: {
    CvssTemplate: {
      getDefinitionsByVersion: {
        query: vi.fn().mockImplementation(({ version }) => {
          if (version === '3.1') {
            return Promise.resolve([{ id: 'test-3-1', metric_key: 'AV', value_key: 'N' }])
          } else if (version === '4.0') {
            return Promise.resolve([{ id: 'test-4-0', metric_key: 'AV', value_key: 'N' }])
          }
          return Promise.resolve([])
        }),
      },
    },
  },
}))

describe('CVSS Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const store = useCvssStore()

    expect(store.selectedVersion).toBe('4.0')
    expect(store.selectedDescriptionType).toBe('simplified')
    expect(store.selectedMetrics).toEqual(defaultMetricsV4_0)
    expect(store.definitions['3.1']).toBeNull()
    expect(store.definitions['4.0']).toBeNull()
    expect(store.isLoadingDefinitions).toBe(false)
    expect(store.errorLoadingDefinitions).toBeNull()
    expect(store.theme).toBe('light')
  })

  it('changes version and updates metrics accordingly', async () => {
    const store = useCvssStore()

    expect(store.selectedVersion).toBe('4.0')
    expect(store.selectedMetrics).toEqual(defaultMetricsV4_0)

    store.setVersion('3.1')
    await vi.waitFor(() => expect(store.isLoadingDefinitions).toBe(false))

    expect(store.selectedVersion).toBe('3.1')
    expect(store.selectedMetrics).toEqual(defaultMetricsV3_1)

    store.setVersion('4.0')
    await vi.waitFor(() => expect(store.isLoadingDefinitions).toBe(false))

    expect(store.selectedVersion).toBe('4.0')
    expect(store.selectedMetrics).toEqual(defaultMetricsV4_0)
  })

  it('toggles description type', () => {
    const store = useCvssStore()

    expect(store.selectedDescriptionType).toBe('simplified')
    expect(store.preferredDescriptionKey).toBe('simplified_description')

    store.setDescriptionType('official')

    expect(store.selectedDescriptionType).toBe('official')
    expect(store.preferredDescriptionKey).toBe('official_description')

    store.setDescriptionType('simplified')

    expect(store.selectedDescriptionType).toBe('simplified')
    expect(store.preferredDescriptionKey).toBe('simplified_description')
  })

  it('sets a metric value correctly', () => {
    const store = useCvssStore()

    store.setMetricValue('AV', 'N')

    expect(store.selectedMetrics.AV).toBe('N')

    store.setMetricValue('AV', 'L')

    expect(store.selectedMetrics.AV).toBe('L')
  })

  it('generates a correct CVSS string', () => {
    const store = useCvssStore()

    expect(store.cvssString).toContain('CVSS:4.0/')

    store.setMetricValue('AV', 'N')
    store.setMetricValue('AC', 'L')
    store.setMetricValue('AT', 'N')

    expect(store.cvssString).toContain('AV:N')
    expect(store.cvssString).toContain('AC:L')
    expect(store.cvssString).toContain('AT:N')

    store.resetCurrentMetrics()

    expect(store.selectedMetrics).toEqual(defaultMetricsV4_0)
  })

  it('fetches definitions successfully', async () => {
    const store = useCvssStore()

    expect(store.isLoadingDefinitions).toBe(false)
    expect(store.definitions['3.1']).toBeNull()
    expect(store.definitions['4.0']).toBeNull()

    await store.fetchDefinitions()

    expect(store.isLoadingDefinitions).toBe(false)
    expect(store.definitions['4.0']).toEqual([{ id: 'test-4-0', metric_key: 'AV', value_key: 'N' }])

    store.setVersion('3.1')
    await vi.waitFor(() => expect(store.isLoadingDefinitions).toBe(false))

    expect(store.definitions['3.1']).toEqual([{ id: 'test-3-1', metric_key: 'AV', value_key: 'N' }])
  })
})
