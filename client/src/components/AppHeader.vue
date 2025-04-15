<script lang="ts" setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import VersionSelector from '@/components/VersionSelector.vue'
import DescriptionTypeSelector from '@/components/DescriptionTypeSelector.vue'

const route = useRoute()

const navLinks = [
  { name: 'Calculator', label: 'Calculator' },
  { name: 'Comparison', label: 'Compare' },
]

const isMobileMenuOpen = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

const showCalculatorControls = computed(() => route.name === 'Calculator')
</script>

<template>
  <header class="relative mb-6 border-b border-gray-200 bg-white shadow-sm">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <RouterLink
              :to="{ name: 'Calculator' }"
              class="text-xl font-bold text-gray-800 hover:text-gray-600"
            >
              CVSS Interpreter
            </RouterLink>
          </div>
          <div
            v-if="showCalculatorControls"
            class="hidden items-center space-x-3 border-l border-gray-200 pl-4 sm:ml-4 sm:flex"
          >
            <VersionSelector />
            <DescriptionTypeSelector />
          </div>
        </div>

        <div class="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
          <nav class="flex space-x-4">
            <RouterLink
              v-for="link in navLinks"
              :key="link.name"
              :to="{ name: link.name }"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              active-class="text-gray-900 bg-gray-100"
              exact-active-class="font-semibold text-gray-900 bg-gray-200"
            >
              {{ link.label }}
            </RouterLink>
          </nav>
        </div>

        <div class="-mr-2 flex items-center sm:hidden">
          <button
            @click="toggleMobileMenu"
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-controls="mobile-menu"
            :aria-expanded="isMobileMenuOpen"
          >
            <span class="sr-only">Open main menu</span>
            <svg
              v-if="!isMobileMenuOpen"
              class="block h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
            <svg
              v-else
              class="block h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isMobileMenuOpen" class="sm:hidden" id="mobile-menu">
      <div class="space-y-1 px-2 pb-3 pt-2">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name + '-mobile'"
          :to="{ name: link.name }"
          @click="closeMobileMenu"
          class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          active-class="text-gray-900 bg-gray-100"
          exact-active-class="font-semibold text-gray-900 bg-gray-200"
        >
          {{ link.label }}
        </RouterLink>
      </div>
      <div
        v-if="showCalculatorControls"
        class="flex items-center space-x-6 border-t border-gray-200 px-4 py-4"
      >
        <VersionSelector />
        <DescriptionTypeSelector />
      </div>
    </div>
  </header>
</template>

<style scoped></style>
