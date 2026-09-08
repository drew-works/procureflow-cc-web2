// 生レスポンス → アプリ用型の変換。拡張項目のキー名の差異はすべてここに閉じ込める。
import type {
  ApprovalRole,
  ApprovalRule,
  ApprovalRuleInput,
  ApprovalStep,
  ApprovalStepStatus,
  AttachmentFile,
  AuditLog,
  Budget,
  BudgetInput,
  Department,
  DepartmentInput,
  Invoice,
  InvoiceMatchStatus,
  LineItem,
  Member,
  PurchaseRequest,
  PurchaseRequestStatus,
  Quote,
  Receipt,
  Role,
  Vendor,
  VendorInput,
} from './types'

export function toDepartment(raw: any): Department {
  return {
    departmentId: raw.department_id,
    deptCode: raw.dept_code,
    deptName: raw.dept_name,
    managerMemberId: raw.manager_member_id?.member_id ?? null,
    managerName: raw.manager_member_id?.name ?? '',
    parentDept: raw.parent_dept,
    description: raw.description ?? '',
  }
}

export function toBudget(raw: any): Budget {
  return {
    budgetId: raw.budget_id,
    departmentId: raw.department_id?.department_id ?? raw.department_id,
    fiscalYear: raw.fiscal_year,
    category: raw.category,
    budgetAmount: raw.budget_amount,
    usedAmount: raw.used_amount,
    note: raw.note ?? '',
  }
}

export function toVendor(raw: any): Vendor {
  return {
    vendorId: raw.vendor_id,
    vendorCode: raw.vendor_code,
    name: raw.name,
    contactPerson: raw.contact_person,
    email: raw.email,
    phone: raw.phone,
    address: raw.address,
    bankInfo: raw.bank_info,
    paymentTerms: raw.payment_terms,
    category: raw.category,
    status: raw.status?.label ?? '取引中',
  }
}

export function toApprovalRule(raw: any): ApprovalRule {
  return {
    ruleId: raw.rule_id,
    ruleName: raw.rule_name,
    minAmount: raw.min_amount,
    maxAmount: raw.max_amount,
    requiresItReview: !!raw.requires_it_review,
    steps: raw.steps ?? [],
    active: raw.active_flg === 1,
  }
}

export function toMember(raw: any): Member {
  return {
    memberId: raw.member_id,
    name: `${raw.name1}${raw.name2}`,
    email: raw.email,
    role: (raw.group?.label ?? '申請者') as Role,
    departmentId: raw.department_id?.department_id ?? raw.department_id,
    position: raw.position ?? '',
  }
}

function toAttachment(raw: any): AttachmentFile {
  return {
    id: raw.id,
    name: raw.name ?? raw.desc,
    url: raw.url ?? null,
    uploadedAt: raw.uploaded_at ?? '',
  }
}

function toLineItem(raw: any): LineItem {
  return {
    name: raw.name,
    category: raw.category,
    qty: raw.qty,
    unitPrice: raw.unit_price,
    taxRate: raw.tax_rate,
    purpose: raw.purpose,
    desiredDate: raw.desired_date,
  }
}

function toQuote(raw: any): Quote {
  return {
    vendorId: raw.vendor_id,
    vendorName: raw.vendor_name,
    amount: raw.amount,
    deliveryDate: raw.delivery_date,
    note: raw.note ?? '',
    selected: !!raw.selected,
    fileRef: raw.file_ref ?? null,
  }
}

function toApprovalStep(raw: any): ApprovalStep {
  return {
    order: raw.order,
    role: raw.role,
    approverMemberId: raw.approver_member_id ?? null,
    approverName: raw.approver_name ?? null,
    status: raw.status as ApprovalStepStatus,
    actedAt: raw.acted_at,
    comment: raw.comment,
  }
}

function toReceipt(raw: any): Receipt {
  return {
    date: raw.date,
    itemName: raw.item_name,
    qtyReceived: raw.qty_received,
    receiverMemberId: raw.receiver_member_id,
    receiverName: raw.receiver_name,
    note: raw.note ?? '',
  }
}

