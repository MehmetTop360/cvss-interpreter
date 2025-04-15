<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import { Cvss3P1, Cvss4P0 } from 'ae-cvss-calculator'
import type { CvssVersion } from '@/types/cvss'
import {
  metricOrderV3_1,
  metricOrderV4_0,
  metricGroupsV3_1,
  metricGroupsV4_0,
} from '@/constants/cvssConstants'

interface ComparisonItem {
  id: number
  vectorString: string
  isValid: boolean
  score: string
  severity: string
  version: CvssVersion
}

interface ExampleVector {
  key: string
  name: string
  v4: string
  v3: string
}

const cvssStore = useCvssStore()
const { cvssString, selectedVersion, defaultCvssString } = storeToRefs(cvssStore)

const comparisonItems = ref<ComparisonItem[]>([])

const initialV4Vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H'
const initialV3Vector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'

const exampleVectors: ExampleVector[] = [
  {
    key: 'rce',
    name: 'Remote Code Execution',
    v4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
    v3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
  },
  {
    key: 'sql_injection',
    name: 'SQL Injection',
    v4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:L/SI:L/SA:N',
    v3: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
  },
  {
    key: 'xss_stored',
    name: 'Stored XSS',
    v4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:A/VC:L/VI:L/VA:N/SC:L/SI:L/SA:N',
    v3: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N',
  },
  {
    key: 'csrf',
    name: 'CSRF',
    v4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N',
    v3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N',
  },
  {
    key: 'auth_bypass',
    name: 'Auth Bypass (Low Priv)',
    v4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N',
    v3: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
  },
  {
    key: 'local_privesc',
    name: 'Local Privilege Escalation',
    v4: 'CVSS:4.0/AV:L/AC:L/AT:P/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N',
    v3: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
  },
]

const validMetricValues: Record<CvssVersion, Record<string, string[]>> = {
  '4.0': {
    AV: ['N', 'A', 'L', 'P'],
    AC: ['L', 'H'],
    AT: ['N', 'P'],
    PR: ['N', 'L', 'H'],
    UI: ['N', 'P', 'A'],
    VC: ['N', 'L', 'H'],
    VI: ['N', 'L', 'H'],
    VA: ['N', 'L', 'H'],
    SC: ['N', 'L', 'H'],
    SI: ['N', 'L', 'H'],
    SA: ['N', 'L', 'H'],
  },
  '3.1': {
    AV: ['N', 'A', 'L', 'P'],
    AC: ['L', 'H'],
    PR: ['N', 'L', 'H'],
    UI: ['N', 'R'],
    S: ['U', 'C'],
    C: ['N', 'L', 'H'],
    I: ['N', 'L', 'H'],
    A: ['N', 'L', 'H'],
  },
}

function getRandomValue(version: CvssVersion, metric: string): string {
  const values = validMetricValues[version]?.[metric]
  return values ? values[Math.floor(Math.random() * values.length)] : 'X'
}

function initializeComparisonItems() {
  comparisonItems.value = [
    {
      id: 1,
      vectorString: initialV4Vector,
      isValid: true,
      score: '10.0 (Critical)',
      severity: 'Critical',
      version: '4.0',
    },
    {
      id: 2,
      vectorString: initialV3Vector,
      isValid: true,
      score: '9.8 (Critical)',
      severity: 'Critical',
      version: '3.1',
    },
  ]
  comparisonItems.value.forEach(calculateScore)
}

initializeComparisonItems()

const maxItems = 3
const canAddMore = computed(() => comparisonItems.value.length < maxItems)

function addComparisonItem() {
  if (canAddMore.value) {
    const newId = Math.max(...comparisonItems.value.map((item) => item.id), 0) + 1
    const defaultVector = defaultCvssString.value
    comparisonItems.value.push({
      id: newId,
      vectorString: defaultVector,
      isValid: true,
      score: '0.0 (None)',
      severity: 'None',
      version: selectedVersion.value,
    })
    calculateScore(comparisonItems.value[comparisonItems.value.length - 1])
  }
}

function removeComparisonItem(id: number) {
  const itemIndex = comparisonItems.value.findIndex((item) => item.id === id)
  if (itemIndex === 2 && comparisonItems.value.length === 3) {
    comparisonItems.value = comparisonItems.value.filter((item) => item.id !== id)
  }
}

function resetVectorToDefault(id: number) {
  const item = comparisonItems.value.find((i) => i.id === id)
  if (item) {
    item.vectorString = defaultCvssString.value
    item.version = selectedVersion.value
    calculateScore(item)
  }
}

