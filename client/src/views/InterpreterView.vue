<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import CvssCalculator from '@/components/CvssCalculator.vue'
import InterpretationDisplay from '@/components/InterpretationDisplay.vue'
import ReportGenerator from '@/components/ReportGenerator.vue'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'
const cvssStore = useCvssStore()
const { cvssString, selectedVersion } = storeToRefs(cvssStore)
const { setSelectedMetrics } = cvssStore

onMounted(() => {
  if (!cvssStore.definitions[cvssStore.selectedVersion]) {
    cvssStore.fetchDefinitions()
  }
})

const currentScore = computed(() => {
  return selectedVersion.value === '4.0' ? '0.0 (None)' : '0.0'
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
  const defaults = selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
  const resetValues = { ...defaults }
  setSelectedMetrics(resetValues)
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <div class="sticky top-0 z-10 px-4 pt-2 pb-3 mb-4 bg-white border-b border-gray-300 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-base font-semibold text-gray-700">
          {{ cvssVersionFullName }} Vector & Score
        </h2>
        <div class="flex space-x-2">
          <button
            @click="resetMetrics"
            class="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Reset
          </button>
          <button
            @click="copyToClipboard"
            class="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 transition-colors bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            data-tooltip="Copy CVSS vector string to clipboard"
          >
            <svg
              v-if="!copiedToClipboard"
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
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="mr-1 h-3.5 w-3.5 text-green-600"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {{ copiedToClipboard ? 'Copied!' : 'Copy' }}
          </button>
          <ReportGenerator :current-score="currentScore" />
        </div>
      </div>

      <div class="p-3 border border-gray-200 rounded-md bg-gray-50">
        <div class="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div
            class="flex-grow px-3 py-2 text-sm bg-white border border-gray-200 rounded shadow-inner"
          >
            <p class="font-mono text-gray-800 break-all">{{ cvssString }}</p>
          </div>
          <div
            class="px-3 py-2 mt-2 text-sm font-medium text-blue-800 border border-blue-200 rounded whitespace-nowrap bg-blue-50 md:mt-0"
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
          <div class="h-full">
            <InterpretationDisplay />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
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
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
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
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
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
