<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Member } from '@/lib/kuroco/types'
import { LogIn } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const members = ref<Member[]>([])
const selectedMemberId = ref<number | null>(null)
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  members.value = await auth.loadMembers()
  if (members.value.length) selectedMemberId.value = members.value[0].memberId
})

async function submit() {
  error.value = ''
  if (!selectedMemberId.value) {
    error.value = 'テストユーザーを選択してください'
    return
  }
  loading.value = true
  try {
    await auth.loginAsMember(selectedMemberId.value)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: any) {
    error.value = e.message ?? 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 flex flex-col items-center gap-2">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-800 text-white font-bold">PF</div>
        <h1 class="text-2xl font-bold text-navy-900">ProcureFlow</h1>
        <p class="text-sm text-slate-500">社内購買管理システム</p>
      </div>

      <form class="card p-6" @submit.prevent="submit">
        <div class="mb-4">
          <label class="label">メールアドレス</label>
          <input v-model="email" type="email" class="input" placeholder="user@procureflow.example.com" />
        </div>
        <div class="mb-4">
          <label class="label">パスワード</label>
          <input v-model="password" type="password" class="input" placeholder="パスワード（デモ用: 何を入力しても可）" />
        </div>

        <div class="mb-4 border-t border-dashed border-slate-200 pt-4">
          <label class="label">テストユーザーとしてログイン（デモ）</label>
          <select v-model.number="selectedMemberId" class="input">
            <option v-for="m in members" :key="m.memberId" :value="m.memberId">
              {{ m.name }}（{{ m.role }}・{{ m.position }}）
            </option>
          </select>
        </div>

        <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          <LogIn :size="16" /> ログイン
        </button>
        <p class="mt-4 text-center text-xs text-slate-400">
          モックログインのためパスワードの検証は行われません
        </p>
      </form>
    </div>
  </div>
</template>