export function toPurchaseRequest(raw: any): PurchaseRequest {
  return {
    requestId: raw.topics_id,
    requestNo: raw.request_no,
    title: raw.subject,
    applicantMemberId: raw.applicant_member_id?.member_id,
    applicantName: raw.applicant_member_id?.name ?? '',
    departmentId: raw.department_id?.department_id,
    departmentName: raw.department_id?.dept_name ?? '',
    status: raw.status?.label as PurchaseRequestStatus,
    overallPurpose: raw.overall_purpose ?? '',
    lineItems: (raw.line_items ?? []).map(toLineItem),
    totalExclTax: raw.total_excl_tax,
    totalInclTax: raw.total_incl_tax,
    budgetId: raw.budget_id,
    quotes: (raw.quotes ?? []).map(toQuote),
    selectedVendorId: raw.selected_vendor_id,
    attachmentsQuote: (raw.attachments_quote ?? []).map(toAttachment),
    attachmentsSpec: (raw.attachments_spec ?? []).map(toAttachment),
    attachmentsContract: (raw.attachments_contract ?? []).map(toAttachment),
    approvalSteps: (raw.approval_steps ?? []).map(toApprovalStep),
    poNo: raw.po_no,
    poDate: raw.po_date,
    receipts: (raw.receipts ?? []).map(toReceipt),
    createdAt: raw.inst_ymdhi,
    updatedAt: raw.update_ymdhi,
  }
}

export function toInvoice(raw: any): Invoice {
  return {
    invoiceId: raw.invoice_id,
    invoiceNo: raw.invoice_no,
    purchaseRequestId: raw.purchase_request_id?.topics_id,
    purchaseRequestTitle: raw.purchase_request_id?.subject ?? '',
    vendorId: raw.vendor_id?.vendor_id,
    vendorName: raw.vendor_id?.name ?? '',
    amount: raw.amount,
    receivedDate: raw.received_date,
    matchedStatus: raw.matched_status?.label,
    discrepancyNote: raw.discrepancy_note ?? '',
    fileRef: raw.file?.desc ?? null,
  }
}

export function toAuditLog(raw: any): AuditLog {
  return {
    logId: raw.log_id,
    ts: raw.ts,
    actorMemberId: raw.actor_member_id?.member_id,
    actorName: raw.actor_member_id?.name ?? '',
    actionType: raw.action_type,
    targetType: raw.target_type,
    targetId: raw.target_id,
    detail: raw.detail,
    beforeStatus: raw.before_status,
    afterStatus: raw.after_status,
  }
}

// =====================================================================================
// ここから下: 実API（Kuroco Topics API）用のマッパー・ペイロード変換。
//
// フィールドslugは docs/BACKEND_IDS.md（Admin MCPで実際に作成したコンテンツ定義の対応表）を正とする。
// 旧来 docs/BACKEND_PLAN.md の簡略名（department/status/budget/member等）を参照していた箇所は
// 本ドキュメント作成時に実slug（pr_department/pr_status/pr_budget/staff_member等）へ全て修正済み。
//
// 前提とするレスポンス契約（出典: kuroco-app-builderスキル mock-contract.md、docs/BACKEND_PLAN.md）
//   - 一覧: { errors, messages, list: [...], pageInfo }
//   - 詳細: { errors, messages, details: {...} }
//   - select型:   { key: "選択肢キー", label: "表示ラベル" }
//   - relation型(module="topics"):  { topics_id, subject }  ※確定仕様
//   - relation型(module="member"):  形式未確認。{ member_id, name, ... } 程度を想定した実装。
//     実エンドポイント作成後に実データで要確認・要調整。
//   - json型（line_items/quotes/approval_steps/receipts/steps）: 素の配列/オブジェクトのまま返る
//   - file型: [{ url, desc, ... }, ...]（空スロット含む可能性があるため url がある要素のみ採用）
//
// 実エンドポイントは docs/API_BLOCKER.md の作業がまだ完了していないため、本セクションのコードは
// 「フィールド名は確定済みだが実機で動作確認していない」実装であり、随所に要確認コメントを残している。
// =====================================================================================

