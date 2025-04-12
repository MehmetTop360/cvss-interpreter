<script lang="ts" setup>
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <AppHeader />
    <main>
      <div class="container mx-auto px-6 pb-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
