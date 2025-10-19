# SSOT: SSOT品質チェックリスト（SSOT作成時必読）

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全SSOT作成時必須）

---

## 📋 このSSOTの目的

**SSOTを作成する際の品質基準を定義し、高品質で整合性のあるSSOTを作成するための必須チェックリスト。**

### 対象者

- ✅ **新規SSOT作成時**：AI実装者（Sun/Luna/Suno/Iza）
- ✅ **既存SSOT更新時**：AI実装者（Sun/Luna/Suno/Iza）
- ✅ **SSOT品質監査時**：Iza（統合管理者）

---

## 🚨 SSOT作成前の必須確認

### Phase 0: SSOT作成資格確認（1分）

```markdown
以下の質問に全て「YES」で答えられますか？

- [ ] このSSOTは `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md` のロードマップに記載されているか？
- [ ] SSOT作成指示書 `write_new_ssot.md` を読んだか？
- [ ] このSSOTが対象とするシステムの役割を理解しているか？
- [ ] 既存の関連SSOTを3つ以上読んだか？

❌ 1つでも「NO」がある場合：
  → SSOT作成を開始しない
  → ユーザーに確認する
```

**参照**:
- `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md`

---

## ✅ Phase 1: 既存ドキュメント・ソース調査（15分）

### 1-1. 既存SSOTとの整合性確認

```bash
# ✅ 関連するSSOTを全て読み込む
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/

# 特に重要（必読）：
# - SSOT_SAAS_MULTITENANT.md（テナント分離）
# - SSOT_SAAS_ADMIN_AUTHENTICATION.md（認証）
# - SSOT_DATABASE_SCHEMA.md（DB設計）
# - SSOT_IMPLEMENTATION_CHECKLIST.md（実装方針）
```

**チェック項目**:

- [ ] **変数名の統一**
  - [ ] `tenant_id` vs `tenantId` の統一性
  - [ ] `user_id` vs `userId` の統一性
  - [ ] SessionUser のプロパティ名（`user.user_id` が標準）

- [ ] **パスの統一**
  - [ ] APIパス形式（`/api/v1/admin/...`）
  - [ ] システム間連携パス（hotel-common経由）

- [ ] **認証方式の統一**
  - [ ] Session認証（Redis + HttpOnly Cookie）
  - [ ] JWT認証は非推奨（過去の仕様）

- [ ] **用語の統一**
  - [ ] 「スタッフ」vs「管理者」
  - [ ] 「ロール」vs「役割」
  - [ ] 「パーミッション」vs「権限」

**確認方法**:
```bash
# 既存SSOTで使われている用語を確認
grep -r "tenant_id\|tenantId" /Users/kaneko/hotel-kanri/docs/03_ssot/
grep -r "SessionUser" /Users/kaneko/hotel-kanri/docs/03_ssot/
grep -r "認証方式" /Users/kaneko/hotel-kanri/docs/03_ssot/
```

---

### 1-2. 既存ソースコードとの整合性確認

```bash
# ✅ 該当システムの既存実装を確認
# hotel-saas の場合：
ls -la /Users/kaneko/hotel-saas/pages/admin/
ls -la /Users/kaneko/hotel-saas/server/api/v1/admin/
ls -la /Users/kaneko/hotel-saas/composables/

# hotel-common の場合：
ls -la /Users/kaneko/hotel-common/src/routes/api/v1/admin/
ls -la /Users/kaneko/hotel-common/src/services/

# ✅ 類似機能の実装パターンを確認（3つ以上）
cat /Users/kaneko/hotel-common/src/routes/api/v1/admin/tenants.get.ts
cat /Users/kaneko/hotel-common/src/routes/api/v1/admin/staff.get.ts
cat /Users/kaneko/hotel-common/src/routes/api/v1/admin/roles.get.ts
```

**チェック項目**:

- [ ] **既存UIコンポーネントの確認**
  - [ ] 同じような画面がすでに存在しないか？
  - [ ] 再利用できるコンポーネントはあるか？
  - [ ] UIパターンは統一されているか？

- [ ] **既存APIパターンの確認**
  - [ ] SessionUserの使われ方（`user.user_id` vs `user.id`）
  - [ ] 認証チェックパターン（`checkPermission`の引数）
  - [ ] エラーハンドリング（`createError`の形式）
  - [ ] レスポンス形式（成功時・エラー時）

