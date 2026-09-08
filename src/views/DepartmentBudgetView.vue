<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { useAuthStore } from '@/stores/auth'
import { listDepartments, listBudgets, listMembers, updateDepartment, updateBudget, createBudget } from '@/lib/kuroco/client'
import { canManageBudgets, visibleBudgetDepartmentIds } from '@/lib/permissions'
import type { Budget, BudgetInput, Department, DepartmentInput, Member } from '@/lib/kuroco/types'
import { formatYen } from '@/lib/format'
import { Pencil, Plus, Building2, Wallet } from 'lucide-vue-next'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const auth = useAuthStore()
const user = auth.currentUser!
const canManage = canManageBudgets(user.role)
const allowedDeptIds = visibleBudgetDepartmentIds(user.role, user.departmentId)

const tab = ref<'departments' | 'budgets'>('budgets')
const departments = ref<Department[]>([])
const budgets = ref<Budget[]>([])
const members = ref<Member[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  const [d, b, m] = await Promise.all([listDepartments(), listBudgets(), listMembers()])
  departments.value = d
  budgets.value = b
  members.value = m
  loading.value = false
}
onMounted(load)

const visibleDepartments = computed(() => (allowedDeptIds ? departments.value.filter((d) => allowedDeptIds.includes(d.departmentId)) : departments.value))
const visibleBudgets = computed(() => (allowedDeptIds ? budgets.value.filter((b) => allowedDeptIds.includes(b.departmentId)) : budgets.value))

function usageRate(b: Budget) {
  return b.budgetAmount > 0 ? Math.round((b.usedAmount / b.budgetAmount) * 100) : 0
}
function remaining(b: Budget) {
  return b.budgetAmount - b.usedAmount
}
function barColor(rate: number) {
  if (rate >= 100) return 'bg-red-500'
  if (rate >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

const chartData = computed(() => {
  const rows = visibleBudgets.value.slice().sort((a, b) => a.departmentId - b.departmentId)
  return {
    labels: rows.map((b) => departments.value.find((d) => d.departmentId === b.departmentId)?.deptName ?? `#${b.departmentId}`),
    datasets: [{ label: '予算消化率(%)', data: rows.map((b) => usageRate(b)), backgroundColor: rows.map((b) => (usageRate(b) >= 100 ? '#ef4444' : usageRate(b) >= 80 ? '#f59e0b' : '#10b981')) }],
  }
})
const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => `${v}%` } } },
}

// ---- 部署編集 ----
const showDeptModal = ref(false)
const editingDeptId = ref<number | null>(null)
const deptForm = reactive<DepartmentInput>({ deptName: '', managerMemberId: null, description: '' })
const busy = ref(false)

function openDeptEdit(d: Department) {
  editingDeptId.value = d.departmentId
  deptForm.deptName = d.deptName
  deptForm.managerMemberId = d.managerMemberId
  deptForm.description = d.description
  showDeptModal.value = true
}
async function saveDept() {
  if (!editingDeptId.value) return
  busy.value = true
  await updateDepartment(editingDeptId.value, { ...deptForm }, members.value, user.memberId, user.name)
  showDeptModal.value = false
  await load()
  busy.value = false
}

// ---- 予算編集/新規追加 ----
const showBudgetModal = ref(false)
const editingBudgetId = ref<number | null>(null)
const budgetDeptId = ref<number | null>(null)
const budgetForm = reactive<BudgetInput>({ fiscalYear: 2026, category: '一般', budgetAmount: 0, usedAmount: 0, note: '' })

