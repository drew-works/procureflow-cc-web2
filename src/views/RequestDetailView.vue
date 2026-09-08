<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  getPurchaseRequest,
  actOnApproval,
  resubmitRequest,
  submitDraft,
  placeOrder,
  registerReceipt,
  registerInvoice,
  type ApprovalAction,
} from '@/lib/kuroco/client'
import { canEditRequestActions } from '@/lib/permissions'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { CheckCircle2, XCircle, RotateCcw, Send, Truck, PackageCheck, FileCheck2, Circle, Paperclip, Scale } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const user = auth.currentUser!

const id = computed(() => Number(route.params.id))
const request = ref<PurchaseRequest | null>(null)
const loading = ref(true)
const comment = ref('')
const poNoInput = ref('')
const receiptQty = reactive<Record<number, number>>({})
const invoiceAmount = ref<number | null>(null)
const busy = ref(false)

async function load() {
  loading.value = true
  request.value = await getPurchaseRequest(id.value)
  if (request.value) {
    poNoInput.value = `PO-2026-${String(1000 + request.value.requestId).slice(-4)}`
    invoiceAmount.value = request.value.totalInclTax
    request.value.lineItems.forEach((_, idx) => (receiptQty[idx] = 0))
  }
  loading.value = false
}
onMounted(load)

const actions = computed(() => {
  if (!request.value) return null
  return canEditRequestActions(user.role, request.value, user.memberId, user.departmentId)
})

const isOwner = computed(() => request.value?.applicantMemberId === user.memberId)

async function doApprovalAction(action: ApprovalAction) {
  if (!request.value) return
  busy.value = true
  await actOnApproval(request.value.requestId, action, user.memberId, user.name, comment.value)
  comment.value = ''
  await load()
  busy.value = false
}

async function doSubmit() {
  if (!request.value) return
  busy.value = true
  await submitDraft(request.value.requestId, user.memberId, user.name)
  await load()
  busy.value = false
}

async function doResubmit() {
  if (!request.value) return
  busy.value = true
  await resubmitRequest(request.value.requestId, user.memberId, user.name)
  await load()
  busy.value = false
}

async function doPlaceOrder() {
  if (!request.value) return
  busy.value = true
  await placeOrder(request.value.requestId, poNoInput.value, user.memberId, user.name)
  await load()
  busy.value = false
}

async function doRegisterReceipt() {
  if (!request.value) return
  const receipts = request.value.lineItems
    .map((li, idx) => ({ li, qty: receiptQty[idx] ?? 0 }))
    .filter((x) => x.qty > 0)
    .map((x) => ({
      date: new Date().toISOString().slice(0, 10),
      itemName: x.li.name,
      qtyReceived: x.qty,
      receiverMemberId: user.memberId,
      receiverName: user.name,
      note: '',
    }))
  if (receipts.length === 0) return
  busy.value = true
  await registerReceipt(request.value.requestId, receipts, user.memberId, user.name)
  await load()
  busy.value = false
}

async function doRegisterInvoice() {
  if (!request.value || invoiceAmount.value == null) return
  busy.value = true
  await registerInvoice(request.value.requestId, invoiceAmount.value, user.memberId, user.name)
  await load()
  busy.value = false
}

function stepIcon(status: string) {
  if (status === '承認') return CheckCircle2
  if (status === '差し戻し' || status === '却下') return XCircle
  if (status === '承認待ち') return Circle
  return Circle
}
function stepColor(status: string) {
  if (status === '承認') return 'text-emerald-600 border-emerald-600'
  if (status === '差し戻し' || status === '却下') return 'text-red-600 border-red-600'
  if (status === '承認待ち') return 'text-navy-700 border-navy-700'
  return 'text-slate-300 border-slate-300'
}
</script>

