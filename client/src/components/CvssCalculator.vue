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
  <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm calculator-container">
    <div v-if="!currentDefinitions" class="py-4 text-center text-gray-500">
      Loading metric definitions...
    </div>
    <div v-else-if="structuredMetricGroups.length === 0" class="py-4 text-center text-gray-500">
      No metric groups defined or available for this version.
    </div>

    <div v-else>
      <div
        v-for="parentGroup in structuredMetricGroups"
        :key="parentGroup.name"
        class="mb-6 last:mb-0"
      >
        <h3
          class="relative pb-2 mb-3 text-base font-semibold text-gray-800 border-b border-gray-300 group-header"
          :data-tooltip="groupTooltips[parentGroup.name]"
        >
          {{ parentGroup.name }}
          <span
            v-if="groupTooltips[parentGroup.name]"
            class="ml-1 text-sm font-normal text-blue-500 tooltip-indicator cursor-help hover:text-blue-700"
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
              class="pt-2 pl-4 mb-4 ml-1 border-l-2 border-gray-100 child-group last:mb-0"
            >
              <h4 class="mb-2 text-sm font-semibold text-gray-600 child-group-header">
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
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
  transition-delay: 0.5s;
  z-index: 20;
}

.group-header[data-tooltip]::after {
  content: attr(data-tooltip);
  bottom: calc(100% + 8px);
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: normal;
  white-space: normal;
  width: max-content;
  max-width: 300px;
  text-align: center;
  line-height: 1.4;
}

.group-header[data-tooltip]::before {
  content: '';
  bottom: calc(100% + 3px);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.85) transparent transparent transparent;
}

.group-header[data-tooltip]:hover::after,
.group-header[data-tooltip]:hover::before {
  opacity: 1;
  visibility: visible;
}

.group-header[data-tooltip]:not(:hover)::after,
.group-header[data-tooltip]:not(:hover)::before {
  transition-delay: 0s;
}

.child-group {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}
</style>
