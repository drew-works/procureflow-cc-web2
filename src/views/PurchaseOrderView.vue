<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests } from '@/lib/kuroco/client'
import { visibleRequestsScope } from '@/lib/permissions'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'

const auth = useAuthStore()
const router = useRouter()
const user = auth.currentUser!

const items = ref<PurchaseRequest[]>([])
const loading = ref(true)

onMounted(async () => {
  const scope = visibleRequestsScope(user.role)
  const { items: all } = await listPurchaseRequests({
    perPage: 1000,
    applicantMemberId: scope === 'own' ? user.memberId : undefined,
    departmentId: scope === 'department' ? user.departmentId : undefined,
  })
  items.value = all.filter((r) => !!r.poNo).sort((a, b) => (a.poDate! < b.poDate! ? 1 : -1))
  loading.value = false
})
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">発注済みの申請一覧です</p>
    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>発注書番号</th><th>発注日</th><th>件名</th><th>ベンダー</th><th class="text-right">金額(税込)</th><th>ステータス</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td colspan="6" class="py-8 text-center text-slate-400">読み込み中...</td></tr>
          <tr v-else-if="items.length === 0"><td colspan="6" class="py-8 text-center text-slate-400">発注済みの申請はありません</td></tr>
          <tr v-for="r in items" :key="r.requestId" class="cursor-pointer hover:bg-slate-50" @click="router.push(`/requests/${r.requestId}`)">
            <td class="font-mono text-xs">{{ r.poNo }}</td>
            <td>{{ formatDate(r.poDate) }}</td>
            <td class="max-w-[220px] truncate">{{ r.title }}</td>
            <td>{{ r.quotes.find((q) => q.selected)?.vendorName ?? '-' }}</td>
            <td class="text-right">{{ formatYen(r.totalInclTax) }}</td>
            <td><StatusBadge :status="r.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
