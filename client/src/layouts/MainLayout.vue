<script lang="ts" setup>
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <AppHeader />
    <main>
      <div class="container mx-auto px-4 pb-8 sm:px-6 lg:px-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
