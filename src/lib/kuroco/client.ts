// Kuroco API / モックの切り替え層。UIコンポーネントは必ずこの層を経由すること。
import {
  approvalRuleActiveApiPayload,
  approvalRuleCreateApiPayload,
  approvalRuleUpdateApiPayload,
  auditLogInsertApiPayload,
  budgetCreateApiPayload,
  budgetUpdateApiPayload,
  buildApiApprovalSteps,
  computeApprovalActionPatch,
  computePlaceOrderPatch,
  computeReceiptPatch,
  computeSelectQuotePatch,
  computeSubmitPatch,
  departmentUpdateApiPayload,
  fromApiApprovalRule,
  fromApiAuditLog,
  fromApiBudget,
  fromApiDepartment,
  fromApiInvoice,
  fromApiPurchaseRequest,
  fromApiStaffProfile,
  fromApiVendor,
  invoiceCreateApiPayload,
  invoiceStatusApiPayload,
  purchaseRequestCreateApiPayload,
  PR_STATUS_TO_KEY,
  toApprovalRule,
  toAuditLog,
  toBudget,
  toDepartment,
  toInvoice,
  toMember,
  toPurchaseRequest,
  toVendor,
  vendorCreateApiPayload,
  vendorInputToApiPayload,
  vendorStatusApiPayload,
} from './mappers'
import type {
  ApprovalRole,
  ApprovalRule,
  ApprovalRuleInput,
  ApprovalStep,
  ApprovalStepStatus,
  AuditLog,
  Budget,
  BudgetInput,
  Department,
  DepartmentInput,
  Invoice,
  InvoiceMatchStatus,
  KurocoDetailsResponse,
  KurocoListResponse,
  Member,
  PageInfo,
  PurchaseRequest,
  PurchaseRequestStatus,
  Quote,
  Receipt,
  Vendor,
  VendorInput,
} from './types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const API_BASE = import.meta.env.VITE_KUROCO_API_BASE ?? ''

// 実API接続時に使う認証ヘッダー（動的アクセストークン方式）。モック時は付与しない。
function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('procureflow_access_token')
  return token ? { 'X-RCMS-API-ACCESS-TOKEN': token } : {}
}

async function realFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers ?? {}) },
  })
  return res.json()
}

// 実APIのパス接頭辞。API ID(rcms-api/{id})は docs/API_BLOCKER.md の作業（管理画面でのエンドポイント
// 作成）が完了するまで未確定。既存分岐が仮定していた "1" を暫定的に踏襲するが、実際に採番された
// API IDが判明次第、差し替えが必要（未検証）。
const RCMS_API_PATH = '/rcms-api/1'

// エンドポイントのパス命名は docs/API_BLOCKER.md に記載した命名規則（{resource}/list, {resource}/details,
// {resource}/insert, {resource}/update/{id}）に従う。フィルタ用クエリパラメータ名は実エンドポイント
// 作成後に確認が必要な仮実装（未検証）。

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    usp.set(k, String(v))
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

async function apiList<T>(resource: string, query: Record<string, string | number | boolean | undefined | null> = {}): Promise<{ list: T[]; pageInfo: PageInfo }> {
  const res = await realFetch<KurocoListResponse<T>>(`${RCMS_API_PATH}/${resource}/list${buildQuery(query)}`)
  return { list: res.list ?? [], pageInfo: res.pageInfo }
}

async function apiDetails<T>(resource: string, id: number): Promise<T | null> {
  const res = await realFetch<KurocoDetailsResponse<T>>(`${RCMS_API_PATH}/${resource}/details/${id}`)
  return res.details ?? null
}

async function apiInsert<T = any>(resource: string, body: Record<string, unknown>): Promise<T> {
  return realFetch<T>(`${RCMS_API_PATH}/${resource}/insert`, { method: 'POST', body: JSON.stringify(body) })
}

