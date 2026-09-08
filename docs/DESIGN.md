# ProcureFlow 設計ドキュメント

作成日: 2026-09-08 / 対象: procureflow-cc-web2 (Kuroco)
進め方: kuroco-app-builder スキルの手順に準拠。要件は依頼文で明確に列挙済みのため
0-1ヒアリングは依頼文の内容をそのまま確定値として採用し、追加の質問はしない
（AskUserQuestionは使わず、既定値で前進し判断根拠をここに残す＝「前提が満たせないときの既定動作」に準拠）。

## 0-2. 進め方パターン

**パターンA（モックファースト）を採用。**
理由: データモデル自体は依頼文でほぼ確定しているためパターンBが本来適切だが、
Kuroco Admin MCP接続（procureflow-cc-web2向け）が本セッションでは未確立
（後述「Admin MCP接続状況」）。バックエンドが使えるようになるまでフロントエンドの
モック実装で画面を先に完成させ、接続確立後にフェーズ2以降を一気に通す。

## Admin MCP接続状況（0-6）

- 本セッションに既存接続されているKuroco Admin MCPは `karima0806`（site_key: karima0806）と
  `intern-workspace`（site_key: intern-workspace）の2つで、いずれも `procureflow-cc-web2` ではない。
- `procureflow-cc-web2` 向けのAdmin MCP接続は本セッションに存在せず、かつ本セッション（Claude Code
  Remote, headless）にはブラウザでOAuth同意画面を完了する手段がない。
- 依頼文の指示に従い、client_credentials方式のOAuthクライアントの新規作成を人間に依頼する
  （詳細は別途チャットメッセージ）。到着次第、curlでトークン交換しAdmin MCPエンドポイントに
  直接HTTPS POST（JSON-RPC）することで、MCPサーバー登録なしに接続可能。
- 状態: `[!]` 再開条件「procureflow-cc-web2のclient_credentials OAuthクライアント情報の受領」

## 0-3. 役割 × 画面 権限マトリクス

役割: 申請者 / 部門長 / IT担当 / 購買担当 / 経理担当 / 管理者

| 画面 | 申請者 | 部門長 | IT担当 | 購買担当 | 経理担当 | 管理者 |
|---|---|---|---|---|---|---|
| ダッシュボード | 自分の申請サマリ | 部門サマリ+承認待ち | 承認待ち(IT関連) | 全社サマリ+見積/発注状況 | 請求照合状況 | 全社サマリ |
| 購買申請一覧 | 自分の申請のみ | 自部門+自分 | 全件(閲覧) | 全件 | 全件(閲覧) | 全件 |
| 購買申請作成 | ○(自分の申請) | ○(自分の申請) | ○ | ○ | × | ○ |
| 申請詳細 | 自分の申請 | 自部門+承認操作 | 閲覧+ITカテゴリ承認 | 閲覧+発注操作 | 閲覧+支払操作 | 全操作 |
| 承認待ち一覧 | × | ○(自部門) | ○(IT関連カテゴリ) | ○(購買承認ステップ) | × | ○(全件) |
| 見積比較 | 閲覧(自分の申請) | 閲覧 | 閲覧 | ○(登録・選定) | 閲覧 | ○ |
| 発注管理 | 閲覧(自分の申請) | 閲覧 | 閲覧 | ○(発注確定) | 閲覧 | ○ |
| 検収管理 | ○(自分の申請の検収登録) | 閲覧 | ○(IT機器検収) | ○ | 閲覧 | ○ |
| 請求書照合 | × | × | × | 閲覧 | ○(照合・支払保留解除) | ○ |
| 取引先マスター | 閲覧 | 閲覧 | 閲覧 | ○(編集) | 閲覧 | ○(編集) |
| 部署・予算マスター | 閲覧(自部門) | 閲覧(自部門) | 閲覧 | 閲覧 | ○(編集) | ○(編集) |
| 承認ルール管理 | × | × | × | 閲覧 | 閲覧 | ○(編集) |
| 監査ログ | × | × | × | × | 閲覧 | ○ |

