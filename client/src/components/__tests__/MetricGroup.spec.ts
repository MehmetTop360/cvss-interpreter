import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricGroup from '../MetricGroup.vue'
import { setupComponentTests } from './setupTests'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'

vi.mock('../MetricGroup.vue', async () => {
  const originalModule = await vi.importActual('../MetricGroup.vue')
  return originalModule
})

describe('MetricGroup', () => {
  beforeEach(() => {
    setupComponentTests()
  })

  const mockValues: CvssTemplateBare[] = [
    {
      id: 1,
      metric_key: 'AV',
      value_key: 'N',
      value_name: 'Network',
      official_description: 'The vulnerability can be exploited from the network.',
      simplified_description: 'Attackable over the internet.',
      version: '4.0',
      metric_name: 'Attack Vector',
    },
    {
      id: 2,
      metric_key: 'AV',
      value_key: 'A',
      value_name: 'Adjacent',
      official_description: 'The vulnerability requires the attacker to be on the same network.',
      simplified_description: 'Attackable from the same network.',
      version: '4.0',
      metric_name: 'Attack Vector',
    },
  ]

  it('renders the metric name and key', () => {
    const wrapper = mount(MetricGroup, {
      props: {
        metricKey: 'AV',
        metricName: 'Attack Vector',
        values: mockValues,
        selectedValue: 'N',
      },
    })

    expect(wrapper.text()).toContain('Attack Vector')
    expect(wrapper.text()).toContain('(AV)')
  })

  it('renders all metric values as buttons', () => {
    const wrapper = mount(MetricGroup, {
      props: {
        metricKey: 'AV',
        metricName: 'Attack Vector',
        values: mockValues,
        selectedValue: 'N',
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
    expect(wrapper.text()).toContain('N: Network')
    expect(wrapper.text()).toContain('A: Adjacent')
  })

  it('emits update event when a value is selected', async () => {
    const wrapper = mount(MetricGroup, {
      props: {
        metricKey: 'AV',
        metricName: 'Attack Vector',
        values: mockValues,
        selectedValue: 'N',
      },
    })

    const adjacentButton = wrapper.findAll('button')[1]
    await adjacentButton.trigger('click')

    expect(wrapper.emitted('update:metricValue')).toBeTruthy()
    expect(wrapper.emitted('update:metricValue')![0]).toEqual(['AV', 'A'])
  })

  it('applies different styling to the selected value', () => {
    const wrapper = mount(MetricGroup, {
      props: {
        metricKey: 'AV',
        metricName: 'Attack Vector',
        values: mockValues,
        selectedValue: 'N',
      },
    })

    const buttons = wrapper.findAll('button')

    expect(buttons[0].classes().join(' ')).toContain('metric-button')

    expect(buttons[1].classes().join(' ')).toContain('metric-button')
  })
})
