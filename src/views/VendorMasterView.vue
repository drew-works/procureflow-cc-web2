<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listVendors, createVendor, updateVendor, setVendorStatus } from '@/lib/kuroco/client'
import { canManageVendors } from '@/lib/permissions'
import type { Vendor, VendorInput } from '@/lib/kuroco/types'
import { Search, Plus, Pencil, Power } from 'lucide-vue-next'

const auth = useAuthStore()
const user = auth.currentUser!
const canManage = canManageVendors(user.role)

const vendors = ref<Vendor[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)

const filters = reactive({ keyword: '', category: '' })

async function load() {
  loading.value = true
  vendors.value = await listVendors()
  loading.value = false
}
onMounted(load)

const categories = computed(() => Array.from(new Set(vendors.value.map((v) => v.category))).sort())

const filtered = computed(() => {
  let list = vendors.value
  if (filters.category) list = list.filter((v) => v.category === filters.category)
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    list = list.filter(
      (v) =>
        v.name.toLowerCase().includes(kw) ||
        v.vendorCode.toLowerCase().includes(kw) ||
        v.contactPerson.toLowerCase().includes(kw) ||
        v.email.toLowerCase().includes(kw),
    )
  }
  return list
})

// ---- 編集モーダル ----
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<VendorInput>({
  vendorCode: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  bankInfo: '',
  paymentTerms: '',
  category: '',
})

function resetForm() {
  form.vendorCode = ''
  form.name = ''
  form.contactPerson = ''
  form.email = ''
  form.phone = ''
  form.address = ''
  form.bankInfo = ''
  form.paymentTerms = ''
  form.category = ''
}

function openCreate() {
  editingId.value = null
  resetForm()
  showModal.value = true
}

function openEdit(v: Vendor) {
  editingId.value = v.vendorId
  form.vendorCode = v.vendorCode
  form.name = v.name
  form.contactPerson = v.contactPerson
  form.email = v.email
  form.phone = v.phone
  form.address = v.address
  form.bankInfo = v.bankInfo
  form.paymentTerms = v.paymentTerms
  form.category = v.category
  showModal.value = true
}

async function save() {
  if (!form.name || !form.vendorCode) return
  busyId.value = editingId.value ?? -1
  if (editingId.value) {
    await updateVendor(editingId.value, { ...form }, user.memberId, user.name)
  } else {
    await createVendor({ ...form }, user.memberId, user.name)
  }
  showModal.value = false
  await load()
  busyId.value = null
}

async function toggleStatus(v: Vendor) {
  busyId.value = v.vendorId
  await setVendorStatus(v.vendorId, v.status !== '取引中', user.memberId, user.name)
  await load()
  busyId.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-slate-500">{{ canManage ? '取引先の登録・編集・有効/無効の切替ができます' : '取引先マスターの閲覧のみ可能です（編集は購買担当・管理者のみ）' }}</p>
      <button v-if="canManage" class="btn-primary" @click="openCreate"><Plus :size="16" /> 新規取引先</button>
    </div>

    <div class="card p-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="relative sm:col-span-2">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.keyword" class="input pl-8" placeholder="会社名・取引先コード・担当者・メールで検索" />
        </div>
        <select v-model="filters.category" class="input">
          <option value="">すべてのカテゴリ</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>会社名</th>
            <th>担当者</th>
            <th>連絡先</th>
            <th>カテゴリ</th>
            <th>支払条件</th>
            <th>ステータス</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td :colspan="canManage ? 7 : 6" class="py-8 text-center text-slate-400">読み込み中...</td></tr>
          <tr v-else-if="filtered.length === 0"><td :colspan="canManage ? 7 : 6" class="py-8 text-center text-slate-400">該当する取引先がありません</td></tr>
          <tr v-for="v in filtered" :key="v.vendorId">
            <td>
              <p class="font-medium text-slate-800">{{ v.name }}</p>
              <p class="font-mono text-xs text-slate-400">{{ v.vendorCode }}</p>
            </td>
            <td>{{ v.contactPerson }}</td>
            <td>
              <p class="text-xs">{{ v.email }}</p>
              <p class="text-xs text-slate-500">{{ v.phone }}</p>
            </td>
            <td>{{ v.category }}</td>
            <td class="max-w-[160px] whitespace-normal text-xs">{{ v.paymentTerms }}</td>
            <td>
              <span class="badge" :class="v.status === '取引中' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ v.status }}</span>
            </td>
            <td v-if="canManage">
              <div class="flex gap-1">
                <button class="btn-secondary px-2 py-1 text-xs" title="編集" @click="openEdit(v)"><Pencil :size="13" /></button>
                <button class="btn-secondary px-2 py-1 text-xs" :disabled="busyId === v.vendorId" title="有効/無効切替" @click="toggleStatus(v)">
                  <Power :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <h2 class="mb-4 text-base font-semibold text-slate-800">{{ editingId ? '取引先を編集' : '取引先を新規登録' }}</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="label">取引先コード</label>
            <input v-model="form.vendorCode" class="input" placeholder="V006" />
          </div>
          <div>
            <label class="label">カテゴリ</label>
            <input v-model="form.category" class="input" placeholder="IT機器 など" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">会社名</label>
            <input v-model="form.name" class="input" placeholder="株式会社〇〇" />
          </div>
          <div>
            <label class="label">担当者名</label>
            <input v-model="form.contactPerson" class="input" />
          </div>
          <div>
            <label class="label">支払条件</label>
            <input v-model="form.paymentTerms" class="input" placeholder="月末締め翌月末払い" />
          </div>
          <div>
            <label class="label">メールアドレス</label>
            <input v-model="form.email" type="email" class="input" />
          </div>
          <div>
            <label class="label">電話番号</label>
            <input v-model="form.phone" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">住所</label>
            <input v-model="form.address" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">銀行口座情報</label>
            <input v-model="form.bankInfo" class="input" />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-secondary" @click="showModal = false">キャンセル</button>
          <button class="btn-primary" :disabled="!form.name || !form.vendorCode" @click="save">保存する</button>
        </div>
      </div>
    </div>
  </div>
</template>