レコード単位の条件: 申請者=所有型（自分が作成した申請のみ）、部門長=属性型（自部門の
department_idが自分と一致）、購買・経理・IT・管理者=全件（属性型の絞り込みなし）。
実現機構: 所有型/属性型ともにフロント側でログイン会員のmember_id/department_idに基づき
`filter` パラメータを構築して絞り込む（Kurocoの `my_own_list` 相当をカスタムfilterで代替。
理由: 本案件はAPIのセキュリティ方式を動的アクセストークンで統一しユーザーを判別できるため、
サーバー側でのfilter強制まで作り込む時間的余裕がなければフロントのfilter適用に留める。
これは監査上「閲覧範囲がAPIレベルで強制されていない」というリスクとして5章で明記する）。

## 0-3. ステータス設計

12ステータスは依頼文で列挙済みの1本の業務工程として扱う（見た目上も一体のバッジ列）。
判定: 差し戻し・却下は「前の主体へ戻す」遷移だが、Kuroco標準の承認ワークフロー機能を
使うと申請中データが`Topics::waiting_for_approval_list`系の別系統になり、12ステータスを
1画面で一体表示する要件（依頼文「ステータスは以下です」を1系列として提示）と相性が悪く、
かつ無人構築でワークフロー設定の実機検証（差し戻し先・通知等）を都度確認できない。
**設計判断: 承認ワークフロー標準機能は使わず、PurchaseRequestに `status`（select・12値・
searchable）と `approval_steps`（JSON配列、社内承認ラインの逐次記録）を持たせるカスタム実装
とする。** トレードオフ: Kuroco標準のワークフロー通知メール・多段承認UIは使えず自前実装になる
が、状態遷移を1画面で完全に制御・可視化でき、Admin MCPのtopics系ツールだけで完結できる。

### ステータス遷移表

| 状態 | 遷移させる操作 | 実行ロール | 次の状態 |
|---|---|---|---|
| 下書き | 保存 | 申請者 | 下書き |
| 下書き | 申請する | 申請者 | 申請中 |
| 申請中 | 一次承認(部門長) | 部門長 | 承認中 (次ステップがあれば) or 承認済み |
| 承認中 | 次段承認 | IT担当/購買担当/管理者(金額区分による) | 承認中 or 承認済み |
| 申請中/承認中 | 差し戻し | 承認ライン上の承認者 | 差し戻し |
| 差し戻し | 再申請 | 申請者 | 申請中 |
| 申請中/承認中 | 却下 | 承認ライン上の承認者 | 却下（終端） |
| 承認済み | 発注する | 購買担当 | 発注済み |
| 発注済み | 一部検収登録 | 申請者/IT担当 | 一部検収 |
| 発注済み/一部検収 | 検収完了登録 | 申請者/IT担当 | 検収完了 |
| 検収完了 | 請求書登録 | 経理担当 | 請求書確認中 |
| 請求書確認中 | 金額不一致検出 | 経理担当 | 支払い保留 |
| 支払い保留 | 差異解消 | 経理担当 | 請求書確認中 |
| 請求書確認中 | 支払確定 | 経理担当 | 完了 |

承認ステップ数・承認者は「承認ルール管理」画面で金額区分ごとに設定（例: 10万円未満=部門長のみ、
10万円以上100万円未満=部門長→購買担当、100万円以上=部門長→購買担当→管理者。ITカテゴリの
明細を含む場合はIT担当の承認ステップを追加）。申請時にこのルールから `approval_steps` を
生成しレコードに埋め込む（申請時点のルールをスナップショットとして保持）。

## データモデル（TopicsGroup 設計）

1. **Department（部署）**: dept_code, dept_name, manager_member_id(relation), parent_dept, description
2. **Budget（予算）**: department_id(relation), fiscal_year, category, budget_amount, used_amount, note
3. **Vendor（取引先）**: vendor_code, name, contact_person, email, phone, address, bank_info, payment_terms, category, status
4. **ApprovalRule（承認ルール）**: rule_name, min_amount, max_amount, requires_it_review(bool), steps(JSON: [{order, role}]), active_flag
5. **PurchaseRequest（購買申請）**: request_no, title, applicant_member_id, department_id, status(select), overall_purpose,
   line_items(JSON配列: name, category, qty, unit_price, tax_rate, purpose, desired_date),
   total_excl_tax, total_incl_tax, budget_id, quotes(JSON配列: vendor_id, amount, file_ref, selected, note),
   selected_vendor_id, attachments_quote(file複数), attachments_spec(file複数), attachments_contract(file複数),
   approval_steps(JSON配列: order, role, approver_member_id, status, acted_at, comment),
   po_no, po_date, receipts(JSON配列: date, item_name, qty_received, receiver_member_id, note), created/updated
