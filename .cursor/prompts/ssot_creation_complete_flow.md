------------------------
SSOT作成の完全フロー（必須・3段階）
------------------------
このドキュメントは以下の3つを統合した完全版です：
1. write_new_ssot.md（作成前チェック）
2. SSOT_QUALITY_CHECKLIST.md（作成中の品質基準）
3. retest_new_ssot.md（作成後の品質検証）

🎯 **目的**: 最高品質のSSOTを作成するための完全ガイド

---

# 📋 Phase 1: 作成前チェック（必須）

## 🚨 SSOT作成資格確認（1分）

以下の質問に全て「YES」で答えられますか？

- [ ] このSSOTは `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md` のロードマップに記載されているか？
- [ ] SSOT作成指示書を読んだか？
- [ ] このSSOTが対象とするシステムの役割を理解しているか？
- [ ] 既存の関連SSOTを3つ以上読んだか？

❌ 1つでも「NO」がある場合：
  → SSOT作成を開始しない
  → ユーザーに確認する

## 📚 必須参照ドキュメント

### 基本ドキュメント
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md` ★★★最優先
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md` ★★★最優先
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`（ロードマップ確認）

### データベース関連（テーブル含む場合）
- `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md` v3.0.0 ★必須
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md` ★★★必須
- `/Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md`（クイックリファレンス）
- `/Users/kaneko/hotel-kanri/.cursor/prompts/database_operation_rules.md` ★★★データベース操作指示ルール

### API関連（APIパス含む場合）
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md` ★必須
- `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`
- `/Users/kaneko/hotel-kanri/.cursor/prompts/api_routing_standard_reference.md`（クイックリファレンス）

## 🔍 既存実装・ドキュメントの完全調査（15分）

### 1. 過去のドキュメント確認
```bash
# アーカイブドキュメント参照（SSOT作成時のみ）
ls -la /Users/kaneko/hotel-kanri/docs/_archived_system_docs/
```

### 2. 既存ソースコード確認
```bash
# hotel-saas の場合
ls -la /Users/kaneko/hotel-saas/pages/admin/
ls -la /Users/kaneko/hotel-saas/server/api/v1/admin/
ls -la /Users/kaneko/hotel-saas/composables/

# hotel-common の場合
ls -la /Users/kaneko/hotel-common/src/routes/api/v1/
ls -la /Users/kaneko/hotel-common/src/services/

