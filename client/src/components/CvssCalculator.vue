<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import MetricGroup from '@/components/MetricGroup.vue'

const cvssStore = useCvssStore()

const { selectedMetrics, groupedDefinitions, currentDefinitions, structuredMetricGroups } =
  storeToRefs(cvssStore)

const { setMetricValue } = cvssStore

const groupTooltips: Record<string, string> = {
  'Base Metrics':
    'Intrinsic characteristics of the vulnerability itself. Should be filled by the supplier/reporter.',
  'Threat Metrics':
    'Characteristics of the vulnerability that change over time but not across environments. Should be filled by the consumer/analyst based on threat intelligence.',
  'Supplemental Metrics':
    'Additional characteristics defined by the supplier/reporter for context.',
  'Environmental (Modified Base Metrics)':
    'Base Metrics adjusted for the specific environment. Should be filled by the consumer/analyst.',
  'Environmental (Security Requirements)':
    'Importance of Confidentiality, Integrity, and Availability in the specific environment. Should be filled by the consumer/analyst.',
  'Base Score': 'CVSS v3.1 Base Metrics representing intrinsic characteristics.',
  'Temporal Score':
    'CVSS v3.1 Temporal Metrics reflecting the current exploit landscape and available mitigations.',
  'Environmental Score':
    "CVSS v3.1 Environmental Metrics allowing customization based on the affected asset's importance and existing controls.",
}

function getMetricName(metricKey: string): string {
  const group = groupedDefinitions.value[metricKey]
  return group?.[0]?.metric_name || metricKey
}

function getMetricValues(metricKey: string): any[] {
  return groupedDefinitions.value?.[metricKey] || []
}

function handleMetricUpdate(metricKey: string, valueKey: string) {
  setMetricValue(metricKey, valueKey)
}
</script>

<template>
  <div
    class="calculator-container rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div v-if="!currentDefinitions" class="py-4 text-center text-gray-500 dark:text-gray-400">
      Loading metric definitions...
    </div>
    <div
      v-else-if="structuredMetricGroups.length === 0"
      class="py-4 text-center text-gray-500 dark:text-gray-400"
    >
      No metric groups defined or available for this version.
    </div>

    <div v-else>
      <div
        v-for="parentGroup in structuredMetricGroups"
        :key="parentGroup.name"
        class="mb-6 last:mb-0"
      >
        <h3
          class="group-header relative mb-3 border-b border-gray-300 pb-2 text-base font-semibold text-gray-800 dark:border-gray-600 dark:text-gray-100"
          :data-tooltip="groupTooltips[parentGroup.name]"
        >
          {{ parentGroup.name }}
          <span
            v-if="groupTooltips[parentGroup.name]"
            class="tooltip-indicator ml-1 cursor-help text-sm font-normal text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            (?)
          </span>
        </h3>

        <div class="space-y-2">
          <template v-if="parentGroup.metrics && parentGroup.metrics.length > 0">
            <MetricGroup
              v-for="metricKey in parentGroup.metrics"
              :key="metricKey"
              :metric-key="metricKey"
              :metric-name="getMetricName(metricKey)"
              :values="getMetricValues(metricKey)"
              :selected-value="selectedMetrics[metricKey]"
              @update:metric-value="handleMetricUpdate"
            />
          </template>

          <template v-if="parentGroup.children && parentGroup.children.length > 0">
            <div
              v-for="childGroup in parentGroup.children"
              :key="childGroup.name"
              class="child-group mb-4 ml-1 border-l-2 border-gray-100 pl-4 pt-2 last:mb-0 dark:border-gray-700"
            >
              <h4
                class="child-group-header mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400"
              >
                {{ childGroup.name }}
              </h4>
              <template v-if="childGroup.metrics && childGroup.metrics.length > 0">
                <MetricGroup
                  v-for="metricKey in childGroup.metrics"
                  :key="metricKey"
                  :metric-key="metricKey"
                  :metric-name="getMetricName(metricKey)"
                  :values="getMetricValues(metricKey)"
                  :selected-value="selectedMetrics[metricKey]"
                  @update:metric-value="handleMetricUpdate"
                />
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator-container {
  max-height: none;
  overflow: visible;
}

.group-header {
  position: relative;
}

.tooltip-indicator {
  display: inline-block;
  vertical-align: super;
  font-size: 0.7em;
  line-height: 1;
}

.group-header[data-tooltip]::after,
.group-header[data-tooltip]::before {
  position: absolute;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
  z-index: 100;
}

.group-header[data-tooltip]::after {
  content: attr(data-tooltip);
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  padding: 6px 10px;
  background: rgba(17, 24, 39, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: normal;
  white-space: normal;
  width: max-content;
  max-width: 300px;
  text-align: center;
  line-height: 1.4;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.dark .group-header[data-tooltip]::after {
  background: rgba(226, 232, 240, 0.95);
  color: #1f2937;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.group-header[data-tooltip]::before {
  content: '';
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent rgba(17, 24, 39, 0.9) transparent;
  margin-top: -1px;
}

.dark .group-header[data-tooltip]::before {
  border-color: transparent transparent rgba(226, 232, 240, 0.95) transparent;
}

.group-header[data-tooltip]:hover::after,
.group-header[data-tooltip]:hover::before {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
}

.group-header[data-tooltip]:not(:hover)::after,
.group-header[data-tooltip]:not(:hover)::before {
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0s;
}

.child-group {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}
</style>
