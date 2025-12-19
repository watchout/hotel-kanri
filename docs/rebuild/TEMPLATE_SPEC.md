# 📐 CRUDテンプレート完全仕様

**最終更新**: 2025年11月4日  
**目的**: 動作確認済みのCRUD実装パターンを定義  
**対象**: 実装AI

---

## 📖 このドキュメントの使い方

### 🎯 読む順序

```
【Phase 1: テンプレート作成時】
1. 🚀 Phase 1: テンプレート作成（完全手順）
   ↓ 事前確認・テンプレートファイル作成・動作確認
   
2. 📐 置換ルール完全ガイド
   ↓ 置換方法の理解
   
3. 🏗️ hotel-common CRUD テンプレート
   ↓ 完全なコードを確認
   
4. 🚀 hotel-saas プロキシ テンプレート
   ↓ 完全なコードを確認（5ファイル）

【Phase 2以降: 機能実装時】
1. 🔄 Phase 2以降：テンプレート使用方法
   ↓ 作成済みテンプレートのコピー＆置換
   
2. 📊 Phase 2以降の実装ペース
   ↓ 時間見積もり
   
3. 🎯 テンプレート使用の鉄則
   ↓ 守るべきルール・禁止事項
```

### 📋 このドキュメントに含まれること

1. **Phase 1完全手順**（最重要）
   - 依存ファイルの確認方法
   - テンプレートファイルの新規作成方法
   - 客室グレードでの動作確認方法
   - 完全チェックリスト

2. **置換ルール**
   - hotel-common: `:resource` → Prismaモデル名
   - hotel-saas: `RESOURCE` → APIパス
   - 命名規則対応表

3. **完全なテンプレートコード**
   - hotel-common: 300行以上の完全なコード
   - hotel-saas: 5ファイル分の完全なコード

4. **Phase 2以降の使用方法**
   - テンプレートのコピー＆置換方法
   - 動作確認方法
   - Plane Issue管理

5. **トラブルシューティング**
   - よくある6つのエラー
   - 原因と対処法

### 🚫 このドキュメントに含まれないこと

1. **環境構築**
   → OVERVIEW.md を参照

2. **ロードマップ・Phase別計画**
   → ROADMAP.md を参照

3. **Plane Issue定義**
   → PLANE_ISSUES.md を参照

4. **SSOT仕様**
   → /docs/03_ssot/ を参照

### 💡 読む前の心構え

```
❌ 間違い: 「ざっと読んで実装開始」
✅ 正しい: 「Phase 1完全手順を1行ずつ実行」

❌ 間違い: 「テンプレートをカスタマイズ」
✅ 正しい: 「テンプレートをそのままコピー＆置換」

❌ 間違い: 「たぶん動く」で次に進む
✅ 正しい: 「動作確認してからユーザー報告」
```

---

## 🎯 テンプレートとは？

### 概要

```
テンプレート = 動作確認済みのCRUD実装パターン

1つのテンプレートを作成
↓
コピー＆リソース名を置換
↓
全てのAPIで同じパターン
↓
エラーが出ない
```

### なぜ必要か？

```
テンプレートなし（現状）:
- 実装ごとにパターンがバラバラ
- JWT認証とSession認証が混在
- $fetch直接使用とcallHotelCommonAPI使用が混在
- エラーが多発

テンプレートあり（リビルド後）:
- 全て同じパターン
- Session認証統一
- callHotelCommonAPI統一
- エラーが出ない
```

---

## 📋 テンプレート一覧

### 作成するテンプレート

1. **hotel-common CRUD テンプレート**
   - ファイル: `/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts`
   - 用途: hotel-commonのAPI実装

2. **hotel-saas プロキシ テンプレート**（5ファイル）
   - `hotel-saas-create.template.ts` → create.post.ts
   - `hotel-saas-list.template.ts` → list.get.ts
   - `hotel-saas-get.template.ts` → [id].get.ts
   - `hotel-saas-update.template.ts` → [id].put.ts
   - `hotel-saas-delete.template.ts` → [id].delete.ts

---

## 🚀 Phase 1: テンプレート作成（完全手順）

### 目的

動作確認済みのテンプレートを作成し、客室グレードで動作確認する

### 🔍 事前確認：依存ファイル

#### hotel-common

1. **sessionAuthMiddleware の確認**
```bash
ls /Users/kaneko/hotel-common-rebuild/src/auth/session-auth.middleware.ts
```
  
