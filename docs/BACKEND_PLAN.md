# Kuroco バックエンド構築計画（Admin MCP接続後にそのまま実行する）

`docs/DESIGN.md` のデータモデルを `topics_group-create` 用JSONに落としたもの。
接続確立後は「① whoami確認 → ② ここに列挙した順で作成 → ③ topics_group-getで読み戻し検証 →
④ カテゴリ/会員グループ作成 → ⑤ サンプルデータ投入 → ⑥ API作成 → ⑦ デプロイ」の順で進める。
ツール名・inputSchemaは`tools/list`で必ず実物を確認してから呼ぶ（本書は設計メモであり実行前の
最終確認を省略しない）。件名(タイトル)は標準の`subject`フィールドを流用し、拡張項目を圧縮する。

## 事前確認（whoami）
- `site.site_key` が `procureflow-cc-web2` であること
- `permissions.connection.scope` が `mcp:tools.all` 以上であること（未満ならエンドポイント作成で失敗するため着手しない）
- `site.copy_from_site_key` を確認し、0-7の棚卸し（既存API/コンテンツ定義の流用可否）を先に行う
- `site.limits` (`topics_max_extension` 等) と `site.topics_ext_features.can_import_structured_json` を確認
- `site.topics_ext_key_format` を確認（`ext_slug`を全項目に設定するため実運用では影響小だが記録する）

## 1. Department（部署）
```json
{
  "name": "Department",
  "description": "部署マスター",
  "fields": [
    { "ext_title": "部署コード", "ext_type": 0, "type": "text", "ext_slug": "dept_code", "required": true, "searchable": true, "max_length": 20 },
    { "ext_title": "説明", "ext_type": 1, "type": "textarea", "ext_slug": "description" }
  ]
}
```
subject = 部署名。サンプル: 総務部/情報システム部/購買部/経理部/営業部/開発部

## 2. Vendor（取引先）
```json
{
  "name": "Vendor",
  "description": "取引先マスター",
  "fields": [
    { "ext_title": "取引先コード", "ext_type": 0, "type": "text", "ext_slug": "vendor_code", "searchable": true, "max_length": 20 },
    { "ext_title": "担当者名", "ext_type": 0, "type": "text", "ext_slug": "contact_person" },
    { "ext_title": "メールアドレス", "ext_type": 0, "type": "text", "ext_slug": "email", "type_limitation": "email" },
    { "ext_title": "電話番号", "ext_type": 0, "type": "text", "ext_slug": "phone", "type_limitation": "tel" },
    { "ext_title": "住所", "ext_type": 0, "type": "text", "ext_slug": "address", "max_length": 255 },
    { "ext_title": "銀行口座情報", "ext_type": 1, "type": "textarea", "ext_slug": "bank_info" },
    { "ext_title": "支払条件", "ext_type": 0, "type": "text", "ext_slug": "payment_terms" },
    { "ext_title": "取扱カテゴリ", "ext_type": 2, "type": "select", "ext_slug": "category", "searchable": true,
      "options": [{"key":"it","val":"IT機器"},{"key":"oa","val":"OA機器"},{"key":"office","val":"事務用品"},{"key":"service","val":"サービス"},{"key":"other","val":"その他"}] },
    { "ext_title": "ステータス", "ext_type": 2, "type": "select", "ext_slug": "status", "searchable": true,
      "options": [{"key":"active","val":"取引中","default":true},{"key":"inactive","val":"取引停止"}] }
  ]
}
```
subject = 会社名

## 3. Budget（予算）
```json
{
  "name": "Budget",
  "description": "部署別予算マスター",
  "fields": [
    { "ext_title": "部署", "ext_type": 20, "type": "relation", "ext_slug": "department", "module": "topics", "group_id": "<DepartmentのtopicsGroupID>", "required": true },
    { "ext_title": "年度", "ext_type": 35, "type": "number", "ext_slug": "fiscal_year", "number_type": "integer", "searchable": true },
    { "ext_title": "予算枠", "ext_type": 35, "type": "number", "ext_slug": "budget_amount", "min": 0 },
    { "ext_title": "使用済み額", "ext_type": 35, "type": "number", "ext_slug": "used_amount", "min": 0 },
    { "ext_title": "備考", "ext_type": 1, "type": "textarea", "ext_slug": "note" }
  ]
}
```
subject = 例「情報システム部 2026年度予算」。`group_id`はDepartment作成後のIDに差し替える。

