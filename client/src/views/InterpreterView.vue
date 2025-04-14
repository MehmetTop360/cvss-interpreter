<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import CvssCalculator from '@/components/CvssCalculator.vue'
import InterpretationDisplay from '@/components/InterpretationDisplay.vue'
import ReportGenerator from '@/components/ReportGenerator.vue'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'

const cvssStore = useCvssStore()

const { cvssString, selectedVersion, selectedMetrics } = storeToRefs(cvssStore)
const { setSelectedMetrics } = cvssStore

onMounted(() => {
  if (!cvssStore.definitions[cvssStore.selectedVersion]) {
    cvssStore.fetchDefinitions()
  }
})

const currentScore = computed(() => {
  return '0.0 (None)'
})

const cvssVersionFullName = computed(() => {
  return selectedVersion.value === '4.0' ? 'CVSS 4.0' : 'CVSS 3.1'
})

const copiedToClipboard = ref(false)

function copyToClipboard() {
  navigator.clipboard.writeText(cvssString.value).then(() => {
    copiedToClipboard.value = true
    setTimeout(() => {
      copiedToClipboard.value = false
    }, 2000)
  })
}

function resetMetrics() {
  console.log('Resetting metrics for version: ', selectedVersion.value)
  const defaults = selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1

  const resetValues = { ...defaults }
  console.log('Reset values: ', resetValues)

  setSelectedMetrics(resetValues)
}

watch(
  selectedMetrics,
  () => {
    console.log('Selected metrics changed - updating CVSS string')
  },
  { deep: true }
)
</script>

<template>
  <div class="flex h-full flex-col bg-gray-50">
    <div class="sticky top-0 z-10 mb-4 border-b border-gray-300 bg-white px-4 pb-3 pt-2 shadow-sm">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-700">
          {{ cvssVersionFullName }} Vector & Score
        </h2>
        <div class="flex space-x-2">
          <button
            @click="resetMetrics"
            class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
            data-tooltip="Reset all metrics to default values"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="mr-1 h-3.5 w-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Reset
          </button>
          <button
            @click="copyToClipboard"
            class="inline-flex items-center rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
            data-tooltip="Copy CVSS vector string to clipboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="mr-1 h-3.5 w-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
              />
            </svg>
            {{ copiedToClipboard ? 'Copied!' : 'Copy' }}
          </button>
          <ReportGenerator :current-score="currentScore" />
        </div>
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3 font-mono">
        <div class="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div
            class="flex-grow rounded border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner"
          >
            <p class="break-all text-gray-800">{{ cvssString }}</p>
          </div>
          <div
            class="mt-2 whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 md:mt-0"
          >
            Score: {{ currentScore }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow px-4 pb-6">
      <div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 lg:col-span-7">
          <CvssCalculator />
        </div>

        <div class="col-span-12 lg:col-span-5">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-700">Interpretation</h2>
          </div>
          <div class="h-full">
            <InterpretationDisplay />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.rounded-md) {
  border-radius: 0.375rem;
}

:deep(.border) {
  border-width: 1px;
}

:deep(.shadow-sm) {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:deep(.calculator-container) {
  background-color: white;
  border-color: #e5e7eb;
}

[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.5s,
    visibility 0.5s;
  transition-delay: 0.8s;
}

[data-tooltip]::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.5s,
    visibility 0.5s;
  transition-delay: 0.8s;
}

[data-tooltip]:hover::after,
[data-tooltip]:hover::before {
  opacity: 1;
  visibility: visible;
}

[data-tooltip]:not(:hover)::after,
[data-tooltip]:not(:hover)::before {
  transition-delay: 0s;
}
</style>
