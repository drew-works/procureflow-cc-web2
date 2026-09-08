// DESIGN.md「0-3. 役割 × 画面 権限マトリクス」に基づく権限判定ヘルパー
import type { PurchaseRequest, PurchaseRequestStatus, Role } from './kuroco/types'

export interface NavItem {
  key: string
  label: string
  path: string
  implemented: boolean
  roles: Role[] | 'all'
}

const ALL_ROLES: Role[] = ['申請者', '部門長', 'IT担当', '購買担当', '経理担当', '管理者']

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'ダッシュボード', path: '/', implemented: true, roles: 'all' },
  { key: 'requests', label: '購買申請一覧', path: '/requests', implemented: true, roles: 'all' },
  { key: 'requests-new', label: '購買申請作成', path: '/requests/new', implemented: true, roles: ['申請者', '部門長', 'IT担当', '購買担当', '管理者'] },
  { key: 'approvals', label: '承認待ち一覧', path: '/approvals', implemented: true, roles: ['部門長', 'IT担当', '購買担当', '管理者'] },
  { key: 'quotes', label: '見積比較', path: '/quotes', implemented: true, roles: 'all' },
  { key: 'purchase-orders', label: '発注管理', path: '/purchase-orders', implemented: true, roles: 'all' },
  { key: 'receiving', label: '検収管理', path: '/receiving', implemented: true, roles: 'all' },
  { key: 'invoices', label: '請求書照合', path: '/invoices', implemented: true, roles: ['購買担当', '経理担当', '管理者'] },
  { key: 'vendors', label: '取引先マスター', path: '/vendors', implemented: true, roles: 'all' },
  { key: 'master-dept-budget', label: '部署・予算マスター', path: '/master/departments', implemented: true, roles: 'all' },
  { key: 'approval-rules', label: '承認ルール管理', path: '/approval-rules', implemented: true, roles: ['購買担当', '経理担当', '管理者'] },
  { key: 'audit-log', label: '監査ログ', path: '/audit-log', implemented: true, roles: ['経理担当', '管理者'] },
]

export function canSeeNavItem(role: Role | null, item: NavItem): boolean {
  if (!role) return false
  if (item.roles === 'all') return true
  return item.roles.includes(role)
}

// 購買申請一覧・承認待ち一覧などでのレコード可視範囲
export function visibleRequestsScope(role: Role): 'own' | 'department' | 'all' {
  if (role === '申請者') return 'own'
  if (role === '部門長') return 'department'
  return 'all'
}

export function canCreateRequest(role: Role): boolean {
  return role !== '経理担当'
}

export function canEditRequestActions(role: Role, req: PurchaseRequest, memberId: number, departmentId: number): {
  canApprove: boolean
  canReject: boolean
  canReturn: boolean
  canPlaceOrder: boolean
  canRegisterReceipt: boolean
  canRegisterInvoice: boolean
  canSelectQuote: boolean
} {
  const currentStep = req.approvalSteps.find((s) => s.status === '承認待ち')
  const isApproverForCurrentStep =
    !!currentStep &&
    ((currentStep.role === '部門長' && role === '部門長' && req.departmentId === departmentId) ||
      (currentStep.role === 'IT担当' && role === 'IT担当') ||
      (currentStep.role === '購買担当' && role === '購買担当') ||
      (currentStep.role === '管理者' && role === '管理者'))

  const canApprove = isApproverForCurrentStep && (req.status === '申請中' || req.status === '承認中')
  const canReject = canApprove
  const canReturn = canApprove

  const canPlaceOrder = role === '購買担当' && req.status === '承認済み'
  const isOwnerOrIt = role === 'IT担当' || (role === '申請者' && req.applicantMemberId === memberId)
  const canRegisterReceipt = (isOwnerOrIt || role === '購買担当' || role === '管理者') && (req.status === '発注済み' || req.status === '一部検収')
  const canRegisterInvoice = role === '経理担当' && req.status === '検収完了'
  const canSelectQuote = role === '購買担当' || role === '管理者'

  return { canApprove, canReject, canReturn, canPlaceOrder, canRegisterReceipt, canRegisterInvoice, canSelectQuote }
}

// ---- 追加5画面向けの権限ヘルパー ----

// 請求書照合: 経理担当・管理者のみ照合確定/支払保留/支払確定を操作できる（購買担当は閲覧のみ）
export function canManageInvoices(role: Role): boolean {
  return role === '経理担当' || role === '管理者'
}

// 取引先マスター: 購買担当・管理者のみ編集（新規・更新・有効/無効切替）できる
export function canManageVendors(role: Role): boolean {
  return role === '購買担当' || role === '管理者'
}

// 部署・予算マスター: 経理担当・管理者のみ編集できる
export function canManageBudgets(role: Role): boolean {
  return role === '経理担当' || role === '管理者'
}

// 部署・予算マスターの閲覧範囲: 申請者/部門長は自部門のみ、他ロールは全件
export function visibleBudgetDepartmentIds(role: Role, departmentId: number): number[] | null {
  if (role === '申請者' || role === '部門長') return [departmentId]
  return null
}

// 承認ルール管理: 管理者のみ編集（購買担当・経理担当は閲覧のみ）
export function canManageApprovalRules(role: Role): boolean {
  return role === '管理者'
}

export const STATUS_COLOR: Record<PurchaseRequestStatus, string> = {
  下書き: 'bg-slate-100 text-slate-600',
  申請中: 'bg-blue-100 text-blue-700',
  承認中: 'bg-indigo-100 text-indigo-700',
  差し戻し: 'bg-amber-100 text-amber-700',
  却下: 'bg-red-100 text-red-700',
  承認済み: 'bg-emerald-100 text-emerald-700',
  発注済み: 'bg-cyan-100 text-cyan-700',
  一部検収: 'bg-purple-100 text-purple-700',
  検収完了: 'bg-teal-100 text-teal-700',
  請求書確認中: 'bg-orange-100 text-orange-700',
  支払い保留: 'bg-rose-100 text-rose-700',
  完了: 'bg-navy-100 text-navy-800',
}