## 4. ApprovalRule（承認ルール）
```json
{
  "name": "ApprovalRule",
  "description": "金額区分ごとの承認ライン設定",
  "fields": [
    { "ext_title": "下限金額", "ext_type": 35, "type": "number", "ext_slug": "min_amount", "min": 0 },
    { "ext_title": "上限金額", "ext_type": 35, "type": "number", "ext_slug": "max_amount", "min": 0 },
    { "ext_title": "IT審査要否", "ext_type": 36, "type": "bool", "ext_slug": "requires_it_review", "default_value": "false" },
    { "ext_title": "承認ステップ定義(JSON)", "ext_type": 28, "type": "json", "ext_slug": "steps" },
    { "ext_title": "有効フラグ", "ext_type": 36, "type": "bool", "ext_slug": "active_flag", "default_value": "true" }
  ]
}
```
subject = ルール名。`steps`の値の形: `[{"order":1,"role":"部門長"},{"order":2,"role":"購買担当"}]`
サンプル3件: 「10万円未満」(0-99999, 部門長のみ) / 「10万円以上100万円未満」(100000-999999, 部門長→購買担当)
/ 「100万円以上」(1000000-999999999, 部門長→購買担当→管理者)。ITカテゴリ明細を含む申請は
requires_it_review=trueのルールでIT担当ステップを追加（別ルール行 or フロント側でIT担当ステップを注入。
実装簡略化のため「ITカテゴリ明細を含む場合はIT担当ステップを申請時に自動追加」はフロント側ロジックとする）。

## 5. PurchaseRequest（購買申請）※本体
```json
{
  "name": "PurchaseRequest",
  "description": "購買申請",
  "fields": [
    { "ext_title": "申請者", "ext_type": 20, "type": "relation", "ext_slug": "applicant", "module": "member", "required": true },
    { "ext_title": "部署", "ext_type": 20, "type": "relation", "ext_slug": "department", "module": "topics", "group_id": "<DepartmentID>", "required": true, "searchable": true },
    { "ext_title": "ステータス", "ext_type": 2, "type": "select", "ext_slug": "status", "required": true, "searchable": true,
      "options": [
        {"key":"draft","val":"下書き","default":true},{"key":"submitted","val":"申請中"},
        {"key":"in_approval","val":"承認中"},{"key":"returned","val":"差し戻し"},
        {"key":"rejected","val":"却下"},{"key":"approved","val":"承認済み"},
        {"key":"ordered","val":"発注済み"},{"key":"partial_received","val":"一部検収"},
        {"key":"received","val":"検収完了"},{"key":"invoice_checking","val":"請求書確認中"},
        {"key":"payment_hold","val":"支払い保留"},{"key":"completed","val":"完了"}
      ] },
    { "ext_title": "利用目的(全体)", "ext_type": 1, "type": "textarea", "ext_slug": "overall_purpose" },
    { "ext_title": "明細(JSON)", "ext_type": 28, "type": "json", "ext_slug": "line_items", "required": true },
    { "ext_title": "合計金額(税抜)", "ext_type": 35, "type": "number", "ext_slug": "total_excl_tax", "searchable": true },
    { "ext_title": "合計金額(税込)", "ext_type": 35, "type": "number", "ext_slug": "total_incl_tax", "required": true, "searchable": true },
    { "ext_title": "予算", "ext_type": 20, "type": "relation", "ext_slug": "budget", "module": "topics", "group_id": "<BudgetID>" },
    { "ext_title": "見積(JSON)", "ext_type": 28, "type": "json", "ext_slug": "quotes" },
    { "ext_title": "選定取引先", "ext_type": 20, "type": "relation", "ext_slug": "selected_vendor", "module": "topics", "group_id": "<VendorID>" },
    { "ext_title": "見積書添付", "ext_type": 9, "type": "file", "ext_slug": "attachment_quotes", "repetitions": 5, "file_type": ["pdf","xlsx","docx","jpg","png"] },
    { "ext_title": "仕様書添付", "ext_type": 9, "type": "file", "ext_slug": "attachment_specs", "repetitions": 5, "file_type": ["pdf","xlsx","docx","jpg","png"] },
    { "ext_title": "契約書添付", "ext_type": 9, "type": "file", "ext_slug": "attachment_contracts", "repetitions": 5, "file_type": ["pdf","xlsx","docx","jpg","png"] },
    { "ext_title": "承認ライン(JSON)", "ext_type": 28, "type": "json", "ext_slug": "approval_steps" },
    { "ext_title": "発注番号", "ext_type": 0, "type": "text", "ext_slug": "po_no" },
    { "ext_title": "発注日", "ext_type": 8, "type": "date", "ext_slug": "po_date" },
    { "ext_title": "検収記録(JSON)", "ext_type": 28, "type": "json", "ext_slug": "receipts" }
  ]
}
```
subject = 件名（例「新入社員8名分PC・モニター購入」）。`group_id`はDepartment/Budget/Vendor作成後のID。