# hotel-pms の場合
ls -la /Users/kaneko/hotel-pms/server/api/
```

### 3. Prismaスキーマ確認（DB関連の場合）
```bash
# 既存テーブル確認
grep "model " /Users/kaneko/hotel-common/prisma/schema.prisma
```

### 4. 関連SSOTの確認
```bash
# 関連するSSOTを全て読み込む
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/
```

**特に重要（必読）**:
- `SSOT_SAAS_MULTITENANT.md`（テナント分離）
- `SSOT_SAAS_ADMIN_AUTHENTICATION.md`（認証）
- `SSOT_DATABASE_SCHEMA.md`（DB設計）
- `SSOT_PRODUCTION_PARITY_RULES.md`（本番同等性）

## ✅ 必須確認事項（26項目）

### 基本方針
- [ ] 既存ドキュメント、各システムの実装ソースを全文正確に把握して準拠する
- [ ] 基本的には実装済み・作成済みを前提として、見つからない場合は多角的に検索
- [ ] システム間連携について確実に連携可能な仕様を明記
- [ ] 開発・本番が全て統一される設計（モック・フォールバック禁止）
- [ ] 既存SSOTの記載と矛盾がないこと
- [ ] 細部まで各システムの開発を予測して必要な情報・値・データを漏れなく記入
- [ ] 想像・想定で実装せず、ドキュメントにない点はソースから、ソースにない点は質問
- [ ] 実装用のコードは書かない（サンプル程度のみ）
- [ ] E2Eテスト（Playwright等）は記載しない（APIテストと手動UIテストのみ）
- [ ] システム共通で使用する変数・パスの扱いに特に注意
- [ ] できる限り現状優先、どうしても必要な場合のみ変更設計
- [ ] UIパスが作成されるものは各パスごとに仕様を整理
- [ ] 現在のUI構成をそのまま利用できる設計か確認
- [ ] UIを変更しなければならない場合は改善提案
- [ ] 管理画面用と客室端末用でSSOTは別々に作成（混乱回避）
- [ ] 既存のSSOTを全て読み込んで作成
- [ ] 既存SSOTと矛盾が発生する場合は作成中断して質問
- [ ] UIの仕様でどこにどのように表示するかを定義
- [ ] 現在の各システム（saas/common/pms/member）のソースを実際に読み込み理解確認した上で実装フローを盛り込む
- [ ] ロードマップ記載のSSOTファイル名のみ作成（勝手にファイル名決定禁止）

### データベース関連（該当する場合）
- [ ] DATABASE_NAMING_STANDARD.md v3.0.0に準拠
- [ ] 新規テーブル名: `snake_case`必須
- [ ] 新規カラム名: `snake_case`必須
- [ ] Prismaモデル名: `PascalCase`
- [ ] Prismaフィールド名: `camelCase` + `@map`ディレクティブ必須
- [ ] `@@map`ディレクティブ必須
- [ ] 既存テーブルは現状維持（強制統一しない）
- [ ] SSOT_DATABASE_MIGRATION_OPERATION.md を必ず参照
- [ ] 直接SQL実行の指示は絶対禁止
- [ ] Prisma標準手順を必ず含める

### API関連（該当する場合）
- [ ] API_ROUTING_GUIDELINES.md に準拠
- [ ] 深いネスト禁止（2階層以上の動的パス）
- [ ] `index.*`ファイル禁止
- [ ] フラット構造推奨（1階層の動的パスのみ）
- [ ] クエリパラメータ活用
- [ ] 明示的なファイル名（`list.get.ts`, `create.post.ts`等）

---

# 📝 Phase 2: SSOT作成中の品質基準（必須）

## 🎯 SSOT作成時の必須セクション

### 必須メタ情報
```markdown
# [アイコン] SSOT: [タイトル]

**Doc-ID**: SSOT-[カテゴリ]-[番号]
**バージョン**: 1.0.0
**作成日**: YYYY-MM-DD
**最終更新**: YYYY-MM-DD
**ステータス**: ✅ 完成
**所有者**: [担当AI名]
**Phase**: Phase X - Week Y
**品質スコア**: XX/100点

**関連SSOT**:
- [関連SSOT一覧]
```

### 必須セクション構成
1. **目次**
2. **概要**（目的・主要機能・技術スタック）
3. **システムアーキテクチャ**（システム境界の明確化）
4. **データベース設計**（該当する場合）
5. **API仕様**（該当する場合）
6. **フロントエンド実装**（該当する場合）
7. **実装フロー**
8. **エラーハンドリング**
9. **テストケース**（APIテスト・手動UIテスト）
10. **セキュリティ**
11. **パフォーマンス最適化**
12. **トラブルシューティング**

## 🔒 システム境界の明確化（必須）

### hotel-saas（プロキシ層）
**役割**: 
- フロントエンドUI提供
- hotel-common APIへのプロキシ
- Cookie-based Session認証

**禁止事項**:
- ❌ Prisma直接使用
- ❌ ファイルシステム直接操作
- ❌ データベース直接接続

### hotel-common（API基盤層）
**役割**:
- 統合API提供
- ビジネスロジック実装
- データベースアクセス
- システムイベント記録

**禁止事項**:
- ❌ システム固有のUI実装

### hotel-pms（独立システム）
**役割**:
- フロント業務専用機能
- 独自データベース
- イベント駆動連携

**禁止事項**:
- ❌ 他システムDB直接操作
- ❌ イベント無し予約操作

### hotel-member（独立システム）
**役割**:
- 顧客マスタ管理
- 会員情報管理
- イベント駆動連携

**禁止事項**:
- ❌ tenant_id無しクエリ
- ❌ イベント無し更新

## 📊 要件ID体系（必須）

### 要件IDの命名規則
```
[カテゴリ]-[連番]

