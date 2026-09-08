<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listInvoices, listPurchaseRequests, holdInvoicePayment, confirmInvoiceMatch, confirmInvoicePayment } from '@/lib/kuroco/client'
import { canManageInvoices } from '@/lib/permissions'
import type { Invoice, InvoiceMatchStatus, PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { Search, AlertTriangle, PauseCircle, CheckCircle2, JapaneseYen } from 'lucide-vue-next'

const auth = useAuthStore()
const user = auth.currentUser!
const canManage = canManageInvoices(user.role)

const STATUS_OPTIONS: InvoiceMatchStatus[] = ['確認中', '一致', '不一致', '支払保留', '支払済']
const INVOICE_STATUS_COLOR: Record<InvoiceMatchStatus, string> = {
  確認中: 'bg-slate-100 text-slate-600',
  一致: 'bg-emerald-100 text-emerald-700',
  不一致: 'bg-red-100 text-red-700',
  支払保留: 'bg-rose-100 text-rose-700',
  支払済: 'bg-navy-100 text-navy-800',
}

const invoices = ref<Invoice[]>([])
const requestsById = ref<Map<number, PurchaseRequest>>(new Map())
const loading = ref(true)
const selectedId = ref<number | null>(null)
const busy = ref(false)

const filters = reactive({ keyword: '', status: '' as InvoiceMatchStatus | '' })

async function load() {
  loading.value = true
  const [inv, { items: reqs }] = await Promise.all([listInvoices(), listPurchaseRequests({ perPage: 1000 })])
  invoices.value = inv.slice().sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1))
  requestsById.value = new Map(reqs.map((r) => [r.requestId, r]))
  loading.value = false
}
onMounted(load)

const filteredInvoices = computed(() => {
  let list = invoices.value
  if (filters.status) list = list.filter((i) => i.matchedStatus === filters.status)
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    list = list.filter(
      (i) =>
        i.invoiceNo.toLowerCase().includes(kw) ||
        i.purchaseRequestTitle.toLowerCase().includes(kw) ||
        i.vendorName.toLowerCase().includes(kw) ||
        (requestsById.value.get(i.purchaseRequestId)?.requestNo ?? '').toLowerCase().includes(kw),
    )
  }
  return list
})

function requestNoOf(inv: Invoice) {
  return requestsById.value.get(inv.purchaseRequestId)?.requestNo ?? '-'
}

const selected = computed(() => invoices.value.find((i) => i.invoiceId === selectedId.value) ?? null)
const selectedRequest = computed(() => (selected.value ? requestsById.value.get(selected.value.purchaseRequestId) ?? null : null))
const isMismatch = computed(() => !!selectedRequest.value && !!selected.value && selectedRequest.value.totalInclTax !== selected.value.amount)
const diffAmount = computed(() => (selectedRequest.value && selected.value ? selected.value.amount - selectedRequest.value.totalInclTax : 0))

function select(inv: Invoice) {
  selectedId.value = selectedId.value === inv.invoiceId ? null : inv.invoiceId
}