`line_items`の値の形: `[{"name":"ノートPC","category":"IT機器","qty":8,"unit_price":122727,"tax_rate":10,"purpose":"新入社員用PC","desired_date":"2026-10-01"}, ...]`
`quotes`の値の形: `[{"vendor_id":<Vendorのtopics_id>,"vendor_name":"OA機器商事株式会社","amount":1248000,"note":"","selected":true}, ...]`
`approval_steps`の値の形: `[{"order":1,"role":"部門長","approver_member_id":<member_id>,"approver_name":"...","status":"pending","acted_at":null,"comment":""}, ...]`
`receipts`の値の形: `[{"date":"2026-10-05","item_name":"ノートPC","qty_received":8,"receiver_member_id":<id>,"note":""}]`

## 6. Invoice（請求書）
```json
{
  "name": "Invoice",
  "description": "請求書照合",
  "fields": [
    { "ext_title": "対象申請", "ext_type": 20, "type": "relation", "ext_slug": "purchase_request", "module": "topics", "group_id": "<PurchaseRequestID>", "required": true },
    { "ext_title": "取引先", "ext_type": 20, "type": "relation", "ext_slug": "vendor", "module": "topics", "group_id": "<VendorID>" },
    { "ext_title": "金額", "ext_type": 35, "type": "number", "ext_slug": "amount", "searchable": true },
    { "ext_title": "受領日", "ext_type": 8, "type": "date", "ext_slug": "received_date" },
    { "ext_title": "照合ステータス", "ext_type": 2, "type": "select", "ext_slug": "matched_status", "searchable": true,
      "options": [{"key":"checking","val":"確認中","default":true},{"key":"matched","val":"一致"},{"key":"mismatched","val":"不一致"},{"key":"hold","val":"支払保留"},{"key":"paid","val":"支払済"}] },
    { "ext_title": "差異メモ", "ext_type": 1, "type": "textarea", "ext_slug": "discrepancy_note" },
    { "ext_title": "請求書ファイル", "ext_type": 9, "type": "file", "ext_slug": "file", "file_type": ["pdf","jpg","png"] }
  ]
}
```
subject = 請求書番号

## 7. AuditLog（監査ログ）
```json
{
  "name": "AuditLog",
  "description": "操作監査ログ",
  "fields": [
    { "ext_title": "操作者", "ext_type": 20, "type": "relation", "ext_slug": "actor", "module": "member" },
    { "ext_title": "操作種別", "ext_type": 2, "type": "select", "ext_slug": "action_type", "searchable": true,
      "options": [{"key":"create","val":"作成"},{"key":"update","val":"更新"},{"key":"status_change","val":"ステータス変更"},{"key":"approve","val":"承認"},{"key":"reject","val":"却下"},{"key":"return","val":"差し戻し"},{"key":"login","val":"ログイン"}] },
    { "ext_title": "対象種別", "ext_type": 0, "type": "text", "ext_slug": "target_type", "searchable": true },
    { "ext_title": "対象ID", "ext_type": 35, "type": "number", "ext_slug": "target_id" },
    { "ext_title": "詳細", "ext_type": 1, "type": "textarea", "ext_slug": "detail" },
    { "ext_title": "変更前ステータス", "ext_type": 0, "type": "text", "ext_slug": "before_status" },
    { "ext_title": "変更後ステータス", "ext_type": 0, "type": "text", "ext_slug": "after_status" }
  ]
}
```
subject = ログ要約（例「PR-0001 を承認」）。日時は標準の`inst_ymdhi`を使用（専用フィールド不要）。

## 会員（Member）拡張項目・グループ
- 会員拡張項目: `department`(relation→Department), `position`(text 役職)。ツール名は接続後`tools/list`で確認。
- 会員グループ6件: 申請者 / 部門長 / IT担当 / 購買担当 / 経理担当 / 管理者
  （`mcp:tools.all`では作成不可の可能性が高い＝`mcp:admin`が必要。不足時は管理画面での作成を依頼する）

## API作成方針（フェーズ3, mcp:tools.all以上が必要）
- 認証: 動的アクセストークン（`X-RCMS-API-ACCESS-TOKEN`）
- 各TopicsGroupに対し `list` / `details` / `insert` / `update` エンドポイントを作成
- PurchaseRequestは検索性のためstatus/department/total_incl_taxをfilter対象に
- CORS: フロントのKurocoFront公開URLを許可オリジンに設定
- ログイン・トークン発行のエンドポイント（login_challenge, token, profile）を作成

## サンプルデータ投入方針（フェーズ4）
1. Department 6件 → 2. Vendor 5件 → 3. Budget 6件(部署ごと) → 4. ApprovalRule 3件
5. Member 12名程度(6ロール×2名前後、departmentとpositionを設定) → 6. PurchaseRequest 12件
（新入社員8名PC/モニター申請1件を含む。ステータス12種を最低1件ずつ）→ 7. Invoice 数件 → 8. AuditLog 数件
書き込みは1件ずつ、書き込み前にユーザー確認（ただし本タスクは自走指示のため、確認は「実行ログに明記」に代える）。