function selectLabel(v: any, fallback = ''): string {
  return v?.label ?? fallback
}

function selectKey(v: any, fallback = ''): string {
  return v?.key ?? fallback
}

function relationTopicsId(v: any): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  return v.topics_id ?? null
}

function relationSubject(v: any, fallback = ''): string {
  if (v == null) return fallback
  return v.subject ?? fallback
}

// member relation（申請者・承認者・監査ログ操作者など）: 実エンドポイント未作成のため形式未確認。
// { member_id, name } の他、Kuroco標準のメンバー情報（name1/name2等）が返るケースも吸収する。
function relationMemberId(v: any): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  return v.member_id ?? v.id ?? null
}

function relationMemberName(v: any, fallback = ''): string {
  if (v == null) return fallback
  if (typeof v === 'object') {
    if (v.name) return v.name
    if (v.name1 || v.name2) return `${v.name1 ?? ''}${v.name2 ?? ''}`
  }
  return fallback
}

function apiFiles(v: any): AttachmentFile[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((f) => f && f.url)
    .map((f, i) => ({
      id: f.file_id != null ? String(f.file_id) : `f-${i}`,
      name: f.desc || f.name || `添付ファイル${i + 1}`,
      url: f.url ?? null,
      uploadedAt: f.uploaded_at ?? f.inst_ymdhi ?? '',
    }))
}

// bool型ext項目: true / 1 / "1" のいずれで返っても真として扱う（実データ未確認のため防御的に判定）
function apiBool(v: any): boolean {
  return v === true || v === 1 || v === '1'
}

// ---- ステータス系 select のキー⇔ラベル対応表 ----
// バックエンドのラベル文言をそのまま信頼せず、必ずキー経由でアプリの型（Union）に正規化する
// （例: VendorのステータスラベルはBACKEND_PLAN.md上「取引停止」だが、アプリの型は既存モックに
//  合わせて「停止中」を採用しているため、ラベル文字列の一致に依存すると壊れる）

const PR_STATUS_BY_KEY: Record<string, PurchaseRequestStatus> = {
  draft: '下書き',
  submitted: '申請中',
  in_approval: '承認中',
  returned: '差し戻し',
  rejected: '却下',
  approved: '承認済み',
  ordered: '発注済み',
  partial_received: '一部検収',
  received: '検収完了',
  invoice_checking: '請求書確認中',
  payment_hold: '支払い保留',
  completed: '完了',
}
export const PR_STATUS_TO_KEY: Record<PurchaseRequestStatus, string> = Object.fromEntries(
  Object.entries(PR_STATUS_BY_KEY).map(([k, v]) => [v, k]),
) as Record<PurchaseRequestStatus, string>

const INVOICE_STATUS_BY_KEY: Record<string, InvoiceMatchStatus> = {
  checking: '確認中',
  matched: '一致',
  mismatched: '不一致',
  hold: '支払保留',
  paid: '支払済',
}
export const INVOICE_STATUS_TO_KEY: Record<InvoiceMatchStatus, string> = Object.fromEntries(
  Object.entries(INVOICE_STATUS_BY_KEY).map(([k, v]) => [v, k]),
) as Record<InvoiceMatchStatus, string>

const VENDOR_STATUS_BY_KEY: Record<string, Vendor['status']> = { active: '取引中', inactive: '停止中' }

// ---- 読み取り: 実APIの生レスポンス → アプリ用型 ----