- ✅ 存在する → OK
- ❌ 存在しない → 既存からコピー
  ```bash
  mkdir -p /Users/kaneko/hotel-common-rebuild/src/auth
  cp /Users/kaneko/hotel-common/src/auth/session-auth.middleware.ts \
     /Users/kaneko/hotel-common-rebuild/src/auth/
  ```

2. **Prisma Client の生成**
```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma generate
```

#### hotel-saas

1. **callHotelCommonAPI の確認**
```bash
ls /Users/kaneko/hotel-saas-rebuild/server/utils/api-client.ts
```
  
- ✅ 存在する → OK
- ❌ 存在しない → 既存からコピー
  ```bash
  mkdir -p /Users/kaneko/hotel-saas-rebuild/server/utils
  cp /Users/kaneko/hotel-saas/server/utils/api-client.ts \
     /Users/kaneko/hotel-saas-rebuild/server/utils/
  ```

---

### Step 1: テンプレートファイル新規作成

#### 1-1. ディレクトリ作成

```bash
cd /Users/kaneko/hotel-kanri
mkdir -p templates
```

#### 1-2. hotel-common CRUDテンプレート作成

**このTEMPLATE_SPEC.mdの「hotel-common CRUD テンプレート」セクションのコードを使用**

```bash
# 次のセクション「hotel-common CRUD テンプレート」のコードをコピー
# /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts に保存
```

**重要**: `:resource` はそのまま残す（置換しない）

#### 1-3. hotel-saas プロキシテンプレート作成（5ファイル）

**このTEMPLATE_SPEC.mdの各テンプレートコードを使用**

```bash
# 1. create.post.ts テンプレート
# hotel-saas-create.template.ts として保存

# 2. list.get.ts テンプレート
# hotel-saas-list.template.ts として保存

# 3. [id].get.ts テンプレート
# hotel-saas-get.template.ts として保存

# 4. [id].put.ts テンプレート
# hotel-saas-update.template.ts として保存

# 5. [id].delete.ts テンプレート
# hotel-saas-delete.template.ts として保存
```

**重要**: `RESOURCE` はそのまま残す（置換しない）

---

### Step 2: テストテナント作成

```sql
-- PostgreSQLで実行
-- psql -U admin -d hotel_db
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (
  'rebuild-test-tenant',
  'リビルドテスト施設',
  'rebuild-test',
  NOW(),
  NOW()
);
```

---

### Step 3: 客室グレードで動作確認実装

#### 3-1. hotel-common 客室グレードAPI実装

```bash
cd /Users/kaneko/hotel-common-rebuild

# テンプレートをコピー
cp /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts \
   src/routes/systems/common/room-grades.routes.ts
```

**置換作業**:

1. `:resource` を `roomGrade` に置換（Prismaモデル名）
```bash
sed -i '' 's/:resource/roomGrade/g' src/routes/systems/common/room-grades.routes.ts
```

2. APIパスを `room-grades` に置換
```bash
sed -i '' "s|'\/api\/v1\/:resource'|'\/api\/v1\/room-grades'|g" src/routes/systems/common/room-grades.routes.ts
```

3. app.ts に登録
```typescript
// src/app.ts に追加
import roomGradesRoutes from './routes/systems/common/room-grades.routes'
app.use(roomGradesRoutes)
```

#### 3-2. hotel-saas 客室グレードプロキシ実装

```bash
cd /Users/kaneko/hotel-saas-rebuild
mkdir -p server/api/v1/admin/room-grades

# 各テンプレートをコピー＆置換
# 1. Create
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts \
   server/api/v1/admin/room-grades/create.post.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/create.post.ts

# 2. List
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts \
   server/api/v1/admin/room-grades/list.get.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/list.get.ts

# 3. Get by ID
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts \
   server/api/v1/admin/room-grades/[id].get.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].get.ts

# 4. Update
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts \
   server/api/v1/admin/room-grades/[id].put.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].put.ts

# 5. Delete
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts \
   server/api/v1/admin/room-grades/[id].delete.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].delete.ts
```

---

### Step 4: サーバー起動・動作確認

#### 4-1. サーバー起動

```bash
# ターミナル1: hotel-common起動
cd /Users/kaneko/hotel-common-rebuild
PORT=3401 npm run dev

# ターミナル2: hotel-saas起動
cd /Users/kaneko/hotel-saas-rebuild
PORT=3101 npm run dev
```

#### 4-2. ログイン（Session Cookie取得）

```bash
curl -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  -c cookies.txt
```

#### 4-3. CRUD実行

