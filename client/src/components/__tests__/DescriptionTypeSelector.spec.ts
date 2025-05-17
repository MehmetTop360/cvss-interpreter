import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DescriptionTypeSelector from '../DescriptionTypeSelector.vue'
import { useCvssStore } from '@/stores/cvssStore'
import { setupComponentTests } from './setupTests'

vi.mock('../DescriptionTypeSelector.vue', async () => {
  const originalModule = await vi.importActual('../DescriptionTypeSelector.vue')
  return originalModule
})

describe('DescriptionTypeSelector', () => {
  let store: ReturnType<typeof useCvssStore>

  beforeEach(() => {
    setupComponentTests()
    store = useCvssStore()
    vi.spyOn(store, 'setDescriptionType')
  })

  it('renders both description types', () => {
    const wrapper = mount(DescriptionTypeSelector)
    const buttons = wrapper.findAll('button')

    expect(buttons.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('simplified')
    expect(wrapper.text()).toContain('official')
  })

  it('calls setDescriptionType store method when button is clicked', async () => {
    const wrapper = mount(DescriptionTypeSelector)

    const officialButton = wrapper.get('button:nth-of-type(2)')
    await officialButton.trigger('click')

    expect(store.setDescriptionType).toHaveBeenCalledWith('official')

    const simplifiedButton = wrapper.get('button:nth-of-type(1)')
    await simplifiedButton.trigger('click')

    expect(store.setDescriptionType).toHaveBeenCalledWith('simplified')
  })
})