export function fromApiDepartment(raw: any): Department {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: dept_code, description, manager_member(relation→member)。
  // 要確認: 同ドキュメントの実フィールドslug一覧に parent_dept に相当する項目が無い
  // （Departmentは階層を持たない構造で作成されている）。呼び出し元の型に parentDept が残っているため
  // 参照だけは残すが、実データでは常に undefined → null になる想定。
  return {
    departmentId: raw.topics_id,
    deptCode: raw.dept_code ?? '',
    deptName: raw.subject ?? '',
    managerMemberId: relationMemberId(raw.manager_member) as number,
    managerName: relationMemberName(raw.manager_member),
    parentDept: raw.parent_dept ?? null,
    description: raw.description ?? '',
  }
}

export function fromApiBudget(raw: any): Budget {
  // フィールド名は docs/BACKEND_IDS.md で確定済み:
  // budget_department(relation→Department), fiscal_year, budget_amount, used_amount, budget_note, budget_category
  return {
    budgetId: raw.topics_id,
    departmentId: relationTopicsId(raw.budget_department) as number,
    fiscalYear: raw.fiscal_year,
    category: raw.budget_category ?? '',
    budgetAmount: raw.budget_amount,
    usedAmount: raw.used_amount,
    note: raw.budget_note ?? '',
  }
}

export function fromApiVendor(raw: any): Vendor {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: vendor_email, vendor_category(select), vendor_status(select)
  return {
    vendorId: raw.topics_id,
    vendorCode: raw.vendor_code ?? '',
    name: raw.subject ?? '',
    contactPerson: raw.contact_person ?? '',
    email: raw.vendor_email ?? '',
    phone: raw.phone ?? '',
    address: raw.address ?? '',
    bankInfo: raw.bank_info ?? '',
    paymentTerms: raw.payment_terms ?? '',
    category: selectLabel(raw.vendor_category),
    status: VENDOR_STATUS_BY_KEY[selectKey(raw.vendor_status)] ?? '取引中',
  }
}

export function fromApiApprovalRule(raw: any): ApprovalRule {
  return {
    ruleId: raw.topics_id,
    ruleName: raw.subject ?? '',
    minAmount: raw.min_amount,
    maxAmount: raw.max_amount,
    requiresItReview: apiBool(raw.requires_it_review),
    steps: raw.steps ?? [],
    active: apiBool(raw.active_flag),
  }
}

// StaffProfile（topics_group_id=8）: フィールド名は docs/BACKEND_IDS.md で確定済み:
// staff_member(relation→member) / staff_department(relation→Department) / position(text)。
// email に相当する独立フィールドはStaffProfile自身には無いため、relation展開されたmember情報
// （memberRel.email）からのみ取得する。
// 要確認: ロールはStaffProfile自身ではなく紐づくmemberの会員グループに由来する想定だが、
// relation(module=member)で会員グループ(group)まで展開されて返るかは実データ未確認。
// 展開されない場合は常にフォールバック値「申請者」になる。
export function fromApiStaffProfile(raw: any): Member {
  const memberRel = raw.staff_member ?? null
  return {
    memberId: relationMemberId(memberRel) ?? raw.topics_id,
    name: relationMemberName(memberRel),
    email: memberRel?.email ?? '',
    role: (memberRel?.group?.label ?? '申請者') as Role,
    departmentId: relationTopicsId(raw.staff_department) as number,
    position: raw.position ?? '',
  }
}

