<script lang="ts" setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import VersionSelector from '@/components/VersionSelector.vue'
import DescriptionTypeSelector from '@/components/DescriptionTypeSelector.vue'
import { FwbButton } from 'flowbite-vue'

const route = useRoute()

const navLinks = [
  { name: 'Calculator', label: 'Calculator' },
  { name: 'Comparison', label: 'Compare' },
]

const showCalculatorControls = computed(() => route.name === 'Calculator')
</script>

<template>
  <header class="mb-6 bg-white p-4 shadow-sm">
    <div class="container mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <nav class="flex space-x-4">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="{ name: link.name }"
            class="text-sm font-medium text-gray-600 hover:text-blue-600"
            active-class="pb-1 text-blue-600 border-b-2 border-blue-600"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
        <div
          v-if="showCalculatorControls"
          class="flex items-center space-x-4 border-l border-gray-200 pl-6"
        >
          <VersionSelector />
          <DescriptionTypeSelector />
        </div>
      </div>
      <div class="flex items-center">
        <FwbButton v-if="showCalculatorControls" color="blue" size="sm">
          Generate Report
        </FwbButton>
      </div>
    </div>
  </header>
</template>

<style scoped>
nav a {
  transition:
    color 0.2s ease-in-out,
    border-color 0.2s ease-in-out;
}
</style>
