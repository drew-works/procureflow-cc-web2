<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests, listInvoices } from '@/lib/kuroco/client'
import { visibleRequestsScope, canEditRequestActions, STATUS_COLOR } from '@/lib/permissions'
import { formatYen, formatDate } from '@/lib/format'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import StatusBadge from '@/components/StatusBadge.vue'
import { FileText, JapaneseYen, Clock3, Receipt } from 'lucide-vue-next'

ChartJS.register(ArcElement, Tooltip, Legend)

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const requests = ref<PurchaseRequest[]>([])
const invoiceCount = ref(0)
const invoiceCheckingCount = ref(0)

onMounted(async () => {
  const user = auth.currentUser!
  const scope = visibleRequestsScope(user.role)
  const { items } = await listPurchaseRequests({
    perPage: 1000,
    applicantMemberId: scope === 'own' ? user.memberId : undefined,
    departmentId: scope === 'department' ? user.departmentId : undefined,
  })
  requests.value = items
  const invoices = await listInvoices()
  invoiceCount.value = invoices.length
  invoiceCheckingCount.value = invoices.filter((i) => i.matchedStatus === '確認中' || i.matchedStatus === '不一致').length
  loading.value = false
})

const totalCount = computed(() => requests.value.length)
const totalAmount = computed(() => requests.value.reduce((s, r) => s + r.totalInclTax, 0))
const pendingApprovalCount = computed(() => {
  const user = auth.currentUser!
  return requests.value.filter((r) => canEditRequestActions(user.role, r, user.memberId, user.departmentId).canApprove).length
})
const orderedCount = computed(() => requests.value.filter((r) => ['発注済み', '一部検収', '検収完了', '請求書確認中', '支払い保留', '完了'].includes(r.status)).length)

const kpiCards = computed(() => {
  const user = auth.currentUser!
  const base = [
    { label: '申請件数', value: `${totalCount.value}件`, icon: FileText },
    { label: '合計金額', value: formatYen(totalAmount.value), icon: JapaneseYen },
  ]
  if (user.role === '経理担当') {
    base.push({ label: '請求照合対象', value: `${invoiceCheckingCount.value}件 / 全${invoiceCount.value}件`, icon: Receipt })
  } else if (user.role === '購買担当') {
    base.push({ label: '発注済み以降', value: `${orderedCount.value}件`, icon: Receipt })
    base.push({ label: '自分が承認すべき件数', value: `${pendingApprovalCount.value}件`, icon: Clock3 })
  } else if (['部門長', 'IT担当', '管理者'].includes(user.role)) {
    base.push({ label: '自分が承認すべき件数', value: `${pendingApprovalCount.value}件`, icon: Clock3 })
  }
  return base
})

const statusCounts = computed(() => {
  const map = new Map<string, number>()
  requests.value.forEach((r) => map.set(r.status, (map.get(r.status) ?? 0) + 1))
  return map
})

const chartData = computed(() => {
  const labels = Array.from(statusCounts.value.keys())
  const data = Array.from(statusCounts.value.values())
  const colors = labels.map((label) => {
    const cls = STATUS_COLOR[label as keyof typeof STATUS_COLOR] ?? ''
    if (cls.includes('blue')) return '#3b82f6'
    if (cls.includes('indigo')) return '#6366f1'
    if (cls.includes('amber')) return '#f59e0b'
    if (cls.includes('red')) return '#ef4444'
    if (cls.includes('emerald')) return '#10b981'
    if (cls.includes('cyan')) return '#06b6d4'
    if (cls.includes('purple')) return '#a855f7'
    if (cls.includes('teal')) return '#14b8a6'
    if (cls.includes('orange')) return '#f97316'
    if (cls.includes('rose')) return '#f43f5e'
    if (cls.includes('navy')) return '#334e68'
    return '#94a3b8'
  })
  return {
    labels,
    datasets: [{ data, backgroundColor: colors, borderWidth: 1 }],
  }
})

const myTasks = computed(() => {
  const user = auth.currentUser!
  const actionable = requests.value.filter((r) => {
    const actions = canEditRequestActions(user.role, r, user.memberId, user.departmentId)
    return actions.canApprove || actions.canPlaceOrder || actions.canRegisterReceipt || actions.canRegisterInvoice
  })
  const source = actionable.length ? actionable : requests.value
  return source.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5)
})

function openRequest(id: number) {
  router.push(`/requests/${id}`)
}
</script>

<template>
  <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>
  <div v-else class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="card in kpiCards" :key="card.label" class="card p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
            <component :is="card.icon" :size="20" />
          </div>
          <div>
            <p class="text-xs text-slate-500">{{ card.label }}</p>
            <p class="text-lg font-bold text-slate-800">{{ card.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card p-4 lg:col-span-1">
        <h2 class="mb-3 text-sm font-semibold text-slate-600">ステータス別件数</h2>
        <div v-if="totalCount === 0" class="py-10 text-center text-sm text-slate-400">データがありません</div>
        <Doughnut v-else :data="chartData" :options="{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }" />
      </div>

      <div class="card p-4 lg:col-span-2">
        <h2 class="mb-3 text-sm font-semibold text-slate-600">直近の自分のタスク</h2>
        <div class="overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr>
                <th>申請番号</th>
                <th>件名</th>
                <th>ステータス</th>
                <th>金額</th>
                <th>更新日</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in myTasks" :key="r.requestId" class="cursor-pointer hover:bg-slate-50" @click="openRequest(r.requestId)">
                <td>{{ r.requestNo }}</td>
                <td class="max-w-[200px] truncate">{{ r.title }}</td>
                <td><StatusBadge :status="r.status" /></td>
                <td>{{ formatYen(r.totalInclTax) }}</td>
                <td>{{ formatDate(r.updatedAt) }}</td>
              </tr>
              <tr v-if="myTasks.length === 0">
                <td colspan="5" class="py-6 text-center text-slate-400">タスクはありません</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
