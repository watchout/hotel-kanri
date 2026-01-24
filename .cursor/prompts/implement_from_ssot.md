------------------------
SSOT実装時の※※必須確認事項※※
------------------------
このドキュメントは「write_new_ssot.md」と同等の品質管理を実装時に適用するためのものです。

🎯 **実装開始前の絶対ルール**:
1. 該当SSOTを最後まで読む（必須）
2. 既存実装を100%調査（必須）
3. 実装プランをユーザーに提案・承認（必須）
4. 承認後のみ実装開始

------------------------
Phase 1: SSOT読み込み + 依存関係トレース（必須）
------------------------
✅ 必須手順:
1. 該当SSOTファイルを開く
2. 最後まで読み込む
3. 「[SSOTファイル名] 読了」と表示
4. 要件ID（XXX-nnn形式）を全て抽出
5. Accept（合格条件）を全て抽出
6. ★★★ 依存関係トレース（必須・5分）★★★
   - 📖 参照: `.cursor/prompts/ssot_dependency_trace.md`
   - UIがある場合: UI → Composable → API → Middleware → Session → Login/Creation API
   - APIのみの場合: API → Service → Database
   - 全ての中間層を特定し、実装必須箇所をリスト化

❌ 絶対禁止:
・SSOTを読まずに実装開始
・「たぶん〜だと思います」で実装
・要件IDを確認せずに実装
・★ 依存関係トレースをスキップして実装（今回の教訓）

🚨 このPhaseをスキップした場合、実装を停止してください。

------------------------
Phase 2: 既存実装の100%調査（必須・15分）
------------------------
✅ 必須調査項目:

【2-1. 同じディレクトリの既存実装確認（3つ以上）】
・目的: 命名規則・パターン・認証方式を把握
・対象: 
  - hotel-common実装の場合: src/routes/api/v1/ 配下
  - hotel-saas実装の場合: server/api/v1/ 配下
  - hotel-pms実装の場合: server/api/ 配下
・確認内容:
  ✓ ファイル命名パターン（list.get.ts, create.post.ts等）
  ✓ 認証チェック方法（SessionUser取得方法）
  ✓ エラーハンドリングパターン
  ✓ レスポンス形式

【2-2. データベーステーブル確認】
・目的: テーブル存在確認、カラム名確認
・対象: 
  - Prismaスキーマ（prisma/schema.prisma）
  - 既存マイグレーションファイル
・確認内容:
  ✓ テーブル名（snake_case確認）
  ✓ カラム名（snake_case確認）
  ✓ @map/@mapディレクティブ確認
  ✓ インデックス確認

【2-3. 関連SSOTの確認】
・目的: SSOT間の矛盾を防ぐ
・対象: SSOTファイル内の「関連SSOT」セクション
・確認内容:
  ✓ 認証方式の統一
  ✓ APIパスの一貫性
  ✓ データ型の統一
  ✓ 用語の統一

【2-4. システム間連携の確認】
・目的: システム境界を正しく理解
・確認内容:
  ✓ hotel-saas: プロキシ専用（Prisma使用禁止）
  ✓ hotel-common: API基盤・DB層
  ✓ hotel-pms: 独自DB・イベント駆動連携
  ✓ hotel-member: 独自DB・イベント駆動連携

【2-5. ★NEW: UI/ページ実装の場合は Page Registry を必ず確認】
・目的: SSOT間のページパス矛盾をゼロにする（canonical固定）
・対象:
  - Page Registry: `docs/03_ssot/00_foundation/SSOT_PAGE_REGISTRY.md`
  - Nuxt pages 実体: `/Users/kaneko/hotel-saas-rebuild/pages`
・必須確認:
  ✓ ページパス表記が registry の canonical と完全一致している
  ✓ 新規ページを追加する場合、先に registry を更新している
・推奨コマンド（検出は strict でFailさせる）:
```bash
cd /Users/kaneko/hotel-kanri
node scripts/quality/check-page-registry-consistency.cjs --strict
echo "exit=$?"
```

❌ 絶対禁止:
・既存実装を確認せずに実装
・「想像」「推測」で実装
・他のシステムの実装方法を無視

🚨 このPhaseをスキップした場合、実装を停止してください。

------------------------
Phase 3: ハルシネーション防止チェック（必須）
------------------------
✅ 必須確認事項:

【3-1. ファイル存在確認】
・参照する全てのファイルが実在することを確認
・方法: read_file, list_dir, grep等で確認
・❌ 確認せずに「存在します」と言わない

【3-2. プレースホルダー使用禁止】
❌ 禁止パターン:
```typescript
// ❌ プレースホルダー使用
import { SomeType } from '@/types'  // 想像上の型
const data = await fetchData()      // 想像上の関数
const { someField } = user          // 確認していないフィールド
```

