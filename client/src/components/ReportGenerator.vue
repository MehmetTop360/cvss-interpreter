<script lang="ts" setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'
import type { StructuredMetricGroup } from '@/stores/cvssStore'

const props = defineProps<{
  currentScore: string
}>()

const cvssStore = useCvssStore()
const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  preferredDescriptionKey,
  cvssString,
  structuredMetricGroups,
} = storeToRefs(cvssStore)

const generatingReport = ref(false)
const reportReady = ref(false)
const reportUrl = ref('')

const currentDefaults = computed(() => {
  return selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
})

function shouldDisplayMetric(metricKey: string): boolean {
  const currentValue = selectedMetrics.value?.[metricKey]
  const defaultValue = currentDefaults.value?.[metricKey] ?? 'X'

  const groups = structuredMetricGroups.value
  let isBase = false
  if (selectedVersion.value === '4.0') {
    const baseParent = groups.find((g) => g.name === 'Base Metrics')
    isBase = !!baseParent?.children?.some((child) => child.metrics?.includes(metricKey))
  } else {
    const baseGroup = groups.find((g) => g.name === 'Base Score')
    isBase = !!baseGroup?.metrics?.includes(metricKey)
  }

  return isBase || (currentValue !== undefined && currentValue !== defaultValue)
}

const activeStructuredGroupsForReport = computed((): StructuredMetricGroup[] => {
  return structuredMetricGroups.value
    .map((parentGroup): StructuredMetricGroup | null => {
      const activeParentMetrics = parentGroup.metrics?.filter(shouldDisplayMetric) ?? []

      const activeChildren =
        parentGroup.children
          ?.map((childGroup): StructuredMetricGroup | null => {
            const activeChildMetrics = childGroup.metrics?.filter(shouldDisplayMetric) ?? []
            return activeChildMetrics.length > 0
              ? { ...childGroup, metrics: activeChildMetrics }
              : null
          })
          .filter((child): child is StructuredMetricGroup => child !== null) ?? []

      const hasActiveParentMetrics = activeParentMetrics.length > 0
      const hasActiveChildren = activeChildren.length > 0

      if (hasActiveParentMetrics || hasActiveChildren) {
        return {
          name: parentGroup.name,
          metrics: hasActiveParentMetrics ? activeParentMetrics : undefined,
          children: hasActiveChildren ? activeChildren : undefined,
        }
      }
      return null
    })
    .filter((group): group is StructuredMetricGroup => group !== null)
})

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
  const text =
    definition[preferredKey] || definition.official_description || 'No description available.'
  return text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
}

function getMetricName(metricKey: string): string {
  const definition = currentDefinitions.value?.find((def) => def.metric_key === metricKey)
  return definition?.metric_name || metricKey
}

function getValueClass(value: string | undefined): string {
  if (!value) return 'metric-value-default'
  value = value.toUpperCase()

  if (value === 'N') return 'metric-value-n'
  if (value === 'L') return 'metric-value-l'
  if (value === 'M') return 'metric-value-m'
  if (value === 'H') return 'metric-value-h'
  if (value === 'P') return 'metric-value-p'
  if (value === 'A') return 'metric-value-a'
  if (value === 'U') return 'metric-value-u'
  if (value === 'C') return 'metric-value-c'
  if (value === 'R') return 'metric-value-r'
  if (value === 'F') return 'metric-value-f'
  if (value === 'O') return 'metric-value-o'
  if (value === 'T') return 'metric-value-t'
  if (value === 'W') return 'metric-value-w'
  if (value === 'S') return 'metric-value-s'
  if (value === 'Y') return 'metric-value-y'
  if (value === 'D') return 'metric-value-d'
  if (value === 'I') return 'metric-value-i'
  if (value === 'CLEAR') return 'metric-value-clear'
  if (value === 'GREEN') return 'metric-value-green'
  if (value === 'AMBER') return 'metric-value-amber'
  if (value === 'RED') return 'metric-value-red'
  return 'metric-value-default'
}

