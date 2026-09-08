<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests, registerReceipt } from '@/lib/kuroco/client'
import { visibleRequestsScope, canEditRequestActions } from '@/lib/permissions'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { PackageCheck, ChevronDown, ChevronUp } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const user = auth.currentUser!

const items = ref<PurchaseRequest[]>([])
const loading = ref(true)
const openId = ref<number | null>(null)
const qtyInput = reactive<Record<string, number>>({})
const busyId = ref<number | null>(null)

function receivedQty(req: PurchaseRequest, itemName: string) {
  return req.receipts.filter((r) => r.itemName === itemName).reduce((s, r) => s + r.qtyReceived, 0)
}

async function load() {
  loading.value = true
  const scope = visibleRequestsScope(user.role)
  const { items: all } = await listPurchaseRequests({
    perPage: 1000,
    applicantMemberId: scope === 'own' ? user.memberId : undefined,
    departmentId: scope === 'department' ? user.departmentId : undefined,
  })
  items.value = all.filter((r) => r.status === '発注済み' || r.status === '一部検収')
  loading.value = false
}
onMounted(load)

function toggle(req: PurchaseRequest) {
  if (openId.value === req.requestId) {
    openId.value = null
    return
  }
  openId.value = req.requestId
  req.lineItems.forEach((li, idx) => (qtyInput[`${req.requestId}-${idx}`] = 0))
}

function canRegister(req: PurchaseRequest) {
  return canEditRequestActions(user.role, req, user.memberId, user.departmentId).canRegisterReceipt
}

async function submit(req: PurchaseRequest) {
  const receipts = req.lineItems
    .map((li, idx) => ({ li, qty: qtyInput[`${req.requestId}-${idx}`] ?? 0 }))
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
  busyId.value = req.requestId
  await registerReceipt(req.requestId, receipts, user.memberId, user.name)
  openId.value = null
  await load()
  busyId.value = null
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">発注済み・一部検収の申請一覧です</p>
    <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>
    <div v-else-if="items.length === 0" class="card p-10 text-center text-sm text-slate-400">対象の申請はありません</div>
    <div v-else class="space-y-3">
      <div v-for="req in items" :key="req.requestId" class="card p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-mono text-xs text-slate-400">{{ req.requestNo }}</p>
            <button class="text-left text-base font-semibold text-navy-900 hover:underline" @click="router.push(`/requests/${req.requestId}`)">{{ req.title }}</button>
            <p class="mt-1 text-xs text-slate-500">{{ req.departmentName }} ・ 発注書 {{ req.poNo }}（{{ formatDate(req.poDate) }}）</p>
          </div>
          <div class="text-right">
            <StatusBadge :status="req.status" />
            <p class="mt-1 text-sm font-semibold">{{ formatYen(req.totalInclTax) }}</p>
          </div>
        </div>
        <button v-if="canRegister(req)" class="btn-secondary mt-3 text-xs" @click="toggle(req)">
          <PackageCheck :size="14" /> 検収登録
          <component :is="openId === req.requestId ? ChevronUp : ChevronDown" :size="14" />
        </button>
        <div v-if="openId === req.requestId" class="mt-3 space-y-2 rounded-md border border-slate-200 p-3">
          <div v-for="(li, idx) in req.lineItems" :key="idx" class="flex flex-wrap items-center gap-3 text-sm">
            <span class="w-56 truncate">{{ li.name }}</span>
            <span class="text-xs text-slate-400">検収済 {{ receivedQty(req, li.name) }} / {{ li.qty }}</span>
            <input v-model.number="qtyInput[`${req.requestId}-${idx}`]" type="number" min="0" :max="li.qty - receivedQty(req, li.name)" class="input max-w-[100px]" />
          </div>
          <button class="btn-primary text-xs" :disabled="busyId === req.requestId" @click="submit(req)">登録する</button>
        </div>
      </div>
    </div>
  </div>
</template>