6. **Invoice（請求書）**: invoice_no, purchase_request_id(relation), vendor_id(relation), amount, received_date,
   matched_status(select: 確認中/一致/不一致/支払保留/支払済), discrepancy_note, file
7. **AuditLog（監査ログ）**: ts, actor_member_id, action_type, target_type, target_id, detail, before_status, after_status

会員(Member): Kuroco標準Memberモジュール。拡張項目 department_id, position。
6グループ = 申請者/部門長/IT担当/購買担当/経理担当/管理者（Kurocoの会員グループとして作成）。

## 認証方式・到達経路（0-5）

- ①認証方式: 会員機能あり・KurocoFront(xxx.g.kuroco-front.app)とAPI(xxx.g.kuroco.app)が別ドメイン
  のクロスドメインSPAのため **動的アクセストークン認証**（`X-RCMS-API-ACCESS-TOKEN`）を採用。
- ②到達経路制限: 社内購買管理システムだが依頼文にIPやVPN等の制約記載がないため **制限なし**
  として進める（仮定。外れた場合の影響: KurocoFront配信のIP制限/Basic認証をフェーズ4-3で追加
  する作業が増えるのみで設計自体への影響はない）。公開はデモ検証目的のため、既定の「非公開
  デフォルト」（Basic認証）を適用してデプロイし、ログイン情報を最終報告に記載する。

## 画面一覧（14）

1. ログイン 2. ダッシュボード 3. 購買申請一覧 4. 購買申請作成 5. 申請詳細 6. 承認待ち一覧
7. 見積比較 8. 発注管理 9. 検収管理 10. 請求書照合 11. 取引先マスター 12. 部署・予算マスター
13. 承認ルール管理 14. 監査ログ

デバイス方針: PC中心（デスクトップ業務システム）。モバイル対応対象画面はダッシュボード
（サマリのみ簡易表示）、購買申請一覧（自分の申請の確認）、申請詳細（閲覧+承認/差戻/却下操作）、
承認待ち一覧、ログイン。他画面（マスタ管理・監査ログ・見積比較・発注/検収/請求照合の編集操作）
はPC最適化のみで可（依頼文「スマートフォンでも申請確認と承認ができるように」の範囲に限定）。

## フレームワーク選定

クロールが不要（社内業務システム、認証必須）→ **Vite + Vue 3 (SPA)** を採用。
`vite build` の `dist/` をKurocoFrontへAdmin MCP直接デプロイする。

## 確認事項（仮定一覧・影響範囲）

1. ②到達経路制限「制限なし」と仮定 → 外れれば4-3でBasic認証/IP制限を追加するのみ（設計影響小）
2. 承認ワークフロー標準機能を使わずカスタムstatus実装 → 標準の通知メール・承認UIは提供されない
3. レコード単位の閲覧制限をフロントfilterで実装（APIレベル未強制）→ 5章セキュリティ監査で
   既知の残課題として明記する

## 進捗ログ

- 2026-09-08T03:48Z 作業開始
- 2026-09-08T04:18Z 人間よりclient_credentials OAuthクライアント受領、Admin MCP接続確立(procureflow-cc-web2, mcp:admin)
- 2026-09-08T04:35Z バックエンド構築完了（コンテンツ定義7種、会員グループ6、サンプルデータ全件投入）
- 2026-09-08T04:40Z Admin MCPのrcms_apiモジュール（API/エンドポイント作成)が機能しない不具合を確認（docs/API_BLOCKER.md）
- 2026-09-08T04:48Z フロントエンド(モックモード)をKurocoFrontへ本番デプロイ（Basic認証で非公開）
  https://procureflow-cc-web2.g.kuroco-front.app/ (ID: kuroco / PW: 別途共有)
  → 最初に画面が動くまでの経過時間: 約60分
- 現在: API作成のAdmin MCP不具合により、実データ接続(モック→実API切替)が保留中。
  docs/API_BLOCKER.md の内容で人間にKuroco管理画面での手動エンドポイント作成を依頼中。
