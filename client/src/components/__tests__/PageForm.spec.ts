import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PageForm from '../PageForm.vue'
import { setupComponentTests } from './setupTests'

vi.mock('../PageForm.vue', async () => {
  const originalModule = await vi.importActual('../PageForm.vue')
  return originalModule
})

describe('PageForm', () => {
  beforeEach(() => {
    setupComponentTests()
  })

  it('renders the heading correctly', () => {
    const heading = 'Test Form Heading'
    const wrapper = mount(PageForm, {
      props: {
        heading,
        formLabel: 'Test Form',
      },
    })

    expect(wrapper.text()).toContain(heading)
  })

  it('sets the form aria-label correctly', () => {
    const formLabel = 'Test Form Label'
    const wrapper = mount(PageForm, {
      props: {
        heading: 'Test',
        formLabel,
      },
    })

    const form = wrapper.find('form')
    expect(form.attributes('aria-label')).toBe(formLabel)
  })

  it('emits submit event when form is submitted', async () => {
    const wrapper = mount(PageForm, {
      props: {
        heading: 'Test',
        formLabel: 'Test Form',
      },
    })

    const form = wrapper.find('form')
    await form.trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')!.length).toBe(1)
  })

  it('renders default slot content', () => {
    const slotContent = 'Test slot content'
    const wrapper = mount(PageForm, {
      props: {
        heading: 'Test',
        formLabel: 'Test Form',
      },
      slots: {
        default: slotContent,
      },
    })

    expect(wrapper.text()).toContain(slotContent)
  })

  it('renders footer slot content', () => {
    const footerContent = 'Test footer content'
    const wrapper = mount(PageForm, {
      props: {
        heading: 'Test',
        formLabel: 'Test Form',
      },
      slots: {
        footer: footerContent,
      },
    })

    expect(wrapper.text()).toContain(footerContent)
  })
})
