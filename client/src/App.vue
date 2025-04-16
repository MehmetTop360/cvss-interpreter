<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useCvssStore } from '@/stores/cvssStore'

const cvssStore = useCvssStore()

onMounted(() => {
  cvssStore.initializeTheme()
})
</script>

<template>
  <RouterView />
</template>