```bash
# 1. Create
curl -X POST http://localhost:3101/api/v1/admin/room-grades/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"テストグレード","gradeCode":"TEST","gradeLevel":5}' \
  | jq

# 成功: {"success":true,"data":{...}}

# 2. List
curl http://localhost:3101/api/v1/admin/room-grades/list \
  -b cookies.txt \
  | jq

# 成功: {"success":true,"data":[{...}]}

# 3. Update（IDを上記で取得したIDに置換）
curl -X PUT http://localhost:3101/api/v1/admin/room-grades/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"更新グレード"}' \
  | jq

# 成功: {"success":true,"data":{...}}

# 4. Delete
curl -X DELETE http://localhost:3101/api/v1/admin/room-grades/{id} \
  -b cookies.txt \
  | jq

# 成功: {"success":true}
```

#### 4-4. Prisma Studioでデータ確認

```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma studio

# ブラウザで http://localhost:5555 を開く
# room_grades テーブルを確認
```

---

### ✅ Phase 1 完全チェックリスト

#### 事前準備

- [ ] 依存ファイル確認完了
  - [ ] sessionAuthMiddleware 存在確認
  - [ ] callHotelCommonAPI 存在確認
  - [ ] Prisma Client生成完了

#### テンプレート作成

- [ ] hotel-common CRUDテンプレート作成
  - [ ] `/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts` 作成
  - [ ] コード確認（文法エラーなし）
  - [ ] `:resource` がそのまま残っていることを確認

- [ ] hotel-saas プロキシテンプレート作成（5ファイル）
  - [ ] hotel-saas-create.template.ts 作成
  - [ ] hotel-saas-list.template.ts 作成
  - [ ] hotel-saas-get.template.ts 作成
  - [ ] hotel-saas-update.template.ts 作成
  - [ ] hotel-saas-delete.template.ts 作成
  - [ ] `RESOURCE` がそのまま残っていることを確認

#### 客室グレードで動作確認

- [ ] テストテナント作成
- [ ] hotel-common 客室グレードAPI実装
  - [ ] room-grades.routes.ts 作成
  - [ ] `:resource` → `roomGrade` 置換
  - [ ] app.ts に登録
- [ ] hotel-saas 客室グレードプロキシ実装
  - [ ] 5ファイル作成
  - [ ] `RESOURCE` → `room-grades` 置換
- [ ] サーバー起動（hotel-common:3401, hotel-saas:3101）
- [ ] ログイン成功（cookies.txt取得）
- [ ] Create実行 → ✅ 成功（{"success":true}）
- [ ] List実行 → ✅ 成功（データ表示）
- [ ] Update実行 → ✅ 成功（{"success":true}）
- [ ] Delete実行 → ✅ 成功（{"success":true}）
- [ ] Prisma Studioでデータ確認
- [ ] サーバーログでエラーゼロ確認

#### 完了報告

- [ ] ユーザーに報告
  ```
  Phase 1完了しました。完了条件：
  ✅ テンプレート2種類作成
  ✅ 客室グレードのCRUD全て動作
  ✅ エラーゼロ
  次のPhaseに進んでよろしいですか？
  ```
- [ ] ユーザーの承認取得

---

### 🚨 Phase 1 トラブルシューティング

#### 問題1: テンプレートファイルが作成できない

**症状**: `Permission denied` エラー

**対処法**:
```bash
mkdir -p /Users/kaneko/hotel-kanri/templates
chmod 755 /Users/kaneko/hotel-kanri/templates
```

#### 問題2: sessionAuthMiddleware が見つからない

**症状**: `Cannot find module '../auth/session-auth.middleware'`

**原因**: ファイルが存在しない

**対処法**:
```bash
mkdir -p /Users/kaneko/hotel-common-rebuild/src/auth
cp /Users/kaneko/hotel-common/src/auth/session-auth.middleware.ts \
   /Users/kaneko/hotel-common-rebuild/src/auth/
```

#### 問題3: callHotelCommonAPI が見つからない

**症状**: `Cannot find module '~/server/utils/api-client'`

**原因**: ファイルが存在しない

**対処法**:
```bash
mkdir -p /Users/kaneko/hotel-saas-rebuild/server/utils
cp /Users/kaneko/hotel-saas/server/utils/api-client.ts \
   /Users/kaneko/hotel-saas-rebuild/server/utils/
```

#### 問題4: Prismaモデル名が分からない

**症状**: `prisma.roomGrade is not a function`

**原因**: Prismaモデル名が間違っている