- [ ] **既存DBスキーマの確認**
  - [ ] 関連テーブルがすでに存在しないか？
  - [ ] 命名規則（snake_case）が統一されているか？
  - [ ] リレーションの定義が正しいか？

**確認方法**:
```bash
# SessionUser の使われ方を確認
grep -r "user\.user_id\|user\.id" /Users/kaneko/hotel-common/src/routes/api/v1/admin/*.ts

# 認証チェックパターンを確認
grep -r "checkPermission" /Users/kaneko/hotel-common/src/routes/api/v1/admin/*.ts | head -5

# 既存テーブル確認
cat /Users/kaneko/hotel-common/prisma/schema.prisma | grep "model"
```

---

### 1-3. システム間連携の想定

**チェック項目**:

- [ ] **hotel-saas → hotel-common 連携**
  - [ ] API呼び出し形式（`$fetch`）
  - [ ] エラーハンドリング（try/catch）
  - [ ] タイムアウト設定

- [ ] **hotel-common → hotel-pms 連携**
  - [ ] イベント駆動（EventBus）
  - [ ] データ同期タイミング
  - [ ] エラー時のロールバック

- [ ] **hotel-common → hotel-member 連携**
  - [ ] API呼び出し（FastAPI）
  - [ ] 認証ヘッダー（X-Tenant-ID）
  - [ ] レスポンス形式

**確認方法**:
```bash
# 既存の連携パターンを確認
grep -r "\$fetch" /Users/kaneko/hotel-saas/composables/*.ts
grep -r "EventBus" /Users/kaneko/hotel-common/src/
```

---

## ✅ Phase 2: SSOT作成時チェック（30分）

### 2-1. データベーステーブルが含まれる場合

**必須参照**:
- `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md` v3.0.0
- `/Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md`

**チェック項目**:

- [ ] **テーブル名**
  - [ ] 新規テーブル：`snake_case` で命名
  - [ ] 既存テーブル：現状維持で記述

- [ ] **カラム名**
  - [ ] 新規カラム：`snake_case` で命名
  - [ ] 既存カラム：現状維持で記述

- [ ] **Prismaモデル**
  - [ ] モデル名：`PascalCase`
  - [ ] フィールド名：`camelCase` + `@map("snake_case")` 必須
  - [ ] `@@map("table_name")` 必須

- [ ] **テンプレート使用**
  ```prisma
  model ExampleTable {
    id         String   @id @default(uuid()) @map("id")
    tenantId   String   @map("tenant_id")
    createdAt  DateTime @default(now()) @map("created_at")
    updatedAt  DateTime @updatedAt @map("updated_at")
    
    @@map("example_table")
    @@index([tenantId])
  }
  ```

**確認コマンド**:
```bash
# 既存テーブルの命名規則を確認
cat /Users/kaneko/hotel-common/prisma/schema.prisma | grep "@@map"
```

---

### 2-2. APIパス（動的パラメータ）が含まれる場合

**必須参照**:
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`

**チェック項目**:

❌ **禁止パターン**:
- [ ] 2階層以上の動的パス（例: `/[id]/items/[itemId]`）
- [ ] `index.*` ファイル（例: `index.get.ts`）
- [ ] 深いネスト（例: `/api/v1/admin/orders/[id]/items/[itemId]`）

✅ **推奨パターン**:
- [ ] 1階層の動的パスのみ（例: `/[id].get.ts`）
- [ ] フラット構造（例: `/order-items/[itemId]`）
- [ ] クエリパラメータ活用（例: `?orderId=123`）
- [ ] 明示的なファイル名（例: `list.get.ts`, `create.post.ts`）

**例**:
```typescript
// ❌ 禁止
/server/api/v1/admin/orders/[id]/items/[itemId].get.ts

// ✅ 推奨
/server/api/v1/admin/order-items/[itemId].get.ts
// クエリパラメータで注文指定: ?orderId=xxx
```

**確認コマンド**:
```bash
# 既存のAPIルーティングを確認
ls -la /Users/kaneko/hotel-saas/server/api/v1/admin/
find /Users/kaneko/hotel-saas/server/api -name "index.*.ts"
```

---

### 2-3. Expressルーティング順序（hotel-common）

**必須参照**:
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md`

