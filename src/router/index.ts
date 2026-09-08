import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/requests', name: 'requests', component: () => import('@/views/RequestListView.vue'), meta: { requiresAuth: true } },
  { path: '/requests/new', name: 'request-new', component: () => import('@/views/RequestFormView.vue'), meta: { requiresAuth: true } },
  { path: '/requests/:id', name: 'request-detail', component: () => import('@/views/RequestDetailView.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/requests/:id/quotes', name: 'request-quotes', component: () => import('@/views/QuoteComparisonView.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/quotes', name: 'quotes', component: () => import('@/views/QuoteComparisonView.vue'), meta: { requiresAuth: true } },
  { path: '/approvals', name: 'approvals', component: () => import('@/views/ApprovalListView.vue'), meta: { requiresAuth: true } },
  { path: '/purchase-orders', name: 'purchase-orders', component: () => import('@/views/PurchaseOrderView.vue'), meta: { requiresAuth: true } },
  { path: '/receiving', name: 'receiving', component: () => import('@/views/ReceivingView.vue'), meta: { requiresAuth: true } },
  { path: '/invoices', name: 'invoices', component: () => import('@/views/PlaceholderView.vue'), meta: { requiresAuth: true }, props: { title: '請求書照合' } },
  { path: '/vendors', name: 'vendors', component: () => import('@/views/PlaceholderView.vue'), meta: { requiresAuth: true }, props: { title: '取引先マスター' } },
  { path: '/master/departments', name: 'master-dept-budget', component: () => import('@/views/PlaceholderView.vue'), meta: { requiresAuth: true }, props: { title: '部署・予算マスター' } },
  { path: '/approval-rules', name: 'approval-rules', component: () => import('@/views/PlaceholderView.vue'), meta: { requiresAuth: true }, props: { title: '承認ルール管理' } },
  { path: '/audit-log', name: 'audit-log', component: () => import('@/views/PlaceholderView.vue'), meta: { requiresAuth: true }, props: { title: '監査ログ' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let restored = false
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!restored) {
    await auth.restoreSession()
    restored = true
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