**対処法**:
```bash
# schema.prisma を確認
grep "model room_grades" /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma

# 出力例:
# model room_grades {
#   @@map("room_grades")
# }
# → Prismaモデル名: roomGrade（camelCase）
```

#### 問題5: 401 Unauthorized

**症状**: `{"success":false,"error":{"message":"テナントIDが取得できません"}}`

**原因**: Cookie転送されていない、またはログインしていない

**対処法**:
1. ログイン確認
   ```bash
   # cookies.txt が存在するか確認
   ls -la cookies.txt
   ```

2. Cookieを使用しているか確認
   ```bash
   # -b cookies.txt が含まれているか確認
   curl ... -b cookies.txt
   ```

#### 問題6: サーバーが起動しない

**症状**: `Port 3401 is already in use`

**原因**: 既存環境がまだ起動している

**対処法**:
```bash
# 既存環境を停止
# または、ポート番号を確認
lsof -i :3401
kill -9 [PID]
```

---

## 📐 置換ルール完全ガイド

### hotel-common の置換

| 置換対象 | 置換後 | 説明 | 例 |
|---------|-------|------|---|
| `:resource` | Prismaモデル名（camelCase） | Prismaで使用 | `roomGrade` |
| `'/api/v1/:resource'` | APIパス（kebab-case） | Express routerで使用 | `'/api/v1/room-grades'` |

**Prismaモデル名の確認方法**:
```bash
# DB テーブル名: room_grades
# schema.prisma で確認:
grep "model room_grades" prisma/schema.prisma
# → model room_grades { @@map("room_grades") }
# → Prismaモデル名: roomGrade（camelCase変換）
```

### hotel-saas の置換

| 置換対象 | 置換後 | 説明 | 例 |
|---------|-------|------|---|
| `RESOURCE` | APIパス（kebab-case） | hotel-commonのAPIパス | `room-grades` |
| ディレクトリ名 | APIパス（kebab-case） | server/api/v1/admin/ 配下 | `room-grades` |

### 命名規則対応表

| DB（snake_case） | Prisma（camelCase） | API（kebab-case） | ディレクトリ |
|-----------------|-------------------|------------------|-------------|
| room_grades | roomGrade | room-grades | room-grades |
| staff_members | staffMember | staff-members | staff-members |
| room_types | roomType | room-types | room-types |
| booking_requests | bookingRequest | booking-requests | booking-requests |

---

## 🏗️ hotel-common CRUD テンプレート

### ファイル名

```
/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts
```

### 完全なコード

