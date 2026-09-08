<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { listAuditLogs } from '@/lib/kuroco/client'
import type { AuditLog } from '@/lib/kuroco/types'
import { Search } from 'lucide-vue-next'

const logs = ref<AuditLog[]>([])
const loading = ref(true)

const filters = reactive({ keyword: '', actionType: '', dateFrom: '', dateTo: '' })

async function load() {
  loading.value = true
  logs.value = (await listAuditLogs()).slice().sort((a, b) => (a.ts < b.ts ? 1 : -1))
  loading.value = false
}
onMounted(load)

const actionTypes = computed(() => Array.from(new Set(logs.value.map((l) => l.actionType))))

function actionColor(actionType: string): string {
  if (actionType.includes('却下') || actionType.includes('不一致')) return 'bg-red-100 text-red-700'
  if (actionType.includes('差し戻し') || actionType.includes('保留')) return 'bg-amber-100 text-amber-700'
  if (actionType.includes('承認') || actionType.includes('一致確定') || actionType.includes('解消')) return 'bg-emerald-100 text-emerald-700'
  if (actionType.includes('申請') || actionType.includes('作成')) return 'bg-blue-100 text-blue-700'
  if (actionType.includes('発注')) return 'bg-cyan-100 text-cyan-700'
  if (actionType.includes('検収')) return 'bg-purple-100 text-purple-700'
  if (actionType.includes('請求書') || actionType.includes('支払')) return 'bg-orange-100 text-orange-700'
  if (actionType.includes('ステータス変更') || actionType.includes('更新')) return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-100 text-slate-600'
}

const filtered = computed(() => {
  let list = logs.value
  if (filters.actionType) list = list.filter((l) => l.actionType === filters.actionType)
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    list = list.filter(
      (l) =>
        l.actorName.toLowerCase().includes(kw) ||
        l.detail.toLowerCase().includes(kw) ||
        l.targetType.toLowerCase().includes(kw) ||
        String(l.targetId).includes(kw),
    )
  }
  if (filters.dateFrom) list = list.filter((l) => l.ts.slice(0, 10) >= filters.dateFrom)
  if (filters.dateTo) list = list.filter((l) => l.ts.slice(0, 10) <= filters.dateTo)
  return list
})
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">全社の操作履歴を表示しています（経理担当・管理者のみ閲覧可能）</p>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="relative lg:col-span-2">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.keyword" class="input pl-8" placeholder="操作者・対象・詳細で検索" />
        </div>
        <select v-model="filters.actionType" class="input">
          <option value="">すべての操作種別</option>
          <option v-for="a in actionTypes" :key="a" :value="a">{{ a }}</option>
        </select>
        <div class="flex gap-2">
          <input v-model="filters.dateFrom" type="date" class="input" title="期間(From)" />
          <input v-model="filters.dateTo" type="date" class="input" title="期間(To)" />
        </div>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>日時</th>
            <th>操作者</th>
            <th>操作種別</th>
            <th>対象</th>
            <th>詳細</th>
            <th>ステータス変化</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td colspan="6" class="py-8 text-center text-slate-400">読み込み中...</td></tr>
          <tr v-else-if="filtered.length === 0"><td colspan="6" class="py-8 text-center text-slate-400">該当するログがありません</td></tr>
          <tr v-for="l in filtered" :key="l.logId">
            <td class="whitespace-nowrap font-mono text-xs">{{ l.ts }}</td>
            <td>{{ l.actorName }}</td>
            <td><span class="badge" :class="actionColor(l.actionType)">{{ l.actionType }}</span></td>
            <td class="whitespace-nowrap text-xs">{{ l.targetType }} #{{ l.targetId }}</td>
            <td class="max-w-[320px] whitespace-normal text-xs text-slate-600">{{ l.detail }}</td>
            <td class="whitespace-nowrap text-xs">
              <template v-if="l.beforeStatus || l.afterStatus">{{ l.beforeStatus ?? '-' }} → {{ l.afterStatus ?? '-' }}</template>
              <template v-else>-</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