<template>
  <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>
  <div v-else-if="!request" class="text-sm text-slate-400">申請が見つかりません</div>
  <div v-else class="mx-auto max-w-5xl space-y-6">
    <div class="card p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="font-mono text-xs text-slate-400">{{ request.requestNo }}</p>
          <h2 class="text-lg font-bold text-slate-800">{{ request.title }}</h2>
        </div>
        <StatusBadge :status="request.status" />
      </div>
      <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div><p class="text-xs text-slate-400">申請部署</p><p>{{ request.departmentName }}</p></div>
        <div><p class="text-xs text-slate-400">申請者</p><p>{{ request.applicantName }}</p></div>
        <div><p class="text-xs text-slate-400">申請日</p><p>{{ formatDate(request.createdAt) }}</p></div>
        <div><p class="text-xs text-slate-400">合計金額(税込)</p><p class="font-semibold">{{ formatYen(request.totalInclTax) }}</p></div>
      </div>
      <div v-if="request.overallPurpose" class="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{{ request.overallPurpose }}</div>
      <div v-if="request.poNo" class="mt-3 text-sm text-slate-600">発注書番号: <span class="font-mono">{{ request.poNo }}</span>（{{ formatDate(request.poDate) }}）</div>
    </div>

    <!-- 明細 -->
    <div class="card overflow-x-auto p-5">
      <h3 class="mb-3 text-sm font-semibold text-slate-600">明細</h3>
      <table class="table-base">
        <thead>
          <tr>
            <th>品名</th><th>カテゴリ</th><th class="text-right">数量</th><th class="text-right">単価(税抜)</th><th class="text-right">税率</th><th>利用目的</th><th>希望納期</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="(li, idx) in request.lineItems" :key="idx">
            <td>{{ li.name }}</td>
            <td>{{ li.category }}</td>
            <td class="text-right">{{ li.qty }}</td>
            <td class="text-right">{{ formatYen(li.unitPrice) }}</td>
            <td class="text-right">{{ li.taxRate }}%</td>
            <td>{{ li.purpose }}</td>
            <td>{{ formatDate(li.desiredDate) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="mt-3 ml-auto max-w-xs space-y-1 text-sm">
        <div class="flex justify-between"><span class="text-slate-500">小計(税抜)</span><span>{{ formatYen(request.totalExclTax) }}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">消費税</span><span>{{ formatYen(request.totalInclTax - request.totalExclTax) }}</span></div>
        <div class="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-navy-900"><span>合計(税込)</span><span>{{ formatYen(request.totalInclTax) }}</span></div>
      </div>
    </div>

    <!-- 添付ファイル -->
    <div class="card p-5">
      <h3 class="mb-3 text-sm font-semibold text-slate-600 flex items-center gap-1"><Paperclip :size="14" /> 添付ファイル</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-500">見積書</p>
          <ul class="space-y-1">
            <li v-for="f in request.attachmentsQuote" :key="f.id" class="text-slate-600">{{ f.name }}</li>
            <li v-if="!request.attachmentsQuote.length" class="text-slate-300">なし</li>
          </ul>
        </div>
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-500">仕様書</p>
          <ul class="space-y-1">
            <li v-for="f in request.attachmentsSpec" :key="f.id" class="text-slate-600">{{ f.name }}</li>
            <li v-if="!request.attachmentsSpec.length" class="text-slate-300">なし</li>
          </ul>
        </div>
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-500">契約書</p>
          <ul class="space-y-1">
            <li v-for="f in request.attachmentsContract" :key="f.id" class="text-slate-600">{{ f.name }}</li>
            <li v-if="!request.attachmentsContract.length" class="text-slate-300">なし</li>
          </ul>
        </div>
      </div>
      <RouterLink v-if="request.quotes.length" :to="`/requests/${request.requestId}/quotes`" class="mt-3 inline-flex items-center gap-1 text-sm text-navy-700 hover:underline">
        <Scale :size="14" /> 見積比較を見る
      </RouterLink>
    </div>

    <!-- 承認タイムライン -->
    <div v-if="request.approvalSteps.length" class="card p-5">
      <h3 class="mb-4 text-sm font-semibold text-slate-600">承認タイムライン</h3>
      <ol class="space-y-0">
        <li v-for="(step, idx) in request.approvalSteps" :key="step.order" class="relative flex gap-4 pb-6 last:pb-0">
          <div class="flex flex-col items-center">
            <span class="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white" :class="stepColor(step.status)">
              <component :is="stepIcon(step.status)" :size="14" />
            </span>
            <span v-if="idx < request.approvalSteps.length - 1" class="mt-1 h-full w-px flex-1 bg-slate-200" />
          </div>
          <div class="flex-1 pb-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-700">{{ step.role }}</span>
              <span v-if="step.approverName" class="text-xs text-slate-400">{{ step.approverName }}</span>
              <span class="badge" :class="stepColor(step.status) + ' border'">{{ step.status }}</span>
            </div>
            <p v-if="step.actedAt" class="mt-0.5 text-xs text-slate-400">{{ step.actedAt }}</p>
            <p v-if="step.comment" class="mt-1 rounded-md bg-slate-50 p-2 text-xs text-slate-600">{{ step.comment }}</p>
          </div>
        </li>
      </ol>
    </div>

    <!-- 検収状況 -->
    <div v-if="request.receipts.length" class="card p-5">
      <h3 class="mb-3 text-sm font-semibold text-slate-600">検収履歴</h3>
      <table class="table-base">
        <thead><tr><th>検収日</th><th>品名</th><th class="text-right">数量</th><th>受領者</th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="(r, idx) in request.receipts" :key="idx">
            <td>{{ formatDate(r.date) }}</td><td>{{ r.itemName }}</td><td class="text-right">{{ r.qtyReceived }}</td><td>{{ r.receiverName }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- アクション -->
    <div v-if="actions" class="card space-y-4 p-5">
      <h3 class="text-sm font-semibold text-slate-600">アクション</h3>

      <div v-if="request.status === '下書き' && isOwner" class="flex gap-2">
        <button class="btn-primary" :disabled="busy" @click="doSubmit"><Send :size="16" /> 申請する</button>
      </div>

      <div v-if="request.status === '差し戻し' && isOwner" class="flex gap-2">
        <button class="btn-primary" :disabled="busy" @click="doResubmit"><RotateCcw :size="16" /> 再申請</button>
      </div>

      <div v-if="actions.canApprove" class="space-y-2">
        <label class="label">承認コメント（差し戻し・却下時は理由を入力してください）</label>
        <textarea v-model="comment" class="input" rows="2" />
        <div class="flex flex-wrap gap-2">
          <button class="btn-primary" :disabled="busy" @click="doApprovalAction('承認')"><CheckCircle2 :size="16" /> 承認</button>
          <button class="btn-secondary" :disabled="busy" @click="doApprovalAction('差し戻し')"><RotateCcw :size="16" /> 差し戻し</button>
          <button class="btn-danger" :disabled="busy" @click="doApprovalAction('却下')"><XCircle :size="16" /> 却下</button>
        </div>
      </div>

      <div v-if="actions.canPlaceOrder" class="space-y-2">
        <label class="label">発注書番号</label>
        <div class="flex flex-wrap gap-2">
          <input v-model="poNoInput" class="input max-w-xs" />
          <button class="btn-primary" :disabled="busy" @click="doPlaceOrder"><Truck :size="16" /> 発注する</button>
        </div>
      </div>

      <div v-if="actions.canRegisterReceipt" class="space-y-2">
        <label class="label">検収登録（受領した数量を入力）</label>
        <div class="space-y-2">
          <div v-for="(li, idx) in request.lineItems" :key="idx" class="flex items-center gap-3 text-sm">
            <span class="w-48 truncate">{{ li.name }}</span>
            <input v-model.number="receiptQty[idx]" type="number" min="0" :max="li.qty" class="input max-w-[100px]" />
            <span class="text-xs text-slate-400">/ {{ li.qty }}</span>
          </div>
        </div>
        <button class="btn-primary" :disabled="busy" @click="doRegisterReceipt"><PackageCheck :size="16" /> 検収登録</button>
      </div>

      <div v-if="actions.canRegisterInvoice" class="space-y-2">
        <label class="label">請求金額</label>
        <div class="flex flex-wrap gap-2">
          <input v-model.number="invoiceAmount" type="number" class="input max-w-xs" />
          <button class="btn-primary" :disabled="busy" @click="doRegisterInvoice"><FileCheck2 :size="16" /> 請求書登録</button>
        </div>
      </div>

      <p v-if="!actions.canApprove && !actions.canPlaceOrder && !actions.canRegisterReceipt && !actions.canRegisterInvoice && !(request.status === '下書き' && isOwner) && !(request.status === '差し戻し' && isOwner)" class="text-sm text-slate-400">
        現在、実行可能な操作はありません
      </p>
    </div>
  </div>
</template>