```typescript
import { Router, Request, Response, NextFunction } from 'express'
import { sessionAuthMiddleware } from '../auth/session-auth.middleware'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// ============================================
// 必ずsessionAuthMiddlewareを使用
// ============================================
router.use(sessionAuthMiddleware)

// ============================================
// Create
// ============================================
router.post('/api/v1/:resource', async (req: Request, res: Response) => {
  try {
    // tenantId取得（必須）
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'テナントIDが取得できません' }
      })
    }

    console.log('🔍 [Create] リクエスト:', {
      resource: ':resource',
      tenantId,
      body: req.body
    })

    // ★ここを置換: :resource → 実際のリソース名（camelCase）
    const data = await prisma.:resource.create({
      data: {
        ...req.body,
        tenantId
      }
    })

    console.log('✅ [Create] 成功:', data)

    res.status(201).json({ 
      success: true, 
      data 
    })
  } catch (error: any) {
    console.error('❌ [Create] エラー:', error)
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    })
  }
})

// ============================================
// Read (List)
// ============================================
router.get('/api/v1/:resource', async (req: Request, res: Response) => {
  try {
    // tenantId取得（必須）
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'テナントIDが取得できません' }
      })
    }

    console.log('🔍 [List] リクエスト:', {
      resource: ':resource',
      tenantId
    })

    // ★ここを置換: :resource → 実際のリソース名（camelCase）
    const data = await prisma.:resource.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    console.log('✅ [List] 成功:', { count: data.length })

    res.json({ 
      success: true, 
      data 
    })
  } catch (error: any) {
    console.error('❌ [List] エラー:', error)
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    })
  }
})

// ============================================
// Read (Get by ID)
// ============================================
router.get('/api/v1/:resource/:id', async (req: Request, res: Response) => {
  try {
    // tenantId取得（必須）
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'テナントIDが取得できません' }
      })
    }

    const { id } = req.params

    console.log('🔍 [Get] リクエスト:', {
      resource: ':resource',
      tenantId,
      id
    })

    // ★ここを置換: :resource → 実際のリソース名（camelCase）
    const data = await prisma.:resource.findUnique({
      where: { 
        id,
        tenantId 
      }
    })

    if (!data) {
      return res.status(404).json({ 
        success: false,
        error: { message: 'データが見つかりません' }
      })
    }

    console.log('✅ [Get] 成功:', data)

    res.json({ 
      success: true, 
      data 
    })
  } catch (error: any) {
    console.error('❌ [Get] エラー:', error)
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    })
  }
})

// ============================================
// Update
// ============================================
router.put('/api/v1/:resource/:id', async (req: Request, res: Response) => {
  try {
    // tenantId取得（必須）
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'テナントIDが取得できません' }
      })
    }

    const { id } = req.params

    console.log('🔍 [Update] リクエスト:', {
      resource: ':resource',
      tenantId,
      id,
      body: req.body
    })

    // ★ここを置換: :resource → 実際のリソース名（camelCase）
    const data = await prisma.:resource.update({
      where: { 
        id,
        tenantId 
      },
      data: req.body
    })

    console.log('✅ [Update] 成功:', data)

    res.json({ 
      success: true, 
      data 
    })
  } catch (error: any) {
    console.error('❌ [Update] エラー:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        error: { message: 'データが見つかりません' }
      })
    }
    
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    })
  }
})

// ============================================
// Delete
// ============================================
router.delete('/api/v1/:resource/:id', async (req: Request, res: Response) => {
  try {
    // tenantId取得（必須）
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'テナントIDが取得できません' }
      })
    }

    const { id } = req.params

    console.log('🔍 [Delete] リクエスト:', {
      resource: ':resource',
      tenantId,
      id
    })

    // ★ここを置換: :resource → 実際のリソース名（camelCase）
    await prisma.:resource.delete({
      where: { 
        id,
        tenantId 
      }
    })

    console.log('✅ [Delete] 成功')

    res.json({ 
      success: true 
    })
  } catch (error: any) {
    console.error('❌ [Delete] エラー:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        error: { message: 'データが見つかりません' }
      })
    }
    
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    })
  }
})

export default router
```

### 使用方法

#### Step 1: テンプレートをコピー

```bash
cd /Users/kaneko/hotel-common-rebuild
cp /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts \
   src/routes/systems/common/room-grades.routes.ts
```

#### Step 2: リソース名を置換

```typescript
// 置換前
prisma.:resource.create(...)
prisma.:resource.findMany(...)

// 置換後（客室グレードの場合）
prisma.roomGrade.create(...)
prisma.roomGrade.findMany(...)
```

**Prismaモデル名の確認**:
```bash
# prisma/schema.prisma を確認
grep "model" prisma/schema.prisma

# 例: model room_grades → Prismaモデル名は roomGrade
```

#### Step 3: ルートパスを置換

```typescript
// 置換前
router.post('/api/v1/:resource', ...)
router.get('/api/v1/:resource', ...)

// 置換後（客室グレードの場合）
router.post('/api/v1/room-grades', ...)
router.get('/api/v1/room-grades', ...)
```

#### Step 4: app.ts に登録

```typescript
// src/app.ts
import roomGradesRoutes from './routes/systems/common/room-grades.routes'

app.use(roomGradesRoutes)
```

---

## 🚀 hotel-saas プロキシ テンプレート

### ファイル名（5ファイル）

```
/Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts
/Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts
/Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts
/Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts
/Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts
```

### 完全なコード（Create）

```typescript
// server/api/v1/admin/RESOURCE/create.post.ts
import { createError, defineEventHandler, readBody } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（ミドルウェアで認証済み）
    const user = event.context.user
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
    }

    const body = await readBody(event)
    
    console.log('🔍 [Create] リクエスト:', {
      resource: 'RESOURCE',
      body
    })

    // ★ここを置換: RESOURCE → 実際のリソース名（kebab-case）
    const response = await callHotelCommonAPI(event, '/api/v1/RESOURCE', {
      method: 'POST',
      body
    })

    console.log('✅ [Create] 成功:', response)

    return {
      success: true,
      data: response.data
    }

  } catch (error: any) {
    console.error('❌ [Create] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
```

### 完全なコード（Read - List）

