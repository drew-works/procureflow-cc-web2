// アプリ用の型（Kurocoの生フィールド名はここに持ち込まない。マッパーで変換する）

export type Role = '申請者' | '部門長' | 'IT担当' | '購買担当' | '経理担当' | '管理者'

export interface Member {
  memberId: number
  name: string
  email: string
  role: Role
  departmentId: number
  position: string
}

export interface Department {
  departmentId: number
  deptCode: string
  deptName: string
  managerMemberId: number
  managerName: string
  parentDept: string | null
  description: string
}

export interface Budget {
  budgetId: number
  departmentId: number
  fiscalYear: number
  category: string
  budgetAmount: number
  usedAmount: number
  note: string
}

export interface Vendor {
  vendorId: number
  vendorCode: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  bankInfo: string
  paymentTerms: string
  category: string
  status: '取引中' | '停止中'
}

export type ApprovalRole = '部門長' | 'IT担当' | '購買担当' | '経理担当' | '管理者'

export interface ApprovalRuleStep {
  order: number
  role: ApprovalRole
}

export interface ApprovalRule {
  ruleId: number
  ruleName: string
  minAmount: number
  maxAmount: number | null
  requiresItReview: boolean
  steps: ApprovalRuleStep[]
  active: boolean
}

export type PurchaseRequestStatus =
  | '下書き'
  | '申請中'
  | '承認中'
  | '差し戻し'
  | '却下'
  | '承認済み'
  | '発注済み'
  | '一部検収'
  | '検収完了'
  | '請求書確認中'
  | '支払い保留'
  | '完了'

export const ALL_STATUSES: PurchaseRequestStatus[] = [
  '下書き',
  '申請中',
  '承認中',
  '差し戻し',
  '却下',
  '承認済み',
  '発注済み',
  '一部検収',
  '検収完了',
  '請求書確認中',
  '支払い保留',
  '完了',
]

export interface LineItem {
  name: string
  category: string
  qty: number
  unitPrice: number
  taxRate: number
  purpose: string
  desiredDate: string
}

export interface Quote {
  vendorId: number
  vendorName: string
  amount: number
  deliveryDate: string
  note: string
  selected: boolean
  fileRef: string | null
}

export type ApprovalStepStatus = '待機' | '承認待ち' | '承認' | '差し戻し' | '却下' | 'スキップ'

export interface ApprovalStep {
  order: number
  role: ApprovalRole
  approverMemberId: number | null
  approverName: string | null
  status: ApprovalStepStatus
  actedAt: string | null
  comment: string | null
}

export interface Receipt {
  date: string
  itemName: string
  qtyReceived: number
  receiverMemberId: number
  receiverName: string
  note: string
}

export interface AttachmentFile {
  id: string
  name: string
  url: string | null
  uploadedAt: string
}

export interface PurchaseRequest {
  requestId: number
  requestNo: string
  title: string
  applicantMemberId: number
  applicantName: string
  departmentId: number
  departmentName: string
  status: PurchaseRequestStatus
  overallPurpose: string
  lineItems: LineItem[]
  totalExclTax: number
  totalInclTax: number
  budgetId: number | null
  quotes: Quote[]
  selectedVendorId: number | null
  attachmentsQuote: AttachmentFile[]
  attachmentsSpec: AttachmentFile[]
  attachmentsContract: AttachmentFile[]
  approvalSteps: ApprovalStep[]
  poNo: string | null
  poDate: string | null
  receipts: Receipt[]
  createdAt: string
  updatedAt: string
}

export type InvoiceMatchStatus = '確認中' | '一致' | '不一致' | '支払保留' | '支払済'

export interface Invoice {
  invoiceId: number
  invoiceNo: string
  purchaseRequestId: number
  purchaseRequestTitle: string
  vendorId: number
  vendorName: string
  amount: number
  receivedDate: string
  matchedStatus: InvoiceMatchStatus
  discrepancyNote: string
  fileRef: string | null
}

export interface VendorInput {
  vendorCode: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  bankInfo: string
  paymentTerms: string
  category: string
}

export interface DepartmentInput {
  deptName: string
  managerMemberId: number | null
  description: string
}

export interface BudgetInput {
  fiscalYear: number
  category: string
  budgetAmount: number
  usedAmount: number
  note: string
}

export interface ApprovalRuleInput {
  ruleName: string
  minAmount: number
  maxAmount: number | null
  requiresItReview: boolean
  steps: ApprovalRuleStep[]
}

export interface AuditLog {
  logId: number
  ts: string
  actorMemberId: number
  actorName: string
  actionType: string
  targetType: string
  targetId: number
  detail: string
  beforeStatus: string | null
  afterStatus: string | null
}

export interface PageInfo {
  totalCnt: number
  perPage: number
  totalPageCnt: number
  pageNo: number
}

export interface KurocoListResponse<T> {
  errors: { code: string; message: string }[]
  messages: string[]
  list: T[]
  pageInfo: PageInfo
}

export interface KurocoDetailsResponse<T> {
  errors: { code: string; message: string }[]
  messages: string[]
  details: T
}