function updateVectorString(id: number, value: string) {
  const item = comparisonItems.value.find((i) => i.id === id)
  if (item) {
    item.vectorString = value
    const detectedVersion = value.startsWith('CVSS:4.0/')
      ? '4.0'
      : value.startsWith('CVSS:3.1/')
        ? '3.1'
        : item.version
    item.version = detectedVersion
    calculateScore(item)
  }
}

type SeverityRating = 'None' | 'Low' | 'Medium' | 'High' | 'Critical' | 'Invalid' | 'Error'

function getSeverityRating(score: number | null): SeverityRating {
  if (score === null || score === undefined || isNaN(score)) return 'None'
  if (score === 0.0) return 'None'
  if (score >= 0.1 && score <= 3.9) return 'Low'
  if (score >= 4.0 && score <= 6.9) return 'Medium'
  if (score >= 7.0 && score <= 8.9) return 'High'
  if (score >= 9.0 && score <= 10.0) return 'Critical'
  return 'None'
}

function calculateScore(item: ComparisonItem) {
  const vector = item.vectorString
  const version = item.version

  if (
    !vector ||
    (vector.startsWith('CVSS:4.0/') && vector.length <= 9) ||
    (vector.startsWith('CVSS:3.1/') && vector.length <= 9)
  ) {
    item.score = version === '4.0' ? '0.0 (None)' : '0.0 (None)'
    item.severity = 'None'
    item.isValid = true
    return
  }

  try {
    let calculator
    let scores
    let scoreValue: number | null = null

    if (version === '4.0' && vector.startsWith('CVSS:4.0/')) {
      calculator = new Cvss4P0(vector)
      scores = calculator.calculateScores()
      scoreValue = scores?.overall ?? null
      item.isValid = true
    } else if (version === '3.1' && vector.startsWith('CVSS:3.1/')) {
      calculator = new Cvss3P1(vector)
      scores = calculator.calculateScores()
      scoreValue = scores?.overall ?? scores?.base ?? null
      item.isValid = true
    } else {
      item.isValid = false
      item.score = 'Invalid Prefix'
      item.severity = 'Invalid'
      return
    }

    if (scoreValue !== null && !isNaN(scoreValue)) {
      const severity = getSeverityRating(scoreValue)
      item.score = `${scoreValue.toFixed(1)} (${severity})`
      item.severity = severity
    } else {
      item.isValid = false
      item.score = 'Calc Error'
      item.severity = 'Error'
    }
  } catch (error) {
    item.isValid = false
    item.score = 'Invalid Vector'
    item.severity = 'Invalid'
  }
}

function getSeverityClass(severity: string): string {
  const baseClasses =
    'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm ml-2'
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
      return `${baseClasses} bg-red-100 text-red-800 border-red-300`
    case 'Invalid':
    case 'Error':
    default:
      return `${baseClasses} bg-gray-200 text-gray-600 border-gray-400`
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {})
    .catch((err) => {
      console.error('Failed to copy text: ', err)
    })
}

