export const auditLogRaw = [
  { log_id: 1, ts: '2026-09-02 09:15:00', actor_member_id: { member_id: 6, name: '伊藤沙耶' }, action_type: '申請', target_type: 'PurchaseRequest', target_id: 2, detail: '新入社員8名分PC・モニター購入を申請', before_status: '下書き', after_status: '申請中' },
  { log_id: 2, ts: '2026-08-20 11:00:00', actor_member_id: { member_id: 11, name: '加藤隆' }, action_type: '承認', target_type: 'PurchaseRequest', target_id: 3, detail: '一次承認(部門長)', before_status: '申請中', after_status: '承認中' },
  { log_id: 3, ts: '2026-08-15 15:20:00', actor_member_id: { member_id: 1, name: '田中一郎' }, action_type: '差し戻し', target_type: 'PurchaseRequest', target_id: 4, detail: '型番と色を再確認のうえ再申請してください', before_status: '申請中', after_status: '差し戻し' },
  { log_id: 4, ts: '2026-08-07 16:00:00', actor_member_id: { member_id: 3, name: '神田正人' }, action_type: '却下', target_type: 'PurchaseRequest', target_id: 5, detail: '今期予算超過のため却下', before_status: '承認中', after_status: '却下' },
  { log_id: 5, ts: '2026-08-14 15:00:00', actor_member_id: { member_id: 3, name: '神田正人' }, action_type: '承認', target_type: 'PurchaseRequest', target_id: 6, detail: '最終承認', before_status: '承認中', after_status: '承認済み' },
  { log_id: 6, ts: '2026-08-27 09:00:00', actor_member_id: { member_id: 8, name: '小林正一' }, action_type: '発注', target_type: 'PurchaseRequest', target_id: 7, detail: '発注書PO-2026-0031を発行', before_status: '承認済み', after_status: '発注済み' },
  { log_id: 7, ts: '2026-09-08 10:00:00', actor_member_id: { member_id: 2, name: '佐藤花子' }, action_type: '検収登録', target_type: 'PurchaseRequest', target_id: 8, detail: 'オフィスチェア10脚を検収登録', before_status: '発注済み', after_status: '一部検収' },
  { log_id: 8, ts: '2026-08-18 15:00:00', actor_member_id: { member_id: 14, name: '木村健二' }, action_type: '検収登録', target_type: 'PurchaseRequest', target_id: 9, detail: 'ノートPC3台を全数検収登録', before_status: '発注済み', after_status: '検収完了' },
  { log_id: 9, ts: '2026-08-12 09:00:00', actor_member_id: { member_id: 10, name: '中村由美' }, action_type: '請求書登録', target_type: 'PurchaseRequest', target_id: 10, detail: '請求書INV-2026-0501を登録', before_status: '検収完了', after_status: '請求書確認中' },
  { log_id: 10, ts: '2026-08-05 11:00:00', actor_member_id: { member_id: 10, name: '中村由美' }, action_type: '金額不一致検出', target_type: 'PurchaseRequest', target_id: 11, detail: '請求金額が発注金額と一致しないため支払保留', before_status: '請求書確認中', after_status: '支払い保留' },
  { log_id: 11, ts: '2026-07-15 17:00:00', actor_member_id: { member_id: 10, name: '中村由美' }, action_type: '支払確定', target_type: 'PurchaseRequest', target_id: 12, detail: '支払を確定し完了', before_status: '請求書確認中', after_status: '完了' },
]

export const auditLogList = {
  errors: [],
  messages: [],
  list: auditLogRaw,
  pageInfo: { totalCnt: auditLogRaw.length, perPage: 50, totalPageCnt: 1, pageNo: 1 },
}
