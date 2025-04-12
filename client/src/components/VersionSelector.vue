<script lang="ts" setup>
import { computed } from 'vue'
import { FwbButtonGroup, FwbButton } from 'flowbite-vue'
import { useCvssStore } from '@/stores/cvssStore'

const cvssStore = useCvssStore()

const currentVersion = computed({
  get: () => cvssStore.selectedVersion,
  set: (value) => cvssStore.setVersion(value as '3.1' | '4.0'),
})

const versions: ('3.1' | '4.0')[] = ['4.0', '3.1']
</script>

<template>
  <FwbButtonGroup>
    <FwbButton
      v-for="version in versions"
      :key="version"
      @click="currentVersion = version"
      :color="currentVersion === version ? 'blue' : 'light'"
      size="sm"
      class="focus:ring-2 focus:ring-blue-300"
      pill
    >
      {{ version }}
    </FwbButton>
  </FwbButtonGroup>
</template>

<style scoped>
.fwb-button-group > button {
  min-width: 50px;
  text-align: center;
}
</style>
