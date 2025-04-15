<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import CvssCalculator from '@/components/CvssCalculator.vue'
import InterpretationDisplay from '@/components/InterpretationDisplay.vue'
import ReportGenerator from '@/components/ReportGenerator.vue'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'
import { Cvss3P1, Cvss4P0 } from 'ae-cvss-calculator'

const cvssStore = useCvssStore()
const { cvssString, selectedVersion } = storeToRefs(cvssStore)
const { setSelectedMetrics } = cvssStore

onMounted(() => {
  if (!cvssStore.definitions[cvssStore.selectedVersion]) {
    cvssStore.fetchDefinitions()
  }
})

type SeverityRating = 'None' | 'Low' | 'Medium' | 'High' | 'Critical' | 'Invalid' | 'Error'

function getSeverityRating(score: number | null): SeverityRating {
  if (score === null || score === undefined) return 'None'
  if (score === 0.0) return 'None'
  if (score >= 0.1 && score <= 3.9) return 'Low'
  if (score >= 4.0 && score <= 6.9) return 'Medium'
  if (score >= 7.0 && score <= 8.9) return 'High'
  if (score >= 9.0 && score <= 10.0) return 'Critical'
  return 'None'
}

const calculatedScoreData = computed(() => {
  const vector = cvssString.value
  const version = selectedVersion.value
  let scoreValue: number | null = null
  let severity: SeverityRating = 'None'
  let display: string = '0.0 (None)'
  let status: 'valid' | 'invalid' | 'error' | 'nodata' = 'nodata'

  if (
    !vector ||
    (vector.startsWith('CVSS:4.0/') && vector.length <= 9) ||
    (vector.startsWith('CVSS:3.1/') && vector.length <= 9)
  ) {
    display = version === '4.0' ? '0.0 (None)' : '0.0 (None)'
    status = 'valid'
    scoreValue = 0.0
    severity = 'None'
  } else {
    try {
      let calculator
      let scores

      if (version === '4.0' && vector.startsWith('CVSS:4.0/')) {
        calculator = new Cvss4P0(vector)
        scores = calculator.calculateScores()
        scoreValue = scores?.overall ?? null
        severity = getSeverityRating(scoreValue)
        status = 'valid'
      } else if (version === '3.1' && vector.startsWith('CVSS:3.1/')) {
        calculator = new Cvss3P1(vector)
        scores = calculator.calculateScores()
        scoreValue = scores?.overall ?? scores?.base ?? null
        severity = getSeverityRating(scoreValue)
        status = 'valid'
      } else {
        console.warn(
          `Vector string "${vector}" does not match selected version "${version}" or is invalid.`
        )
        severity = 'Invalid'
        status = 'invalid'
      }

      if (status === 'valid') {
        if (scoreValue !== null) {
          display = `${scoreValue.toFixed(1)} (${severity})`
        } else {
          console.warn('Score calculation returned null for vector:', vector)
          severity = 'Error'
          status = 'error'
        }
      }
    } catch (error) {
      console.error('Error calculating CVSS score:', error, 'Vector:', vector)
      severity = 'Invalid'
      status = 'invalid'
    }
  }

  if (status === 'invalid') display = 'Invalid Vector'
  if (status === 'error') display = 'Calculation Error'
  if (scoreValue === 0.0) severity = 'None'

  return {
    score: scoreValue,
    severity: severity,
    display: display,
    status: status,
  }
})

const scoreDisplayClass = computed(() => {
  const severity = calculatedScoreData.value.severity
  const baseClasses = 'mt-2 whitespace-nowrap rounded border px-3 py-2 text-sm font-medium md:mt-0'
  switch (severity) {
    case 'None':
      return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`
    case 'Low':
      return `${baseClasses} bg-green-100 text-green-800 border-green-300`
    case 'Medium':
      return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`
    case 'High':
      return `${baseClasses} bg-orange-100 text-orange-800 border-orange-300`
    case 'Critical':
      return `${baseClasses} bg-red-100 text-red-800 border-red-300 font-semibold`
    case 'Invalid':
    case 'Error':
    default:
      return `${baseClasses} bg-gray-200 text-gray-600 border-gray-400`
  }
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
  <div class="flex h-full flex-col bg-gray-50">
    <div class="sticky top-0 z-10 mb-4 border-b border-gray-300 bg-white px-4 pb-3 pt-2 shadow-sm">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-700">
          {{ cvssVersionFullName }} Vector & Score
        </h2>
        <div class="flex space-x-2">
          <button
            @click="resetMetrics"
            class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Reset
          </button>
          <button
            @click="copyToClipboard"
            class="inline-flex items-center rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
          <ReportGenerator :current-score="calculatedScoreData.display" />
        </div>
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div class="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div
            class="flex-grow rounded border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner"
          >
            <p class="break-all font-mono text-gray-800">{{ cvssString }}</p>
          </div>
          <div :class="scoreDisplayClass">Score: {{ calculatedScoreData.display }}</div>
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