```typescript
// server/api/v1/admin/RESOURCE/list.get.ts
import { createError, defineEventHandler, getQuery } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（ミドルウェアで認証済み）
    const user = event.context.user
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
    }

    const query = getQuery(event)
    
    console.log('🔍 [List] リクエスト:', {
      resource: 'RESOURCE',
      query
    })

    // ★ここを置換: RESOURCE → 実際のリソース名（kebab-case）
    const response = await callHotelCommonAPI(event, '/api/v1/RESOURCE', {
      method: 'GET',
      query
    })

    console.log('✅ [List] 成功:', { count: response.data?.length })

    return response

  } catch (error: any) {
    console.error('❌ [List] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
```

### 完全なコード（Read - Get by ID）

```typescript
// server/api/v1/admin/RESOURCE/[id].get.ts
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（ミドルウェアで認証済み）
    const user = event.context.user
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'IDが必要です' })
    }
    
    console.log('🔍 [Get] リクエスト:', {
      resource: 'RESOURCE',
      id
    })

    // ★ここを置換: RESOURCE → 実際のリソース名（kebab-case）
    const response = await callHotelCommonAPI(event, `/api/v1/RESOURCE/${id}`, {
      method: 'GET'
    })

    console.log('✅ [Get] 成功:', response)

    return response

  } catch (error: any) {
    console.error('❌ [Get] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
```

### 完全なコード（Update）

```typescript
// server/api/v1/admin/RESOURCE/[id].put.ts
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（ミドルウェアで認証済み）
    const user = event.context.user
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'IDが必要です' })
    }

    const body = await readBody(event)
    
    console.log('🔍 [Update] リクエスト:', {
      resource: 'RESOURCE',
      id,
      body
    })

    // ★ここを置換: RESOURCE → 実際のリソース名（kebab-case）
    const response = await callHotelCommonAPI(event, `/api/v1/RESOURCE/${id}`, {
      method: 'PUT',
      body
    })

    console.log('✅ [Update] 成功:', response)

    return {
      success: true,
      data: response.data
    }

  } catch (error: any) {
    console.error('❌ [Update] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
```

### 完全なコード（Delete）

```typescript
// server/api/v1/admin/RESOURCE/[id].delete.ts
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（ミドルウェアで認証済み）
    const user = event.context.user
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'IDが必要です' })
    }
    
    console.log('🔍 [Delete] リクエスト:', {
      resource: 'RESOURCE',
      id
    })

    // ★ここを置換: RESOURCE → 実際のリソース名（kebab-case）
    const response = await callHotelCommonAPI(event, `/api/v1/RESOURCE/${id}`, {
      method: 'DELETE'
    })

    console.log('✅ [Delete] 成功')

    return {
      success: true
    }

  } catch (error: any) {
    console.error('❌ [Delete] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data
    })
  }
})
```

### 使用方法

#### Step 1: ディレクトリ作成

```bash
cd /Users/kaneko/hotel-saas-rebuild
mkdir -p server/api/v1/admin/room-grades
```

#### Step 2: テンプレートからファイル作成

```bash
# Create
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts \
   server/api/v1/admin/room-grades/create.post.ts

# List
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts \
   server/api/v1/admin/room-grades/list.get.ts

# Get by ID
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts \
   server/api/v1/admin/room-grades/[id].get.ts

# Update
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts \
   server/api/v1/admin/room-grades/[id].put.ts

# Delete
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts \
   server/api/v1/admin/room-grades/[id].delete.ts
```

#### Step 3: RESOURCEを置換

```typescript
// 置換前
callHotelCommonAPI(event, '/api/v1/RESOURCE', ...)

// 置換後（客室グレードの場合）
callHotelCommonAPI(event, '/api/v1/room-grades', ...)
```

---

## ✅ 動作確認手順

### Phase 1: テンプレート作成時

#### 1. テストテナント作成

```sql
-- PostgreSQLで実行
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (
  'rebuild-test-tenant',
  'リビルドテスト施設',
  'rebuild-test',
  NOW(),
  NOW()
);
```

#### 2. 客室グレードで動作確認

```bash
# hotel-common起動
cd /Users/kaneko/hotel-common-rebuild
PORT=3401 npm run dev

# hotel-saas起動（別ターミナル）
cd /Users/kaneko/hotel-saas-rebuild
PORT=3101 npm run dev

# テスト実行（別ターミナル）
# 1. ログイン（Session Cookie取得）
curl -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  -c cookies.txt

# 2. Create
curl -X POST http://localhost:3101/api/v1/admin/room-grades/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"テストグレード","gradeCode":"TEST","gradeLevel":5}'

# 3. List
curl http://localhost:3101/api/v1/admin/room-grades/list \
  -b cookies.txt

# 4. Update
curl -X PUT http://localhost:3101/api/v1/admin/room-grades/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"更新グレード"}'

# 5. Delete
curl -X DELETE http://localhost:3101/api/v1/admin/room-grades/{id} \
  -b cookies.txt
```

