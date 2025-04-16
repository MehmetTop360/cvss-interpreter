<script lang="ts" setup>
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900">
    <AppHeader />
    <main>
      <div class="container mx-auto max-w-[100vw] px-4 pb-8 sm:px-6 lg:px-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
