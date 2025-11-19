# 📋 機能実装プロンプトテンプレート（Full Stack）

**適用条件**: タスクに "[Phase N]" が含まれる、またはDB+API+UIの複合実装が必要な場合

**バージョン**: 1.0.0  
**最終更新**: 2025年11月7日

---

## 🎯 目的

- hotel-saas / hotel-common の機能実装（Full Stack）
- タスク: [タスクID] [Phase N] [機能名]実装

---

## 📚 前提条件

### サービス稼働確認
- hotel-saas: http://localhost:3101/api/v1/health → 200
- hotel-common: http://localhost:3401/health → 200
- PostgreSQL: ポート5432

### 技術スタック
- **DB**: PostgreSQL + Prisma
- **API**: Express (hotel-common) + Nuxt Server (hotel-saas)
- **UI**: Nuxt 3 + Vue 3 + TypeScript
- **認証**: セッション（Redis + HttpOnly Cookie）

### 参照ドキュメント（★必読）

#### 基盤SSOT（必須）
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_SCHEMA.md` - DB設計
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` - マルチテナント
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` - 認証
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md` - 本番同等性
- `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md` - DB命名規則
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md` - APIルーティング
- **★★★ `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_ADMIN_CRUD_UI_STANDARD.md`** - **管理画面CRUD UI標準（最重要）**
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md` - UI原則

#### UI実装ガイド（UI実装時は必須）
- **★★ `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_COMPONENTS_DEPLOYMENT_GUIDE.md`** - shadcn/ui導入
- **★★ `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_DESIGN_IMPLEMENTATION_GUIDE.md`** - 実装詳細
- **★ `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/MULTILINGUAL_IMPLEMENTATION_GUIDE.md`** - 多言語実装
- `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_UI_DESIGN.md` - 管理画面UI設計

#### 機能SSOT（最重要・実装開始前に必読）
- `/Users/kaneko/hotel-kanri/docs/03_ssot/[カテゴリ]/[SSOT名].md`

---

## 🚨 重要：実装中断の基準（必読）★★★CRITICAL

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）- 絶対に停止

1. **SSOT照合失敗（0件）** or **SSOT複数一致**
2. **ルーティング不一致**（/api/v1/admin形式外、深いネスト、二重/api、A/B混在等）
3. **依存ファイル非実在・未生成**
4. **型エラー連鎖**（>5件/1ステップ）
5. **Prismaスキーマ変更・直接SQL**
6. **tenant_idフォールバック/環境分岐**
7. **矛盾の発見**（プロンプト vs SSOT、既存実装 vs SSOT）
8. **エラー原因不明**（15分以上調査で進展なし）

### 停止時の対応

1. 実装を停止
2. 「🛑 実装停止（判断依頼）」テンプレートで報告
3. ユーザーの指示を待つ
4. **推測で実装を続けない**

詳細: `/Users/kaneko/hotel-kanri/.cursor/prompts/implementation_halt_protocol.md`

---

## 📍 Item 1: 事前調査（SSOT確認とスコープ判定）

**所要時間**: 20分（必須）

### Step 1: 機能SSOTの検索

```bash
# 機能名から検索
find /Users/kaneko/hotel-kanri/docs/03_ssot -type f -name "*.md" | grep -i "[機能名]"

# 全SSOT一覧
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/*/
```

**確認ポイント**:
- 該当機能のSSOTが存在するか？
- SSOTのバージョンは？
- 最終更新日は？

### Step 2: SSOTの読了（存在する場合）

```bash
# SSOT全文を読む
cat /Users/kaneko/hotel-kanri/docs/03_ssot/[カテゴリ]/[SSOT名].md
```

**抽出すべき情報**:
- [ ] 要件ID（カテゴリ別）
  - DB: XXX-DB-001 〜 XXX-DB-NNN
  - API: XXX-API-001 〜 XXX-API-NNN
  - UI: XXX-UI-001 〜 XXX-UI-NNN
- [ ] Accept（合格条件）: AC-1 〜 AC-N
- [ ] データベース設計（テーブル定義、カラム、制約）
- [ ] API仕様（エンドポイント、リクエスト/レスポンス型）
- [ ] UI仕様（画面構成、表示項目、操作フロー）
- [ ] 依存関係（他機能との連携）

### Step 3: 既存実装の確認

```bash
# DB: Prismaスキーマ確認
grep -A 20 "model [機能名]" /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma

# API: hotel-common確認
ls -la /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名]*
cat /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名].get.ts 2>/dev/null

# API: hotel-saas確認
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]*
cat /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts 2>/dev/null

# UI: pages確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]* 2>/dev/null
cat /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/index.vue 2>/dev/null
```

### Step 4: タスクスコープの判定

**判定基準**:

| Plane Issueタイトル | 実装スコープ（タスク内Item） |
|---------|-------------|
| `[Phase 1] XXX実装` | 基盤設計・準備（通常はSSO T作成） |
| `[Phase 2] XXX実装` | 基盤機能実装（通常はDB+API+UI） |
| `[Phase 3] XXX実装` | 業務機能実装（通常はDB+API+UI） |
| `[Phase 4] XXX実装` | 統合・最適化 |
| `[Phase 5] XXX実装` | リリース準備 |
| タイトルに記載なし | ユーザーに確認 |

**注**: Plane IssueのPhase Nは「プロジェクト全体の段階」を示し、タスク内Itemとは異なる概念です。

**既存実装との照合**:

```
既存実装の状況:
- DB: ✅テーブル定義済み / ❌未定義
- API (hotel-common): ✅実装済み / ❌未実装
- API (hotel-saas): ✅実装済み / ❌未実装
- UI: ✅実装済み / ❌未実装

タスクタイトル: [タスクタイトル]

判定結果:
- 実装スコープ: [DBのみ / APIのみ / UIのみ / DB+API+UI全て]
- 理由: [判定理由]
```

