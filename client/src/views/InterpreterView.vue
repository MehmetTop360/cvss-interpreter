<script lang="ts" setup>
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import CvssCalculator from '@/components/CvssCalculator.vue'
import InterpretationDisplay from '@/components/InterpretationDisplay.vue'

const cvssStore = useCvssStore()

const { cvssString, selectedVersion, selectedMetrics } = storeToRefs(cvssStore)

onMounted(() => {
  if (!cvssStore.definitions[cvssStore.selectedVersion]) {
    cvssStore.fetchDefinitions()
  }
})

const currentScore = computed(() => {
  return '0.0 (None)'
})

const cvssVersionFullName = computed(() => {
  return selectedVersion.value === '4.0' ? 'CVSS 4.0' : 'CVSS 3.1'
})

watch(
  selectedMetrics,
  () => {
    console.log('Selected metrics changed - updating CVSS string')
  },
  { deep: true }
)
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="sticky top-0 z-10 mb-3 border-b border-gray-300 bg-gray-100 pb-3 pt-1">
      <h2 class="mb-1 text-base font-semibold text-gray-600">
        {{ cvssVersionFullName }} Vector & Score
      </h2>
      <div class="rounded border border-gray-200 bg-white p-2 font-mono text-sm shadow-sm">
        <p class="break-all">{{ cvssString }}</p>
        <p class="mt-1 font-semibold">Score: {{ currentScore }}</p>
      </div>
    </div>
    <div class="flex-grow overflow-y-auto pb-4">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-7">
          <CvssCalculator />
        </div>

        <div class="col-span-12 min-h-[500px] lg:col-span-5">
          <h2 class="mb-2 text-base font-semibold text-gray-700">Interpretation</h2>
          <div class="h-full">
            <InterpretationDisplay />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .overflow-y-auto {
    height: calc(100vh - 140px);
  }
}
</style>