**チェック項目**:

- [ ] **具体的パスを先に登録**
  ```typescript
  // ✅ 正しい順序
  router.put('/roles/permissions', ...) // 具体的パス
  router.get('/roles/:id', ...)          // パラメータパス
  
  // ❌ 間違い
  router.get('/roles/:id', ...)          // 先に登録すると
  router.put('/roles/permissions', ...) // これがマッチしない
  ```

- [ ] **index.ts での登録順序確認**
  ```bash
  cat /Users/kaneko/hotel-common/src/routes/api/v1/admin/index.ts
  ```

---

### 2-4. 認証・権限チェック

**チェック項目**:

- [ ] **SessionUser プロパティ**
  - [ ] `user.user_id` を使用（`user.id` ではない）
  - [ ] `user.tenant_id` を使用（`user.tenantId` ではない）

- [ ] **認証チェック実装**
  ```typescript
  // ✅ 正しいパターン
  const session = await getSession(sessionId)
  if (!session || !session.user) {
    throw createError({ statusCode: 401, message: '認証が必要です' })
  }
  
  const user = session.user
  const userId = user.user_id    // ← user.user_id を使用
  const tenantId = user.tenant_id
  ```

- [ ] **権限チェック実装**
  ```typescript
  // ✅ 正しいパターン
  const hasPermission = await checkPermission(
    user.user_id,  // ← user.user_id を使用
    'resource',
    'action'
  )
  ```

**確認コマンド**:
```bash
# 既存の実装パターンを確認
grep -r "user\.user_id" /Users/kaneko/hotel-common/src/routes/api/v1/admin/*.ts
grep -r "checkPermission" /Users/kaneko/hotel-common/src/routes/api/v1/admin/*.ts
```

---

### 2-5. UI構成の実装可能性

**チェック項目**:

- [ ] **現在のUI構成をそのまま使えるか？**
  - [ ] 既存コンポーネントで実現可能か？
  - [ ] レイアウトは統一されているか？
  - [ ] レスポンシブデザイン対応可能か？

- [ ] **UI構成を変えないといけない場合**
  - [ ] 変更理由を明記
  - [ ] 変更内容を具体的に提案
  - [ ] ユーザーに承認を得る

**確認コマンド**:
```bash
# 既存UIコンポーネントを確認
ls -la /Users/kaneko/hotel-saas/components/
ls -la /Users/kaneko/hotel-saas/pages/admin/
```

---

### 2-6. 管理画面用と客室端末用の分離

**重要ルール**:

- [ ] **管理画面用と客室端末用でSSOTは別々に作成**
  - [ ] 理由：混乱を避けるため
  - [ ] 命名規則：
    - 管理画面：`SSOT_ADMIN_*.md`
    - 客室端末：`SSOT_DEVICE_*.md`

**例**:
```
✅ 正しい：
  - SSOT_ADMIN_AI_CONCIERGE.md（管理画面）
  - SSOT_DEVICE_AI_CONCIERGE.md（客室端末）

❌ 間違い：
  - SSOT_AI_CONCIERGE.md（両方を1つにまとめる）
```

---

## ✅ Phase 3: SSOT作成後チェック（10分）

### 3-1. 最終品質チェック

**チェック項目**:

- [ ] **これ以上のクオリティで作れないレベルか？**
  - [ ] 曖昧な表現がないか？
  - [ ] 具体的な実装例があるか？
  - [ ] エラーハンドリングが明記されているか？
  - [ ] テストケースがあるか？

- [ ] **ロードマップ上のファイル名か？**
  - [ ] `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md` に記載されているか？
  - [ ] 勝手にファイル名を決めていないか？

**確認方法**:
```bash
# ロードマップ確認
cat /Users/kaneko/hotel-kanri/docs/03_ssot/README.md | grep "SSOT_YOUR_FEATURE"
```

---

### 3-2. 自己チェックリスト

**以下の質問に全て「YES」で答えられるか？**

#### 整合性チェック
- [ ] 修正点以外は既存のドキュメント及びソースに則っているか？
- [ ] 既存のSSOTと変数やパスなど細かい部分でズレ・矛盾がないか？
- [ ] データベース命名規則に準拠しているか？（該当する場合）
- [ ] APIルーティングガイドラインに準拠しているか？（該当する場合）

