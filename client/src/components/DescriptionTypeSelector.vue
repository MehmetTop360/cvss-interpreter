<script lang="ts" setup>
import { computed } from 'vue'
import { FwbButtonGroup, FwbButton } from 'flowbite-vue'
import { useCvssStore } from '@/stores/cvssStore'

const cvssStore = useCvssStore()

const currentType = computed({
  get: () => cvssStore.selectedDescriptionType,
  set: (value) => cvssStore.setDescriptionType(value as 'simplified' | 'official'),
})

const types: ('simplified' | 'official')[] = ['simplified', 'official']
</script>

<template>
  <FwbButtonGroup>
    <FwbButton
      v-for="descType in types"
      :key="descType"
      @click="currentType = descType"
      :color="currentType === descType ? 'blue' : 'light'"
      size="sm"
      class="capitalize focus:ring-2 focus:ring-blue-300"
      pill
    >
      {{ descType }}
    </FwbButton>
  </FwbButtonGroup>
</template>

<style scoped>
.fwb-button-group > button {
  min-width: 90px;
  text-align: center;
}
</style>