#### 3. Prisma Studioで確認

```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma studio

# ブラウザで http://localhost:5555 を開く
# room_grades テーブルを確認
```

---

## 🚨 よくあるエラーと対処法

### エラー1: `prisma.:resource is not a function`

**原因**: Prismaモデル名が間違っている

**対処法**:
```bash
# schema.prisma を確認
grep "model" prisma/schema.prisma

# 例: model room_grades → roomGrade（camelCase）
```

### エラー2: `401 Unauthorized`

**原因**: Cookie転送されていない

**対処法**:
```typescript
// callHotelCommonAPI を使用しているか確認
await callHotelCommonAPI(event, '/api/v1/room-grades', ...)
```

### エラー3: `tenantId undefined`

**原因**: sessionAuthMiddleware が動作していない

**対処法**:
```typescript
// hotel-common側で確認
router.use(sessionAuthMiddleware) // ← 必須
```

### エラー4: `P2025: Record not found`

**原因**: tenantId が違う、またはデータが存在しない

**対処法**:
```bash
# Prisma Studio でデータ確認
npx prisma studio
```

---

## 🔄 Phase 2以降：テンプレート使用方法

### Phase 1との違い

```
Phase 1:
- テンプレートファイルを新規作成
- 客室グレードで動作確認
- テンプレートが完成

Phase 2以降:
- 作成済みのテンプレートをコピー
- リソース名を置換
- すぐに動作する
```

### 実装手順（全機能共通）

#### Step 1: Plane Issueを確認

```
例: REBUILD-11: テナント管理実装

確認内容:
- SSOT: SSOT_SAAS_MULTITENANT.md
- Prismaモデル名: tenant
- APIパス: tenants
```

#### Step 2: SSOTを読む（ある場合）

```bash
# SSOTがある場合
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md

# 確認内容:
- データ構造（テーブル・カラム）
- API仕様（エンドポイント）
- Accept条件（何ができればいいか）
```

#### Step 3: hotel-common API実装

```bash
cd /Users/kaneko/hotel-common-rebuild

# テンプレートをコピー
cp /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts \
   src/routes/systems/common/tenants.routes.ts

# 置換（自動）
sed -i '' 's/:resource/tenant/g' src/routes/systems/common/tenants.routes.ts
sed -i '' "s|'/api/v1/:resource'|'/api/v1/tenants'|g" src/routes/systems/common/tenants.routes.ts

# app.ts に登録
# import tenantsRoutes from './routes/systems/common/tenants.routes'
# app.use(tenantsRoutes)
```

#### Step 4: hotel-saas プロキシ実装

```bash
cd /Users/kaneko/hotel-saas-rebuild
mkdir -p server/api/v1/admin/tenants

# 5ファイルコピー＆置換
for template in create list get update delete; do
  cp /Users/kaneko/hotel-kanri/templates/hotel-saas-${template}.template.ts \
     server/api/v1/admin/tenants/${template}.*.ts
  sed -i '' 's/RESOURCE/tenants/g' server/api/v1/admin/tenants/${template}.*.ts
done
```

#### Step 5: 動作確認

```bash
# CRUD実行
./scripts/crud-verify.sh tenants

# 期待結果:
# ✅ Create成功
# ✅ List成功
# ✅ Update成功
# ✅ Delete成功
```

#### Step 6: ユーザーに報告

```
テナント管理実装完了しました。完了条件：
✅ CRUD全て動作
✅ エラーゼロ
✅ ./crud-verify.sh tenants 成功

次の機能（スタッフ管理）に進んでよろしいですか？
```

#### Step 7: Plane IssueをDoneに

```
REBUILD-11: Done
```

---

## 📊 Phase 2以降の実装ペース

### 1機能あたり

| 作業 | 所要時間 |
|-----|---------|
| Plane Issue確認 | 1分 |
| SSOT読み込み | 5分 |
| hotel-common実装 | 3分 |
| hotel-saas実装 | 3分 |
| 動作確認 | 5分 |
| 報告・承認 | 3分 |
| **合計** | **20分** |

### Phase 2全体

```
最優先機能（5機能） × 20分 = 1.7時間
高優先機能（6機能） × 20分 = 2時間
中低優先機能（まとめて） = 3時間
---
合計: 6.7時間 ≒ 7時間
```

