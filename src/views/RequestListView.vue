<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests, listDepartments } from '@/lib/kuroco/client'
import { visibleRequestsScope, canCreateRequest } from '@/lib/permissions'
import { ALL_STATUSES } from '@/lib/kuroco/types'
import type { Department, PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const user = auth.currentUser!
const scope = visibleRequestsScope(user.role)

const departments = ref<Department[]>([])
const items = ref<PurchaseRequest[]>([])
const totalCnt = ref(0)
const totalPageCnt = ref(1)
const loading = ref(true)

const filters = reactive({
  keyword: '',
  status: '' as string,
  departmentId: '' as number | '',
  amountMin: '' as number | '',
  amountMax: '' as number | '',
  dateFrom: '',
  dateTo: '',
  page: 1,
})

async function load() {
  loading.value = true
  const { items: list, pageInfo } = await listPurchaseRequests({
    keyword: filters.keyword || undefined,
    status: (filters.status || undefined) as any,
    departmentId: scope === 'department' ? user.departmentId : filters.departmentId || undefined,
    applicantMemberId: scope === 'own' ? user.memberId : undefined,
    amountMin: filters.amountMin === '' ? null : Number(filters.amountMin),
    amountMax: filters.amountMax === '' ? null : Number(filters.amountMax),
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: filters.page,
    perPage: 10,
  })
  items.value = list
  totalCnt.value = pageInfo.totalCnt
  totalPageCnt.value = pageInfo.totalPageCnt
  loading.value = false
}

onMounted(async () => {
  departments.value = await listDepartments()
  await load()
})

watch(
  () => [filters.keyword, filters.status, filters.departmentId, filters.amountMin, filters.amountMax, filters.dateFrom, filters.dateTo],
  () => {
    filters.page = 1
    load()
  },
)
watch(() => filters.page, load)

const scopeLabel = computed(() => {
  if (scope === 'own') return '自分の申請のみ表示しています'
  if (scope === 'department') return `${user.role}として自部門（${departments.value.find((d) => d.departmentId === user.departmentId)?.deptName ?? ''}）の申請を表示しています`
  return '全件表示しています'
})

function openRequest(id: number) {
  router.push(`/requests/${id}`)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-slate-500">{{ scopeLabel }}</p>
      <button v-if="canCreateRequest(user.role)" class="btn-primary" @click="router.push('/requests/new')">
        <Plus :size="16" /> 新規申請
      </button>
    </div>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div class="relative lg:col-span-2">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.keyword" class="input pl-8" placeholder="件名・申請番号・申請者で検索" />
        </div>
        <select v-model="filters.status" class="input">
          <option value="">すべてのステータス</option>
          <option v-for="s in ALL_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-if="scope === 'all'" v-model="filters.departmentId" class="input">
          <option value="">すべての部署</option>
          <option v-for="d in departments" :key="d.departmentId" :value="d.departmentId">{{ d.deptName }}</option>
        </select>
        <input v-model="filters.dateFrom" type="date" class="input" title="申請日(From)" />
        <input v-model="filters.dateTo" type="date" class="input" title="申請日(To)" />
        <input v-model="filters.amountMin" type="number" class="input" placeholder="金額(以上)" />
        <input v-model="filters.amountMax" type="number" class="input" placeholder="金額(以下)" />
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>申請番号</th>
            <th>件名</th>
            <th>部署</th>
            <th>申請者</th>
            <th>ステータス</th>
            <th class="text-right">金額(税込)</th>
            <th>申請日</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="7" class="py-8 text-center text-slate-400">読み込み中...</td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="7" class="py-8 text-center text-slate-400">該当する申請がありません</td>
          </tr>
          <tr v-for="r in items" :key="r.requestId" class="cursor-pointer hover:bg-slate-50" @click="openRequest(r.requestId)">
            <td class="font-mono text-xs">{{ r.requestNo }}</td>
            <td class="max-w-[240px] truncate">{{ r.title }}</td>
            <td>{{ r.departmentName }}</td>
            <td>{{ r.applicantName }}</td>
            <td><StatusBadge :status="r.status" /></td>
            <td class="text-right">{{ formatYen(r.totalInclTax) }}</td>
            <td>{{ formatDate(r.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && totalCnt > 0" class="flex items-center justify-between text-sm text-slate-500">
      <span>全{{ totalCnt }}件中 {{ (filters.page - 1) * 10 + 1 }}-{{ Math.min(filters.page * 10, totalCnt) }}件</span>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" :disabled="filters.page <= 1" @click="filters.page--"><ChevronLeft :size="14" /></button>
        <span>{{ filters.page }} / {{ totalPageCnt }}</span>
        <button class="btn-secondary" :disabled="filters.page >= totalPageCnt" @click="filters.page++"><ChevronRight :size="14" /></button>
      </div>
    </div>
  </div>
</template>