✅ 正しいパターン:
```typescript
// ✅ 実際に存在する型・関数のみ使用
import { SessionUser } from '../../middleware/auth'  // 確認済み
const data = await prisma.tenant.findMany()          // 確認済み
const { user_id, tenant_id } = user                  // 確認済み
```

【3-3. 曖昧表現の禁止】
❌ 禁止表現:
・「たぶん〜だと思います」
・「おそらく〜でしょう」
・「〜かもしれません」
・「〜のはずです」

✅ 正しい表現:
・「確認します」
・「調査します」
・「[ファイル名]を確認した結果、〜」

【3-4. 確認済みと嘘をつかない】
❌ 絶対禁止:
・確認していないのに「確認しました」
・読んでいないのに「読みました」
・実在しないのに「存在します」

✅ 正しい対応:
・「今から確認します」
・「[ツール名]で確認します」
・「確認した結果: [結果]」

🚨 このPhaseで1つでも違反した場合、実装を停止してください。

------------------------
Phase 4: 実装プラン提案（必須）
------------------------
✅ 必須提案内容:

【4-1. 実装対象の明確化】
・実装するファイル一覧
・各ファイルの役割
・ファイル間の依存関係

【4-2. 実装順序の提案】
1. データベース関連（Prismaスキーマ、マイグレーション）
   ★NEW: Prisma共有インスタンス確認（必須）
   - 既存の`src/lib/prisma.ts`を使用
   - 個別インスタンス作成は絶対禁止
   - 詳細: PRISMA_CLIENT_STANDARD.md
2. サービス層（ビジネスロジック）
3. API層（ルート、コントローラー）
4. テスト実装

【4-3. 工数見積もり】
・各ステップの所要時間
・総工数
・リスク要因

【4-4. 実装方針の説明】
・なぜこの実装方針を選んだか
・他の選択肢との比較
・SSOT準拠の根拠

🚨 ユーザーの承認を得るまで実装を開始しないでください。

------------------------
Phase 5: 実装時の必須ルール
------------------------
✅ 実装中の必須事項:

【5-1. SSOT準拠の徹底】
・要件ID（XXX-nnn）を全て実装
・Accept（合格条件）を全て満たす
・SSOT記載以外の機能を勝手に追加しない

【5-2. 命名規則・Prisma使用の厳守】
・データベース: DATABASE_NAMING_STANDARD.md v3.1.0準拠
・Prisma: PRISMA_CLIENT_STANDARD.md v1.0.0準拠（★必須）
  ❌ 個別インスタンス作成禁止: `new PrismaClient()`
  ✅ 共有インスタンス使用必須: `import prisma from '../lib/prisma'`
・API: API_ROUTING_GUIDELINES.md準拠
・既存コードの命名パターンに合わせる

【5-3. エラーハンドリングの統一】
・既存実装と同じエラーハンドリング方法を使用
・エラーメッセージの形式を統一
・適切なHTTPステータスコード使用

【5-4. 認証・セキュリティの徹底】
・全てのAPIで認証チェック必須
・tenant_idフィルタリング必須（マルチテナント）
・入力検証必須（Zod等）

【5-5. ★★★ hotel-saas実装時の必須パターン ★★★】
hotel-saasから hotel-common を呼び出す場合、**必ず以下のパターンを使用**:

✅ **正しい実装（Cookie自動転送）**:
```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 認証チェック（ミドルウェアで認証済み）
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  // 🔑 SSOT準拠: callHotelCommonAPIを使用（Cookie自動転送）
  const response = await callHotelCommonAPI(event, '/api/v1/your-endpoint', {
    method: 'POST',
    body: payload
  })

  return { success: true, data: response.data }
})
```

❌ **絶対禁止（Cookie転送なし → 401エラー）**:
```typescript
// ❌ 禁止パターン1: $fetch直接使用
const response = await $fetch(`${HOTEL_COMMON_API_URL}/api/v1/your-endpoint`, {
  method: 'POST',
  body: payload
})

// ❌ 禁止パターン2: credentials: 'include' でもサーバー間通信では不十分
const response = await $fetch(url, {
  credentials: 'include', // ← サーバー間では効かない
  body: payload
})
```

🚨 **なぜこのルールが重要か**:
- hotel-saasはプロキシ専用システム
- 認証はSession（Redis + HttpOnly Cookie）方式
- サーバー間通信でCookieを転送するには明示的な`Cookie`ヘッダー設定が必要
- `callHotelCommonAPI`はこれを自動で行う
- このパターンを守らないと**全ての管理画面APIで401エラー**が発生

📋 **実装前チェックリスト**:
- [ ] `callHotelCommonAPI`をインポートしたか？
- [ ] 第1引数に`event`を渡したか？
- [ ] 第2引数にAPIパス（相対パス）を渡したか？
- [ ] 第3引数に`method`と`body`を渡したか？
- [ ] `$fetch`や`fetch`を直接使用していないか？

