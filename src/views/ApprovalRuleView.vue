<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listApprovalRules, createApprovalRule, updateApprovalRule, setApprovalRuleActive } from '@/lib/kuroco/client'
import { canManageApprovalRules } from '@/lib/permissions'
import type { ApprovalRole, ApprovalRule, ApprovalRuleInput } from '@/lib/kuroco/types'
import { formatYen } from '@/lib/format'
import { Plus, Pencil, Power, ArrowRight, ShieldCheck } from 'lucide-vue-next'

const ROLE_OPTIONS: ApprovalRole[] = ['部門長', 'IT担当', '購買担当', '経理担当', '管理者']

const auth = useAuthStore()
const user = auth.currentUser!
const canManage = canManageApprovalRules(user.role)

const rules = ref<ApprovalRule[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)

async function load() {
  loading.value = true
  rules.value = (await listApprovalRules()).slice().sort((a, b) => a.minAmount - b.minAmount)
  loading.value = false
}
onMounted(load)

function rangeLabel(r: ApprovalRule) {
  const min = formatYen(r.minAmount)
  const max = r.maxAmount == null ? '上限なし' : formatYen(r.maxAmount)
  return r.maxAmount == null ? `${min} 以上` : `${min} 〜 ${max} 未満`
}

// ---- 編集モーダル ----
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<ApprovalRuleInput>({ ruleName: '', minAmount: 0, maxAmount: null, requiresItReview: false, steps: [] })

function resetForm() {
  form.ruleName = ''
  form.minAmount = 0
  form.maxAmount = null
  form.requiresItReview = false
  form.steps = [{ order: 1, role: '部門長' }]
}

function openCreate() {
  editingId.value = null
  resetForm()
  showModal.value = true
}

function openEdit(r: ApprovalRule) {
  editingId.value = r.ruleId
  form.ruleName = r.ruleName
  form.minAmount = r.minAmount
  form.maxAmount = r.maxAmount
  form.requiresItReview = r.requiresItReview
  form.steps = r.steps.map((s) => ({ ...s }))
  showModal.value = true
}

function addStep() {
  form.steps.push({ order: form.steps.length + 1, role: '購買担当' })
}
function removeStep(idx: number) {
  form.steps.splice(idx, 1)
  form.steps.forEach((s, i) => (s.order = i + 1))
}

async function save() {
  if (!form.ruleName || form.steps.length === 0) return
  busyId.value = editingId.value ?? -1
  const payload: ApprovalRuleInput = { ...form, steps: form.steps.map((s, i) => ({ order: i + 1, role: s.role })) }
  if (editingId.value) {
    await updateApprovalRule(editingId.value, payload, user.memberId, user.name)
  } else {
    await createApprovalRule(payload, user.memberId, user.name)
  }
  showModal.value = false
  await load()
  busyId.value = null
}

async function toggleActive(r: ApprovalRule) {
  busyId.value = r.ruleId
  await setApprovalRuleActive(r.ruleId, !r.active, user.memberId, user.name)
  await load()
  busyId.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-slate-500">
        {{ canManage ? '金額区分ごとの承認ラインを設定します（新規申請時にこのルールをスナップショットして承認ラインを生成します）' : '承認ルールの閲覧のみ可能です（編集は管理者のみ）' }}
      </p>
      <button v-if="canManage" class="btn-primary" @click="openCreate"><Plus :size="16" /> ルールを新規作成</button>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>
    <div v-else-if="rules.length === 0" class="card p-10 text-center text-sm text-slate-400">承認ルールが登録されていません</div>

    <div v-else class="space-y-3">
      <div v-for="r in rules" :key="r.ruleId" class="card p-4" :class="!r.active ? 'opacity-60' : ''">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-slate-800">{{ r.ruleName }}</h3>
            <p class="text-xs text-slate-500">{{ rangeLabel(r) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="r.requiresItReview" class="badge bg-indigo-100 text-indigo-700"><ShieldCheck :size="11" class="mr-1 inline" />IT審査要</span>
            <span class="badge" :class="r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ r.active ? '有効' : '無効' }}</span>
            <template v-if="canManage">
              <button class="btn-secondary px-2 py-1 text-xs" @click="openEdit(r)"><Pencil :size="13" /></button>
              <button class="btn-secondary px-2 py-1 text-xs" :disabled="busyId === r.ruleId" @click="toggleActive(r)"><Power :size="13" /></button>
            </template>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <template v-for="(s, idx) in r.steps" :key="idx">
            <div class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">{{ s.order }}</span>
              <span class="font-medium text-slate-700">{{ s.role }}</span>
            </div>
            <ArrowRight v-if="idx < r.steps.length - 1" :size="16" class="text-slate-300" />
          </template>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <h2 class="mb-4 text-base font-semibold text-slate-800">{{ editingId ? '承認ルールを編集' : '承認ルールを新規作成' }}</h2>
        <div class="space-y-3">
          <div>
            <label class="label">ルール名</label>
            <input v-model="form.ruleName" class="input" placeholder="例: 10万円未満" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">下限金額（以上）</label>
              <input v-model.number="form.minAmount" type="number" class="input" />
            </div>
            <div>
              <label class="label">上限金額（未満・空欄で上限なし）</label>
              <input
                :value="form.maxAmount ?? ''"
                type="number"
                class="input"
                @input="form.maxAmount = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.requiresItReview" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
            IT機器を含む明細がある場合はIT担当の承認ステップを要求する
          </label>

          <div>
            <label class="label">承認ステップ（順番に承認）</label>
            <div class="space-y-2">
              <div v-for="(s, idx) in form.steps" :key="idx" class="flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{{ idx + 1 }}</span>
                <select v-model="s.role" class="input">
                  <option v-for="role in ROLE_OPTIONS" :key="role" :value="role">{{ role }}</option>
                </select>
                <button class="btn-secondary px-2 py-1 text-xs" :disabled="form.steps.length <= 1" @click="removeStep(idx)">削除</button>
              </div>
            </div>
            <button class="btn-secondary mt-2 text-xs" @click="addStep"><Plus :size="13" /> ステップを追加</button>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-secondary" @click="showModal = false">キャンセル</button>
          <button class="btn-primary" :disabled="!form.ruleName || form.steps.length === 0" @click="save">保存する</button>
        </div>
      </div>
    </div>
  </div>
</template>