function getSimpleDescription(item: ComparisonItem): string {
  if (!item.isValid || item.severity === 'Invalid' || item.severity === 'Error') {
    return 'The vector string is invalid or could not be calculated.'
  }
  if (item.severity === 'None') {
    return 'This configuration represents little to no security risk.'
  }

  const vector = item.vectorString
  let descriptions = []

  if (vector.includes('/AV:N')) {
    descriptions.push('exploitable remotely over the network')
  } else if (vector.includes('/AV:A')) {
    descriptions.push('exploitable from an adjacent network')
  } else if (vector.includes('/AV:L')) {
    descriptions.push('requires local access to exploit')
  } else if (vector.includes('/AV:P')) {
    descriptions.push('requires physical access to exploit')
  }

  if (vector.includes('/AC:L')) {
    descriptions.push('with low attack complexity')
  } else if (vector.includes('/AC:H')) {
    descriptions.push('but requires high attack complexity')
  }

  if (vector.includes('/PR:N')) {
    descriptions.push('without privileges required')
  } else if (vector.includes('/PR:L')) {
    descriptions.push('requiring low privileges')
  } else if (vector.includes('/PR:H')) {
    descriptions.push('requiring high privileges')
  }

  if (vector.includes('/UI:N')) {
    descriptions.push('and no user interaction')
  } else if (vector.includes('/UI:R') || vector.includes('/UI:P')) {
    descriptions.push('requiring user interaction')
  } else if (vector.includes('/UI:A')) {
    descriptions.push('requiring user interaction where the user must grant permissions')
  }

  let impactDesc = ''
  const highConf = vector.includes('/C:H') || vector.includes('/VC:H')
  const highInt = vector.includes('/I:H') || vector.includes('/VI:H')
  const highAvail = vector.includes('/A:H') || vector.includes('/VA:H')

  if (highConf && highInt && highAvail) {
    impactDesc = 'resulting in a complete loss of confidentiality, integrity, and availability'
  } else if (highConf || highInt || highAvail) {
    let impacts = []
    if (highConf) impacts.push('confidentiality')
    if (highInt) impacts.push('integrity')
    if (highAvail) impacts.push('availability')
    impactDesc = `resulting in a high impact to ${impacts.join(' and ')}`
  } else if (vector.includes(':L')) {
    impactDesc = 'resulting in a low impact'
  } else if (
    vector.includes(':N') &&
    !(vector.includes('/SC:N') && vector.includes('/SI:N') && vector.includes('/SA:N'))
  ) {
    impactDesc = 'with no direct impact to the vulnerable system'
  }

  if (impactDesc) descriptions.push(impactDesc)

  if (
    vector.includes('/S:C') ||
    vector.includes('/SC:') ||
    vector.includes('/SI:') ||
    vector.includes('/SA:')
  ) {
    const affectsSubsequent =
      vector.includes('/SC:H') ||
      vector.includes('/SI:H') ||
      vector.includes('/SA:H') ||
      vector.includes('/SC:L') ||
      vector.includes('/SI:L') ||
      vector.includes('/SA:L')
    if (vector.includes('/S:C')) {
      descriptions.push('and can impact other system components')
    } else if (affectsSubsequent) {
      descriptions.push('and can impact subsequent systems')
    }
  }

  if (descriptions.length === 0) {
    return 'Base metrics seem to be at default or non-impactful levels. Check details for environmental or temporal scores.'
  }

  let finalDesc = `This vulnerability is ${descriptions[0]}`
  if (descriptions.length > 1) {
    finalDesc += `, ${descriptions.slice(1).join(', ')}.`
  } else {
    finalDesc += '.'
  }

  return finalDesc.charAt(0).toUpperCase() + finalDesc.slice(1)
}

function importFromCalculator(id: number) {
  const item = comparisonItems.value.find((i) => i.id === id)
  if (item && cvssString.value) {
    updateVectorString(id, cvssString.value)
  }
}

function generateExampleVectorByKey(id: number, exampleKey: string) {
  const item = comparisonItems.value.find((i) => i.id === id)
  const example = exampleVectors.find((e) => e.key === exampleKey)
  if (!item || !example) return

  item.vectorString = item.version === '4.0' ? example.v4 : example.v3
  calculateScore(item)
}

function generateRandomBaseCvss(id: number) {
  const item = comparisonItems.value.find((i) => i.id === id)
  if (!item) return

  const version = item.version
  const prefix = `CVSS:${version}/`
  let baseMetrics: string[] = []
  let metricParts: string[] = []

  if (version === '4.0') {
    baseMetrics = [
      ...(metricGroupsV4_0['Exploitability Metrics'] || []),
      ...(metricGroupsV4_0['Vulnerable System Impact Metrics'] || []),
      ...(metricGroupsV4_0['Subsequent System Impact Metrics'] || []),
    ]
    metricParts = baseMetrics
      .sort((a, b) => metricOrderV4_0.indexOf(a) - metricOrderV4_0.indexOf(b))
      .map((metric) => `${metric}:${getRandomValue(version, metric)}`)
  } else {
    baseMetrics = metricGroupsV3_1['Base Score'] || []
    metricParts = baseMetrics
      .sort((a, b) => metricOrderV3_1.indexOf(a) - metricOrderV3_1.indexOf(b))
      .map((metric) => `${metric}:${getRandomValue(version, metric)}`)
  }

  item.vectorString = prefix + metricParts.join('/')
  calculateScore(item)
}

watch(
  selectedVersion,
  (newGlobalVersion) => {
    console.log('Global version changed to:', newGlobalVersion)
    const newDefaultVector = defaultCvssString.value

    comparisonItems.value.forEach((item) => {
      item.vectorString = newDefaultVector
      item.version = newGlobalVersion
      calculateScore(item)
    })
  },
  { immediate: false }
)
</script>

