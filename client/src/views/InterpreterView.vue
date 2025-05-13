<script lang="ts" setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import CvssCalculator from '@/components/CvssCalculator.vue'
import InterpretationDisplay from '@/components/InterpretationDisplay.vue'
import ReportGenerator from '@/components/ReportGenerator.vue'
import {
  defaultMetricsV3_1,
  defaultMetricsV4_0,
  metricOrderV3_1,
  metricOrderV4_0,
} from '@/constants/cvssConstants'
import { Cvss3P1, Cvss4P0 } from 'ae-cvss-calculator'
import { useRoute, useRouter } from 'vue-router'

const cvssStore = useCvssStore()
const route = useRoute()
const router = useRouter()

const { cvssString, selectedVersion } = storeToRefs(cvssStore)
const { setVersion, setSelectedMetrics } = cvssStore

const isProcessingUrl = ref(false)
const editMode = ref(false)
const editableVectorString = ref('')
const editableVectorError = ref('')

function isValidMetricValue(version: '3.1' | '4.0', metric: string, value: string): boolean {
  const definitions = cvssStore.definitions[version]
  if (!definitions) {
    console.warn(`Definitions for version ${version} not loaded yet for validation.`)
    return false
  }
  return definitions.some((def) => def.metric_key === metric && def.value_key === value)
}

function parseAndApplyVector(vector: string) {
  if (!vector || typeof vector !== 'string' || !vector.startsWith('CVSS:')) {
    resetMetrics()
    return
  }
  isProcessingUrl.value = true
  let shouldReset = false

  try {
    const vectorPrefix = vector.split('/')[0]
    const metricsPart = vector.substring(vectorPrefix.length + 1)
    let version: '3.1' | '4.0' | null = null
    let newMetrics: Record<string, string> = {}
    let baseDefaults: Record<string, string> = {}
    let validVectorPrefix = false

    if (vectorPrefix === 'CVSS:4.0') {
      version = '4.0'
      baseDefaults = defaultMetricsV4_0
      newMetrics = { ...baseDefaults }
      validVectorPrefix = true
    } else if (vectorPrefix === 'CVSS:3.1') {
      version = '3.1'
      baseDefaults = defaultMetricsV3_1
      newMetrics = { ...baseDefaults }
      validVectorPrefix = true
    } else {
      console.error('Invalid CVSS vector prefix:', vectorPrefix)
      shouldReset = true
    }

    if (validVectorPrefix && version) {
      if (!cvssStore.definitions[version]) {
        console.warn(`Definitions not ready for version ${version}, cannot fully validate vector.`)
        shouldReset = true
      } else {
        const currentOrder = version === '4.0' ? metricOrderV4_0 : metricOrderV3_1
        const metricPairRegex = /([A-Z]{1,3}[2-3]?):([A-Za-z0-9]{1,5})/g
        let match
        let parseError = false

        while ((match = metricPairRegex.exec(metricsPart)) !== null) {
          const key = match[1]
          const value = match[2]

          if (currentOrder.includes(key)) {
            if (isValidMetricValue(version, key, value)) {
              newMetrics[key] = value
            } else {
              console.warn(`Invalid value "${value}" for metric "${key}" in version ${version}`)
              parseError = true
              break
            }
          } else {
            console.warn(`Unknown metric "${key}" in version ${version}`)
            parseError = true
            break
          }
        }

        if (!parseError) {
          setVersion(version)
          nextTick(() => {
            setSelectedMetrics(newMetrics)
          })
        } else {
          shouldReset = true
        }
      }
    }
  } catch (e) {
    shouldReset = true
  } finally {
    if (shouldReset) {
      resetMetrics()
    }
    setTimeout(() => {
      isProcessingUrl.value = false
    }, 50)
  }
}

onMounted(async () => {
  await cvssStore.fetchDefinitions()
  const hash = route.hash
  if (hash && hash.startsWith('#CVSS:')) {
    const vectorFromHash = hash.substring(1)
    parseAndApplyVector(vectorFromHash)
  } else if (!cvssStore.definitions[cvssStore.selectedVersion]) {
    await cvssStore.fetchDefinitions()
  }
})

watch(
  () => route.hash,
  (newHash, oldHash) => {
    if (newHash !== oldHash && newHash && newHash.startsWith('#CVSS:') && !isProcessingUrl.value) {
      const vectorFromHash = newHash.substring(1)
      parseAndApplyVector(vectorFromHash)
    } else if (!newHash && oldHash && !isProcessingUrl.value) {
      resetMetrics()
    }
  }
)

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
  if (route.hash) {
    router.replace({ hash: '' })
  }
}

function startEditing() {
  editableVectorString.value = cvssString.value
  editMode.value = true
  editableVectorError.value = ''
}