【5-6. テストの実装】
・APIテスト（curl）必須
・手動UIテスト手順の明記
・E2Eテスト（Playwright）は不要

❌ 絶対禁止:
・SSOT記載外の機能追加
・開発専用のフォールバック実装
・モック・一時対応の実装
・システム境界を越えた実装

------------------------
Phase 6: 実装後の必須確認
------------------------
✅ 実装完了の定義:

【6-1. 要件ID完全実装チェック】
・抽出した全要件ID（XXX-nnn）が実装されているか
・Accept（合格条件）が全て満たされているか

【6-2. テスト実施】
・APIテスト（curl）実行・結果確認
・手動UIテスト実行・結果確認
・エラーケーステスト実行

【6-3. SSOT準拠チェック】
・データベース命名規則チェック
・APIルーティングチェック
・認証・セキュリティチェック

【6-4. ドキュメント更新】
・実装状況の記録
・SSOT_PROGRESS_MASTER.mdの更新
・Linear Issueのステータス更新

🚨 上記が全て完了するまで「実装完了」と報告しないでください。

------------------------
エラー発生時の絶対プロトコル
------------------------
エラーが発生した場合、以下の手順を必ず実行:

🛑 Step 1: 実装即座停止
・エラーを修正しようとしない
・推測で実装を続けない
・「動けばいい」という発想を捨てる

📖 Step 2: SSOT再読み込み
該当SSOTファイルを必ず再読み込み:
・テナント関連 → SSOT_SAAS_MULTITENANT.md
・認証・セッション → SSOT_SAAS_ADMIN_AUTHENTICATION.md
・DB・Prisma → SSOT_DATABASE_SCHEMA.md
・本番同等性 → SSOT_PRODUCTION_PARITY_RULES.md

🛡️ Step 3: ガードレール確認
📖 .cursor/prompts/ssot_implementation_guard.md

❓ Step 4: ユーザー報告
以下のテンプレートで報告:

```
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## エラー内容
[エラーメッセージ]

## 該当SSOT
[SSOTファイル名]

## SSOT記載内容
[該当セクションの引用]

## 判断
- [ ] SSOTに記載あり → SSOT通りに実装
- [ ] SSOTに記載なし → ユーザーに質問

## 提案する対応方針
[具体的な実装方針]

実装を再開してよろしいでしょうか？
```

✅ Step 5: 承認後再開
ユーザーの承認を得てから実装を再開

------------------------
データベース操作を含む場合（★★★最重要）
------------------------
必ず参照: 
・/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md v3.0.0
・/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md（★★★必須）

必須手順:
1. 環境変数DATABASE_URL確認（admin権限必須）
2. Prismaスキーマ更新
3. マイグレーション作成: `npx prisma migrate dev --name [説明]`
4. マイグレーション実行確認
5. スキーマドリフトチェック: `npx prisma migrate status`

❌ 絶対禁止:
・直接SQL実行
・マイグレーションファイルの手動編集
・prisma db push（本番環境では禁止）
・schema.prismaとDBの不整合放置

------------------------
API実装を含む場合
------------------------
必ず参照:
・/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md
・/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md

❌ 禁止パターン（Nuxt 3 / Nitro制約）:
・深いネスト: /api/v1/admin/orders/[id]/items/[itemId]
・index.*ファイル: server/api/v1/admin/rooms/index.get.ts

✅ 推奨パターン:
・フラット構造: /api/v1/admin/order-items/[itemId]
・クエリパラメータ: /api/v1/admin/order-items?orderId=123
・明示的ファイル名: list.get.ts, create.post.ts

------------------------
品質スコア算出
------------------------
実装完了時に以下を自己評価（100点満点）:

【SSOT準拠度】（40点）
- [ ] 要件ID全実装（20点）
- [ ] Accept全達成（20点）

【コード品質】（30点）
- [ ] 命名規則準拠（10点）
- [ ] エラーハンドリング統一（10点）
- [ ] セキュリティ対策（10点）

【テスト実施】（20点）
- [ ] APIテスト実行（10点）
- [ ] 手動UIテスト実行（10点）

【ドキュメント】（10点）
- [ ] 実装状況記録（5点）
- [ ] 進捗更新（5点）

🎯 目標: 90点以上

------------------------
最終チェックリスト
------------------------
実装完了報告前に以下を全て確認:

□ Phase 1: SSOT読み込み完了
□ Phase 2: 既存実装100%調査完了
□ Phase 3: ハルシネーション防止チェック完了
□ Phase 4: 実装プラン提案・承認取得
□ Phase 5: SSOT準拠実装完了
□ Phase 6: 実装後の必須確認完了
□ エラー0件
□ テスト全合格
□ 品質スコア90点以上
□ ドキュメント更新完了

全て✅の場合のみ「実装完了」と報告してください。

------------------------
ここまで読み込んだらまず「[このファイル名]+読了」と表示すること







