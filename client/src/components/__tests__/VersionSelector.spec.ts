import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VersionSelector from '../VersionSelector.vue'
import { useCvssStore } from '@/stores/cvssStore'
import { setupComponentTests } from './setupTests'

vi.mock('../VersionSelector.vue', async () => {
  const originalModule = await vi.importActual('../VersionSelector.vue')
  return originalModule
})

describe('VersionSelector', () => {
  let store: ReturnType<typeof useCvssStore>

  beforeEach(() => {
    setupComponentTests()
    store = useCvssStore()
    vi.spyOn(store, 'setVersion')
  })

  it('renders both CVSS versions', () => {
    const wrapper = mount(VersionSelector)

    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('4.0')
    expect(wrapper.text()).toContain('3.1')
  })

  it('calls setVersion store method when button is clicked', async () => {
    const wrapper = mount(VersionSelector)

    const button31 = wrapper.get('button:nth-of-type(2)')
    await button31.trigger('click')

    expect(store.setVersion).toHaveBeenCalledWith('3.1')

    const button40 = wrapper.get('button:nth-of-type(1)')
    await button40.trigger('click')

    expect(store.setVersion).toHaveBeenCalledWith('4.0')
  })
})