function generateReportHtml(): string {
  const date = new Date().toLocaleString()
  const version = selectedVersion.value
  const groupsToReport = activeStructuredGroupsForReport.value

  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CVSS ${version} Report - ${date}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1.5rem;
          background-color: #f9fafb;
        }
        .report-container {
            background-color: #ffffff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .header {
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
        }
        h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .header p {
            font-size: 0.9rem;
            color: #6b7280;
        }
        .vector-string-container {
            margin: 1.5rem 0;
        }
         .vector-string-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #4b5563;
            display: block;
            margin-bottom: 0.25rem;
         }
        .vector-string {
          font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          background-color: #f3f4f6;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          word-break: break-all;
          border: 1px solid #e5e7eb;
          font-size: 0.9rem;
          color: #1f2937;
        }
        .score-container {
            margin-top: 1rem;
        }
        .score-label {
             font-size: 0.9rem;
            font-weight: 600;
            color: #4b5563;
        }
        .score {
          font-weight: 700;
          font-size: 1.1rem;
          color: #1d4ed8;
          margin-left: 0.5rem;
        }

        h2 {
          font-size: 1.3rem;
          font-weight: 600;
          color: #111827;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.6rem;
          border-bottom: 1px solid #d1d5db;
        }
        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-top: 1.5rem;
          margin-bottom: 0.8rem;
          padding-left: 1rem;
           position: relative;
        }
         h3::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0.3em;
            bottom: 0.3em;
            width: 4px;
            background-color: #9ca3af;
            border-radius: 2px;
        }


        .metric-group-content {
            padding-left: 0;
        }
         .child-metric-group-content {
            padding-left: 1rem;
        }


        .metric {
          margin-bottom: 1.25rem;
          padding: 1rem 1.25rem;
          background-color: #ffffff;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
        }
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }
        .metric-name {
          font-weight: 600;
          font-size: 1rem;
          color: #1f2937;
          margin-right: 1rem;
           flex-shrink: 0;
        }
        .metric-value {
          font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          border: 1px solid transparent;
          white-space: nowrap;
          margin-top: 2px;
        }

        .metric-value-default { background-color: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
        .metric-value-n { background-color: #dbeafe; color: #1e3a8a; border-color: #bfdbfe; }
        .metric-value-l { background-color: #fef9c3; color: #854d0e; border-color: #fef08a; }
        .metric-value-m { background-color: #ffedd5; color: #9a3412; border-color: #fed7aa; }
        .metric-value-h { background-color: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .metric-value-p { background-color: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
        .metric-value-a { background-color: #fce7f3; color: #9d174d; border-color: #fbcfe8; }
        .metric-value-u { background-color: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
        .metric-value-c { background-color: #dcfce7; color: #15803d; border-color: #bbf7d0; }
        .metric-value-r { background-color: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
        .metric-value-f { background-color: #ffe4e6; color: #9f1239; border-color: #fecdd3; }
        .metric-value-o { background-color: #ecfccb; color: #4d7c0f; border-color: #d9f99d; }
        .metric-value-t { background-color: #cffafe; color: #0e7490; border-color: #a5f3fc; }
        .metric-value-w { background-color: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
        .metric-value-s { background-color: #fecaca; color: #7f1d1d; border-color: #fca5a5; font-weight: 700; }
        .metric-value-y { background-color: #d1fae5; color: #057a55; border-color: #a7f3d0; }
        .metric-value-d { background-color: #f5f5f4; color: #57534e; border-color: #e7e5e4; }
        .metric-value-i { background-color: #f4f4f5; color: #52525b; border-color: #e4e4e7; }
        .metric-value-clear { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .metric-value-green { background-color: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .metric-value-amber { background-color: #fef3c7; color: #92400e; border-color: #fde68a; }
        .metric-value-red { background-color: #fee2e2; color: #991b1b; border-color: #fecaca; }


        .metric-value-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
           color: #374151;
        }
        .metric-description {
          font-size: 0.875rem;
          color: #4b5563;
        }

        .footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.8rem;
          color: #9ca3af;
          text-align: center;
        }

        @media print {
          body { padding: 0; font-size: 10pt; max-width: 100%; margin: 1cm; background-color: #fff;}
          .report-container { box-shadow: none; border: none; padding: 0; }
          .metric { page-break-inside: avoid; border: 1px solid #ccc; background-color: #fff !important; box-shadow: none;}
          .metric-value { border: 1px solid #ccc !important; }
          h2, h3 { page-break-after: avoid; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
          .metric-value { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .metric-value-default { background-color: #f3f4f6 !important; }
          .metric-value-n { background-color: #dbeafe !important; }
          .metric-value-l { background-color: #fef9c3 !important; }
          .metric-value-m { background-color: #ffedd5 !important; }
          .metric-value-h { background-color: #fee2e2 !important; }
          .metric-value-p { background-color: #f3e8ff !important; }
          .metric-value-a { background-color: #fce7f3 !important; }
          .metric-value-u { background-color: #e0e7ff !important; }
          .metric-value-c { background-color: #dcfce7 !important; }
          .metric-value-r { background-color: #ccfbf1 !important; }
          .metric-value-f { background-color: #ffe4e6 !important; }
          .metric-value-o { background-color: #ecfccb !important; }
          .metric-value-t { background-color: #cffafe !important; }
          .metric-value-w { background-color: #e0f2fe !important; }
          .metric-value-s { background-color: #fecaca !important; }
          .metric-value-y { background-color: #d1fae5 !important; }
          .metric-value-d { background-color: #f5f5f4 !important; }
          .metric-value-i { background-color: #f4f4f5 !important; }
          .metric-value-clear { background-color: #f1f5f9 !important; }
          .metric-value-green { background-color: #dcfce7 !important; }
          .metric-value-amber { background-color: #fef3c7 !important; }
          .metric-value-red { background-color: #fee2e2 !important; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <h1>CVSS ${version} Vulnerability Assessment Report</h1>
          <p>Generated on: ${date}</p>
          <div class="vector-string-container">
            <span class="vector-string-label">CVSS Vector String:</span>
            <div class="vector-string">${cvssString.value}</div>
          </div>
          <div class="score-container">
             <span class="score-label">Overall Score:</span>
             <span class="score">${props.currentScore}</span>
          </div>
        </div>

        <div class="report-content">
  `

  const renderMetrics = (metrics: string[] | undefined) => {
    let metricsHtml = ''
    if (!metrics) return metricsHtml

    metrics.forEach((metricKey) => {
      const definition = getSelectedDefinition(metricKey)
      const metricName = getMetricName(metricKey)
      const metricValue = selectedMetrics.value[metricKey]
      const valueName = definition?.value_name || 'N/A'
      const description = getDescriptionText(definition)
      const valueClass = getValueClass(metricValue)

      metricsHtml += `
                <div class="metric">
                  <div class="metric-header">
                    <div class="metric-name">${metricName} (${metricKey})</div>
                    <div class="metric-value ${valueClass}">${metricValue}</div>
                  </div>
                  <div class="metric-value-title">${valueName}</div>
                  <div class="metric-description">${description}</div>
                </div>
            `
    })
    return metricsHtml
  }

  groupsToReport.forEach((parentGroup) => {
    html += `
      <div class="metric-group">
        <h2>${parentGroup.name}</h2>
    `

    if (parentGroup.metrics && parentGroup.metrics.length > 0) {
      html += `<div class="metric-group-content">`
      html += renderMetrics(parentGroup.metrics)
      html += `</div>`
    }

    if (parentGroup.children && parentGroup.children.length > 0) {
      parentGroup.children.forEach((childGroup) => {
        html += `
          <div class="child-metric-group">
            <h3>${childGroup.name}</h3>
            <div class="child-metric-group-content">
               ${renderMetrics(childGroup.metrics)}
            </div>
          </div>
        `
      })
    }

    html += `
      </div> `
  })

  html += `
        </div> <div class="footer">
          <p>This report was generated using the CVSS Interpreter.</p>
        </div>
      </div> </body>
    </html>
  `

  return html
}

function generateReport() {
  generatingReport.value = true

  try {
    const html = generateReportHtml()

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    reportUrl.value = url
    reportReady.value = true

    window.open(url, '_blank')
  } catch (error) {
    console.error('Error generating report:', error)
  } finally {
    generatingReport.value = false
  }
}
</script>

<template>
  <button
    @click="generateReport"
    class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="generatingReport"
    data-tooltip="Generate a detailed HTML report in a new tab"
  >
    <svg
      v-if="generatingReport"
      class="-ml-0.5 mr-1.5 h-4 w-4 animate-spin text-white"
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
      class="mr-1.5 h-4 w-4"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
    {{ generatingReport ? 'Generating...' : 'Generate Report' }}
  </button>
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
