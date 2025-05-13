<script lang="ts" setup>
import { FwbButton, FwbButtonGroup } from 'flowbite-vue'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import { useCvssStore } from '@/stores/cvssStore'

const props = defineProps<{
  metricKey: string
  metricName: string
  values: CvssTemplateBare[]
  selectedValue: string | undefined
}>()

const emit = defineEmits<{
  (e: 'update:metricValue', metricKey: string, valueKey: string): void
}>()

const cvssStore = useCvssStore()

function getDescription(value: CvssTemplateBare): string {
  const key = cvssStore.preferredDescriptionKey
  return value[key] || value.official_description || 'No description available.'
}

const tooltipContent = (value: CvssTemplateBare) => {
  return `${value.value_name}: ${getDescription(value)}`
}

function selectValue(valueKey: string) {
  emit('update:metricValue', props.metricKey, valueKey)
}

const selectedClasses =
  'text-white bg-blue-700 border border-transparent hover:bg-blue-800 focus:ring-2 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'

const defaultClasses =
  'text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-700'
</script>

<template>
  <div
    class="grid grid-cols-1 items-start gap-2 border-b border-gray-200 py-2 last:border-b-0 dark:border-gray-700 md:grid-cols-3"
  >
    <div class="pt-1 text-sm font-medium text-gray-700 dark:text-gray-300 md:col-span-1">
      {{ metricName }} ({{ metricKey }})
    </div>

    <div class="md:col-span-2">
      <FwbButtonGroup class="flex flex-wrap gap-1">
        <FwbButton
          v-for="value in values"
          :key="value.value_key"
          size="xs"
          pill
          :class="[
            'metric-button focus:ring-1',
            selectedValue === value.value_key ? selectedClasses : defaultClasses,
          ]"
          :data-tooltip="tooltipContent(value)"
          @click="selectValue(value.value_key)"
        >
          <span class="mr-1 font-semibold">{{ value.value_key }}:</span> {{ value.value_name }}
        </FwbButton>
      </FwbButtonGroup>
    </div>
  </div>
</template>

<style scoped>
.fwb-button-group > button {
  margin-right: 0.25rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.metric-button {
  position: relative;
}

.metric-button::after,
.metric-button::before {
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

.metric-button::after {
  content: attr(data-tooltip);
  top: 100%;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%) translateY(5px);
  width: max-content;
  max-width: 300px;
  padding: 6px 10px;
  background: rgba(17, 24, 39, 0.9);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  text-align: left;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  line-height: 1.4;
}

.dark .metric-button::after {
  background: rgba(226, 232, 240, 0.95);
  color: #1f2937;
  box-shadow: 0 2px 10px rgba(255, 255, 255, 0.1);
}

.metric-button::before {
  content: '';
  top: 100%;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: rgba(17, 24, 39, 0.9);
  border-top-color: transparent;
}

.dark .metric-button::before {
  border-bottom-color: rgba(226, 232, 240, 0.95);
  border-top-color: transparent;
}

.metric-button:hover::after,
.metric-button:hover::before {
  opacity: 1;
  visibility: visible;
}

.metric-button:not(:hover)::after,
.metric-button:not(:hover)::before {
  transition-delay: 0s;
  top: 100%;
  bottom: auto;
}
</style>