<template>
  <div class="flex h-full w-full flex-col bg-gray-50">
    <div
      class="sticky top-0 z-10 mb-4 border-b border-gray-300 bg-white px-4 py-5 shadow-sm sm:px-6 lg:px-8"
    >
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <h2 class="text-lg font-semibold text-gray-700">CVSS Vector Comparison</h2>
        <div class="flex items-center space-x-4 sm:space-x-6">
          <button
            v-if="canAddMore"
            @click="addComparisonItem"
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="mr-1.5 h-4 w-4"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Vector
          </button>
        </div>
      </div>
    </div>

    <div class="flex-grow px-4 pb-6 sm:px-6 lg:px-8">
      <div
        class="grid grid-cols-1 items-start gap-4 sm:gap-5 md:grid-cols-2"
        :class="{ 'lg:grid-cols-3': comparisonItems.length > 2 }"
      >
        <div v-for="(item, index) in comparisonItems" :key="item.id" class="comparison-item flex">
          <div
            class="relative flex h-full w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-200 hover:shadow-lg sm:p-5"
          >
            <button
              v-if="index === 2 && comparisonItems.length === 3"
              @click="removeComparisonItem(item.id)"
              class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1"
              title="Remove this comparison"
            >
              <span class="sr-only">Remove</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div class="mb-3 flex flex-wrap items-center justify-between gap-y-2">
              <div class="flex items-center">
                <h3 class="text-sm font-semibold text-gray-900 sm:text-base">
                  Vector {{ index + 1 }}
                </h3>
                <span :class="getSeverityClass(item.severity)">
                  {{ item.score }}
                </span>
              </div>
            </div>

            <div class="mb-3">
              <label
                :for="`vector-string-${item.id}`"
                class="mb-1 block text-xs font-medium text-gray-700"
                >Vector String</label
              >
              <div class="flex rounded-md shadow-sm">
                <div class="relative flex-grow">
                  <input
                    :id="`vector-string-${item.id}`"
                    :value="item.vectorString"
                    @input="updateVectorString(item.id, ($event.target as HTMLInputElement).value)"
                    type="text"
                    class="block w-full rounded-l-md border-gray-300 pr-8 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    :placeholder="`CVSS:${item.version}/AV:N/AC:L/...`"
                  />
                  <button
                    @click="copyToClipboard(item.vectorString)"
                    class="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
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
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  @click="resetVectorToDefault(item.id)"
                  class="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:px-3"
                  title="Reset to Default"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-3.5 w-3.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span class="hidden sm:inline">Reset</span>
                </button>
              </div>
              <div v-if="!item.isValid" class="mt-1 text-xs text-red-600">
                Invalid vector string. Please check the format.
              </div>
            </div>

            <div class="flex flex-grow flex-col">
              <details class="mb-3 text-sm">
                <summary
                  class="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 sm:text-sm"
                >
                  Example Vectors
                </summary>
                <div class="relative">
                  <div
                    class="mt-2 grid grid-cols-1 gap-x-2 gap-y-1 rounded-md border border-gray-100 bg-gray-50 p-2 text-xs sm:grid-cols-2"
                  >
                    <button
                      v-for="example in exampleVectors"
                      :key="example.key"
                      @click="generateExampleVectorByKey(item.id, example.key)"
                      class="flex items-center rounded px-1.5 py-1 text-left text-gray-700 hover:bg-gray-100"
                      :title="item.version === '4.0' ? example.v4 : example.v3"
                    >
                      {{ example.name }}
                    </button>
                    <button
                      @click="generateRandomBaseCvss(item.id)"
                      class="flex items-center rounded px-1.5 py-1 text-left text-blue-800 hover:bg-gray-100 sm:col-span-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="mr-1.5 h-3 w-3"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                        />
                      </svg>
                      Random Base Vector
                    </button>
                  </div>
                </div>
              </details>

              <div class="mb-3 flex items-center">
                <button
                  @click="importFromCalculator(item.id)"
                  class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1"
                  title="Import the vector from the calculator view"
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Import
                </button>
              </div>

              <div class="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <h4 class="mb-1 text-xs font-semibold text-gray-700">Summary</h4>
                <p class="text-xs text-gray-600">{{ getSimpleDescription(item) }}</p>
              </div>

              <div class="mt-auto border-t border-gray-100 pt-3">
                <RouterLink
                  :to="{ name: 'Calculator', query: {}, hash: `#${item.vectorString}` }"
                  class="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View full details
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="ml-1 h-3 w-3"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-item {
  display: flex;
}
</style>