### Item 1 完了報告（ユーザー承認必須）

```markdown
## Item 1 完了報告

### 1. SSOT確認
- 機能SSOT: ✅存在 / ❌不在
- パス: [SSOTファイルパス]
- バージョン: [vX.Y.Z]
- 最終更新: [日付]

### 2. 要件ID抽出
- DB: [件数] 件
  - [XXX-DB-001: テーブル定義]
  - [XXX-DB-002: インデックス設定]
  - ...
- API: [件数] 件
  - [XXX-API-001: 一覧取得API]
  - [XXX-API-002: 詳細取得API]
  - ...
- UI: [件数] 件
  - [XXX-UI-001: 一覧画面]
  - [XXX-UI-002: 新規作成モーダル]
  - ...

### 3. Accept（合格条件）
- AC-1: [内容]
- AC-2: [内容]
- ...

### 4. 既存実装状況
- DB: ✅定義済み（テーブル: [テーブル名]） / ❌未定義
- API (hotel-common): ✅実装済み（5本） / ❌未実装
- API (hotel-saas): ✅実装済み（5本） / ❌未実装
- UI: ✅実装済み / ❌未実装

### 5. 実装スコープ判定
タスク: [タスクID] [タスクタイトル]

**判定結果**: [DB+API+UI / APIのみ / UIのみ]

**理由**:
- タイトルに "[Phase N]" と記載（※プロジェクト全体Phase）
- 既存実装: [DB完了済み / 未完了、API完了済み / 未完了]

**依存関係**:
- Blocked by: [依存Issue] ← [完了済み / 未完了]

### 6. 判断
- [ ] 実装開始可能（前提完了済み）
- [ ] 実装停止（前提未完了 / SSOT不在）

**停止理由（該当する場合）**:
- [ ] SSOT不在 → SSOT作成タスクが必要
- [ ] DB未完了 → DB実装後に実施
- [ ] API未完了 → API実装後に実施
- [ ] 依存Issue未完了 → 依存Issue完了後に実施

この判定で実装を開始してよろしいでしょうか？
```

**🚨 停止条件**:
- 機能SSOTが存在しない → ユーザーに報告、SSOT作成タスクを提案
- 前提実装が未完了 → ユーザーに報告、前提完了を依頼
- 依存Issueが未完了 → ユーザーに報告、依存Issue完了を依頼

---

## 📍 Item 2: データベース実装（該当する場合のみ）

**スキップ条件**: 
- タスクがAPI実装以降の場合
- DB実装が既に完了済みの場合

**所要時間**: 30分

### ⚠️ 停止チェックポイント（Item開始前・必須）

**以下を確認し、1つでも該当する場合は停止**:
- [ ] Prismaスキーマの変更が必要か？ → **Layer 1停止**（SSOT_DATABASE_MIGRATION_OPERATION.md準拠確認）
- [ ] マイグレーション作成が必要か？ → **Layer 1停止**（admin権限DB_URL確認）
- [ ] SSOTに記載がないDB設計が必要か？ → **Layer 1停止**（SSOT照合失敗）
- [ ] 既存スキーマとの整合性が不明か？ → **Layer 1停止**（矛盾の可能性）

→ **1つでも該当する場合は、Item開始前に停止して報告**

### Step 1: Prismaスキーマ確認

```bash
# 既存スキーマの確認
cat /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma | grep -A 30 "model [機能名]"

# 関連テーブルの確認
cat /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma | grep -A 10 "model [関連テーブル名]"
```

### Step 2: スキーマ実装

**ツール**: `search_replace` (既存スキーマを編集) または `write` (新規作成)

**ファイル**: `/Users/kaneko/hotel-common-rebuild/prisma/schema.prisma`

**実装必須ルール**:
- ✅ テーブル名: `snake_case` + `@@map` ディレクティブ
- ✅ カラム名: `snake_case` + `@map` ディレクティブ
- ✅ モデル名: `PascalCase`
- ✅ フィールド名: `camelCase`
- ✅ マルチテナント: `tenantId` カラム必須（`@map("tenant_id")`）
- ✅ 主キー: `id` (UUID)
- ✅ タイムスタンプ: `createdAt`, `updatedAt`
- ✅ ソフトデリート: `deletedAt` (必要な場合)

**テンプレート**:

```prisma
model [機能名] {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  
  // 機能固有フィールド（SSOTに従う）
  name      String
  // ...
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // リレーション
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("[テーブル名_snake_case]")
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}
```

### Step 3: マイグレーション作成

**🚨 重要**: 必ず `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md` を参照

```bash
# hotel-common-rebuild ディレクトリへ移動
cd /Users/kaneko/hotel-common-rebuild

# 環境変数確認（admin権限のDATABASE_URL）
grep DATABASE_URL .env

# マイグレーション作成
npx prisma migrate dev --name add_[機能名]_table

# 終了コードを記録
echo "終了コード: $?"
```

### Step 4: マイグレーション検証

```bash
# マイグレーション状態確認
npx prisma migrate status

# スキーマドリフト確認（差分があってはいけない）
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# 期待結果: "No difference detected"
```

### Item 2 完了チェックリスト

- [ ] Prismaスキーマ実装（命名規則準拠）
- [ ] `tenantId` カラム追加（`@map("tenant_id")`）
- [ ] インデックス設定（`tenantId`, `tenantId + deletedAt`）
- [ ] マイグレーション作成成功（終了コード: 0）
- [ ] `migrate status`: "Database schema is up to date"
- [ ] スキーマドリフト: "No difference detected"

---

