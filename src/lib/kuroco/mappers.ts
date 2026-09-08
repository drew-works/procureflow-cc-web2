// 生レスポンス → アプリ用型の変換。拡張項目のキー名の差異はすべてここに閉じ込める。
import type {
  ApprovalRule,
  ApprovalStep,
  ApprovalStepStatus,
  AttachmentFile,
  AuditLog,
  Budget,
  Department,
  Invoice,
  LineItem,
  Member,
  PurchaseRequest,
  PurchaseRequestStatus,
  Quote,
  Receipt,
  Role,
  Vendor,
} from './types'

export function toDepartment(raw: any): Department {
  return {
    departmentId: raw.department_id,
    deptCode: raw.dept_code,
    deptName: raw.dept_name,
    managerMemberId: raw.manager_member_id?.member_id ?? null,
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
