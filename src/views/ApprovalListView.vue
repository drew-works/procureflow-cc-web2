<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listPurchaseRequests, actOnApproval, type ApprovalAction } from '@/lib/kuroco/client'
import { canEditRequestActions } from '@/lib/permissions'
import type { PurchaseRequest } from '@/lib/kuroco/types'
import { formatYen, formatDate } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const user = auth.currentUser!

const items = ref<PurchaseRequest[]>([])
const loading = ref(true)
const comments = reactive<Record<number, string>>({})
const busyId = ref<number | null>(null)

async function load() {
  loading.value = true
  const { items: all } = await listPurchaseRequests({ perPage: 1000 })
  items.value = all.filter((r) => canEditRequestActions(user.role, r, user.memberId, user.departmentId).canApprove)
  loading.value = false
}
onMounted(load)

async function act(req: PurchaseRequest, action: ApprovalAction) {
  busyId.value = req.requestId
  await actOnApproval(req.requestId, action, user.memberId, user.name, comments[req.requestId] ?? '')
  delete comments[req.requestId]
  await load()
  busyId.value = null
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">{{ user.role }}として承認すべき申請の一覧です</p>
    <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>
    <div v-else-if="items.length === 0" class="card p-10 text-center text-sm text-slate-400">承認待ちの申請はありません</div>
    <div v-else class="space-y-4">
      <div v-for="req in items" :key="req.requestId" class="card p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-mono text-xs text-slate-400">{{ req.requestNo }}</p>
            <button class="text-left text-base font-semibold text-navy-900 hover:underline" @click="router.push(`/requests/${req.requestId}`)">
              {{ req.title }}
            </button>
            <p class="mt-1 text-xs text-slate-500">{{ req.departmentName }} ・ {{ req.applicantName }} ・ {{ formatDate(req.createdAt) }}</p>
          </div>
          <div class="text-right">
            <StatusBadge :status="req.status" />
            <p class="mt-1 text-sm font-semibold">{{ formatYen(req.totalInclTax) }}</p>
          </div>
        </div>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input v-model="comments[req.requestId]" class="input flex-1" placeholder="コメント（差し戻し・却下時は理由を入力）" />
          <div class="flex gap-2">
            <button class="btn-primary" :disabled="busyId === req.requestId" @click="act(req, '承認')"><CheckCircle2 :size="16" /> 承認</button>
            <button class="btn-secondary" :disabled="busyId === req.requestId" @click="act(req, '差し戻し')"><RotateCcw :size="16" /> 差し戻し</button>
            <button class="btn-danger" :disabled="busyId === req.requestId" @click="act(req, '却下')"><XCircle :size="16" /> 却下</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