例:
- AUTH-001: 認証系の要件1番
- PERM-001: 権限系の要件1番
- DB-001: データベース系の要件1番
- API-001: API系の要件1番
- UI-001: UI系の要件1番
```

### 16カテゴリ定義
| カテゴリ | コード | 例 |
|---------|--------|-----|
| 認証 | AUTH | AUTH-001 |
| 権限 | PERM | PERM-001 |
| データベース | DB | DB-001 |
| API | API | API-001 |
| UI | UI | UI-001 |
| メニュー | MENU | MENU-001 |
| 注文 | ORDER | ORDER-001 |
| 予約 | RESV | RESV-001 |
| 会員 | MEMBER | MEMBER-001 |
| AI | AI | AI-001 |
| 通知 | NOTIF | NOTIF-001 |
| 決済 | PAY | PAY-001 |
| 多言語 | I18N | I18N-001 |
| パフォーマンス | PERF | PERF-001 |
| セキュリティ | SEC | SEC-001 |
| テスト | TEST | TEST-001 |

### Accept（合格条件）の記述例
```markdown
## AUTH-001 メールアドレスは必須・形式検証

**Accept（合格条件）**:
- ✅ 有効なメールアドレス（RFC 5322準拠）は受理される
- ❌ 空文字列は `400 {"code":"REQUIRED_FIELD","field":"email"}` で拒否
- ❌ 形式違反は `400 {"code":"INVALID_EMAIL"}` で拒否

**Test Cases**:
```typescript
describe('AUTH-001', () => {
  it('有効なメールは受理される', async () => {
    const result = await register({ email: 'test@example.com' })
    expect(result.status).toBe(200)
  })
  
  it('形式違反は400エラー', async () => {
    const result = await register({ email: 'invalid' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('INVALID_EMAIL')
  })
})
```

**Type（型定義）**:
```typescript
import { z } from 'zod'

const RegisterSchema = z.object({
  email: z.string()
    .min(1, { message: "REQUIRED_FIELD" })
    .email({ message: "INVALID_EMAIL" })
})
```
```

## 🗄️ データベース設計（該当する場合）

### Prismaスキーマの必須要素
```prisma
model ExampleTable {
  id          String    @id @default(cuid())
  tenantId    String    @map("tenant_id")        // ✅ camelCase + @map
  columnName  String    @map("column_name")      // ✅ camelCase + @map
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@index([tenantId])
  @@index([tenantId, columnName])
  @@map("example_table")                         // ✅ @@map必須
}
```

### 必須チェック項目
- [ ] テーブル名: `snake_case`
- [ ] カラム名: `snake_case`
- [ ] Prismaモデル名: `PascalCase`
- [ ] Prismaフィールド名: `camelCase` + `@map`
- [ ] `@@map`ディレクティブ: 必須
- [ ] `tenant_id`カラム: マルチテナント対応の場合必須
- [ ] `created_at`, `updated_at`, `deleted_at`: 必須
- [ ] インデックス: 検索条件に応じて適切に設定

## 🌐 API仕様（該当する場合）

### APIエンドポイントの記述例
```markdown
#### 1. リソース作成

**エンドポイント**: `POST /api/v1/admin/resources`

**認証**: Session認証（Cookie）必須

**リクエスト**:
```typescript
interface CreateRequest {
  name: string;
  description?: string;
  // ...
}
```