async function apiUpdate<T = any>(resource: string, id: number, body: Record<string, unknown>): Promise<T> {
  return realFetch<T>(`${RCMS_API_PATH}/${resource}/update/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

// pushAuditLog（下記、モックDB用）の実API版。監査ログ用のAuditLogコンテンツ定義には既知の不整合
// （mappers.ts の auditLogInsertApiPayload / fromApiAuditLog のコメント参照）があり、
// action_typeがselect型の想定選択肢を超える値を受け付けない可能性が高い。業務操作自体を失敗させない
// ため、記録失敗はログ出力のみに留めるベストエフォート実装とする（未検証）。
async function postAuditLogApi(
  actorId: number,
  actionType: string,
  targetId: number,
  detail: string,
  before: string | null,
  after: string | null,
  targetType: string = 'PurchaseRequest',
): Promise<void> {
  try {
    await apiInsert('audit-logs', auditLogInsertApiPayload(actorId, actionType, targetId, detail, before, after, targetType))
  } catch (e) {
    console.error('[procureflow] 監査ログの実API記録に失敗しました（未検証のエンドポイントのため想定内）', e)
  }
}

// ---- モック用インメモリDB（セッション中のみ状態を保持。リロードでリセットされる） ----
let _db: {
  departments: any[]
  budgets: any[]
  vendors: any[]
  approvalRules: any[]
  members: any[]
  requests: any[]
  invoices: any[]
  auditLogs: any[]
} | null = null

async function db() {
  if (_db) return _db
  const [dep, bud, ven, rule, mem, req, inv, log] = await Promise.all([
    import('./mock/departments'),
    import('./mock/budgets'),
    import('./mock/vendors'),
    import('./mock/approvalRules'),
    import('./mock/members'),
    import('./mock/purchaseRequests'),
    import('./mock/invoices'),
    import('./mock/auditLogs'),
  ])
  _db = {
    departments: structuredClone(dep.departmentList.list),
    budgets: structuredClone(bud.budgetList.list),
    vendors: structuredClone(ven.vendorList.list),
    approvalRules: structuredClone(rule.approvalRuleList.list),
    members: structuredClone(mem.memberList.list),
    requests: structuredClone(req.purchaseRequestRaw),
    invoices: structuredClone(inv.invoiceRaw),
    auditLogs: structuredClone(log.auditLogRaw),
  }
  return _db
}

// モックDB用の監査ログ記録。実API使用時（!USE_MOCK）はこの関数を使わず、各操作関数内で
// postAuditLogApi（本ファイル上部、AuditLog topics_group_id=13へのinsert）を個別に呼び出す。
// pushAuditLogは第一引数にモックDBオブジェクトを取る設計のため、この1関数の内部で分岐させるのではなく
// 呼び出し側の各アクション関数でUSE_MOCK分岐する形にしている（モック分岐は無変更）。
let nextLogId = 1000
function pushAuditLog(
  d: NonNullable<typeof _db>,
  actorId: number,
  actorName: string,
  actionType: string,
  targetId: number,
  detail: string,
  before: string | null,
  after: string | null,
  targetType: string = 'PurchaseRequest',
) {
  d.auditLogs.unshift({
    log_id: nextLogId++,
    ts: new Date().toISOString().slice(0, 19).replace('T', ' '),
    actor_member_id: { member_id: actorId, name: actorName },
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    detail,
    before_status: before,
    after_status: after,
  })
}

// ---- マスタ系 ----
export async function listDepartments(): Promise<Department[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('departments')
    return list.map(fromApiDepartment)
  }
  const d = await db()
  return d.departments.map(toDepartment)
}

export async function listBudgets(): Promise<Budget[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('budgets')
    return list.map(fromApiBudget)
  }
  const d = await db()
  return d.budgets.map(toBudget)
}

export async function listVendors(): Promise<Vendor[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('vendors')
    return list.map(fromApiVendor)
  }
  const d = await db()
  return d.vendors.map(toVendor)
}

export async function listApprovalRules(): Promise<ApprovalRule[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('approval-rules')
    return list.map(fromApiApprovalRule)
  }
  const d = await db()
  return d.approvalRules.map(toApprovalRule)
}

export async function listMembers(): Promise<Member[]> {
  // 要確認: 会員一覧はKuroco標準のMember APIではなく、StaffProfile（topics_group_id=8、
  // 会員⇔部署の紐付け用コンテンツ）経由で取得する想定（docs/API_BLOCKER.mdの staff-profiles/list）。
  // フィールド定義・relation(module=member)の実データ形式ともに未確認（mappers.ts参照）。
  if (!USE_MOCK) {
    const { list } = await apiList<any>('staff-profiles')
    return list.map(fromApiStaffProfile)
  }
  const d = await db()
  return d.members.map(toMember)
}

// ---- 取引先マスター ----
let nextVendorId = 1000
export async function createVendor(input: VendorInput, actorId: number, actorName: string): Promise<Vendor> {
  if (!USE_MOCK) {
    const res = await apiInsert<{ topics_id: number }>('vendors', vendorCreateApiPayload(input))
    await postAuditLogApi(actorId, '作成', res.topics_id, `取引先「${input.name}」を登録`, null, '取引中', 'Vendor')
    const details = await apiDetails<any>('vendors', res.topics_id)
    if (!details) throw new Error('作成した取引先の取得に失敗しました')
    return fromApiVendor(details)
  }
  const d = await db()
  const id = nextVendorId++
  const raw = {
    vendor_id: id,
    vendor_code: input.vendorCode,
    name: input.name,
    contact_person: input.contactPerson,
    email: input.email,
    phone: input.phone,
    address: input.address,
    bank_info: input.bankInfo,
    payment_terms: input.paymentTerms,
    category: input.category,
    status: { key: 'active', label: '取引中' },
  }
  d.vendors.unshift(raw)
  pushAuditLog(d, actorId, actorName, '作成', id, `取引先「${input.name}」を登録`, null, '取引中', 'Vendor')
  return toVendor(raw)
}

export async function updateVendor(vendorId: number, input: VendorInput, actorId: number, actorName: string): Promise<Vendor | null> {
  if (!USE_MOCK) {
    await apiUpdate('vendors', vendorId, vendorInputToApiPayload(input))
    await postAuditLogApi(actorId, '更新', vendorId, `取引先「${input.name}」を更新`, null, null, 'Vendor')
    const details = await apiDetails<any>('vendors', vendorId)
    return details ? fromApiVendor(details) : null
  }
  const d = await db()
  const raw = d.vendors.find((v) => v.vendor_id === vendorId)
  if (!raw) return null
  Object.assign(raw, {
    vendor_code: input.vendorCode,
    name: input.name,
    contact_person: input.contactPerson,
    email: input.email,
    phone: input.phone,
    address: input.address,
    bank_info: input.bankInfo,
    payment_terms: input.paymentTerms,
    category: input.category,
  })
  pushAuditLog(d, actorId, actorName, '更新', vendorId, `取引先「${input.name}」を更新`, raw.status.label, raw.status.label, 'Vendor')
  return toVendor(raw)
}

export async function setVendorStatus(vendorId: number, active: boolean, actorId: number, actorName: string): Promise<Vendor | null> {
  if (!USE_MOCK) {
    await apiUpdate('vendors', vendorId, vendorStatusApiPayload(active))
    const label = active ? '取引中' : '停止中'
    await postAuditLogApi(actorId, 'ステータス変更', vendorId, `取引先を${label}に変更`, null, label, 'Vendor')
    const details = await apiDetails<any>('vendors', vendorId)
    return details ? fromApiVendor(details) : null
  }
  const d = await db()
  const raw = d.vendors.find((v) => v.vendor_id === vendorId)
  if (!raw) return null
  const before = raw.status.label
  raw.status = active ? { key: 'active', label: '取引中' } : { key: 'inactive', label: '停止中' }
  pushAuditLog(d, actorId, actorName, 'ステータス変更', vendorId, `取引先「${raw.name}」を${raw.status.label}に変更`, before, raw.status.label, 'Vendor')
  return toVendor(raw)
}

// ---- 部署・予算マスター ----
export async function updateDepartment(departmentId: number, input: DepartmentInput, members: Member[], actorId: number, actorName: string): Promise<Department | null> {
  if (!USE_MOCK) {
    await apiUpdate('departments', departmentId, departmentUpdateApiPayload(input))
    await postAuditLogApi(actorId, '更新', departmentId, `部署「${input.deptName}」を更新`, null, null, 'Department')
    const details = await apiDetails<any>('departments', departmentId)
    return details ? fromApiDepartment(details) : null
  }
  const d = await db()
  const raw = d.departments.find((dep) => dep.department_id === departmentId)
  if (!raw) return null
  const manager = members.find((m) => m.memberId === input.managerMemberId)
  raw.dept_name = input.deptName
  raw.manager_member_id = manager ? { member_id: manager.memberId, name: manager.name } : null
  raw.description = input.description
  pushAuditLog(d, actorId, actorName, '更新', departmentId, `部署「${input.deptName}」を更新`, null, null, 'Department')
  return toDepartment(raw)
}

export async function updateBudget(budgetId: number, input: BudgetInput, actorId: number, actorName: string): Promise<Budget | null> {
  if (!USE_MOCK) {
    await apiUpdate('budgets', budgetId, budgetUpdateApiPayload(input))
    await postAuditLogApi(actorId, '更新', budgetId, `予算(${input.fiscalYear}年度)を更新`, null, null, 'Budget')
    const details = await apiDetails<any>('budgets', budgetId)
    return details ? fromApiBudget(details) : null
  }
  const d = await db()
  const raw = d.budgets.find((b) => b.budget_id === budgetId)
  if (!raw) return null
  raw.fiscal_year = input.fiscalYear
  raw.category = input.category
  raw.budget_amount = input.budgetAmount
  raw.used_amount = input.usedAmount
  raw.note = input.note
  pushAuditLog(d, actorId, actorName, '更新', budgetId, `予算(${raw.department_id?.dept_name ?? ''} ${input.fiscalYear}年度)を更新`, null, null, 'Budget')
  return toBudget(raw)
}

let nextBudgetId = 1000
export async function createBudget(departmentId: number, departmentName: string, input: BudgetInput, actorId: number, actorName: string): Promise<Budget> {
  if (!USE_MOCK) {
    const subject = `${departmentName} ${input.fiscalYear}年度予算`
    const res = await apiInsert<{ topics_id: number }>('budgets', budgetCreateApiPayload(departmentId, subject, input))
    await postAuditLogApi(actorId, '作成', res.topics_id, `予算(${departmentName} ${input.fiscalYear}年度)を作成`, null, null, 'Budget')
    const details = await apiDetails<any>('budgets', res.topics_id)
    if (!details) throw new Error('作成した予算の取得に失敗しました')
    return fromApiBudget(details)
  }
  const d = await db()
  const id = nextBudgetId++
  const raw = {
    budget_id: id,
    department_id: { department_id: departmentId, dept_name: departmentName },
    fiscal_year: input.fiscalYear,
    category: input.category,
    budget_amount: input.budgetAmount,
    used_amount: input.usedAmount,
    note: input.note,
  }
  d.budgets.unshift(raw)
  pushAuditLog(d, actorId, actorName, '作成', id, `予算(${departmentName} ${input.fiscalYear}年度)を作成`, null, null, 'Budget')
  return toBudget(raw)
}

// ---- 承認ルール管理 ----
let nextApprovalRuleId = 1000
export async function createApprovalRule(input: ApprovalRuleInput, actorId: number, actorName: string): Promise<ApprovalRule> {
  if (!USE_MOCK) {
    const res = await apiInsert<{ topics_id: number }>('approval-rules', approvalRuleCreateApiPayload(input))
    await postAuditLogApi(actorId, '作成', res.topics_id, `承認ルール「${input.ruleName}」を作成`, null, null, 'ApprovalRule')
    const details = await apiDetails<any>('approval-rules', res.topics_id)
    if (!details) throw new Error('作成した承認ルールの取得に失敗しました')
    return fromApiApprovalRule(details)
  }
  const d = await db()
  const id = nextApprovalRuleId++
  const raw = {
    rule_id: id,
    rule_name: input.ruleName,
    min_amount: input.minAmount,
    max_amount: input.maxAmount,
    requires_it_review: input.requiresItReview,
    steps: input.steps,
    active_flg: 1,
  }
  d.approvalRules.push(raw)
  pushAuditLog(d, actorId, actorName, '作成', id, `承認ルール「${input.ruleName}」を作成`, null, null, 'ApprovalRule')
  return toApprovalRule(raw)
}

export async function updateApprovalRule(ruleId: number, input: ApprovalRuleInput, actorId: number, actorName: string): Promise<ApprovalRule | null> {
  if (!USE_MOCK) {
    await apiUpdate('approval-rules', ruleId, approvalRuleUpdateApiPayload(input))
    await postAuditLogApi(actorId, '更新', ruleId, `承認ルール「${input.ruleName}」を更新`, null, null, 'ApprovalRule')
    const details = await apiDetails<any>('approval-rules', ruleId)
    return details ? fromApiApprovalRule(details) : null
  }
  const d = await db()
  const raw = d.approvalRules.find((r) => r.rule_id === ruleId)
  if (!raw) return null
  raw.rule_name = input.ruleName
  raw.min_amount = input.minAmount
  raw.max_amount = input.maxAmount
  raw.requires_it_review = input.requiresItReview
  raw.steps = input.steps
  pushAuditLog(d, actorId, actorName, '更新', ruleId, `承認ルール「${input.ruleName}」を更新`, null, null, 'ApprovalRule')
  return toApprovalRule(raw)
}

export async function setApprovalRuleActive(ruleId: number, active: boolean, actorId: number, actorName: string): Promise<ApprovalRule | null> {
  if (!USE_MOCK) {
    await apiUpdate('approval-rules', ruleId, approvalRuleActiveApiPayload(active))
    await postAuditLogApi(actorId, 'ステータス変更', ruleId, `承認ルールを${active ? '有効化' : '無効化'}`, null, null, 'ApprovalRule')
    const details = await apiDetails<any>('approval-rules', ruleId)
    return details ? fromApiApprovalRule(details) : null
  }
  const d = await db()
  const raw = d.approvalRules.find((r) => r.rule_id === ruleId)
  if (!raw) return null
  raw.active_flg = active ? 1 : 0
  pushAuditLog(d, actorId, actorName, 'ステータス変更', ruleId, `承認ルール「${raw.rule_name}」を${active ? '有効化' : '無効化'}`, null, null, 'ApprovalRule')
  return toApprovalRule(raw)
}

// ---- 購買申請 ----
export interface RequestFilter {
  keyword?: string
  status?: PurchaseRequestStatus | ''
  departmentId?: number | ''
  amountMin?: number | null
  amountMax?: number | null
  dateFrom?: string | ''
  dateTo?: string | ''
  applicantMemberId?: number | ''
  page?: number
  perPage?: number
}

export async function listPurchaseRequests(filter: RequestFilter = {}): Promise<{ items: PurchaseRequest[]; pageInfo: { totalCnt: number; perPage: number; totalPageCnt: number; pageNo: number } }> {
  if (!USE_MOCK) {
    // 要確認: Kurocoのtopics検索クエリのパラメータ名は実エンドポイント作成後に確認が必要な仮実装。
    // ここでは searchable指定済みのフィールド(status/department/total_incl_tax)に対する素朴な
    // クエリパラメータ名を仮定している（未検証）。
    const { list, pageInfo } = await apiList<any>('purchase-requests', {
      keyword: filter.keyword || undefined,
      status: filter.status ? PR_STATUS_TO_KEY[filter.status] : undefined,
      department: filter.departmentId || undefined,
      applicant: filter.applicantMemberId || undefined,
      total_incl_tax_from: filter.amountMin ?? undefined,
      total_incl_tax_to: filter.amountMax ?? undefined,
      inst_ymdhi_from: filter.dateFrom || undefined,
      inst_ymdhi_to: filter.dateTo || undefined,
      pageID: filter.page ?? 1,
      pageSize: filter.perPage ?? 10,
    })
    return { items: list.map(fromApiPurchaseRequest), pageInfo }
  }
  const d = await db()
  let items = d.requests.map(toPurchaseRequest)

  if (filter.applicantMemberId) items = items.filter((r) => r.applicantMemberId === filter.applicantMemberId)
  if (filter.departmentId) items = items.filter((r) => r.departmentId === filter.departmentId)
  if (filter.status) items = items.filter((r) => r.status === filter.status)
  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase()
    items = items.filter((r) => r.title.toLowerCase().includes(kw) || r.requestNo.toLowerCase().includes(kw) || r.applicantName.toLowerCase().includes(kw))
  }
  if (filter.amountMin != null) items = items.filter((r) => r.totalInclTax >= filter.amountMin!)
  if (filter.amountMax != null) items = items.filter((r) => r.totalInclTax <= filter.amountMax!)
  if (filter.dateFrom) items = items.filter((r) => r.createdAt.slice(0, 10) >= filter.dateFrom!)
  if (filter.dateTo) items = items.filter((r) => r.createdAt.slice(0, 10) <= filter.dateTo!)

  items = items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const perPage = filter.perPage ?? 10
  const pageNo = filter.page ?? 1
  const totalCnt = items.length
  const totalPageCnt = Math.max(1, Math.ceil(totalCnt / perPage))
  const paged = items.slice((pageNo - 1) * perPage, pageNo * perPage)

  return { items: paged, pageInfo: { totalCnt, perPage, totalPageCnt, pageNo } }
}

export async function getPurchaseRequest(id: number): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  return raw ? toPurchaseRequest(raw) : null
}

export interface LineItemInput {
  name: string
  category: string
  qty: number
  unitPrice: number
  taxRate: number
  purpose: string
  desiredDate: string
}

// 明細1行の税込単価を先に四捨五入してから数量を掛ける（設計ドキュメント指定の丸め方）
export function calcLineTotal(item: LineItemInput): { exclTax: number; inclTax: number } {
  const exclTax = item.unitPrice * item.qty
  const unitInclTax = Math.round(item.unitPrice * (1 + item.taxRate / 100))
  const inclTax = unitInclTax * item.qty
  return { exclTax, inclTax }
}

export function calcRequestTotals(items: LineItemInput[]): { totalExclTax: number; totalInclTax: number } {
  return items.reduce(
    (acc, item) => {
      const { exclTax, inclTax } = calcLineTotal(item)
      return { totalExclTax: acc.totalExclTax + exclTax, totalInclTax: acc.totalInclTax + inclTax }
    },
    { totalExclTax: 0, totalInclTax: 0 },
  )
}

export interface CreateRequestInput {
  title: string
  overallPurpose: string
  applicantMemberId: number
  applicantName: string
  departmentId: number
  departmentName: string
  budgetId: number | null
  lineItems: LineItemInput[]
  asDraft: boolean
}

function buildApprovalSteps(members: any[], amount: number, hasItCategory: boolean): any[] {
  const roles: ApprovalRole[] = []
  if (amount < 100000) roles.push('部門長')
  else if (amount < 1000000) roles.push('部門長', '購買担当')
  else roles.push('部門長', '購買担当', '管理者')
  if (hasItCategory && !roles.includes('IT担当')) {
    // 部門長の直後にIT担当ステップを挿入
    const idx = roles.indexOf('部門長')
    roles.splice(idx + 1, 0, 'IT担当')
  }
  const roleToMemberGroup: Record<ApprovalRole, string> = {
    部門長: 'dept_manager',
    IT担当: 'it_staff',
    購買担当: 'purchasing_staff',
    経理担当: 'accounting_staff',
    管理者: 'admin',
  }
  return roles.map((role, i) => {
    const approver = members.find((m) => m.group?.key === roleToMemberGroup[role])
    return {
      order: i + 1,
      role,
      approver_member_id: approver?.member_id ?? null,
      approver_name: approver ? `${approver.name1}${approver.name2}` : null,
      status: i === 0 ? '承認待ち' : '待機',
      acted_at: null,
      comment: null,
    }
  })
}

let nextRequestId = 1000
export async function createPurchaseRequest(input: CreateRequestInput): Promise<PurchaseRequest> {
  if (!USE_MOCK) {
    const totals = calcRequestTotals(input.lineItems)
    const hasIt = input.lineItems.some((li) => li.category === 'IT機器')
    // 承認ラインは申請時点のメンバー一覧から組み立てる（buildApiApprovalSteps参照）。下書き保存時は空。
    const members = input.asDraft ? [] : await listMembers()
    const approvalSteps = input.asDraft ? [] : buildApiApprovalSteps(members, totals.totalInclTax, hasIt)
    const payload = purchaseRequestCreateApiPayload(input, totals, approvalSteps)
    const res = await apiInsert<{ topics_id: number }>('purchase-requests', payload)
    await postAuditLogApi(
      input.applicantMemberId,
      input.asDraft ? '下書き保存' : '申請',
      res.topics_id,
      input.title,
      null,
      input.asDraft ? '下書き' : '申請中',
    )
    const details = await apiDetails<any>('purchase-requests', res.topics_id)
    if (!details) throw new Error('作成した申請の取得に失敗しました')
    return fromApiPurchaseRequest(details)
  }
  const d = await db()
  const totals = calcRequestTotals(input.lineItems)
  const hasIt = input.lineItems.some((li) => li.category === 'IT機器')
  const id = nextRequestId++
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const status = input.asDraft ? 'draft' : 'requesting'
  const statusLabel = input.asDraft ? '下書き' : '申請中'
  const raw = {
    topics_id: id,
    request_no: `PR-2026-${String(id).padStart(4, '0')}`,
    subject: input.title,
    applicant_member_id: { member_id: input.applicantMemberId, name: input.applicantName },
    department_id: { department_id: input.departmentId, dept_name: input.departmentName },
    status: { key: status, label: statusLabel },
    overall_purpose: input.overallPurpose,
    line_items: input.lineItems.map((li) => ({
      name: li.name,
      category: li.category,
      qty: li.qty,
      unit_price: li.unitPrice,
      tax_rate: li.taxRate,
      purpose: li.purpose,
      desired_date: li.desiredDate,
    })),
    total_excl_tax: totals.totalExclTax,
    total_incl_tax: totals.totalInclTax,
    budget_id: input.budgetId,
    quotes: [],
    selected_vendor_id: null,
    attachments_quote: [],
    attachments_spec: [],
    attachments_contract: [],
    approval_steps: input.asDraft ? [] : buildApprovalSteps(d.members, totals.totalInclTax, hasIt),
    po_no: null,
    po_date: null,
    receipts: [],
    inst_ymdhi: nowStr,
    update_ymdhi: nowStr,
  }
  d.requests.unshift(raw)
  pushAuditLog(d, input.applicantMemberId, input.applicantName, input.asDraft ? '下書き保存' : '申請', id, input.title, null, statusLabel)
  return toPurchaseRequest(raw)
}

export async function submitDraft(id: number, actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const raw = await apiDetails<any>('purchase-requests', id)
    if (!raw) return null
    const members = await listMembers()
    await apiUpdate('purchase-requests', id, computeSubmitPatch(raw, members))
    await postAuditLogApi(actorId, '申請', id, `${fromApiPurchaseRequest(raw).title}を申請`, null, '申請中')
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  if (!raw) return null
  const hasIt = raw.line_items.some((li: any) => li.category === 'IT機器')
  raw.approval_steps = buildApprovalSteps(d.members, raw.total_incl_tax, hasIt)
  const before = raw.status.label
  raw.status = { key: 'requesting', label: '申請中' }
  raw.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
  pushAuditLog(d, actorId, actorName, '申請', id, `${raw.subject}を申請`, before, '申請中')
  return toPurchaseRequest(raw)
}

export type ApprovalAction = '承認' | '差し戻し' | '却下'

export async function actOnApproval(id: number, action: ApprovalAction, actorId: number, actorName: string, comment: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const raw = await apiDetails<any>('purchase-requests', id)
    if (!raw) return null
    const result = computeApprovalActionPatch(raw, action, actorId, actorName, comment)
    if (!result) return fromApiPurchaseRequest(raw)
    await apiUpdate('purchase-requests', id, result.patch)
    await postAuditLogApi(actorId, action, id, comment || `${action}`, null, result.afterLabel)
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  if (!raw) return null
  const steps: any[] = raw.approval_steps
  const current = steps.find((s) => s.status === '承認待ち')
  if (!current) return toPurchaseRequest(raw)
  const before = raw.status.label
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')
  current.acted_at = nowStr
  current.comment = comment || null
  current.approver_member_id = actorId
  current.approver_name = actorName

  if (action === '承認') {
    current.status = '承認'
    const next = steps.find((s) => s.order === current.order + 1)
    if (next) {
      next.status = '承認待ち'
      raw.status = { key: 'approving', label: '承認中' }
    } else {
      raw.status = { key: 'approved', label: '承認済み' }
    }
  } else if (action === '差し戻し') {
    current.status = '差し戻し'
    raw.status = { key: 'returned', label: '差し戻し' }
  } else {
    current.status = '却下'
    raw.status = { key: 'rejected', label: '却下' }
  }
  raw.update_ymdhi = nowStr
  pushAuditLog(d, actorId, actorName, action, id, comment || `${action}（${current.role}）`, before, raw.status.label)
  return toPurchaseRequest(raw)
}

export async function resubmitRequest(id: number, actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  return submitDraft(id, actorId, actorName)
}

export async function selectQuoteVendor(id: number, vendorId: number, actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const raw = await apiDetails<any>('purchase-requests', id)
    if (!raw) return null
    await apiUpdate('purchase-requests', id, computeSelectQuotePatch(raw, vendorId))
    await postAuditLogApi(actorId, '見積選定', id, `ベンダーID ${vendorId} を選定`, null, null)
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  if (!raw) return null
  raw.quotes.forEach((q: any) => (q.selected = q.vendor_id === vendorId))
  raw.selected_vendor_id = vendorId
  raw.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
  pushAuditLog(d, actorId, actorName, '見積選定', id, `ベンダーID ${vendorId} を選定`, raw.status.label, raw.status.label)
  return toPurchaseRequest(raw)
}

export async function placeOrder(id: number, poNo: string, actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    await apiUpdate('purchase-requests', id, computePlaceOrderPatch(poNo))
    await postAuditLogApi(actorId, '発注', id, `発注書${poNo}を発行`, null, '発注済み')
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  if (!raw) return null
  const before = raw.status.label
  raw.po_no = poNo
  raw.po_date = new Date().toISOString().slice(0, 10)
  raw.status = { key: 'ordered', label: '発注済み' }
  raw.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
  pushAuditLog(d, actorId, actorName, '発注', id, `発注書${poNo}を発行`, before, '発注済み')
  return toPurchaseRequest(raw)
}

export async function registerReceipt(id: number, receipts: Receipt[], actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const raw = await apiDetails<any>('purchase-requests', id)
    if (!raw) return null
    const patch = computeReceiptPatch(raw, receipts)
    await apiUpdate('purchase-requests', id, patch)
    await postAuditLogApi(actorId, '検収登録', id, '検収を登録', null, patch.status === 'received' ? '検収完了' : '一部検収')
    const details = await apiDetails<any>('purchase-requests', id)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === id)
  if (!raw) return null
  const before = raw.status.label
  raw.receipts.push(
    ...receipts.map((r) => ({
      date: r.date,
      item_name: r.itemName,
      qty_received: r.qtyReceived,
      receiver_member_id: r.receiverMemberId,
      receiver_name: r.receiverName,
      note: r.note,
    })),
  )
  const totalOrderedQty = raw.line_items.reduce((s: number, li: any) => s + li.qty, 0)
  const receivedByName: Record<string, number> = {}
  raw.receipts.forEach((r: any) => (receivedByName[r.item_name] = (receivedByName[r.item_name] ?? 0) + r.qty_received))
  const totalReceivedQty = Object.values(receivedByName).reduce((s, v) => s + v, 0)
  raw.status = totalReceivedQty >= totalOrderedQty ? { key: 'received', label: '検収完了' } : { key: 'partially_received', label: '一部検収' }
  raw.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
  pushAuditLog(d, actorId, actorName, '検収登録', id, '検収を登録', before, raw.status.label)
  return toPurchaseRequest(raw)
}

let nextInvoiceId = 1000
export async function registerInvoice(requestId: number, amount: number, actorId: number, actorName: string): Promise<PurchaseRequest | null> {
  if (!USE_MOCK) {
    const raw = await apiDetails<any>('purchase-requests', requestId)
    if (!raw) return null
    const invoiceRes = await apiInsert<{ topics_id: number }>('invoices', invoiceCreateApiPayload(raw, amount))
    await apiUpdate('purchase-requests', requestId, { status: 'invoice_checking' })
    await postAuditLogApi(actorId, '請求書登録', requestId, `請求書を登録（${amount}円）`, null, '請求書確認中')
    await postAuditLogApi(actorId, '作成', invoiceRes.topics_id, `請求書を登録（${amount}円）`, null, '確認中', 'Invoice')
    const details = await apiDetails<any>('purchase-requests', requestId)
    return details ? fromApiPurchaseRequest(details) : null
  }
  const d = await db()
  const raw = d.requests.find((r) => r.topics_id === requestId)
  if (!raw) return null
  const before = raw.status.label
  const invoiceId = nextInvoiceId++
  d.invoices.unshift({
    invoice_id: invoiceId,
    invoice_no: `INV-2026-${String(invoiceId).padStart(4, '0')}`,
    purchase_request_id: { topics_id: raw.topics_id, subject: raw.subject },
    vendor_id: { vendor_id: raw.selected_vendor_id, name: raw.quotes.find((q: any) => q.vendor_id === raw.selected_vendor_id)?.vendor_name ?? '' },
    amount,
    received_date: new Date().toISOString().slice(0, 10),
    matched_status: { key: amount === raw.total_incl_tax ? 'matched' : 'mismatch', label: amount === raw.total_incl_tax ? '一致' : '不一致' },
    discrepancy_note: amount === raw.total_incl_tax ? '' : `発注金額${raw.total_incl_tax}円に対し請求額${amount}円`,
    file: null,
  })
  raw.status = { key: 'invoice_checking', label: '請求書確認中' }
  raw.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
  pushAuditLog(d, actorId, actorName, '請求書登録', requestId, `請求書を登録（${amount}円）`, before, '請求書確認中')
  return toPurchaseRequest(raw)
}

// ---- 請求書 ----
export async function listInvoices(): Promise<Invoice[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('invoices')
    return list.map(fromApiInvoice)
  }
  const d = await db()
  return d.invoices.map(toInvoice)
}

const INVOICE_STATUS_KEY: Record<InvoiceMatchStatus, string> = { 確認中: 'checking', 一致: 'matched', 不一致: 'mismatch', 支払保留: 'hold', 支払済: 'paid' }

export async function updateInvoiceStatus(invoiceId: number, status: InvoiceMatchStatus, note: string): Promise<Invoice | null> {
  if (!USE_MOCK) {
    await apiUpdate('invoices', invoiceId, invoiceStatusApiPayload(status, note))
    const details = await apiDetails<any>('invoices', invoiceId)
    return details ? fromApiInvoice(details) : null
  }
  const d = await db()
  const raw = d.invoices.find((i) => i.invoice_id === invoiceId)
  if (!raw) return null
  raw.matched_status = { key: INVOICE_STATUS_KEY[status], label: status }
  raw.discrepancy_note = note
  return toInvoice(raw)
}

// 金額不一致検出 → 請求書を「支払保留」にし、対象申請のステータスも「支払い保留」にする（経理担当/管理者操作）
export async function holdInvoicePayment(invoiceId: number, actorId: number, actorName: string): Promise<Invoice | null> {
  if (!USE_MOCK) {
    const invoiceRaw = await apiDetails<any>('invoices', invoiceId)
    if (!invoiceRaw) return null
    const beforeInvoice = fromApiInvoice(invoiceRaw)
    await apiUpdate('invoices', invoiceId, invoiceStatusApiPayload('支払保留', beforeInvoice.discrepancyNote))
    if (beforeInvoice.purchaseRequestId) {
      await apiUpdate('purchase-requests', beforeInvoice.purchaseRequestId, { status: 'payment_hold' })
      await postAuditLogApi(actorId, '金額不一致検出', beforeInvoice.purchaseRequestId, `請求書${beforeInvoice.invoiceNo}の金額不一致により支払保留`, null, '支払い保留')
    }
    await postAuditLogApi(actorId, 'ステータス変更', invoiceId, `請求書${beforeInvoice.invoiceNo}を支払保留に変更`, beforeInvoice.matchedStatus, '支払保留', 'Invoice')
    const details = await apiDetails<any>('invoices', invoiceId)
    return details ? fromApiInvoice(details) : null
  }
  const d = await db()
  const raw = d.invoices.find((i) => i.invoice_id === invoiceId)
  if (!raw) return null
  const before = raw.matched_status.label
  raw.matched_status = { key: 'hold', label: '支払保留' }
  const req = d.requests.find((r) => r.topics_id === raw.purchase_request_id?.topics_id)
  if (req) {
    const beforeReq = req.status.label
    req.status = { key: 'payment_hold', label: '支払い保留' }
    req.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
    pushAuditLog(d, actorId, actorName, '金額不一致検出', req.topics_id, `請求書${raw.invoice_no}の金額不一致により支払保留`, beforeReq, '支払い保留')
  }
  pushAuditLog(d, actorId, actorName, 'ステータス変更', invoiceId, `請求書${raw.invoice_no}を支払保留に変更`, before, '支払保留', 'Invoice')
  return toInvoice(raw)
}

// 差異解消 → 請求書を「一致」として確定し、対象申請を「請求書確認中」に戻す（経理担当/管理者操作）
export async function confirmInvoiceMatch(invoiceId: number, actorId: number, actorName: string): Promise<Invoice | null> {
  if (!USE_MOCK) {
    const invoiceRaw = await apiDetails<any>('invoices', invoiceId)
    if (!invoiceRaw) return null
    const beforeInvoice = fromApiInvoice(invoiceRaw)
    await apiUpdate('invoices', invoiceId, invoiceStatusApiPayload('一致', ''))
    if (beforeInvoice.purchaseRequestId) {
      const reqRaw = await apiDetails<any>('purchase-requests', beforeInvoice.purchaseRequestId)
      const reqStatus = reqRaw ? fromApiPurchaseRequest(reqRaw).status : null
      if (reqStatus === '支払い保留') {
        await apiUpdate('purchase-requests', beforeInvoice.purchaseRequestId, { status: 'invoice_checking' })
        await postAuditLogApi(actorId, '差異解消', beforeInvoice.purchaseRequestId, `請求書${beforeInvoice.invoiceNo}の差異を解消し請求書確認中に戻す`, '支払い保留', '請求書確認中')
      }
    }
    await postAuditLogApi(actorId, '一致確定', invoiceId, `請求書${beforeInvoice.invoiceNo}を一致として確定`, beforeInvoice.matchedStatus, '一致', 'Invoice')
    const details = await apiDetails<any>('invoices', invoiceId)
    return details ? fromApiInvoice(details) : null
  }
  const d = await db()
  const raw = d.invoices.find((i) => i.invoice_id === invoiceId)
  if (!raw) return null
  const before = raw.matched_status.label
  raw.matched_status = { key: 'matched', label: '一致' }
  raw.discrepancy_note = ''
  const req = d.requests.find((r) => r.topics_id === raw.purchase_request_id?.topics_id)
  if (req && req.status.label === '支払い保留') {
    const beforeReq = req.status.label
    req.status = { key: 'invoice_checking', label: '請求書確認中' }
    req.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
    pushAuditLog(d, actorId, actorName, '差異解消', req.topics_id, `請求書${raw.invoice_no}の差異を解消し請求書確認中に戻す`, beforeReq, '請求書確認中')
  }
  pushAuditLog(d, actorId, actorName, '一致確定', invoiceId, `請求書${raw.invoice_no}を一致として確定`, before, '一致', 'Invoice')
  return toInvoice(raw)
}

// 支払確定 → 請求書を「支払済」にし、対象申請を「完了」にする（経理担当/管理者操作）
export async function confirmInvoicePayment(invoiceId: number, actorId: number, actorName: string): Promise<Invoice | null> {
  if (!USE_MOCK) {
    const invoiceRaw = await apiDetails<any>('invoices', invoiceId)
    if (!invoiceRaw) return null
    const beforeInvoice = fromApiInvoice(invoiceRaw)
    await apiUpdate('invoices', invoiceId, invoiceStatusApiPayload('支払済', beforeInvoice.discrepancyNote))
    if (beforeInvoice.purchaseRequestId) {
      await apiUpdate('purchase-requests', beforeInvoice.purchaseRequestId, { status: 'completed' })
      await postAuditLogApi(actorId, '支払確定', beforeInvoice.purchaseRequestId, `請求書${beforeInvoice.invoiceNo}の支払を確定し完了`, null, '完了')
    }
    await postAuditLogApi(actorId, '支払確定', invoiceId, `請求書${beforeInvoice.invoiceNo}を支払済に変更`, beforeInvoice.matchedStatus, '支払済', 'Invoice')
    const details = await apiDetails<any>('invoices', invoiceId)
    return details ? fromApiInvoice(details) : null
  }
  const d = await db()
  const raw = d.invoices.find((i) => i.invoice_id === invoiceId)
  if (!raw) return null
  const before = raw.matched_status.label
  raw.matched_status = { key: 'paid', label: '支払済' }
  const req = d.requests.find((r) => r.topics_id === raw.purchase_request_id?.topics_id)
  if (req) {
    const beforeReq = req.status.label
    req.status = { key: 'completed', label: '完了' }
    req.update_ymdhi = new Date().toISOString().slice(0, 19).replace('T', ' ')
    pushAuditLog(d, actorId, actorName, '支払確定', req.topics_id, `請求書${raw.invoice_no}の支払を確定し完了`, beforeReq, '完了')
  }
  pushAuditLog(d, actorId, actorName, '支払確定', invoiceId, `請求書${raw.invoice_no}を支払済に変更`, before, '支払済', 'Invoice')
  return toInvoice(raw)
}

// ---- 監査ログ ----
export async function listAuditLogs(): Promise<AuditLog[]> {
  if (!USE_MOCK) {
    const { list } = await apiList<any>('audit-logs')
    return list.map(fromApiAuditLog)
  }
  const d = await db()
  return d.auditLogs.map(toAuditLog)
}