export function fromApiPurchaseRequest(raw: any): PurchaseRequest {
  const year = String(raw.inst_ymdhi ?? '').slice(0, 4) || String(new Date().getFullYear())
  return {
    requestId: raw.topics_id,
    // 要確認: BACKEND_PLAN.mdのPurchaseRequest定義に独立した申請番号フィールドは無いため、
    // topics_id と作成年から擬似的に採番する（モックの採番規則 "PR-YYYY-NNNN" を踏襲）。
    requestNo: raw.request_no ?? `PR-${year}-${String(raw.topics_id).padStart(4, '0')}`,
    title: raw.subject ?? '',
    applicantMemberId: relationMemberId(raw.applicant) as number,
    applicantName: relationMemberName(raw.applicant),
    departmentId: relationTopicsId(raw.pr_department) as number,
    departmentName: relationSubject(raw.pr_department),
    status: PR_STATUS_BY_KEY[selectKey(raw.pr_status)] ?? (selectLabel(raw.pr_status) as PurchaseRequestStatus),
    overallPurpose: raw.overall_purpose ?? '',
    lineItems: (raw.line_items ?? []).map(toLineItem),
    totalExclTax: raw.total_excl_tax,
    totalInclTax: raw.total_incl_tax,
    budgetId: relationTopicsId(raw.pr_budget),
    quotes: (raw.quotes ?? []).map(toQuote),
    selectedVendorId: relationTopicsId(raw.selected_vendor),
    attachmentsQuote: apiFiles(raw.attachment_quotes),
    attachmentsSpec: apiFiles(raw.attachment_specs),
    attachmentsContract: apiFiles(raw.attachment_contracts),
    approvalSteps: (raw.approval_steps ?? []).map(toApprovalStep),
    poNo: raw.po_no ?? null,
    poDate: raw.po_date ?? null,
    receipts: (raw.receipts ?? []).map(toReceipt),
    createdAt: raw.inst_ymdhi,
    updatedAt: raw.update_ymdhi,
  }
}

export function fromApiInvoice(raw: any): Invoice {
  // フィールド名は docs/BACKEND_IDS.md で確定済み:
  // inv_purchase_request(relation→PurchaseRequest), inv_vendor(relation→Vendor), inv_amount, invoice_file
  return {
    invoiceId: raw.topics_id,
    invoiceNo: raw.subject ?? '',
    purchaseRequestId: relationTopicsId(raw.inv_purchase_request) as number,
    purchaseRequestTitle: relationSubject(raw.inv_purchase_request),
    vendorId: relationTopicsId(raw.inv_vendor) as number,
    vendorName: relationSubject(raw.inv_vendor),
    amount: raw.inv_amount,
    receivedDate: raw.received_date,
    matchedStatus: INVOICE_STATUS_BY_KEY[selectKey(raw.matched_status)] ?? (selectLabel(raw.matched_status) as InvoiceMatchStatus),
    discrepancyNote: raw.discrepancy_note ?? '',
    fileRef: apiFiles(raw.invoice_file)[0]?.name ?? null,
  }
}

export function fromApiAuditLog(raw: any): AuditLog {
  return {
    logId: raw.topics_id,
    ts: raw.inst_ymdhi,
    actorMemberId: relationMemberId(raw.actor) as number,
    actorName: relationMemberName(raw.actor),
    // 要確認: AuditLog.action_type の選択肢（作成/更新/ステータス変更/承認/却下/差し戻し/ログインの7種、
    // BACKEND_PLAN.md参照）は、モック側で使っている操作ラベル（申請/発注/検収登録/請求書登録/
    // 金額不一致検出/支払確定/見積選定/一致確定など14種）を網羅していない。select型のままだと
    // insert/updateで許容外の値として弾かれる可能性が高く、バックエンド側でtext型へ変更するか
    // 選択肢を追加する対応が別途必要（フロント側だけでは解決できない既知の不整合）。
    actionType: selectLabel(raw.action_type, raw.action_type),
    targetType: raw.target_type ?? '',
    targetId: raw.target_id,
    // フィールド名は docs/BACKEND_IDS.md で確定済み: detail ではなく log_detail
    detail: raw.log_detail ?? '',
    beforeStatus: raw.before_status ?? null,
    afterStatus: raw.after_status ?? null,
  }
}

// ---- 書き込み: アプリ用の入力 → 実APIへ送るペイロード ----

export function vendorInputToApiPayload(input: VendorInput): Record<string, unknown> {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: vendor_email, vendor_category(select)
  return {
    subject: input.name,
    vendor_code: input.vendorCode,
    contact_person: input.contactPerson,
    vendor_email: input.email,
    phone: input.phone,
    address: input.address,
    bank_info: input.bankInfo,
    payment_terms: input.paymentTerms,
    // select型: insert/update時はkey文字列を渡す想定（未検証）。vendor_categoryのkey一覧はBACKEND_PLAN.md参照。
    vendor_category: input.category,
  }
}

