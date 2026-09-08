<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { NAV_ITEMS, canSeeNavItem } from '@/lib/permissions'
import {
  LayoutDashboard,
  ClipboardList,
  FilePlus,
  CheckSquare,
  Scale,
  Truck,
  PackageCheck,
  Receipt,
  Building2,
  Landmark,
  ListChecks,
  FileClock,
  Menu,
  X,
  LogOut,
} from 'lucide-vue-next'

const ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  'requests-new': FilePlus,
  approvals: CheckSquare,
  quotes: Scale,
  'purchase-orders': Truck,
  receiving: PackageCheck,
  invoices: Receipt,
  vendors: Building2,
  'master-dept-budget': Landmark,
  'approval-rules': ListChecks,
  'audit-log': FileClock,
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)

const visibleItems = computed(() => NAV_ITEMS.filter((item) => canSeeNavItem(auth.role, item)))

const ROUTE_NAME_TITLE: Record<string, string> = {
  'request-detail': '申請詳細',
  'request-quotes': '見積比較',
}

const pageTitle = computed(() => {
  const byName = route.name ? ROUTE_NAME_TITLE[route.name as string] : undefined
  if (byName) return byName
  const candidates = NAV_ITEMS.filter((item) => route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)))
  const match = candidates.sort((a, b) => b.path.length - a.path.length)[0]
  return match?.label ?? 'ProcureFlow'
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

function go(path: string) {
  mobileOpen.value = false
  router.push(path)
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- デスクトップ サイドバー -->
    <aside class="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white">
      <div class="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-white font-bold text-sm">PF</div>
        <span class="text-lg font-bold text-navy-900">ProcureFlow</span>
      </div>
      <nav class="flex-1 overflow-y-auto py-3">
        <button
          v-for="item in visibleItems"
          :key="item.key"
          class="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors"
          :class="route.path === item.path ? 'bg-navy-50 text-navy-900 font-semibold border-r-2 border-navy-800' : 'text-slate-600 hover:bg-slate-50'"
          @click="go(item.path)"
        >
          <component :is="ICONS[item.key]" :size="18" />
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="!item.implemented" class="badge bg-slate-100 text-slate-400 text-[10px]">準備中</span>
        </button>
      </nav>
      <div class="border-t border-slate-200 p-4">
        <p class="text-sm font-semibold text-slate-800">{{ auth.currentUser?.name }}</p>
        <p class="text-xs text-slate-500">{{ auth.currentUser?.role }} ・ {{ auth.currentUser?.position }}</p>
        <button class="btn-secondary mt-3 w-full text-xs" @click="logout">
          <LogOut :size="14" /> ログアウト
        </button>
      </div>
    </aside>

    <!-- モバイル ドロワー -->
    <div v-if="mobileOpen" class="fixed inset-0 z-40 md:hidden">
      <div class="absolute inset-0 bg-black/30" @click="mobileOpen = false" />
      <aside class="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
        <div class="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-white font-bold text-sm">PF</div>
            <span class="text-lg font-bold text-navy-900">ProcureFlow</span>
          </div>
          <button @click="mobileOpen = false"><X :size="20" /></button>
        </div>
        <nav class="flex-1 overflow-y-auto py-3">
          <button
            v-for="item in visibleItems"
            :key="item.key"
            class="flex w-full items-center gap-3 px-5 py-3 text-sm text-left"
            :class="route.path === item.path ? 'bg-navy-50 text-navy-900 font-semibold' : 'text-slate-600'"
            @click="go(item.path)"
          >
            <component :is="ICONS[item.key]" :size="18" />
            <span class="flex-1">{{ item.label }}</span>
            <span v-if="!item.implemented" class="badge bg-slate-100 text-slate-400 text-[10px]">準備中</span>
          </button>
        </nav>
        <div class="border-t border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-800">{{ auth.currentUser?.name }}</p>
          <p class="text-xs text-slate-500">{{ auth.currentUser?.role }}</p>
          <button class="btn-secondary mt-3 w-full text-xs" @click="logout">
            <LogOut :size="14" /> ログアウト
          </button>
        </div>
      </aside>
    </div>

    <div class="flex flex-1 flex-col overflow-hidden">
      <header class="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
        <button class="md:hidden" @click="mobileOpen = true"><Menu :size="22" /></button>
        <h1 class="text-base md:text-lg font-semibold text-slate-800">{{ pageTitle }}</h1>
        <div class="ml-auto flex items-center gap-2 md:hidden">
          <span class="text-xs text-slate-500">{{ auth.currentUser?.name }}（{{ auth.currentUser?.role }}）</span>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
