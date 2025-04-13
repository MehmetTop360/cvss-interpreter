<script lang="ts" setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import MetricGroup from '@/components/MetricGroup.vue'

const cvssStore = useCvssStore()

const { selectedMetrics, groupedDefinitions, selectedVersion, metricGroups, currentDefinitions } =
  storeToRefs(cvssStore)

const { setMetricValue } = cvssStore

const currentMetricGroups = computed(() => {
  return metricGroups.value[selectedVersion.value] || {}
})

const groupTooltips: Record<string, string> = {
  'Base Metrics': 'This category should be filled by the supplier.',
  'Supplemental Metrics': 'This category should be filled by the supplier.',
  'Environmental (Modified Base Metrics)': 'This category should be filled by the consumer.',
  'Environmental (Security Requirements)': 'This category should be filled by the consumer.',
  'Threat Metrics': 'This category should be filled by the consumer.',
  'Base Score': 'CVSS v3.1 Base Metrics representing intrinsic characteristics.',
  'Temporal Score':
    'CVSS v3.1 Temporal Metrics reflecting the current exploit landscape and available mitigations.',
  'Environmental Score':
    "These metrics enable the analyst to customize the CVSS score depending on the importance of the affected IT asset to a user's organization.",
}

const parentChildMap: Record<string, string[]> = {
  'Base Metrics': [
    'Exploitability Metrics',
    'Vulnerable System Impact Metrics',
    'Subsequent System Impact Metrics',
  ],
  'Environmental (Modified Base Metrics)': [
    'Modified Exploitability Metrics',
    'Modified Vulnerable System Impact Metrics',
    'Modified Subsequent System Impact Metrics',
  ],
  'Supplemental Metrics': [],
  'Environmental (Security Requirements)': [],
  'Threat Metrics': [],
}

const orderedGroupNames = computed(() => {
  const availableGroupKeys = Object.keys(currentMetricGroups.value)

  if (selectedVersion.value === '4.0') {
    const parentGroups = [
      'Base Metrics',
      'Supplemental Metrics',
      'Environmental (Modified Base Metrics)',
      'Environmental (Security Requirements)',
      'Threat Metrics',
    ]

    return parentGroups.filter((group) => {
      const isParent = parentChildMap[group]?.length > 0
      const hasMetrics = currentMetricGroups.value[group]?.length > 0
      const hasChildWithMetrics =
        isParent &&
        parentChildMap[group].some(
          (child) =>
            availableGroupKeys.includes(child) && currentMetricGroups.value[child]?.length > 0
        )

      return availableGroupKeys.includes(group) || hasMetrics || hasChildWithMetrics
    })
  } else {
    const v3Order = ['Base Score', 'Temporal Score', 'Environmental Score']

    return v3Order.filter(
      (groupName) =>
        availableGroupKeys.includes(groupName) && currentMetricGroups.value[groupName]?.length > 0
    )
  }
})

const isParentGroup = (groupName: string): boolean => {
  if (selectedVersion.value === '4.0') {
    return Object.keys(parentChildMap).includes(groupName)
  }
  return true
}

const getChildGroups = (parentGroup: string): string[] => {
  if (selectedVersion.value !== '4.0') return []

  const children = parentChildMap[parentGroup] || []
  const availableGroupKeys = Object.keys(currentMetricGroups.value)

  return children.filter(
    (child) => availableGroupKeys.includes(child) && currentMetricGroups.value[child]?.length > 0
  )
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
  <div class="calculator-container rounded border border-gray-200 bg-gray-50 p-4">
    <div v-if="!currentDefinitions" class="py-4 text-center text-gray-500">
      Loading metric definitions...
    </div>
    <div v-else-if="orderedGroupNames.length === 0" class="py-4 text-center text-gray-500">
      No metric groups defined or available for this version.
    </div>
    <div v-else>
      <template v-if="selectedVersion === '4.0'">
        <div v-for="groupName in orderedGroupNames" :key="groupName" class="mb-4 last:mb-0">
          <h3 class="text-md mb-2 border-b border-gray-400 pb-1 font-bold text-gray-800">
            {{ groupName }}
            <span v-if="groupTooltips[groupName]" class="cursor-help text-sm text-gray-500">
              (?)
            </span>
          </h3>

          <template
            v-if="currentMetricGroups[groupName] && currentMetricGroups[groupName].length > 0"
          >
            <MetricGroup
              v-for="metricKey in currentMetricGroups[groupName]"
              :key="metricKey"
              :metric-key="metricKey"
              :metric-name="getMetricName(metricKey)"
              :values="getMetricValues(metricKey)"
              :selected-value="selectedMetrics[metricKey]"
              @update:metric-value="handleMetricUpdate"
            />
          </template>

          <template v-if="getChildGroups(groupName).length > 0">
            <div
              v-for="childGroup in getChildGroups(groupName)"
              :key="childGroup"
              class="mb-4 ml-0 last:mb-0"
            >
              <h4 class="mb-2 pb-1 text-sm font-semibold text-gray-700">
                {{ childGroup }}
              </h4>

              <template
                v-if="currentMetricGroups[childGroup] && currentMetricGroups[childGroup].length > 0"
              >
                <MetricGroup
                  v-for="metricKey in currentMetricGroups[childGroup]"
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
      </template>

      <template v-else>
        <div v-for="groupName in orderedGroupNames" :key="groupName" class="mb-4 last:mb-0">
          <h3 class="text-md mb-2 border-b border-gray-400 pb-1 font-bold text-gray-800">
            {{ groupName }}
            <span v-if="groupTooltips[groupName]" class="cursor-help text-sm text-gray-500">
              (?)
            </span>
          </h3>

          <template
            v-if="currentMetricGroups[groupName] && currentMetricGroups[groupName].length > 0"
          >
            <MetricGroup
              v-for="metricKey in currentMetricGroups[groupName]"
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
</template>

<style scoped></style>