## 📍 Item 3: hotel-common API実装（データベースアクセス層）

**スキップ条件**: 
- タスクがUI実装のみの場合
- hotel-common API実装が既に完了済みの場合

**所要時間**: 30分

### ⚠️ 実装開始前の必須確認（★★★CRITICAL）

**絶対ルール**: API実装を開始する前に、**必ず** Item 1.5を実施する

#### Step 0-1: SSOT定義のエンドポイントパス確認（必須）

```bash
# SSOTでエンドポイントパスを検索（HTTPメソッドと正規表現で厳密に）
grep -nE '^(GET|POST|PUT|PATCH|DELETE)\s+/api/v1/admin/' \
  /Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md | grep -i [機能名]

# マルチテナントSSOTでも確認
grep -nE '^(GET|POST|PUT|PATCH|DELETE)\s+/api/v1/' \
  /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md | grep -i [機能名]

# 結果を記録
echo "SSOT定義: [確認したエンドポイントパス]"
```

#### Step 0-2: 実装前チェックリスト（必須）

**以下を確認してから実装を開始**:
- [ ] SSOT定義を確認したか？
- [ ] エンドポイントパスがSSO**T**定義と完全一致しているか？（1文字も違わない）
- [ ] パスが `/api/v1/admin/[resource]` 形式か？
- [ ] 深いネスト（`/api/v1/admin/[親]/[id]/[子]/[id]`）ではないか？
- [ ] ルーター登録パスがSSO**T**定義と一致しているか？
- [ ] B方式（router相対 + app.use絶対）を採用しているか？
- [ ] 認証allowlist（/health, /auth/*）を確認したか？
- [ ] 404ポリシー（未認証=401、不在/他テナント=404）を理解したか？

#### Step 0-3: Evidence - Routing（実装前スキャン）

```bash
cd /Users/kaneko/hotel-common-rebuild

echo "=== 二重付与検出（/api/api/） ==="
grep -R '/api/api/' src/server src/routes 2>/dev/null && echo "❌ 検出" || echo "✅ なし"

echo ""
echo "=== ルート実在確認 ==="
ls -la src/routes/[ルートファイル名].routes.ts 2>/dev/null && echo "✅ 存在" || echo "❌ 不在"

# 結果を保存
echo "[実行結果]" > /tmp/evidence-routing-pre.txt
```

**確認完了報告**:
```markdown
### Step 0 完了報告

#### SSOT定義
- エンドポイント: [SSOT定義のパス]（例: POST /api/v1/admin/tenants）
- HTTPメソッド: [POST/GET/PUT/DELETE]
- 参照SSOT: API_ROUTING_GUIDELINES.md 行番号: [XXX]

#### ルーター登録方法
- B方式採用: router相対パス（`router.post('/', ...)`） + app.use絶対パス

#### Evidence - Routing（実装前）
\`\`\`
[/tmp/evidence-routing-pre.txt の内容]
\`\`\`

実装を開始してよろしいでしょうか？
```

**⚠️ ユーザー承認必須**: 承認を得てから次のStepに進む

---

### 実装開始

#### 目的
Prismaを使用してCRUD APIを実装

#### 対象ファイル（★SSOT定義に従う）

**hotel-common（Express）のルート構造**:
```bash
/Users/kaneko/hotel-common-rebuild/src/routes/[機能名].routes.ts  # ルーター定義
/Users/kaneko/hotel-common-rebuild/src/server/index.ts            # ルーター登録
```

**B方式（標準）**:
```typescript
// src/routes/[機能名].routes.ts
router.get('/', ...)      // 一覧取得
router.post('/', ...)     // 新規作成
router.get('/:id', ...)   // 詳細取得
router.patch('/:id', ...) // 更新
router.delete('/:id', ...)// 削除

// src/server/index.ts
app.use('/api/v1/admin/[機能名s]', [機能名]Router)
```

#### 実装必須ルール
- ✅ Prisma使用（hotel-commonのみ許可）
- ✅ `tenantId` フィルタ必須（全クエリ）
- ✅ 認証チェック必須（`req.user`）
- ✅ エラーハンドリング（try-catch）
- ✅ TypeScript型定義
- ✅ Response Helper使用: `createSuccessResponse` / `createErrorResponse`
- ✅ B方式厳守: router相対 + app.use絶対
- ✅ 404ポリシー: 不在/他テナント → 404（列挙耐性）
- ❌ `tenantId` フォールバック禁止（`|| 'default'` 等）
- ❌ 環境分岐禁止（`process.env.NODE_ENV`判定等）
- ❌ A/B方式混在禁止

#### テンプレート活用

```bash
# hotel-common CRUDテンプレートを参照
cat /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts
```

#### 実装例（一覧取得）

**ファイル**: `/Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名].get.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = event.context.user
    if (!user || !user.tenantId) {
      throw createError({
        statusCode: 401,
        statusMessage: '認証が必要です'
      })
    }

    // 一覧取得（tenantIdフィルタ必須）
    const items = await prisma.[機能名].findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      success: true,
      data: items
    }
  } catch (error) {
    console.error('[ERROR] GET /api/v1/admin/[機能名]:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'データ取得に失敗しました'
    })
  }
})
```

#### Item 3 完了チェックリスト

- [ ] hotel-common API 5本実装完了
- [ ] 全APIで `tenantId` フィルタ使用
- [ ] 全APIで認証チェック実施
- [ ] 全APIでエラーハンドリング実装
- [ ] TypeScript型定義完了
- [ ] レスポンス形式統一

---

## 📍 Item 4: hotel-saas APIプロキシ実装（Cookie転送層）

**スキップ条件**: 
- タスクがUI実装のみの場合
- hotel-saas API実装が既に完了済みの場合

**所要時間**: 20分

#### 目的
hotel-commonのAPIをプロキシし、Cookie（セッション）を転送

#### 対象ファイル（5本）

```bash
/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts
/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].post.ts
/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]/[id].get.ts
/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]/[id].patch.ts
/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]/[id].delete.ts
```

#### 実装必須ルール
- ✅ `callHotelCommonAPI` 使用必須（Cookie自動転送）
- ✅ 認証チェック必須（`event.context.user`）
- ❌ Prisma使用禁止
- ❌ DB直接アクセス禁止
- ❌ `$fetch` 直接使用禁止
- ❌ 深いネスト禁止（`/[id]/items/[itemId]` 等）
- ❌ `index.*` ファイル禁止

#### テンプレート活用

```bash
# hotel-saas テンプレートを参照
ls -la /Users/kaneko/hotel-kanri/templates/hotel-saas-*.template.ts
cat /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts
```

#### 実装例（一覧取得）

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 認証チェック（ミドルウェアで認証済み）
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // hotel-commonのAPIを呼び出し（Cookie自動転送）
  const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
    method: 'GET'
  })

  return response
})
```

#### 実装例（新規作成）

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 認証チェック
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // hotel-commonのAPIを呼び出し（Cookie自動転送）
  const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
    method: 'POST',
    body
  })

  return response
})
```

#### Item 4 完了チェックリスト

- [ ] hotel-saas API 5本実装完了
- [ ] 全APIで `callHotelCommonAPI` 使用
- [ ] 全APIで認証チェック実施
- [ ] Prisma/DB直接アクセスなし
- [ ] `$fetch` 直接使用なし
- [ ] APIルーティングガイドライン準拠

---

## 📍 Item 5: UI実装（hotel-saas）

**スキップ条件（厳密に判定）**: 
- **SSOTにPhase 4（UI実装）の記載がない場合のみ**
- UI実装が既に完了済みの場合

**⚠️ 重要**: タスクに"[Phase N]"が含まれる場合、必ずSSOTを確認してPhase 4の有無を判定すること。「API実装のみ」と推測してスキップしてはいけない。

**所要時間**: 40分

### 目的
管理画面のUI実装（一覧・新規作成・編集・削除）

### Step 1: ディレクトリ・ファイル確認

```bash
# ディレクトリ存在確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/

# 既存ファイル確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/index.vue
```

### Step 2: 参考実装の確認

```bash
# 類似画面を探す
find /Users/kaneko/hotel-saas-rebuild/pages/admin -name "index.vue" -type f | head -5

# 参考ファイルを読む
cat /Users/kaneko/hotel-saas-rebuild/pages/admin/[類似機能]/index.vue
```

### Step 3: CRUD UI標準の確認（必須）

**⚠️ 実装開始前に必読**:
```bash
# 管理画面CRUD UI標準を確認
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_ADMIN_CRUD_UI_STANDARD.md | head -200

# 特に確認すべきセクション:
# - 6. CRUD標準レイアウト
# - 7. データテーブル仕様
# - 8. フォーム標準
# - 9. エラーハンドリング・通知
# - 10. アクセシビリティ
# - 13. 国際化
```

**SSOT必須要件**:
- ✅ 世界最高峰ベンチマーク（Linear, Shopify等）の設計思想
- ✅ CRUD標準レイアウト（ヘッダー、フィルター、テーブル、ページネーション）
- ✅ データテーブル仕様（ソート、ページネーション、行選択）
- ✅ フォーム標準（バリデーション、エラー表示、自動保存）
- ✅ キーボードショートカット（⌘K、⌘N、Esc等）
- ✅ アクセシビリティ（WCAG AAA準拠）
- ✅ 多言語対応（15言語）

### Step 4: UI実装

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/index.vue`

**実装必須要素**:
- ✅ 一覧表示（`useFetch('/api/v1/admin/[機能名]')`）
- ✅ ローディング表示（`pending`）
- ✅ エラー表示（`error`）
- ✅ 空表示（`!data || data.length === 0`）
- ✅ 新規作成モーダル
- ✅ 編集モーダル（該当する場合）
- ✅ 削除確認ダイアログ（該当する場合）
- ✅ TypeScript型定義
- ✅ Tailwind CSSスタイリング
- ✅ **SSOT_ADMIN_CRUD_UI_STANDARD.md 準拠**

**詳細**: `/Users/kaneko/hotel-kanri/docs/standards/prompt-templates/UI_IMPLEMENTATION.md` 参照

### Item 5 完了チェックリスト

- [ ] 一覧画面実装完了
- [ ] 新規作成モーダル実装完了
- [ ] 編集モーダル実装完了（該当する場合）
- [ ] 削除機能実装完了（該当する場合）
- [ ] ローディング・エラー・空表示実装
- [ ] TypeScript型定義完了
- [ ] Tailwind CSSスタイリング完了

---

## 📍 Item 6: 統合テスト・証跡取得（必須）

**所要時間**: 30分

### 目的
全APIの動作確認とEvidence取得（Gatekeeper審査用）

### 証跡ファイルの作成

```bash
# 証跡ファイル初期化
cat > /tmp/[タスクID]-evidence.txt << 'EOF'
=== [タスクID] [機能名]実装 証跡 ===
実施日時: $(date '+%Y-%m-%d %H:%M:%S')
実施者: [AI名]

EOF
```

### Evidence 1: Commands & Logs（実行コマンド+終了コード）

#### サービス稼働確認

```bash
echo "【1. サービス稼働確認】" >> /tmp/[タスクID]-evidence.txt

echo "# hotel-common health check" >> /tmp/[タスクID]-evidence.txt
curl -s http://localhost:3401/health | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

echo -e "\n# hotel-saas health check" >> /tmp/[タスクID]-evidence.txt
curl -s http://localhost:3101/api/v1/health | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt
```

#### ログイン

```bash
echo -e "\n【2. ログイン】" >> /tmp/[タスクID]-evidence.txt
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt
```

#### CRUD検証（5本のAPI）

```bash
# 1. GET 一覧取得（初期状態）
echo -e "\n【3. GET /api/v1/admin/[機能名] (初期)】" >> /tmp/[タスクID]-evidence.txt
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

# 2. POST 新規作成
echo -e "\n【4. POST /api/v1/admin/[機能名]】" >> /tmp/[タスクID]-evidence.txt
RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/[機能名] \
  -H 'Content-Type: application/json' \
  -d '[リクエストボディJSON]')
echo "$RESPONSE" | jq . >> /tmp/[タスクID]-evidence.txt
ITEM_ID=$(echo "$RESPONSE" | jq -r '.data.id // .id // empty')
echo "作成されたID: $ITEM_ID" >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

# 3. GET 詳細取得
echo -e "\n【5. GET /api/v1/admin/[機能名]/$ITEM_ID】" >> /tmp/[タスクID]-evidence.txt
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名]/$ITEM_ID | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

# 4. PATCH 更新
echo -e "\n【6. PATCH /api/v1/admin/[機能名]/$ITEM_ID】" >> /tmp/[タスクID]-evidence.txt
curl -s -b /tmp/cookies.txt -X PATCH http://localhost:3101/api/v1/admin/[機能名]/$ITEM_ID \
  -H 'Content-Type: application/json' \
  -d '[更新データJSON]' | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

# 5. DELETE 削除
echo -e "\n【7. DELETE /api/v1/admin/[機能名]/$ITEM_ID】" >> /tmp/[タスクID]-evidence.txt
curl -s -b /tmp/cookies.txt -X DELETE http://localhost:3101/api/v1/admin/[機能名]/$ITEM_ID | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt

# 6. GET 一覧取得（削除後）
echo -e "\n【8. GET /api/v1/admin/[機能名] (削除後)】" >> /tmp/[タスクID]-evidence.txt
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq . >> /tmp/[タスクID]-evidence.txt
echo "終了コード: $?" >> /tmp/[タスクID]-evidence.txt
```

### Evidence 2: Files（変更ファイル一覧）

```bash
echo -e "\n【9. 変更ファイル一覧】" >> /tmp/[タスクID]-evidence.txt

# git status
cd /Users/kaneko/hotel-common-rebuild
echo "## hotel-common-rebuild" >> /tmp/[タスクID]-evidence.txt
git status --short >> /tmp/[タスクID]-evidence.txt
git diff --stat >> /tmp/[タスクID]-evidence.txt

cd /Users/kaneko/hotel-saas-rebuild
echo -e "\n## hotel-saas-rebuild" >> /tmp/[タスクID]-evidence.txt
git status --short >> /tmp/[タスクID]-evidence.txt
git diff --stat >> /tmp/[タスクID]-evidence.txt

# ファイル詳細（ls -la, sha256sum）
echo -e "\n## ファイル詳細" >> /tmp/[タスクID]-evidence.txt
ls -la /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma >> /tmp/[タスクID]-evidence.txt 2>&1
ls -la /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名]* >> /tmp/[タスクID]-evidence.txt 2>&1
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]* >> /tmp/[タスクID]-evidence.txt 2>&1
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]* >> /tmp/[タスクID]-evidence.txt 2>&1

# SHA256ハッシュ
echo -e "\n## SHA256ハッシュ" >> /tmp/[タスクID]-evidence.txt
sha256sum /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma >> /tmp/[タスクID]-evidence.txt 2>&1
find /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名]* -type f -exec sha256sum {} \; >> /tmp/[タスクID]-evidence.txt 2>&1
find /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]* -type f -exec sha256sum {} \; >> /tmp/[タスクID]-evidence.txt 2>&1
```

### Evidence 3: Git（ブランチ・コミット情報）

```bash
echo -e "\n【10. Git情報】" >> /tmp/[タスクID]-evidence.txt

cd /Users/kaneko/hotel-common-rebuild
echo "## hotel-common-rebuild" >> /tmp/[タスクID]-evidence.txt
echo "Branch: $(git branch --show-current)" >> /tmp/[タスクID]-evidence.txt
echo "HEAD: $(git log -1 --oneline)" >> /tmp/[タスクID]-evidence.txt

cd /Users/kaneko/hotel-saas-rebuild
echo -e "\n## hotel-saas-rebuild" >> /tmp/[タスクID]-evidence.txt
echo "Branch: $(git branch --show-current)" >> /tmp/[タスクID]-evidence.txt
echo "HEAD: $(git log -1 --oneline)" >> /tmp/[タスクID]-evidence.txt
```

### Evidence 4: CI（PR作成後に手動追記）

```markdown
（PR作成後、以下を手動で追記）

【11. CI結果】
- Run URL: https://github.com/.../actions/runs/...
- 全ジョブGreen: ✅
  - evidence-check: Pass
  - ssot-compliance: Pass
  - lint-and-typecheck: Pass
  - unit-tests: Pass
  - crud-verify: Pass
  - build: Pass
  - security: Pass
  - quality-gate: Pass
```

### Evidence 5: CRUD Verify（CI Artifact）

```markdown
（CI完了後、以下を手動で追記）

【12. CRUD Verify結果】
- Artifact URL: https://github.com/.../artifacts/...
- crud-verify-results.txt: 全テスト成功
- ファイルサイズ: XXX bytes（非空確認）
```

### 証跡ファイルの確認

```bash
# 証跡ファイル内容を表示
cat /tmp/[タスクID]-evidence.txt

# ファイルサイズ確認（1KB以上推奨）
wc -c /tmp/[タスクID]-evidence.txt

# 終了コード確認（全て0であるべき）
grep "終了コード" /tmp/[タスクID]-evidence.txt
```

---

## 📍 Item 6.5: 標準テストスクリプト実行（必須・commit/PR前ゲート）

**絶対ルール**: 以下が全て成功しない限り、commit/PRは禁止

### スクリプト選択（実装タイプに応じて）

#### 管理画面実装の場合

```bash
/Users/kaneko/hotel-kanri/scripts/test-standard-admin.sh
```

**対象**: `/api/v1/admin/*`, `/admin/*`  
**認証**: Session認証（Redis + Cookie）  
**検証**: ログイン → テナント切替 → API → UI SSR

#### ゲスト画面実装の場合

```bash
/Users/kaneko/hotel-kanri/scripts/test-standard-guest.sh
```

**対象**: `/api/v1/guest/*`, `/menu`  
**認証**: デバイス認証（MAC/IP → device_rooms）  
**検証**: デバイス認証 → API → UI注意事項

### 失敗時の対処

**管理画面用**:
- 401: ログイン/テナント切替やり直し（Cookie転送漏れは`callHotelCommonAPI`を確認）
- 404: パス/ID不正（API結果から正しいIDを使用）

**ゲスト画面用**:
- 401: デバイス認証失敗（device_roomsにテストデバイス登録確認）
- 404: パス/ID不正（API結果から正しいIDを使用）
- 空配列: seed未投入（10〜20件のカテゴリ/メニューを投入）
- 5xx: サーバーログで原因特定（実装修正）

成功時（抜粋EvidenceをPRに貼付）:
- 実行ログ（終了コード0）
- `/menu` 抜粋（「データの取得に失敗しました」が含まれないこと）
- `categories/items` 件数（jqの評価結果）

---

## 📍 Item 7: PR作成・Gatekeeper準備（必須）

**所要時間**: 20分

### 受入基準（Definition of Done）

#### 必須項目（全て✅必須）

1. **Item完了確認**
   - [ ] Item 2（DB）: Prismaスキーマ定義完了、マイグレーション成功
   - [ ] Item 3（API）: hotel-common 全CRUD実装完了
   - [ ] Item 4（API）: hotel-saas プロキシ 全CRUD実装完了
   - [ ] Item 5（UI）: 管理画面実装完了（該当する場合）
   - [ ] Item 6（テスト）: CRUD検証・Evidence取得完了

2. **CRUD検証成功**
   - [ ] サービス稼働確認: hotel-common ✅、hotel-saas ✅
   - [ ] ログイン成功: 200
   - [ ] GET 一覧取得: 200、レスポンス形式正常
   - [ ] POST 新規作成: 200、データ作成確認
   - [ ] GET 詳細取得: 200、作成データ取得確認
   - [ ] PATCH 更新: 200、データ更新確認
   - [ ] DELETE 削除: 200、データ削除確認
   - [ ] GET 一覧取得（削除後）: 200、削除データ不在確認

3. **エラー確認**
   - [ ] サーバーログに401/403エラーがない
   - [ ] ブラウザコンソールにエラーがない（UI実装の場合）
   - [ ] 全curlコマンドの終了コード: 0

4. **SSOT準拠確認**
   - [ ] 全要件ID実装完了
   - [ ] 全Accept（合格条件）達成
   - [ ] 命名規則準拠（DB、API、UI）
   - [ ] 不可侵ルール遵守

5. **Evidence提出**
   - [ ] Evidence 1: Commands & Logs（`/tmp/[タスクID]-evidence.txt`）
   - [ ] Evidence 2: Files（git status, ls -la, sha256sum）
   - [ ] Evidence 3: Git（branch, HEAD）
   - [ ] Evidence 4: CI（PR作成後に追記）
   - [ ] Evidence 5: CRUD Verify（CI完了後に追記）

### PR作成

#### ブランチ作成

```bash
# hotel-common-rebuild
cd /Users/kaneko/hotel-common-rebuild
git checkout -b feature/[タスクID]-[機能名]-implementation
git add .
git commit -m "[タスクID] [機能名]実装

- Item 2: DB実装（該当する場合）
- Item 3: hotel-common API実装
- Item 4: hotel-saas プロキシ実装
- Item 5: UI実装（該当する場合）

参照SSOT: [SSOTパス]
"

# hotel-saas-rebuild
cd /Users/kaneko/hotel-saas-rebuild
git checkout -b feature/[タスクID]-[機能名]-implementation
git add .
git commit -m "[タスクID] [機能名]実装

- Item 4: hotel-saas プロキシ実装
- Item 5: UI実装（該当する場合）

参照SSOT: [SSOTパス]
"
```

#### PR本文テンプレート

```markdown
## 参照SSOT

- **Path**: /Users/kaneko/hotel-kanri/docs/03_ssot/[カテゴリ]/[SSOT名].md
- **Version**: vX.Y.Z
- **要件ID**: 
  - DB: XXX-DB-001 〜 XXX-DB-NNN
  - API: XXX-API-001 〜 XXX-API-NNN
  - UI: XXX-UI-001 〜 XXX-UI-NNN

## Plane

- **Issue**: [タスクID]
- **URL**: https://plane.arrowsworks.com/co/projects/7e187231-3f93-44cd-9892-a9322ebd4312/issues/[issue-id]
- **State**: Backlog → In Progress → Done
- **Dependencies**: [依存Issue] → 完了済み

## テスト・証跡

### Evidence 1: Commands & Logs

```
（/tmp/[タスクID]-evidence.txt の内容をコピペ）
```

### Evidence 2: Files

#### hotel-common-rebuild
```bash
$ git status --short
A  prisma/migrations/[timestamp]_add_[機能名]_table/migration.sql
M  prisma/schema.prisma
A  server/api/v1/admin/[機能名].get.ts
A  server/api/v1/admin/[機能名].post.ts
A  server/api/v1/admin/[機能名]/[id].get.ts
A  server/api/v1/admin/[機能名]/[id].patch.ts
A  server/api/v1/admin/[機能名]/[id].delete.ts

$ git diff --stat
7 files changed, 456 insertions(+)
```

#### hotel-saas-rebuild
```bash
$ git status --short
A  server/api/v1/admin/[機能名].get.ts
A  server/api/v1/admin/[機能名].post.ts
A  server/api/v1/admin/[機能名]/[id].get.ts
A  server/api/v1/admin/[機能名]/[id].patch.ts
A  server/api/v1/admin/[機能名]/[id].delete.ts
A  pages/admin/[機能名]/index.vue

$ git diff --stat
6 files changed, 389 insertions(+)
```

#### ファイル詳細
```bash
$ ls -la /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma
-rw-r--r-- 1 user staff 12345 Nov 7 12:34 prisma/schema.prisma

$ ls -la /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名]*
-rw-r--r-- 1 user staff 678 Nov 7 12:35 server/api/v1/admin/[機能名].get.ts
-rw-r--r-- 1 user staff 789 Nov 7 12:36 server/api/v1/admin/[機能名].post.ts
...

$ sha256sum /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma
abc123def... prisma/schema.prisma
```

### Evidence 3: Git

#### hotel-common-rebuild
```bash
$ git branch --show-current
feature/[タスクID]-[機能名]-implementation

$ git log -1 --oneline
abc123d [タスクID] [機能名]実装 - Phase [N]
```

#### hotel-saas-rebuild
```bash
$ git branch --show-current
feature/[タスクID]-[機能名]-implementation

$ git log -1 --oneline
def456g [タスクID] [機能名]実装 - Phase [N]
```

### Evidence 4: CI

（PR作成後に追記）

- **Run URL**: https://github.com/.../actions/runs/...
- **全ジョブGreen**: ✅
  - evidence-check: Pass
  - ssot-compliance: Pass
  - lint-and-typecheck: Pass
  - unit-tests: Pass
  - crud-verify: Pass
  - build: Pass
  - security: Pass
  - quality-gate: Pass

### Evidence 5: CRUD Verify

（CI完了後に追記）

- **Artifact URL**: https://github.com/.../artifacts/...
- **crud-verify-results.txt**: 全テスト成功
- **ファイルサイズ**: XXX bytes（非空確認）

### 受入基準確認

- [x] Item 2（DB）: Prismaスキーマ定義完了、マイグレーション成功
- [x] Item 3（API - hotel-common）: 全CRUD実装完了
- [x] Item 4（API - hotel-saas）: プロキシ実装完了
- [x] Item 5（UI）: 管理画面実装完了
- [x] Item 6（テスト）: CRUD検証・全API（5本）正常動作
- [x] エラーなし: サーバーログ・ブラウザコンソール
- [x] SSOT準拠: 全要件ID実装、全Accept達成
- [x] Evidence提出: 5種類全て完了

## CI

- [ ] evidence-check
- [ ] ssot-compliance
- [ ] lint-and-typecheck
- [ ] unit-tests
- [ ] crud-verify
- [ ] build
- [ ] security
- [ ] quality-gate
```

---

## 🚨 エラー時の対処フロー

### 401 Unauthorized

**症状**: `{"statusCode":401,"statusMessage":"認証が必要です"}`

**診断**:
```bash
# Cookie確認
cat /tmp/cookies.txt | grep hotel_session

# セッション確認（hotel-common直接）
curl -s -b /tmp/cookies.txt http://localhost:3401/api/v1/admin/auth/me | jq .
```

**原因候補**:
1. ログインしていない → ログインコマンドを実行
2. セッション期限切れ → 再ログイン
3. Cookie未転送 → `callHotelCommonAPI`を使用しているか確認

**対処**:
```bash
# 再ログイン
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .

# 再実行
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq .
```

---

### 500 Internal Server Error

**症状**: `{"statusCode":500}`

**診断**:
```bash
# hotel-saas ログ確認
tail -50 /Users/kaneko/hotel-saas-rebuild/.output/server/logs/nitro.log 2>/dev/null

# hotel-common ログ確認
tail -50 /Users/kaneko/hotel-common-rebuild/logs/app.log 2>/dev/null
```

**原因候補**:
1. hotel-commonが停止 → health checkで確認
2. DB接続エラー → hotel-commonログで確認
3. tenant_id未指定 → コードレビュー
4. Prismaエラー → マイグレーション状態確認

**対処**:
1. ログから原因特定
2. SSOT違反の可能性を確認（Prisma直使用、tenant_id未指定等）
3. 不明な場合はユーザーに報告（ログ全文を添付）

---

### 404 Not Found

**症状**: `Cannot find route /api/v1/admin/[機能名]`

**原因**:
- hotel-saas または hotel-common にAPIルートが存在しない

**対処**:
```bash
# hotel-saas 確認
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]*

# hotel-common 確認
ls -la /Users/kaneko/hotel-common-rebuild/server/api/v1/admin/[機能名]*
```

→ 存在しない場合は実装停止、ユーザーに報告

---

### Prismaマイグレーションエラー

**症状**: `Error: P3009: migrate found failed migrations`

**診断**:
```bash
# マイグレーション状態確認
cd /Users/kaneko/hotel-common-rebuild
npx prisma migrate status
```

**対処**:
1. `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md` を参照
2. 失敗したマイグレーションを削除・再作成
3. 不明な場合はユーザーに報告

---

## 🛡️ 不可侵ルール（絶対禁止・Gatekeeper即否認対象）

### 禁止1: hotel-saas からの Prisma/DB 直接使用 ❌

```typescript
// ❌ 間違い（hotel-saasはプロキシ専用）
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const data = await prisma.[機能名].findMany()

// ✅ 正しい（hotel-common経由）
const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
  method: 'GET'
})
```

---

### 禁止2: tenant_id フォールバック ❌

```typescript
// ❌ 間違い（本番障害リスク）
const tenantId = session.tenantId || 'default'
const tenantId = user?.tenantId ?? 'default'

// ✅ 正しい
const tenantId = session.tenantId
if (!tenantId) {
  throw createError({ statusCode: 401, statusMessage: 'テナントIDが取得できません' })
}
```

---

### 禁止3: $fetch 直接使用（Cookie未転送） ❌

```typescript
// ❌ 間違い（Cookie転送されない）
const response = await $fetch('http://localhost:3401/api/v1/admin/[機能名]')

// ✅ 正しい（Cookie自動転送）
const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
  method: 'GET'
})
```

---

### 禁止4: API Routingガイドライン違反 ❌

```typescript
// ❌ 間違い（深いネスト）
/server/api/v1/admin/[機能名]/[id]/items/[itemId].get.ts

// ❌ 間違い（index.*ファイル）
/server/api/v1/admin/[機能名]/index.get.ts

// ❌ 間違い（/listルート）
/server/api/v1/admin/[機能名]/list.get.ts

// ✅ 正しい（フラット構造）
/server/api/v1/admin/[機能名].get.ts
/server/api/v1/admin/[機能名]/[id].get.ts
```

---

### 禁止5: 環境分岐ロジック ❌

```typescript
// ❌ 間違い（本番同等違反）
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default'
}

// ✅ 正しい（環境変数で接続先のみ変更、ロジックは同一）
const apiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3401'
```

---

## ✅ 完了条件（全て必須）

以下の全てを満たしたら完了：

- [ ] Item 1: 事前調査完了（ユーザー承認取得）
  - [ ] SSOT確認完了
  - [ ] スコープ判定完了
- [ ] Item 2: DB実装完了（該当する場合）
  - [ ] Prismaスキーマ定義完了
  - [ ] マイグレーション成功
  - [ ] スキーマドリフトなし
- [ ] Item 3: hotel-common API実装完了
  - [ ] CRUD API 5本実装完了
  - [ ] 全APIでtenantIdフィルタ使用
  - [ ] 全APIでPrisma使用（hotel-commonのみ）
- [ ] Item 4: hotel-saas APIプロキシ実装完了
  - [ ] プロキシAPI 5本実装完了
  - [ ] 全APIでcallHotelCommonAPI使用
  - [ ] Cookie転送確認
- [ ] Item 5: UI実装完了（該当する場合）
  - [ ] 一覧・新規作成・編集・削除実装完了
- [ ] Item 6: 統合テスト・証跡取得完了
  - [ ] 全API（5本）正常動作確認
  - [ ] Evidence 5種類全て取得
  - [ ] 証跡ファイル: `/tmp/[タスクID]-evidence.txt` 作成完了
- [ ] Item 7: PR作成完了
  - [ ] PR本文に必須見出し4件記載
  - [ ] Evidence 1-3 添付完了
  - [ ] base=develop
  - [ ] CI実行・全ジョブGreen待ち
  - [ ] Gatekeeper承認待ち

---

## 📝 最終報告テンプレート

```markdown
## [タスクID] [機能名]実装 完了報告

### 実装完了Item
- [x] Item 1: 事前調査（SSOT確認・スコープ判定）
- [x] Item 2: DB実装（Prismaスキーマ + マイグレーション）
- [x] Item 3: hotel-common API実装
- [x] Item 4: hotel-saas APIプロキシ実装
- [x] Item 5: UI実装（管理画面）
- [x] Item 6: 統合テスト・証跡取得
- [x] Item 7: PR作成・Gatekeeper準備

### 実装ファイル一覧

#### hotel-common-rebuild
- `prisma/schema.prisma`: [機能名]モデル追加
- `prisma/migrations/[timestamp]_add_[機能名]_table/migration.sql`: マイグレーション
- `server/api/v1/admin/[機能名].get.ts`: 一覧取得API
- `server/api/v1/admin/[機能名].post.ts`: 新規作成API
- `server/api/v1/admin/[機能名]/[id].get.ts`: 詳細取得API
- `server/api/v1/admin/[機能名]/[id].patch.ts`: 更新API
- `server/api/v1/admin/[機能名]/[id].delete.ts`: 削除API

#### hotel-saas-rebuild
- `server/api/v1/admin/[機能名].get.ts`: プロキシAPI（一覧）
- `server/api/v1/admin/[機能名].post.ts`: プロキシAPI（新規作成）
- `server/api/v1/admin/[機能名]/[id].get.ts`: プロキシAPI（詳細）
- `server/api/v1/admin/[機能名]/[id].patch.ts`: プロキシAPI（更新）
- `server/api/v1/admin/[機能名]/[id].delete.ts`: プロキシAPI（削除）
- `pages/admin/[機能名]/index.vue`: 管理画面UI

### 証跡
- Evidence 1-5: `/tmp/[タスクID]-evidence.txt` に記録済み
- PR作成: ✅
  - hotel-common-rebuild: [PR URL]
  - hotel-saas-rebuild: [PR URL]

### 次のアクション
- CI実行待ち
- Gatekeeper承認待ち

実装は以上で完了です。
```

---

**このテンプレートに従うことで、Gatekeeper審査基準を満たす100点のプロンプトが作成できます。**