**レスポンス**:
```typescript
interface CreateResponse {
  success: boolean;
  data: ResourceRecord;
}

interface ResourceRecord {
  id: string;
  name: string;
  // ...
  createdAt: string;
}
```

**実装ファイル**:
- hotel-saas: `/Users/kaneko/hotel-saas/server/api/v1/admin/resources/create.post.ts`
- hotel-common: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/resources.routes.ts`

**処理フロー**:
1. Session認証確認
2. テナント権限チェック
3. 入力検証（Zod）
4. hotel-common API呼び出し
5. レスポンス返却

**エラーレスポンス**:
- `400 Bad Request`: 入力検証エラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 権限エラー
- `500 Internal Server Error`: サーバーエラー
```

### API命名規則（Nuxt 3 / Nitro制約）

❌ **禁止パターン**:
- 深いネスト: `/api/v1/admin/orders/[id]/items/[itemId]`
- `index.*`ファイル: `server/api/v1/admin/rooms/index.get.ts`

✅ **推奨パターン**:
- フラット構造: `/api/v1/admin/order-items/[itemId]`
- クエリパラメータ: `/api/v1/admin/order-items?orderId=123`
- 明示的ファイル名: `list.get.ts`, `create.post.ts`, `[id].get.ts`

## 🎨 UI実装（該当する場合）

### UIパスと画面構成の明確化
```markdown
### 画面一覧

| 画面名 | パス | コンポーネント | 役割 |
|-------|------|---------------|------|
| 一覧画面 | `/admin/resources` | `pages/admin/resources/index.vue` | リソース一覧表示 |
| 詳細画面 | `/admin/resources/[id]` | `pages/admin/resources/[id]/index.vue` | リソース詳細表示 |
| 作成画面 | `/admin/resources/new` | `pages/admin/resources/new.vue` | 新規作成 |
| 編集画面 | `/admin/resources/[id]/edit` | `pages/admin/resources/[id]/edit.vue` | 編集 |
```

### UI変更が必要な場合の提案
```markdown
## UI改善提案

**現状の課題**:
- [具体的な課題]

**提案内容**:
- [改善案]

**影響範囲**:
- [影響を受けるファイル一覧]

**実装工数**:
- [見積もり時間]
```

## 🧪 テストケース（必須）

### APIテスト（curl）
```bash
# 正常系: リソース作成
curl -X POST http://localhost:3400/api/v1/admin/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: hotel_session=xxx" \
  -d '{"name":"Test Resource"}'

# 異常系: 認証なし
curl -X POST http://localhost:3400/api/v1/admin/resources \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Resource"}'
# 期待: 401 Unauthorized

# 異常系: 入力検証エラー
curl -X POST http://localhost:3400/api/v1/admin/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: hotel_session=xxx" \
  -d '{}'
# 期待: 400 Bad Request
```

### 手動UIテスト手順
```markdown
1. ブラウザで `/admin/resources` にアクセス
2. 「新規作成」ボタンをクリック
3. フォームに入力
4. 「保存」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. 一覧画面に戻り、作成したリソースが表示されることを確認
```

## 🔐 セキュリティ（必須）

### 必須セキュリティ対策
- [ ] **認証チェック**: 全てのAPIで実施
- [ ] **テナント分離**: `tenant_id`フィルタリング必須
- [ ] **入力検証**: Zodスキーマで全入力検証
- [ ] **SQLインジェクション対策**: Prisma使用（直接SQL禁止）
- [ ] **XSS対策**: 出力エスケープ
- [ ] **CSRF対策**: Session認証 + SameSite Cookie
- [ ] **認可チェック**: ロール・権限確認

---

# ✅ Phase 3: 作成後の品質検証（必須）

## 🔍 完成したSSOTの最終チェック

**この段階で全ての項目をチェックし、1つでも不合格の場合は修正が必要です。**

### 基本チェック（全SSOT共通）