function openBudgetEdit(b: Budget) {
  editingBudgetId.value = b.budgetId
  budgetDeptId.value = b.departmentId
  budgetForm.fiscalYear = b.fiscalYear
  budgetForm.category = b.category
  budgetForm.budgetAmount = b.budgetAmount
  budgetForm.usedAmount = b.usedAmount
  budgetForm.note = b.note
  showBudgetModal.value = true
}
function openBudgetCreate() {
  editingBudgetId.value = null
  budgetDeptId.value = visibleDepartments.value[0]?.departmentId ?? null
  budgetForm.fiscalYear = new Date().getFullYear()
  budgetForm.category = '一般'
  budgetForm.budgetAmount = 0
  budgetForm.usedAmount = 0
  budgetForm.note = ''
  showBudgetModal.value = true
}
async function saveBudget() {
  if (!budgetDeptId.value) return
  busy.value = true
  if (editingBudgetId.value) {
    await updateBudget(editingBudgetId.value, { ...budgetForm }, user.memberId, user.name)
  } else {
    const deptName = departments.value.find((d) => d.departmentId === budgetDeptId.value)?.deptName ?? ''
    await createBudget(budgetDeptId.value, deptName, { ...budgetForm }, user.memberId, user.name)
  }
  showBudgetModal.value = false
  await load()
  busy.value = false
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">
      {{ allowedDeptIds ? '自部門の部署・予算情報を表示しています' : canManage ? '全部署の部署・予算情報を編集できます' : '全部署の部署・予算情報を閲覧できます（編集は経理担当・管理者のみ）' }}
    </p>

    <div class="flex gap-2 border-b border-slate-200">
      <button class="px-4 py-2 text-sm font-medium" :class="tab === 'departments' ? 'border-b-2 border-navy-800 text-navy-900' : 'text-slate-500'" @click="tab = 'departments'">
        <Building2 :size="14" class="mr-1 inline" />部署一覧
      </button>
      <button class="px-4 py-2 text-sm font-medium" :class="tab === 'budgets' ? 'border-b-2 border-navy-800 text-navy-900' : 'text-slate-500'" @click="tab = 'budgets'">
        <Wallet :size="14" class="mr-1 inline" />予算一覧
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">読み込み中...</div>

    <template v-else-if="tab === 'departments'">
      <div class="card overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr><th>部署名</th><th>コード</th><th>部門長</th><th>説明</th><th v-if="canManage"></th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="d in visibleDepartments" :key="d.departmentId">
              <td class="font-medium text-slate-800">{{ d.deptName }}</td>
              <td class="font-mono text-xs">{{ d.deptCode }}</td>
              <td>{{ d.managerName || '-' }}</td>
              <td class="max-w-[320px] whitespace-normal text-xs text-slate-600">{{ d.description }}</td>
              <td v-if="canManage">
                <button class="btn-secondary px-2 py-1 text-xs" @click="openDeptEdit(d)"><Pencil :size="13" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <div class="card p-4">
        <h2 class="mb-3 text-sm font-semibold text-slate-600">部署別予算消化率</h2>
        <div v-if="visibleBudgets.length === 0" class="py-6 text-center text-sm text-slate-400">データがありません</div>
        <Bar v-else :data="chartData" :options="chartOptions" :height="90" />
      </div>

      <div class="flex justify-end" v-if="canManage">
        <button class="btn-primary" @click="openBudgetCreate"><Plus :size="16" /> 予算行を追加</button>
      </div>

      <div class="card overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th>部署</th><th>年度</th><th>区分</th><th class="text-right">予算枠</th><th class="text-right">使用済み額</th>
              <th class="text-right">残高</th><th class="w-40">消化率</th><th v-if="canManage"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="b in visibleBudgets" :key="b.budgetId">
              <td>{{ departments.find((d) => d.departmentId === b.departmentId)?.deptName ?? '-' }}</td>
              <td>{{ b.fiscalYear }}年度</td>
              <td>{{ b.category }}</td>
              <td class="text-right">{{ formatYen(b.budgetAmount) }}</td>
              <td class="text-right">{{ formatYen(b.usedAmount) }}</td>
              <td class="text-right" :class="remaining(b) < 0 ? 'text-red-600 font-semibold' : ''">{{ formatYen(remaining(b)) }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="h-2 flex-1 rounded-full bg-slate-100">
                    <div class="h-2 rounded-full" :class="barColor(usageRate(b))" :style="{ width: `${Math.min(100, usageRate(b))}%` }" />
                  </div>
                  <span class="w-10 text-right text-xs text-slate-500">{{ usageRate(b) }}%</span>
                </div>
              </td>
              <td v-if="canManage">
                <button class="btn-secondary px-2 py-1 text-xs" @click="openBudgetEdit(b)"><Pencil :size="13" /></button>
              </td>
            </tr>
            <tr v-if="visibleBudgets.length === 0"><td colspan="8" class="py-8 text-center text-slate-400">対象の予算データがありません</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 部署編集モーダル -->
    <div v-if="showDeptModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div class="card w-full max-w-md p-5">
        <h2 class="mb-4 text-base font-semibold text-slate-800">部署情報を編集</h2>
        <div class="space-y-3">
          <div>
            <label class="label">部署名</label>
            <input v-model="deptForm.deptName" class="input" />
          </div>
          <div>
            <label class="label">部門長</label>
            <select v-model.number="deptForm.managerMemberId" class="input">
              <option :value="null">未設定</option>
              <option v-for="m in members" :key="m.memberId" :value="m.memberId">{{ m.name }}（{{ m.role }}）</option>
            </select>
          </div>
          <div>
            <label class="label">説明</label>
            <textarea v-model="deptForm.description" class="input" rows="3" />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-secondary" @click="showDeptModal = false">キャンセル</button>
          <button class="btn-primary" :disabled="busy" @click="saveDept">保存する</button>
        </div>
      </div>
    </div>

    <!-- 予算編集モーダル -->
    <div v-if="showBudgetModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div class="card w-full max-w-md p-5">
        <h2 class="mb-4 text-base font-semibold text-slate-800">{{ editingBudgetId ? '予算を編集' : '予算行を新規追加' }}</h2>
        <div class="space-y-3">
          <div v-if="!editingBudgetId">
            <label class="label">部署</label>
            <select v-model.number="budgetDeptId" class="input">
              <option v-for="d in visibleDepartments" :key="d.departmentId" :value="d.departmentId">{{ d.deptName }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">年度</label>
              <input v-model.number="budgetForm.fiscalYear" type="number" class="input" />
            </div>
            <div>
              <label class="label">区分</label>
              <input v-model="budgetForm.category" class="input" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">予算枠</label>
              <input v-model.number="budgetForm.budgetAmount" type="number" class="input" />
            </div>
            <div>
              <label class="label">使用済み額</label>
              <input v-model.number="budgetForm.usedAmount" type="number" class="input" />
            </div>
          </div>
          <div>
            <label class="label">備考</label>
            <textarea v-model="budgetForm.note" class="input" rows="2" />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-secondary" @click="showBudgetModal = false">キャンセル</button>
          <button class="btn-primary" :disabled="busy || !budgetDeptId" @click="saveBudget">保存する</button>
        </div>
      </div>
    </div>
  </div>
</template>