export function vendorCreateApiPayload(input: VendorInput): Record<string, unknown> {
  return { ...vendorInputToApiPayload(input), vendor_status: 'active' }
}

export function vendorStatusApiPayload(active: boolean): Record<string, unknown> {
  return { vendor_status: active ? 'active' : 'inactive' }
}

export function departmentUpdateApiPayload(input: DepartmentInput): Record<string, unknown> {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: manager_member（manager_member_idではない）
  return {
    subject: input.deptName,
    description: input.description,
    manager_member: input.managerMemberId,
  }
}

// フィールド名は docs/BACKEND_IDS.md で確定済み: budget_department, budget_note, budget_category
export function budgetCreateApiPayload(departmentId: number, subject: string, input: BudgetInput): Record<string, unknown> {
  return {
    subject,
    budget_department: departmentId,
    fiscal_year: input.fiscalYear,
    budget_amount: input.budgetAmount,
    used_amount: input.usedAmount,
    budget_note: input.note,
    budget_category: input.category,
  }
}

export function budgetUpdateApiPayload(input: BudgetInput): Record<string, unknown> {
  return {
    fiscal_year: input.fiscalYear,
    budget_amount: input.budgetAmount,
    used_amount: input.usedAmount,
    budget_note: input.note,
    budget_category: input.category,
  }
}

export function approvalRuleCreateApiPayload(input: ApprovalRuleInput): Record<string, unknown> {
  return {
    subject: input.ruleName,
    min_amount: input.minAmount,
    max_amount: input.maxAmount,
    requires_it_review: input.requiresItReview,
    steps: input.steps,
    active_flag: true,
  }
}

export function approvalRuleUpdateApiPayload(input: ApprovalRuleInput): Record<string, unknown> {
  return {
    subject: input.ruleName,
    min_amount: input.minAmount,
    max_amount: input.maxAmount,
    requires_it_review: input.requiresItReview,
    steps: input.steps,
  }
}

export function approvalRuleActiveApiPayload(active: boolean): Record<string, unknown> {
  return { active_flag: active }
}

interface LineItemInputShape {
  name: string
  category: string
  qty: number
  unitPrice: number
  taxRate: number
  purpose: string
  desiredDate: string
}

function lineItemsToApiJson(items: LineItemInputShape[]) {
  return items.map((li) => ({
    name: li.name,
    category: li.category,
    qty: li.qty,
    unit_price: li.unitPrice,
    tax_rate: li.taxRate,
    purpose: li.purpose,
    desired_date: li.desiredDate,
  }))
}

// 金額・IT明細有無から承認ライン(JSON)を組み立てる。client.ts の buildApprovalSteps（モック用、
// メンバーの生レコード配列を受け取る）と等価だが、実APIブランチでは既にマッピング済みの Member[]
// （listMembers経由）を使うため別実装にしている。ロール解決はグローバルな該当ロール保持者から1名を
// 拾うのみで部署は見ない（モックと同じ簡易ロジック）。
export function buildApiApprovalSteps(members: Member[], amount: number, hasItCategory: boolean) {
  const roles: ApprovalRole[] = []
  if (amount < 100000) roles.push('部門長')
  else if (amount < 1000000) roles.push('部門長', '購買担当')
  else roles.push('部門長', '購買担当', '管理者')
  if (hasItCategory && !roles.includes('IT担当')) {
    const idx = roles.indexOf('部門長')
    roles.splice(idx + 1, 0, 'IT担当')
  }
  return roles.map((role, i) => {
    const approver = members.find((m) => m.role === role)
    return {
      order: i + 1,
      role,
      approver_member_id: approver?.memberId ?? null,
      approver_name: approver?.name ?? null,
      status: i === 0 ? '承認待ち' : '待機',
      acted_at: null,
      comment: null,
    }
  })
}

