<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listDepartments, listBudgets, createPurchaseRequest, calcLineTotal, calcRequestTotals, type LineItemInput } from '@/lib/kuroco/client'
import type { Budget, Department } from '@/lib/kuroco/types'
import { formatYen } from '@/lib/format'
import { Plus, Trash2, Save, Send, Paperclip } from 'lucide-vue-next'

const CATEGORIES = ['IT機器', '什器', '文具・什器', '印刷', '消耗品', '車両', '検査機器', '開発関連', 'その他']

const auth = useAuthStore()
const router = useRouter()
const user = auth.currentUser!

const departments = ref<Department[]>([])
const budgets = ref<Budget[]>([])

const title = ref('')
const overallPurpose = ref('')
const lineItems = reactive<LineItemInput[]>([
  { name: '', category: 'IT機器', qty: 1, unitPrice: 0, taxRate: 10, purpose: '', desiredDate: '' },
])

const quoteFiles = ref<File[]>([])
const specFiles = ref<File[]>([])
const contractFiles = ref<File[]>([])
const submitting = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  departments.value = await listDepartments()
  budgets.value = await listBudgets()
})

const myDepartment = computed(() => departments.value.find((d) => d.departmentId === user.departmentId))
const myBudget = computed(() => budgets.value.find((b) => b.departmentId === user.departmentId))

function addLine() {
  lineItems.push({ name: '', category: 'IT機器', qty: 1, unitPrice: 0, taxRate: 10, purpose: '', desiredDate: '' })
}
function removeLine(idx: number) {
  if (lineItems.length > 1) lineItems.splice(idx, 1)
}

const totals = computed(() => calcRequestTotals(lineItems))
const taxAmount = computed(() => totals.value.totalInclTax - totals.value.totalExclTax)

function lineIncl(item: LineItemInput) {
  return calcLineTotal(item).inclTax
}

function onFileChange(e: Event, target: 'quote' | 'spec' | 'contract') {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (target === 'quote') quoteFiles.value = files
  if (target === 'spec') specFiles.value = files
  if (target === 'contract') contractFiles.value = files
}

function validate(): string {
  if (!title.value.trim()) return '件名を入力してください'
  if (lineItems.some((li) => !li.name.trim())) return '品名が未入力の明細があります'
  if (lineItems.some((li) => li.qty <= 0)) return '数量は1以上を入力してください'
  return ''
}

async function submit(asDraft: boolean) {
  errorMsg.value = ''
  if (!asDraft) {
    const err = validate()
    if (err) {
      errorMsg.value = err
      return
    }
  } else if (!title.value.trim()) {
    errorMsg.value = '件名を入力してください'
    return
  }
  submitting.value = true
  try {
    const created = await createPurchaseRequest({
      title: title.value,
      overallPurpose: overallPurpose.value,
      applicantMemberId: user.memberId,
      applicantName: user.name,
      departmentId: user.departmentId,
      departmentName: myDepartment.value?.deptName ?? '',
      budgetId: myBudget.value?.budgetId ?? null,
      lineItems: JSON.parse(JSON.stringify(lineItems)),
      asDraft,
    })
    router.push(`/requests/${created.requestId}`)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div class="card p-5">
      <h2 class="mb-4 text-sm font-semibold text-slate-600">基本情報</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="label">件名 <span class="text-red-500">*</span></label>
          <input v-model="title" class="input" placeholder="例: 新入社員8名分PC・モニター購入" />
        </div>
        <div>
          <label class="label">申請部署</label>
          <input class="input bg-slate-50" :value="myDepartment?.deptName" disabled />
        </div>
        <div>
          <label class="label">申請者</label>
          <input class="input bg-slate-50" :value="user.name" disabled />
        </div>
        <div class="sm:col-span-2">
          <label class="label">利用目的（全体概要）</label>
          <textarea v-model="overallPurpose" class="input" rows="2" placeholder="申請全体の目的・背景" />
        </div>
        <div v-if="myBudget" class="sm:col-span-2 text-xs text-slate-500">
          関連予算枠: {{ myBudget.category }}（{{ myBudget.fiscalYear }}年度） 残り {{ formatYen(myBudget.budgetAmount - myBudget.usedAmount) }} / 予算 {{ formatYen(myBudget.budgetAmount) }}
        </div>
      </div>
    </div>

    <div class="card p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-600">明細</h2>
        <button type="button" class="btn-secondary text-xs" @click="addLine"><Plus :size="14" /> 行を追加</button>
      </div>

      <div class="space-y-3">
        <div v-for="(item, idx) in lineItems" :key="idx" class="rounded-md border border-slate-200 p-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div class="sm:col-span-2">
              <label class="label">品名</label>
              <input v-model="item.name" class="input" />
            </div>
            <div>
              <label class="label">カテゴリ</label>
              <select v-model="item.category" class="input">
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label class="label">数量</label>
              <input v-model.number="item.qty" type="number" min="1" class="input" />
            </div>
            <div>
              <label class="label">単価(税抜)</label>
              <input v-model.number="item.unitPrice" type="number" min="0" class="input" />
            </div>
            <div>
              <label class="label">税率(%)</label>
              <input v-model.number="item.taxRate" type="number" min="0" class="input" />
            </div>
            <div class="sm:col-span-2">
              <label class="label">利用目的</label>
              <input v-model="item.purpose" class="input" />
            </div>
            <div>
              <label class="label">希望納期</label>
              <input v-model="item.desiredDate" type="date" class="input" />
            </div>
            <div class="flex items-end justify-between sm:col-span-2">
              <p class="text-sm text-slate-600">小計(税込): <span class="font-semibold">{{ formatYen(lineIncl(item)) }}</span></p>
              <button type="button" class="btn-secondary text-xs text-red-600" :disabled="lineItems.length <= 1" @click="removeLine(idx)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div class="flex justify-between"><span class="text-slate-500">小計(税抜)</span><span>{{ formatYen(totals.totalExclTax) }}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">消費税</span><span>{{ formatYen(taxAmount) }}</span></div>
        <div class="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-navy-900">
          <span>合計(税込)</span><span>{{ formatYen(totals.totalInclTax) }}</span>
        </div>
      </div>
    </div>

    <div class="card p-5">
      <h2 class="mb-4 text-sm font-semibold text-slate-600">添付ファイル</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="label"><Paperclip :size="12" class="inline" /> 見積書</label>
          <input type="file" multiple class="input" @change="onFileChange($event, 'quote')" />
          <p class="mt-1 text-xs text-slate-400">{{ quoteFiles.length }}件選択中</p>
        </div>
        <div>
          <label class="label"><Paperclip :size="12" class="inline" /> 仕様書</label>
          <input type="file" multiple class="input" @change="onFileChange($event, 'spec')" />
          <p class="mt-1 text-xs text-slate-400">{{ specFiles.length }}件選択中</p>
        </div>
        <div>
          <label class="label"><Paperclip :size="12" class="inline" /> 契約書</label>
          <input type="file" multiple class="input" @change="onFileChange($event, 'contract')" />
          <p class="mt-1 text-xs text-slate-400">{{ contractFiles.length }}件選択中</p>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-400">※ モック環境のためファイルは実際にはアップロードされません</p>
    </div>

    <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

    <div class="flex justify-end gap-3">
      <button class="btn-secondary" :disabled="submitting" @click="submit(true)"><Save :size="16" /> 下書き保存</button>
      <button class="btn-primary" :disabled="submitting" @click="submit(false)"><Send :size="16" /> 申請する</button>
    </div>
  </div>
</template>