- [ ] **修正点以外は既存ドキュメント・ソースに則っているか**
  - 既存の命名規則を踏襲
  - 既存の認証方式を踏襲
  - 既存のエラーハンドリングパターンを踏襲

- [ ] **既存SSOTドキュメントと変数・パス等細部でズレ・矛盾がないか**
  - `tenant_id` vs `tenantId` の統一性
  - `user_id` vs `userId` の統一性
  - APIパス形式の統一性
  - 用語の統一性（「スタッフ」「ロール」「パーミッション」等）

- [ ] **これ以上のクオリティで作れないレベルでドキュメントを作成できたか**
  - 実装者が迷わない詳細度
  - サンプルコードの適切性
  - エラーケースの網羅性

- [ ] **システム間連携に関して完璧に想定したドキュメントか**
  - hotel-saas ↔ hotel-common の連携
  - hotel-pms ↔ hotel-common の連携
  - hotel-member ↔ hotel-common の連携
  - イベント駆動連携の明記

- [ ] **現在のUI構成をそのまま使えるか**
  - 既存画面の流用可能性
  - 既存コンポーネントの再利用可能性

- [ ] **UI構成を変えないといけない場合は提案をしたか**
  - 変更理由の明記
  - 改善提案の記載
  - 影響範囲の明記

- [ ] **管理画面用と客室端末用でSSOTは別々のものとして作成したか**
  - 混乱を避けるため明確に分離

- [ ] **ロードマップ記載のSSOTファイル名のみ作成したか**
  - 勝手にファイル名を決定していないか確認

### データベースチェック（テーブル含む場合）

- [ ] **DATABASE_NAMING_STANDARD.md v3.0.0に準拠しているか**
  
- [ ] **新規テーブル名**: `snake_case`（例: `unified_media`, `order_items`）
  
- [ ] **新規カラム名**: `snake_case`（例: `tenant_id`, `created_at`）
  
- [ ] **Prismaモデル名**: `PascalCase`（例: `UnifiedMedia`, `OrderItem`）
  
- [ ] **Prismaフィールド名**: `camelCase` + `@map`
  ```prisma
  tenantId String @map("tenant_id")  // ✅ 正しい
  tenant_id String                   // ❌ 間違い
  ```

- [ ] **`@@map`ディレクティブ**: 必須
  ```prisma
  @@map("unified_media")  // ✅ 正しい
  ```

- [ ] **既存テーブルは現状維持で記述しているか**
  - 既存の命名規則を強制変更していないか

- [ ] **テンプレートを使用しているか**
  - Prismaスキーマのサンプルコードが適切か

### APIチェック（動的パラメータ含む場合）

❌ **禁止パターンが使われていないか**:

- [ ] **2階層以上の動的パス**
  ```
  ❌ /api/v1/admin/orders/[id]/items/[itemId]
  ✅ /api/v1/admin/order-items/[itemId]?orderId=123
  ```

- [ ] **`index.*`ファイル**
  ```
  ❌ server/api/v1/admin/rooms/index.get.ts
  ✅ server/api/v1/admin/rooms/list.get.ts
  ```

✅ **推奨パターンが使われているか**:

- [ ] **1階層の動的パスのみ**
  ```
  ✅ /api/v1/admin/resources/[id].get.ts
  ```

- [ ] **フラット構造**
  ```
  ✅ /api/v1/admin/order-items/[itemId]
  ```

- [ ] **クエリパラメータ活用**
  ```
  ✅ /api/v1/admin/order-items?orderId=123
  ```

- [ ] **明示的なファイル名**
  ```
  ✅ list.get.ts, create.post.ts, [id].get.ts, [id].put.ts, [id].delete.ts
  ```

### 要件ID・Acceptチェック

- [ ] **全ての重要機能に要件ID（XXX-nnn形式）が付与されているか**

- [ ] **各要件IDにAccept（合格条件）が明確に記載されているか**
  - ✅ 正常系の条件
  - ❌ 異常系の条件

