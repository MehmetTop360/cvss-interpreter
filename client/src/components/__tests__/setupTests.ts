import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

export function setupComponentTests() {
  setActivePinia(createPinia())

  document.body.innerHTML = ''

  vi.clearAllMocks()
}

vi.mock('flowbite-vue', () => ({
  FwbButtonGroup: {
    name: 'FwbButtonGroup',
    template: '<div class="fwb-button-group"><slot /></div>',
  },
  FwbButton: {
    name: 'FwbButton',
    template: '<button :data-color="color" class="capitalize"><slot /></button>',
    props: {
      color: {
        type: String,
        default: 'light',
      },
      size: {
        type: String,
        default: 'md',
      },
    },
  },
  FwbHeading: {
    name: 'FwbHeading',
    template: '<div class="heading-mock" :data-tag="tag"><slot /></div>',
    props: {
      tag: {
        type: String,
        default: 'h1',
      },
    },
  },
}))

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
