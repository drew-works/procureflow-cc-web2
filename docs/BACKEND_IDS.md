# Kuroco 実データ ID対応表（procureflow-cc-web2）

Admin MCP (client_credentials, mcp:admin) で構築済み。生の対応関係は `docs/seed_state.json` を参照。

## コンテンツ定義（TopicsGroup）

| topics_group_id | 名前 | 内容 |
|---|---|---|
| 1 | Department | 部署マスター（nuxt-auth-templateのid=1を流用・改修） |
| 7 | Vendor | 取引先マスター |
| 8 | StaffProfile | 社員プロファイル（会員⇔部署の紐付け） |
| 9 | Budget | 部署別予算マスター |
| 10 | ApprovalRule | 承認ルール |
| 11 | PurchaseRequest | 購買申請（本体） |
| 12 | Invoice | 請求書照合 |
| 13 | AuditLog | 監査ログ |

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
