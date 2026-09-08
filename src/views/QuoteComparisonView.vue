<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests, getPurchaseRequest, selectQuoteVendor } from '@/lib/kuroco/client'
import { visibleRequestsScope, canEditRequestActions } from '@/lib/permissions'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { CheckCircle2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const user = auth.currentUser!

const singleId = computed(() => (route.params.id ? Number(route.params.id) : null))
const singleRequest = ref<PurchaseRequest | null>(null)
const listRequests = ref<PurchaseRequest[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)

async function loadList() {
  const scope = visibleRequestsScope(user.role)
  const { items } = await listPurchaseRequests({
    perPage: 1000,
    applicantMemberId: scope === 'own' ? user.memberId : undefined,
    departmentId: scope === 'department' ? user.departmentId : undefined,
  })
  listRequests.value = items.filter((r) => r.quotes.length > 0)
}

async function load() {
  loading.value = true
  if (singleId.value) {
    singleRequest.value = await getPurchaseRequest(singleId.value)
  } else {
    await loadList()
  }
  loading.value = false
}
onMounted(load)

function canSelect(req: PurchaseRequest) {
  return canEditRequestActions(user.role, req, user.memberId, user.departmentId).canSelectQuote
}

async function select(req: PurchaseRequest, vendorId: number) {
  busyId.value = req.requestId
  await selectQuoteVendor(req.requestId, vendorId, user.memberId, user.name)
  await load()
  busyId.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>

    <template v-else-if="singleRequest">
      <div class="card p-4">
        <p class="font-mono text-xs text-slate-400">{{ singleRequest.requestNo }}</p>
        <h2 class="text-lg font-bold text-slate-800">{{ singleRequest.title }}</h2>
        <StatusBadge :status="singleRequest.status" class="mt-1" />
      </div>
      <div class="card overflow-x-auto p-4">
        <table class="table-base">
          <thead>
            <tr><th>ベンダー</th><th class="text-right">金額(税込)</th><th>納期</th><th>備考</th><th>選定</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="q in singleRequest.quotes" :key="q.vendorId">
              <td>{{ q.vendorName }}</td>
              <td class="text-right">{{ formatYen(q.amount) }}</td>
              <td>{{ formatDate(q.deliveryDate) }}</td>
              <td>{{ q.note }}</td>
              <td>
                <span v-if="q.selected" class="badge bg-emerald-100 text-emerald-700"><CheckCircle2 :size="12" class="mr-1 inline" />選定済み</span>
                <button v-else-if="canSelect(singleRequest)" class="btn-secondary text-xs" :disabled="busyId === singleRequest.requestId" @click="select(singleRequest, q.vendorId)">
                  選定する
                </button>
              </td>
            </tr>
            <tr v-if="singleRequest.quotes.length === 0"><td colspan="5" class="py-6 text-center text-slate-400">見積が登録されていません</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <p class="text-xs text-slate-500">見積が登録されている申請の一覧です</p>
      <div v-if="listRequests.length === 0" class="card p-10 text-center text-sm text-slate-400">対象の申請がありません</div>
      <div v-for="req in listRequests" :key="req.requestId" class="card p-4">
        <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-mono text-xs text-slate-400">{{ req.requestNo }}</p>
            <button class="text-left text-base font-semibold text-navy-900 hover:underline" @click="router.push(`/requests/${req.requestId}/quotes`)">
              {{ req.title }}
            </button>
          </div>
          <StatusBadge :status="req.status" />
        </div>
        <div class="overflow-x-auto">
          <table class="table-base">
            <thead>
              <tr><th>ベンダー</th><th class="text-right">金額(税込)</th><th>納期</th><th>備考</th><th>選定</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="q in req.quotes" :key="q.vendorId">
                <td>{{ q.vendorName }}</td>
                <td class="text-right">{{ formatYen(q.amount) }}</td>
                <td>{{ formatDate(q.deliveryDate) }}</td>
                <td>{{ q.note }}</td>
                <td>
                  <span v-if="q.selected" class="badge bg-emerald-100 text-emerald-700"><CheckCircle2 :size="12" class="mr-1 inline" />選定済み</span>
                  <button v-else-if="canSelect(req)" class="btn-secondary text-xs" :disabled="busyId === req.requestId" @click="select(req, q.vendorId)">
                    選定する
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
