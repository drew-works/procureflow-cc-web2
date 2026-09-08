# Admin MCPでのAPI/エンドポイント作成が機能しない

**最終状況（2026-09-08）**: 本ドキュメントの再現データを人間がKurocoへ報告し、**Kuroco側の確認済みバグ
（issue #988）と判明**。プラットフォーム側の不具合であり、このセッション内での回避策は存在しない。
ユーザーの指示により、管理画面での手動エンドポイント作成は行わない（今回の検証で計測したい対象は
「AIエージェント単独でどこまで到達できるか」であり、人間の代行作業で迂回することは目的に反するため）。
**実データ接続（モック→実API切替）はこのバグにより完了できなかった。**

## 事象
Admin MCPの `api-upsert` / `api_uri-upsert` / `api-list` / `api-export_openapi` / `api_uri-list` が、
実際には何も作成・取得できないにもかかわらず `{"errors":[],"messages":[]}` という空の「成功」を
返し続ける。

## 再現・切り分け手順（実施済み）
1. `api-upsert` で新規API作成 → 空成功。直後に `api-list` → `totalCnt: 0`（作成されていない）
2. `api-upsert` に `api_id: 999`（存在しないはずのID）を指定して更新 → 同一の空成功
   （存在確認すら行われていない=書き込みハンドラが実質何もしていない）
3. `api_uri-upsert` でエンドポイント追加（`api_id:1`, `departments/list` 等）→ 空成功
4. 直後に対象URLへ直接HTTPプローブ → `404 [GW] API using this path does not exist`
   （実際には作成されていないことを確認）
5. 比較対象として `topics-create` / `topics-update`（単一ID指定）/ `group-create` /
   `files-create_temp_upload_url` / `kuroco_front-deploy` は正常に動作することを確認済み
   （= Admin MCP接続自体・書き込み全般が壊れているのではなく、`rcms_api` モジュールの
   API定義・エンドポイント関連ツールに限定した不具合）
6. 副次的に、`topics-update` を複数ID(`ids`)+`set` で呼ぶ一括更新も同様に「成功」を返しつつ
   実際には反映されない不具合を発見（単発の`topics_id`指定に切り替えて回避済み）

## 依頼したいこと（Kuroco管理画面での手動操作）

管理画面 `https://procureflow-cc-web2.g.kuroco-mng.app` → [API] メニューで、以下の作業をお願いします。

1. 既存のAPI（`nuxt-auth-template`由来。ログイン(`/login`)・プロフィール(`/profile`)等が
   既に動作しています）を開き、**API ID** と **現在のセキュリティ方式**（Cookie / 動的トークン等）を
   確認して教えてください。
2. そのAPIに対して、下表のエンドポイントを [エンドポイント一覧]→[追加] から作成してください
   （モデル=Topics、オペレーション=一覧/詳細、対象コンテンツ定義=下表のtopics_group_idを選択）。
   優先度P1のみでも動作確認は可能です。時間が許せばP2も追加いただけると助かります。
3. [CORS] 設定に許可オリジンとして `https://procureflow-cc-web2.g.kuroco-front.app` を追加してください。
4. 完了したら、実際に採番された **API ID** と、既存の認証方式（Cookie運用のままで良いか、動的アクセス
   トークン用の `token` エンドポイント追加が必要か）を教えてください。

### エンドポイント一覧（優先度P1: 一覧・詳細）

| パス | メソッド | topics_group_id (コンテンツ定義) | 備考 |
|---|---|---|---|
| departments/list | GET | 1 (Department) | |
| departments/details | GET | 1 (Department) | |
| vendors/list | GET | 7 (Vendor) | |
| vendors/details | GET | 7 (Vendor) | |
| budgets/list | GET | 9 (Budget) | |
| budgets/details | GET | 9 (Budget) | |
| approval-rules/list | GET | 10 (ApprovalRule) | |
| approval-rules/details | GET | 10 (ApprovalRule) | |
| staff-profiles/list | GET | 8 (StaffProfile) | |
| purchase-requests/list | GET | 11 (PurchaseRequest) | |
| purchase-requests/details | GET | 11 (PurchaseRequest) | |
| invoices/list | GET | 12 (Invoice) | |
| invoices/details | GET | 12 (Invoice) | |
| audit-logs/list | GET | 13 (AuditLog) | 経理担当・管理者のみ閲覧想定 |

### エンドポイント一覧（優先度P2: 書き込み。手が回らない場合は後日で構いません）

| パス | メソッド | topics_group_id | 備考 |
|---|---|---|---|
| purchase-requests/insert | POST | 11 (PurchaseRequest) | 申請作成（オペレーション=新規登録） |
| purchase-requests/update | PUT | 11 (PurchaseRequest) | ステータス遷移・承認操作（オペレーション=更新） |
| invoices/insert | POST | 12 (Invoice) | |
| invoices/update | PUT | 12 (Invoice) | 照合ステータス更新 |
| vendors/insert | POST | 7 (Vendor) | |
| vendors/update | PUT | 7 (Vendor) | |
| budgets/insert | POST | 9 (Budget) | |
| budgets/update | PUT | 9 (Budget) | |
| approval-rules/insert | POST | 10 (ApprovalRule) | |
| approval-rules/update | PUT | 10 (ApprovalRule) | |
| audit-logs/insert | POST | 13 (AuditLog) | 操作ログの自動記録用 |

フロントエンドの実装（`src/lib/kuroco/client.ts`）は上記のパス命名（list/details/insert/update）を
前提にコード化済みです。エンドポイント作成時にパスをこの表と完全一致させてください
（ズレる場合は作成後のパスを教えていただければ client.ts 側を合わせます）。

## この作業の記録
最終報告では「人間の手作業（種類: Kuroco管理画面操作）」として件数をカウントする。
