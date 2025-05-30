<script lang="ts" setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import VersionSelector from '@/components/VersionSelector.vue'
import DescriptionTypeSelector from '@/components/DescriptionTypeSelector.vue'
import { useCvssStore } from '@/stores/cvssStore'

const route = useRoute()
const cvssStore = useCvssStore()
const { theme } = storeToRefs(cvssStore)

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
const showComparisonControls = computed(() => route.name === 'Comparison')

function toggleTheme() {
  cvssStore.toggleTheme()
}
</script>

<template>
  <header
    class="relative mb-6 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <RouterLink
              :to="{ name: 'Calculator' }"
              class="text-xl font-bold text-gray-800 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300"
            >
              CVSS Interpreter
            </RouterLink>
          </div>
          <div
            v-if="showCalculatorControls"
            class="hidden items-center space-x-3 border-l border-gray-200 pl-4 dark:border-gray-600 sm:ml-4 sm:flex"
          >
            <VersionSelector />
            <DescriptionTypeSelector />
          </div>
          <div
            v-else-if="showComparisonControls"
            class="hidden items-center space-x-3 border-l border-gray-200 pl-4 dark:border-gray-600 sm:ml-4 sm:flex"
          >
            <VersionSelector />
          </div>
        </div>

        <div class="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
          <button
            @click="toggleTheme"
            type="button"
            class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 dark:focus:ring-offset-gray-800"
            :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
          >
            <svg
              v-if="theme === 'light'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          </button>

          <nav class="flex space-x-4">
            <RouterLink
              v-for="link in navLinks"
              :key="link.name"
              :to="{ name: link.name }"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              active-class="text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-white"
              exact-active-class="font-semibold text-gray-900 bg-gray-200 dark:bg-gray-600 dark:text-white"
            >
              {{ link.label }}
            </RouterLink>
          </nav>
        </div>

        <div class="-mr-2 flex items-center sm:hidden">
          <button
            @click="toggleTheme"
            type="button"
            class="mr-2 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 dark:focus:ring-offset-gray-800"
            :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
          >
            <svg
              v-if="theme === 'light'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          </button>
          <button
            @click="toggleMobileMenu"
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
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
          class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          active-class="text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-white"
          exact-active-class="font-semibold text-gray-900 bg-gray-200 dark:bg-gray-600 dark:text-white"
        >
          {{ link.label }}
        </RouterLink>
      </div>
      <div
        v-if="showCalculatorControls"
        class="flex flex-wrap items-center space-x-6 border-t border-gray-200 px-4 py-4 dark:border-gray-600"
      >
        <VersionSelector />
        <DescriptionTypeSelector />
      </div>
      <div
        v-else-if="showComparisonControls"
        class="flex items-center space-x-6 border-t border-gray-200 px-4 py-4 dark:border-gray-600"
      >
        <VersionSelector />
      </div>
    </div>
  </header>
</template>

<style scoped></style>
