<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ShieldAlert } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const from = typeof route.query.from === 'string' ? route.query.from : null
</script>

<template>
  <div class="card mx-auto flex max-w-lg flex-col items-center gap-3 p-16 text-center">
    <ShieldAlert :size="40" class="text-red-300" />
    <h2 class="text-lg font-semibold text-slate-700">403 - アクセス権がありません</h2>
    <p class="text-sm text-slate-500">
      現在のロール「{{ auth.currentUser?.role }}」では<span v-if="from">「{{ from }}」</span>を表示する権限がありません。
    </p>
    <button class="btn-primary mt-2" @click="router.push('/')">ダッシュボードに戻る</button>
  </div>
</template>