#### 品質チェック
- [ ] これ以上のクオリティで作れないレベルか？
- [ ] システム間の連携に関しても完璧に想定できているか？
- [ ] 現在のUI構成をそのまま使えるか？（または変更提案済みか？）

#### 形式チェック
- [ ] 管理画面用と客室端末用でSSOTは別々か？
- [ ] ロードマップ上に記載のあるSSOTファイル名か？
- [ ] バージョン情報が記載されているか？

#### 実装可能性チェック
- [ ] 実装手順が明確か？（Phase 1-5）
- [ ] エラーハンドリングが定義されているか？
- [ ] テストケースが定義されているか？
- [ ] ロールバック手順が定義されているか？

**1つでも「NO」がある場合**:
→ 該当箇所を修正してから提出

---

## 📊 SSOT作成報告テンプレート

SSOT作成完了時は、以下のテンプレートで報告してください：

```markdown
## ✅ SSOT作成完了報告

### 作成したSSO
- ファイル名: `SSOT_XXX.md`
- バージョン: v1.0.0
- 優先度: 🔴 最高
- 対象システム: hotel-saas, hotel-common

### Phase 1: 既存調査結果
- ✅ 既存SSOT 3件確認済み
  - SSOT_AAA.md
  - SSOT_BBB.md
  - SSOT_CCC.md
- ✅ 既存ソース確認済み
  - /path/to/file1.ts
  - /path/to/file2.ts
- ✅ 整合性確認済み
  - SessionUser: `user.user_id` 使用
  - 認証: `checkPermission(user.user_id, ...)` 使用
  - APIパス: フラット構造採用

### Phase 2: SSOT作成チェック
- ✅ データベース命名規則準拠（該当する場合）
- ✅ APIルーティングガイドライン準拠（該当する場合）
- ✅ Expressルーティング順序確認（該当する場合）
- ✅ SessionUser プロパティ統一
- ✅ UI実装可能性確認済み
- ✅ システム間連携想定済み

### Phase 3: 最終チェック
- ✅ ロードマップ記載のファイル名
- ✅ 品質基準クリア
- ✅ 自己チェックリスト全項目クリア

### 次のステップ
このSSOTに基づいて実装を開始してよろしいでしょうか？
```

---

## 🤖 AI実装者への指示

### SSOT作成時の必須手順

```markdown
Step 0: このSSO（SSOT_QUALITY_CHECKLIST.md）を読む

Step 1: Phase 1実行（既存調査）
  - 既存SSOT 3件以上確認
  - 既存ソース確認
  - 整合性確認
  - 調査結果をユーザーに報告

Step 2: ユーザーの承認を得る

Step 3: Phase 2実行（SSOT作成）
  - チェック項目を1つずつ確認しながら作成
  - 該当しない項目はスキップ

Step 4: Phase 3実行（最終チェック）
  - 自己チェックリスト全項目確認
  - 不備があれば修正

Step 5: 完成報告
  - テンプレートに従って報告
  - ユーザーの承認を得る
```

---

## 📚 関連ドキュメント

### 必読ドキュメント

1. **SSOT作成ルール**
   - `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md`

2. **実装チェックリスト**
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md`

3. **データベース命名規則**
   - `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`
   - `/Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md`

4. **APIルーティングガイドライン**
   - `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
   - `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`

5. **既存SSOT再チェック用**
   - `/Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md`

---

## 🎯 期待される効果

### Before（チェックリストなし）

```
SSOT作成（2時間） → 実装（3時間） → エラー発見（1時間） → SSOT修正（1時間） → 再実装（2時間）
合計: 9時間
```

### After（チェックリスト適用後）

```
既存調査（15分） → SSOT作成（30分） → チェック（10分） → 実装（1時間） → 完了
合計: 2時間（約4.5倍速）
```

### 品質改善

| 項目 | Before | After |
|------|--------|-------|
| SSOT・実装の不整合 | 60% | 5% |
| 命名規則違反 | 40% | 0% |
| APIルーティングミス | 30% | 0% |
| 実装後の手戻り | 平均2回 | 平均0.2回 |

---

## 📝 バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0.0 | 2025-10-14 | 初版作成 |

---

**作成者**: Iza（統合管理者）  
**レビュー**: Luna（実エラー経験者）  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0