- [ ] **Test Cases（テストケース）が記載されているか**
  - APIテスト（curl）
  - 手動UIテスト手順

- [ ] **Type（型定義）が記載されているか**
  - Zodスキーマ
  - TypeScript型定義

### セキュリティチェック

- [ ] **認証チェックが全APIで必須と記載されているか**

- [ ] **テナント分離（`tenant_id`フィルタリング）が必須と記載されているか**

- [ ] **入力検証（Zod等）が必須と記載されているか**

- [ ] **SQLインジェクション対策（Prisma使用、直接SQL禁止）が記載されているか**

- [ ] **XSS対策（出力エスケープ）が記載されているか**

- [ ] **CSRF対策（Session認証）が記載されているか**

### 実装フローチェック

- [ ] **実装順序が明確に記載されているか**
  1. データベース関連（Prismaスキーマ、マイグレーション）
  2. サービス層（ビジネスロジック）
  3. API層（ルート、コントローラー）
  4. UI層（Pages、Components）
  5. テスト実装

- [ ] **システム境界が明確に記載されているか**
  - hotel-saas: プロキシ専用（Prisma使用禁止）
  - hotel-common: API基盤・DB層
  - hotel-pms: 独自DB・イベント駆動連携
  - hotel-member: 独自DB・イベント駆動連携

- [ ] **エラーハンドリングが統一されているか**

- [ ] **トラブルシューティングセクションがあるか**

### 品質スコア算出（100点満点）

以下の項目で自己評価してください：

**【基本品質】（30点）**
- [ ] SSOT構成完備（10点）
- [ ] 既存実装との整合性（10点）
- [ ] 既存SSOTとの整合性（10点）

**【技術仕様】（40点）**
- [ ] データベース設計（10点）
- [ ] API仕様（10点）
- [ ] UI仕様（10点）
- [ ] セキュリティ対策（10点）

**【実装ガイド】（20点）**
- [ ] 実装フロー明確性（10点）
- [ ] テストケース完備（10点）

**【追加価値】（10点）**
- [ ] トラブルシューティング（5点）
- [ ] パフォーマンス最適化（5点）

🎯 **目標**: 90点以上

---

# 📋 最終チェックリスト

SSOT作成完了報告前に以下を全て確認:

□ Phase 1: 作成前チェック完了
  □ SSOT作成資格確認
  □ 必須参照ドキュメント読了
  □ 既存実装・ドキュメント完全調査
  □ 必須確認事項26項目クリア

□ Phase 2: SSOT作成中の品質基準クリア
  □ 必須メタ情報記載
  □ 必須セクション構成完備
  □ システム境界明確化
  □ 要件ID体系適用
  □ データベース設計準拠（該当する場合）
  □ API仕様準拠（該当する場合）
  □ UI実装ガイド記載（該当する場合）
  □ テストケース完備
  □ セキュリティ対策記載

□ Phase 3: 作成後の品質検証クリア
  □ 基本チェック全項目合格
  □ データベースチェック全項目合格（該当する場合）
  □ APIチェック全項目合格（該当する場合）
  □ 要件ID・Acceptチェック全項目合格
  □ セキュリティチェック全項目合格
  □ 実装フローチェック全項目合格
  □ 品質スコア90点以上

全て✅の場合のみ「SSOT作成完了」と報告してください。

---

# 📚 参照ドキュメント一覧

## 基本ドキュメント
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`

## データベース関連
- `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
- `/Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md`
- `/Users/kaneko/hotel-kanri/.cursor/prompts/database_operation_rules.md`

## API関連
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`
- `/Users/kaneko/hotel-kanri/.cursor/prompts/api_routing_standard_reference.md`

## 既存SSOT（必読）
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_SCHEMA.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md`

---

ここまで読み込んだらまず「ssot_creation_complete_flow.md 読了」と表示すること







