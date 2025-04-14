<script lang="ts" setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import {
  defaultMetricsV3_1,
  defaultMetricsV4_0,
  metricGroupsV4_0,
  metricGroupsV3_1,
} from '@/constants/cvssConstants'

const props = defineProps<{
  currentScore: string
}>()

const cvssStore = useCvssStore()
const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  metricOrder,
  preferredDescriptionKey,
  metricGroups,
  cvssString,
} = storeToRefs(cvssStore)

const generatingReport = ref(false)
const reportReady = ref(false)
const reportUrl = ref('')

const organizedGroups = computed(() => {
  const version = selectedVersion.value
  const groups = version === '4.0' ? metricGroupsV4_0 : metricGroupsV3_1

  const metricToGroupMap: Record<string, string> = {}
  Object.entries(groups).forEach(([groupName, metrics]) => {
    metrics.forEach((metric) => {
      metricToGroupMap[metric] = groupName
    })
  })

  return metricToGroupMap
})

const baseMetricKeys = computed(() => {
  const groups = metricGroups.value[selectedVersion.value]
  if (!groups) return []

  if (selectedVersion.value === '4.0') {
    return [
      ...(groups['Exploitability Metrics'] || []),
      ...(groups['Vulnerable System Impact Metrics'] || []),
      ...(groups['Subsequent System Impact Metrics'] || []),
    ]
  } else {
    return groups['Base Score'] || []
  }
})

const orderedMetricKeys = computed(() => {
  return metricOrder.value?.[selectedVersion.value] || []
})

function shouldDisplayMetric(metricKey: string): boolean {
  const currentValue = selectedMetrics.value?.[metricKey]
  const defaultValue =
    (selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1)[metricKey] ?? 'X'
  const isBase = baseMetricKeys.value.includes(metricKey)

  return isBase || (currentValue !== undefined && currentValue !== defaultValue)
}

function getSelectedDefinition(metricKey: string): CvssTemplateBare | undefined {
  const selectedValueKey = selectedMetrics.value?.[metricKey]
  if (!selectedValueKey || !currentDefinitions.value) {
    return undefined
  }
  return currentDefinitions.value.find(
    (def) => def.metric_key === metricKey && def.value_key === selectedValueKey
  )
}

function getDescriptionText(definition: CvssTemplateBare | undefined): string {
  if (!definition) return 'Definition details not found.'
  const preferredKey = preferredDescriptionKey.value
  return definition[preferredKey] || definition.official_description || 'No description available.'
}

function getMetricName(metricKey: string): string {
  const definition = getSelectedDefinition(metricKey)
  return definition?.metric_name || metricKey
}

const activeMetrics = computed(() => {
  return orderedMetricKeys.value.filter((key) => shouldDisplayMetric(key))
})

const groupedActiveMetrics = computed(() => {
  const result: Record<string, string[]> = {}

  activeMetrics.value.forEach((metricKey) => {
    const group = organizedGroups.value[metricKey] || 'Other'

    if (!result[group]) {
      result[group] = []
    }

    result[group].push(metricKey)
  })

  return result
})

const orderedGroupNames = computed(() => {
  const preferredOrder = [
    'Exploitability Metrics',
    'Vulnerable System Impact Metrics',
    'Subsequent System Impact Metrics',
    'Supplemental Metrics',
    'Modified Exploitability Metrics',
    'Modified Vulnerable System Impact Metrics',
    'Modified Subsequent System Impact Metrics',
    'Environmental (Security Requirements)',
    'Threat Metrics',
  ]

  if (selectedVersion.value === '3.1') {
    return ['Base Score', 'Temporal Score', 'Environmental Score'].filter((group) =>
      Object.keys(groupedActiveMetrics.value).includes(group)
    )
  }

  const activeGroups = Object.keys(groupedActiveMetrics.value)

  return preferredOrder.filter((group) => activeGroups.includes(group))
})

function generateReportHtml() {
  const date = new Date().toLocaleString()

  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CVSS ${selectedVersion.value} Report - ${date}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }
        .header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        .vector-string {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 0.8rem;
          margin: 1rem 0;
          border-radius: 4px;
          word-break: break-all;
          border-left: 4px solid #2563eb;
        }
        .score {
          font-weight: bold;
          color: #2563eb;
          margin-top: 0.5rem;
        }
        h1, h2, h3, h4 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #111;
        }
        h1 {
          font-size: 1.8rem;
        }
        h2 {
          font-size: 1.5rem;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 0.5rem;
        }
        h3 {
          font-size: 1.25rem;
          color: #2563eb;
        }
        h4 {
          font-size: 1.1rem;
        }
        .metric-group {
          margin-bottom: 2rem;
        }
        .metric {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 6px;
          border-left: 3px solid #ddd;
        }
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .metric-name {
          font-weight: 600;
          font-size: 1.05rem;
        }
        .metric-value {
          font-family: monospace;
          font-weight: bold;
          padding: 0.25rem 0.5rem;
          border-radius: 99px;
          font-size: 0.8rem;
        }
        .metric-value-N {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .metric-value-L {
          background-color: #fef3c7;
          color: #92400e;
        }
        .metric-value-H {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .metric-value-other {
          background-color: #e5e7eb;
          color: #374151;
        }
        .metric-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .metric-description {
          font-size: 0.925rem;
          margin-top: 0.75rem;
          color: #4b5563;
        }
        .footer {
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 1px solid #eaeaea;
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
        }
        @media print {
          body {
            padding: 0;
            font-size: 12pt;
          }
          .no-print {
            display: none;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CVSS ${selectedVersion.value} Vulnerability Assessment Report</h1>
        <p>Generated on: ${date}</p>
        <div class="vector-string">
          ${cvssString.value}
        </div>
        <div class="score">Score: ${props.currentScore}</div>
      </div>
      
      <div class="report-content">
  `
  orderedGroupNames.value.forEach((groupName) => {
    html += `
      <div class="metric-group">
        <h2>${groupName}</h2>
    `

    const metricsInGroup = groupedActiveMetrics.value[groupName] || []
    metricsInGroup.forEach((metricKey) => {
      const definition = getSelectedDefinition(metricKey)
      const metricName = getMetricName(metricKey)
      const metricValue = selectedMetrics.value[metricKey]
      const valueName = definition?.value_name || 'N/A'
      const description = getDescriptionText(definition)

      let valueClass = 'metric-value-other'
      if (metricValue === 'N') valueClass = 'metric-value-N'
      if (metricValue === 'L') valueClass = 'metric-value-L'
      if (metricValue === 'H') valueClass = 'metric-value-H'

      html += `
        <div class="metric">
          <div class="metric-header">
            <div class="metric-name">${metricName} (${metricKey})</div>
            <div class="metric-value ${valueClass}">${metricValue}</div>
          </div>
          <div class="metric-title">${valueName}</div>
          <div class="metric-description">${description}</div>
        </div>
      `
    })

    html += `
      </div>
    `
  })

  html += `
      </div>

      <div class="footer">
        <p>This report was generated using the CVSS Interpreter Tool.</p>
      </div>
    </body>
    </html>
  `

  return html
}

function generateReport() {
  generatingReport.value = true

  const html = generateReportHtml()

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  reportUrl.value = url
  reportReady.value = true
  generatingReport.value = false

  window.open(url, '_blank')
}
</script>

<template>
  <button
    @click="generateReport"
    class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="generatingReport"
  >
    <svg
      v-if="generatingReport"
      class="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="mr-2 h-4 w-4"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
    {{ generatingReport ? 'Generating...' : 'Generate Report' }}
  </button>
</template>