interface PurchaseRequestCreateInputShape {
  title: string
  overallPurpose: string
  applicantMemberId: number
  departmentId: number
  budgetId: number | null
  lineItems: LineItemInputShape[]
  asDraft: boolean
}

export function purchaseRequestCreateApiPayload(
  input: PurchaseRequestCreateInputShape,
  totals: { totalExclTax: number; totalInclTax: number },
  approvalSteps: unknown[],
): Record<string, unknown> {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: pr_department, pr_status(select), pr_budget
  return {
    subject: input.title,
    applicant: input.applicantMemberId, // relation(module=member): topics_idではなくmember_idを渡す想定（未検証）
    pr_department: input.departmentId,
    pr_status: input.asDraft ? 'draft' : 'submitted',
    overall_purpose: input.overallPurpose,
    line_items: lineItemsToApiJson(input.lineItems),
    total_excl_tax: totals.totalExclTax,
    total_incl_tax: totals.totalInclTax,
    pr_budget: input.budgetId,
    quotes: [],
    selected_vendor: null,
    approval_steps: approvalSteps,
    po_no: null,
    po_date: null,
    receipts: [],
  }
}

// ---- 購買申請アクション: 現在の生レコード(details取得結果)を直接操作してpatchを組み立てる ----
// モック実装(client.ts側)と同じデータ形状を前提とした独立実装。モック分岐へは一切手を加えない方針の
// ため、ロジックが重複している箇所がある（意図的）。

export function computeSubmitPatch(raw: any, members: Member[]): Record<string, unknown> {
  const hasIt = (raw.line_items ?? []).some((li: any) => li.category === 'IT機器')
  return {
    pr_status: 'submitted',
    approval_steps: buildApiApprovalSteps(members, raw.total_incl_tax, hasIt),
  }
}

export function computeApprovalActionPatch(
  raw: any,
  action: '承認' | '差し戻し' | '却下',
  actorId: number,
  actorName: string,
  comment: string,
): { patch: Record<string, unknown>; afterLabel: PurchaseRequestStatus } | null {
  const steps: any[] = Array.isArray(raw.approval_steps) ? structuredClone(raw.approval_steps) : []
  const current = steps.find((s) => s.status === '承認待ち')
  if (!current) return null
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')
  current.acted_at = nowStr
  current.comment = comment || null
  current.approver_member_id = actorId
  current.approver_name = actorName

  let statusKey: string
  if (action === '承認') {
    current.status = '承認'
    const next = steps.find((s) => s.order === current.order + 1)
    if (next) {
      next.status = '承認待ち'
      statusKey = 'in_approval'
    } else {
      statusKey = 'approved'
    }
  } else if (action === '差し戻し') {
    current.status = '差し戻し'
    statusKey = 'returned'
  } else {
    current.status = '却下'
    statusKey = 'rejected'
  }
  return { patch: { approval_steps: steps, pr_status: statusKey }, afterLabel: PR_STATUS_BY_KEY[statusKey] }
}

export function computeSelectQuotePatch(raw: any, vendorId: number): Record<string, unknown> {
  const quotes = (raw.quotes ?? []).map((q: any) => ({ ...q, selected: q.vendor_id === vendorId }))
  return { quotes, selected_vendor: vendorId }
}

export function computePlaceOrderPatch(poNo: string): Record<string, unknown> {
  return { po_no: poNo, po_date: new Date().toISOString().slice(0, 10), pr_status: 'ordered' }
}

interface ReceiptInputShape {
  date: string
  itemName: string
  qtyReceived: number
  receiverMemberId: number
  receiverName: string
  note: string
}

