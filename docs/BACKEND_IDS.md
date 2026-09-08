# Kuroco 実データ ID対応表（procureflow-cc-web2）

Admin MCP (client_credentials, mcp:admin) で構築済み。生の対応関係は `docs/seed_state.json` を参照。

## コンテンツ定義（TopicsGroup）

| topics_group_id | 名前 | 内容 | 実フィールドslug（subject=名前/件名は共通） |
|---|---|---|---|
| 1 | Department | 部署マスター（nuxt-auth-templateのid=1を流用・改修） | dept_code, description, manager_member(relation→member) |
| 7 | Vendor | 取引先マスター | vendor_code, contact_person, vendor_email, phone, address, bank_info, payment_terms, vendor_category(select), vendor_status(select) |
| 8 | StaffProfile | 社員プロファイル（会員⇔部署の紐付け） | staff_member(relation→member), staff_department(relation→Department), position |
| 9 | Budget | 部署別予算マスター | budget_department(relation→Department), fiscal_year, budget_amount, used_amount, budget_note, budget_category |
| 10 | ApprovalRule | 承認ルール | min_amount, max_amount, requires_it_review(bool), steps(json), active_flag(bool) |
| 11 | PurchaseRequest | 購買申請（本体） | applicant(relation→member), pr_department(relation→Department), pr_status(select), overall_purpose, line_items(json), total_excl_tax, total_incl_tax, pr_budget(relation→Budget), quotes(json), selected_vendor(relation→Vendor), attachment_quotes/attachment_specs/attachment_contracts(file×5), approval_steps(json), po_no, po_date, receipts(json) |
| 12 | Invoice | 請求書照合 | inv_purchase_request(relation→PurchaseRequest), inv_vendor(relation→Vendor), inv_amount, received_date, matched_status(select), discrepancy_note, invoice_file |
| 13 | AuditLog | 監査ログ | actor(relation→member), action_type(select・7値: create/update/status_change/approve/reject/return/login), target_type, target_id, log_detail, before_status, after_status |

**注意**: `docs/BACKEND_PLAN.md` の設計時JSON例では簡略名（department/status/budget等）を使っているが、
実際にAdmin MCPで作成したフィールドは上表の通り接頭辞付き（pr_department/pr_status/pr_budget等、
vendor_email/vendor_category/vendor_status等）。**実装・API呼び出しは必ずこの表のslugに従うこと。**
AuditLog.action_typeは選択肢を後から追加できない仕様のため7値固定。アプリ側のより詳細な操作種別
（下書き保存・申請・見積選定等）はこの7値にマッピングしてdetail(log_detail)に原文を残す
（`src/lib/kuroco/mappers.ts` の `ACTION_TYPE_TO_API_KEY` 参照）。

topics_group_id=1は`nuxt-auth-template`由来の遺留フィールド(ext_1〜ext_9: Type/File/Link/Position image/
Image/Textarea/MainImage/Subtitle text)が残存する（`topics_group-update`は既存フィールドを削除しない仕様
のため）。フロントでは参照せず未使用のまま許容している。

## 会員グループ（Role）

| group_id | 名前 |
|---|---|
| 105 | 申請者 |
| 106 | 部門長 |
| 107 | IT担当 |
| 108 | 購買担当 |
| 109 | 経理担当 |
| 110 | 管理者 |

## 会員（サンプル14名）

全員 login_pwd: `ProcureFlow2026!`、login_idは `{email prefix}{mock_id}`（例: tanaka1, sato2 ...）。
実member_idは `docs/seed_state.json` の `members` を参照（mock_id 1-14 → 実id 4-17）。

## サンプルデータ件数

- Department: 6 / Vendor: 5 / Budget: 6 / ApprovalRule: 3 / StaffProfile: 14
- PurchaseRequest: 12（12ステータス各1件以上。新入社員8名PC・モニター申請=topics_id 38、合計税込1,248,000円、
  見積2社(OA機器商事/テックサプライ)添付済み・部門長承認待ち状態）
- Invoice: 3 / AuditLog: 10

## 既知の不具合（Admin MCP側）

- `topics-update` を `ids`(複数)+`set` で呼ぶ一括更新は、成功レスポンス（`completed: N`）を返すにも
  かかわらず実際にはレコードに反映されない（読み戻しで確認）。単発の `topics_id` 指定更新は正常に動作する。
  本構築では全ての公開状態(open_type)設定を単発更新に置き換えて対処済み。
- `api-upsert` / `api_uri-upsert` / `api-list` / `api-export_openapi` / `api_uri-list` が軒並み
  `{"errors":[],"messages":[]}` の空成功を返すのみで、実際には何も作成・一覧取得できない
  （存在しないID・架空IDへの操作でも同一の空成功が返る。作成試行後にHTTPで直接プローブしても404で
  存在しないことを確認済み）。→ 詳細は `docs/API_BLOCKER.md`