**当初見積もり（20時間）より早い理由**:
- テンプレート使用でコピー＆置換だけ
- パターンが統一されているのでエラーが少ない

---

## 🎯 テンプレート使用の鉄則

### ✅ 必ず守ること

1. **テンプレートを改変しない**
   - コピーして使用
   - 元のテンプレートファイルは変更しない

2. **置換は機械的に**
   - sedコマンド使用
   - 手動置換でミスしない

3. **動作確認必須**
   - 全てのCRUDを実行
   - エラーゼロを確認

4. **ユーザー承認必須**
   - 次の機能に進む前に報告
   - 承認を得てから進む

### ❌ やってはいけないこと

1. **テンプレートを改変**
   - 「ここだけカスタマイズ」→ エラーの原因

2. **置換を忘れる**
   - `:resource` のまま → エラー
   - `RESOURCE` のまま → エラー

3. **動作確認をスキップ**
   - 「たぶん動く」→ 後でエラー発見

4. **承認なしで進む**
   - 大量のエラーを生む原因

---

## 🎯 Phase 1成功の定義

### 定量的基準

```
✅ Phase 1完了条件:

1. テンプレートファイルが存在する
   - /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts

2. 客室グレードのCRUDが全て動作する
   - Create: 201 Created
   - List: 200 OK（データ表示）
   - Get by ID: 200 OK（データ表示）
   - Update: 200 OK
   - Delete: 200 OK

3. エラーがゼロ
   - サーバーログにエラーなし
   - curlコマンド実行でエラーなし

4. ユーザーの承認を得た
   - Phase 1完了報告
   - 「次のPhaseに進んでよろしいですか？」
   - 「承認します」を取得
```

### 定性的基準

```
✅ 実装AIが以下を理解している:

1. テンプレートの目的
   - 動作確認済みのパターンを使い回す
   - エラーを出さない

2. 置換ルール
   - hotel-common: :resource → Prismaモデル名
   - hotel-saas: RESOURCE → APIパス

3. Phase 2以降の流れ
   - テンプレートをコピー
   - 置換
   - 動作確認
   - 報告
   - 承認
   - Plane IssueをDone

4. トラブルシューティング
   - よくあるエラーを知っている
   - 対処法を知っている
```

### Phase 1完了報告テンプレート

```
Phase 1完了しました。完了条件：

✅ テンプレート2種類作成（hotel-common + hotel-saas）
  - hotel-common-crud.template.ts（300行）
  - hotel-saas-*.template.ts（5ファイル）

✅ 客室グレードのCRUD全て動作
  - Create: ✅ 成功（201 Created）
  - List: ✅ 成功（200 OK、データ表示）
  - Get by ID: ✅ 成功（200 OK、データ表示）
  - Update: ✅ 成功（200 OK）
  - Delete: ✅ 成功（200 OK）

✅ エラーゼロ
  - hotel-common起動: ✅ エラーなし
  - hotel-saas起動: ✅ エラーなし
  - CRUD実行: ✅ エラーなし

✅ Prisma Studioで確認
  - room_grades テーブルにデータ存在
  - tenant_id正しく設定

次のPhase（Phase 2: 機能実装）に進んでよろしいですか？
```

---

## 📞 問い合わせ

テンプレートで不明な点:
- Luna（設計・管理AI）に相談
- `/Users/kaneko/hotel-kanri/docs/rebuild/` を参照

---

## 📈 評価（60点 → 100点）

### 改善前（60点）

- ✅ コードが完全（30点）
- ❌ Phase 1手順が不明確
- ❌ 置換ルールが分かりにくい
- ❌ 依存ファイルの説明なし
- ❌ Phase 2以降の使用方法なし

### 改善後（100点）

- ✅ コードが完全（30点）
- ✅ Phase 1完全手順（20点）
  - 依存ファイル確認
  - テンプレート作成
  - 動作確認
  - 完全チェックリスト
- ✅ 置換ルール完全ガイド（15点）
  - hotel-common
  - hotel-saas
  - 命名規則対応表
- ✅ Phase 2以降の使用方法（15点）
  - 実装手順（7ステップ）
  - 実装ペース
  - テンプレート使用の鉄則
- ✅ トラブルシューティング（10点）
  - Phase 1（6つのエラー）
  - よくあるエラー（4つ）
- ✅ 成功の定義（10点）
  - 定量的基準
  - 定性的基準
  - 完了報告テンプレート