export function computeReceiptPatch(raw: any, receipts: ReceiptInputShape[]): Record<string, unknown> {
  const merged = [
    ...(raw.receipts ?? []),
    ...receipts.map((r) => ({
      date: r.date,
      item_name: r.itemName,
      qty_received: r.qtyReceived,
      receiver_member_id: r.receiverMemberId,
      receiver_name: r.receiverName,
      note: r.note,
    })),
  ]
  const totalOrderedQty = (raw.line_items ?? []).reduce((s: number, li: any) => s + li.qty, 0)
  const receivedByName: Record<string, number> = {}
  merged.forEach((r: any) => (receivedByName[r.item_name] = (receivedByName[r.item_name] ?? 0) + r.qty_received))
  const totalReceivedQty = Object.values(receivedByName).reduce((s, v) => s + v, 0)
  const statusKey = totalReceivedQty >= totalOrderedQty ? 'received' : 'partial_received'
  return { receipts: merged, pr_status: statusKey }
}

// フィールド名は docs/BACKEND_IDS.md で確定済み: inv_purchase_request, inv_vendor, inv_amount
export function invoiceCreateApiPayload(requestRaw: any, amount: number): Record<string, unknown> {
  const matched = amount === requestRaw.total_incl_tax
  return {
    // 採番方式は仮実装（要確認）。実エンドポイント側で自動採番される場合は上書きされる想定。
    subject: `INV-${new Date().getFullYear()}-${String(requestRaw.topics_id).padStart(4, '0')}`,
    inv_purchase_request: requestRaw.topics_id,
    inv_vendor: relationTopicsId(requestRaw.selected_vendor),
    inv_amount: amount,
    received_date: new Date().toISOString().slice(0, 10),
    matched_status: matched ? 'matched' : 'mismatched',
    discrepancy_note: matched ? '' : `発注金額${requestRaw.total_incl_tax}円に対し請求額${amount}円`,
  }
}

export function invoiceStatusApiPayload(status: InvoiceMatchStatus, note: string): Record<string, unknown> {
  return { matched_status: INVOICE_STATUS_TO_KEY[status], discrepancy_note: note }
}

// AuditLogコンテンツ定義のaction_type(select)は作成時に7選択肢
// (作成/更新/ステータス変更/承認/却下/差し戻し/ログイン)で固定済みで、Kurocoの仕様上
// 後から選択肢を追加できない（topics_group-updateは既存スラッグの上書き不可）。
// アプリ側で使う詳細な操作種別（下書き保存・申請・見積選定・発注・検収登録・請求書登録・
// 金額不一致検出・差異解消・一致確定・支払確定 等）はこの7種の粗いカテゴリにマッピングし、
// 具体的な操作内容は自由記述の detail(log_detail) 側にそのまま残す。
const ACTION_TYPE_TO_API_KEY: Record<string, string> = {
  作成: 'create',
  更新: 'update',
  ステータス変更: 'status_change',
  承認: 'approve',
  却下: 'reject',
  差し戻し: 'return',
  ログイン: 'login',
  下書き保存: 'update',
  申請: 'status_change',
  見積選定: 'update',
  発注: 'status_change',
  検収登録: 'status_change',
  請求書登録: 'create',
  金額不一致検出: 'status_change',
  差異解消: 'status_change',
  一致確定: 'status_change',
  支払確定: 'status_change',
}

// 実API用の監査ログ記録ペイロード。pushAuditLog（モックDB用、client.ts）とは別経路。
export function auditLogInsertApiPayload(
  actorId: number,
  actionType: string,
  targetId: number,
  detail: string,
  before: string | null,
  after: string | null,
  targetType: string,
): Record<string, unknown> {
  // フィールド名は docs/BACKEND_IDS.md で確定済み: detail ではなく log_detail
  return {
    subject: detail || `${targetType} ${targetId} ${actionType}`,
    actor: actorId, // relation(module=member): member_idをそのまま渡す想定（未検証）
    action_type: ACTION_TYPE_TO_API_KEY[actionType] ?? 'update',
    target_type: targetType,
    target_id: targetId,
    log_detail: `[${actionType}] ${detail}`,
    before_status: before,
    after_status: after,
  }
}