async function doHold() {
  if (!selected.value) return
  busy.value = true
  await holdInvoicePayment(selected.value.invoiceId, user.memberId, user.name)
  await load()
  busy.value = false
}
async function doConfirmMatch() {
  if (!selected.value) return
  busy.value = true
  await confirmInvoiceMatch(selected.value.invoiceId, user.memberId, user.name)
  await load()
  busy.value = false
}
async function doConfirmPayment() {
  if (!selected.value) return
  busy.value = true
  await confirmInvoicePayment(selected.value.invoiceId, user.memberId, user.name)
  await load()
  busy.value = false
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">
      {{ canManage ? '請求書の照合・支払保留・支払確定を行えます' : '請求書照合の状況を閲覧できます（照合操作は経理担当・管理者のみ）' }}
    </p>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="relative sm:col-span-2">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.keyword" class="input pl-8" placeholder="請求書番号・申請番号・件名・取引先で検索" />
        </div>
        <select v-model="filters.status" class="input">
          <option value="">すべての照合ステータス</option>
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>請求書番号</th>
            <th>対象申請番号</th>
            <th>件名</th>
            <th>取引先</th>
            <th class="text-right">請求金額</th>
            <th>受領日</th>
            <th>照合ステータス</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td colspan="7" class="py-8 text-center text-slate-400">読み込み中...</td></tr>
          <tr v-else-if="filteredInvoices.length === 0"><td colspan="7" class="py-8 text-center text-slate-400">該当する請求書がありません</td></tr>
          <template v-for="inv in filteredInvoices" :key="inv.invoiceId">
            <tr class="cursor-pointer hover:bg-slate-50" :class="{ 'bg-navy-50': selectedId === inv.invoiceId }" @click="select(inv)">
              <td class="font-mono text-xs">{{ inv.invoiceNo }}</td>
              <td class="font-mono text-xs">{{ requestNoOf(inv) }}</td>
              <td class="max-w-[200px] truncate">{{ inv.purchaseRequestTitle }}</td>
              <td>{{ inv.vendorName }}</td>
              <td class="text-right">{{ formatYen(inv.amount) }}</td>
              <td>{{ formatDate(inv.receivedDate) }}</td>
              <td><span class="badge" :class="INVOICE_STATUS_COLOR[inv.matchedStatus]">{{ inv.matchedStatus }}</span></td>
            </tr>
            <tr v-if="selectedId === inv.invoiceId">
              <td colspan="7" class="bg-slate-50 p-4">
                <div v-if="!selectedRequest" class="text-sm text-slate-400">対象申請の情報が見つかりません</div>
                <div v-else class="space-y-3">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div class="card p-3">
                      <p class="text-xs text-slate-500">発注金額（申請ベース）</p>
                      <p class="text-lg font-bold text-slate-800">{{ formatYen(selectedRequest.totalInclTax) }}</p>
                    </div>
                    <div class="card p-3">
                      <p class="text-xs text-slate-500">請求金額</p>
                      <p class="text-lg font-bold text-slate-800">{{ formatYen(inv.amount) }}</p>
                    </div>
                    <div class="card p-3" :class="isMismatch ? 'border-red-300' : 'border-emerald-300'">
                      <p class="text-xs text-slate-500">差額</p>
                      <p class="text-lg font-bold" :class="isMismatch ? 'text-red-600' : 'text-emerald-600'">
                        {{ isMismatch ? (diffAmount > 0 ? '+' : '') + formatYen(diffAmount) : '一致' }}
                      </p>
                    </div>
                  </div>

                  <div v-if="isMismatch" class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle :size="16" class="mt-0.5 shrink-0" />
                    <div>
                      <p class="font-semibold">発注金額と請求金額が一致しません</p>
                      <p class="text-xs">{{ inv.discrepancyNote || '差異の内容を確認し、取引先へ問い合わせるか金額を修正してください。' }}</p>
                    </div>
                  </div>

                  <p class="text-xs text-slate-500">対象申請ステータス: <StatusBadge :status="selectedRequest.status" /></p>

                  <div v-if="canManage" class="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    <button
                      v-if="inv.matchedStatus === '不一致'"
                      class="btn-secondary text-xs"
                      :disabled="busy"
                      @click.stop="doHold"
                    >
                      <PauseCircle :size="14" /> 支払い保留にする
                    </button>
                    <button
                      v-if="inv.matchedStatus === '不一致' || inv.matchedStatus === '支払保留'"
                      class="btn-secondary text-xs"
                      :disabled="busy"
                      @click.stop="doConfirmMatch"
                    >
                      <CheckCircle2 :size="14" /> 一致として確定
                    </button>
                    <button
                      v-if="(inv.matchedStatus === '一致' || inv.matchedStatus === '確認中') && selectedRequest.status !== '完了'"
                      class="btn-primary text-xs"
                      :disabled="busy"
                      @click.stop="doConfirmPayment"
                    >
                      <JapaneseYen :size="14" /> 支払確定
                    </button>
                    <span v-if="inv.matchedStatus === '支払済'" class="badge bg-navy-100 text-navy-800 text-xs">支払済・処理完了</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