function applyVectorChanges() {
  if (!editableVectorString.value) {
    resetMetrics()
    editMode.value = false
    return
  }

  if (!editableVectorString.value.startsWith('CVSS:')) {
    editableVectorError.value = 'Vector must start with CVSS: prefix'
    return
  }

  const prefix = editableVectorString.value.split('/')[0]
  let version: '3.1' | '4.0' | null = null

  if (prefix === 'CVSS:4.0') {
    version = '4.0'
  } else if (prefix === 'CVSS:3.1') {
    version = '3.1'
  } else {
    editableVectorError.value = 'Invalid CVSS version (must be 3.1 or 4.0)'
    return
  }

  try {
    if (version === '4.0') {
      new Cvss4P0(editableVectorString.value)
    } else {
      new Cvss3P1(editableVectorString.value)
    }

    editMode.value = false
    parseAndApplyVector(editableVectorString.value)

    router.replace({ hash: editableVectorString.value })
  } catch (error) {
    editableVectorError.value = 'Invalid vector format'
    console.error('Error validating CVSS string:', error)
  }
}

function cancelEditing() {
  editMode.value = false
  editableVectorError.value = ''
}

watch(cvssString, (newVector) => {
  if (isProcessingUrl.value) {
    return
  }
  const currentHash = route.hash
  const newHash = `#${newVector}`
  const isValidScore = calculatedScoreData.value.status === 'valid'

  if (isValidScore && newVector && newVector.includes('/') && newHash !== currentHash) {
    router.replace({ hash: newHash })
  } else if (!isValidScore && currentHash && currentHash !== '#') {
    router.replace({ hash: '' })
  } else if (newVector && !newVector.includes('/') && currentHash && currentHash !== '#') {
    router.replace({ hash: '' })
  }
})
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div
      class="sticky top-0 z-20 flex-shrink-0 border-b border-gray-300 bg-white px-4 pb-3 pt-2 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="mb-2 flex flex-wrap items-center justify-between gap-y-2">
        <h2 class="text-base font-semibold text-gray-700 dark:text-gray-200">
          {{ cvssVersionFullName }} Vector & Score
        </h2>
        <div
          class="top-buttons flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:space-x-2"
        >
          <button
            @click="resetMetrics"
            class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-gray-500"
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
            class="inline-flex items-center rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/60"
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

      <div
        class="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50"
      >
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div class="flex-grow">
            <div
              v-if="!editMode"
              class="flex min-w-0 items-center rounded border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-inner dark:border-gray-500 dark:bg-gray-900"
            >
              <p
                class="flex-grow truncate font-mono text-gray-800 dark:text-gray-200"
                :title="cvssString"
              >
                {{ cvssString }}
              </p>
              <button
                @click="startEditing"
                class="ml-2 flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                title="Edit vector string"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
            </div>
            <div v-else class="flex flex-col">
              <div
                class="flex rounded border border-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-400 dark:border-gray-500 dark:bg-gray-900"
              >
                <input
                  v-model="editableVectorString"
                  type="text"
                  class="min-w-0 flex-grow border-none bg-transparent px-3 py-1.5 font-mono text-sm text-gray-900 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="CVSS:4.0/AV:N/AC:L/..."
                />
                <div class="flex flex-shrink-0 border-l border-gray-300 dark:border-gray-500">
                  <button
                    @click="applyVectorChanges"
                    class="px-2 text-green-600 hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-800"
                    title="Apply changes"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-5 w-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </button>
                  <button
                    @click="cancelEditing"
                    class="px-2 text-red-600 hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-800"
                    title="Cancel editing"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-5 w-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <p v-if="editableVectorError" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ editableVectorError }}
              </p>
            </div>
          </div>

          <div :class="scoreDisplayClass" class="flex-shrink-0">
            {{ calculatedScoreData.display }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
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

[data-tooltip]::after,
[data-tooltip]::before {
  position: absolute;
  left: 50%;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  top: auto;
  bottom: 100%;
  transform: translateX(-50%) translateY(-5px);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
}

.dark [data-tooltip]::after {
  background: rgba(237, 242, 247, 0.9);
  color: #1a202c;
}

[data-tooltip]::before {
  content: '';
  top: auto;
  bottom: 100%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}

.dark [data-tooltip]::before {
  border-top-color: rgba(237, 242, 247, 0.9);
}

.top-buttons [data-tooltip]:hover::after {
  top: 100%;
  bottom: auto;
  transform: translateX(-50%) translateY(5px);
}

.top-buttons [data-tooltip]:hover::before {
  top: 100%;
  bottom: auto;
  border-top-color: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.8);
}

.dark .top-buttons [data-tooltip]:hover::before {
  border-bottom-color: rgba(237, 242, 247, 0.9);
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
