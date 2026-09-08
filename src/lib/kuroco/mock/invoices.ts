export const invoiceRaw = [
  {
    invoice_id: 1,
    invoice_no: 'INV-2026-0501',
    purchase_request_id: { topics_id: 10, subject: 'プリンタートナー一式' },
    vendor_id: { vendor_id: 4, name: '山田文具株式会社' },
    amount: 45000,
    received_date: '2026-08-10',
    matched_status: { key: 'checking', label: '確認中' },
    discrepancy_note: '',
    file: { id: 'f-inv1', url: null, desc: '請求書_山田文具_0810.pdf' },
  },
  {
    invoice_id: 2,
    invoice_no: 'INV-2026-0442',
    purchase_request_id: { topics_id: 11, subject: 'ソフトウェアライセンス更新' },
    vendor_id: { vendor_id: 2, name: 'テックサプライ株式会社' },
    amount: 1150000,
    received_date: '2026-08-02',
    matched_status: { key: 'mismatch', label: '不一致' },
    discrepancy_note: '発注金額1,100,000円に対し請求額1,150,000円。ベンダーへ差異確認中',
    file: { id: 'f-inv2', url: null, desc: '請求書_テックサプライ_0802.pdf' },
  },
  {
    invoice_id: 3,
    invoice_no: 'INV-2026-0301',
    purchase_request_id: { topics_id: 12, subject: '名刺作成(経理部)' },
    vendor_id: { vendor_id: 5, name: '三田印刷株式会社' },
    amount: 9900,
    received_date: '2026-07-10',
    matched_status: { key: 'paid', label: '支払済' },
    discrepancy_note: '',
    file: { id: 'f-inv3', url: null, desc: '請求書_三田印刷_0710.pdf' },
  },
]

export const invoiceList = {
  errors: [],
  messages: [],
  list: invoiceRaw,
  pageInfo: { totalCnt: invoiceRaw.length, perPage: 50, totalPageCnt: 1, pageNo: 1 },
}
