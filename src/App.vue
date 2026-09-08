<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/AppShell.vue'

const route = useRoute()
const auth = useAuthStore()

const isLoginPage = computed(() => route.name === 'login')
const showShell = computed(() => !isLoginPage.value && auth.isLoggedIn)
</script>

<template>
  <RouterView v-if="isLoginPage" />
  <AppShell v-else-if="showShell">
    <RouterView />
  </AppShell>
  <div v-else class="flex h-screen items-center justify-center text-slate-400 text-sm">読み込み中...</div>
</template>
