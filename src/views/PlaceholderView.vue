<script setup lang="ts">
import { Construction } from 'lucide-vue-next'
defineProps<{ title?: string }>()
</script>

<template>
  <div class="card flex flex-col items-center justify-center gap-3 p-16 text-center">
    <Construction :size="40" class="text-slate-300" />
    <h2 class="text-lg font-semibold text-slate-600">{{ title ?? '準備中' }}</h2>
    <p class="text-sm text-slate-400">この画面は別タスクで実装予定です</p>
  </div>
</template>
