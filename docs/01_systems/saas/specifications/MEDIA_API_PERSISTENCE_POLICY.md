# 📋 メディア管理API永続化方針決定書

**Doc-ID**: SPEC-2025-005  
**Version**: 1.0  
**Status**: 🔴 **CRITICAL** - 即座実装必須  
**Owner**: 金子裕司  
**作成日**: 2025年1月28日  
**関連**: ADR-2025-003 (データベースアクセスポリシー)

---

## 🎯 **決定事項**

hotel-saasにおけるメディア管理は、**hotel-common API経由の統一アーキテクチャ**を採用し、Nuxt側でのPrisma直接使用を完全に禁止する。

## 🏗️ **アーキテクチャ決定**

### **1. 永続化方針**

```yaml
hotel-saas (フロントエンド層):
  責務:
    - メディアアップロードUI提供
    - hotel-common メディアAPI呼び出し
    - ファイルプレビュー表示
    - メディア管理画面提供

  禁止事項:
    - Prisma直接使用によるメディアテーブル操作
    - ファイルシステム直接操作
    - データベース直接接続

hotel-common (バックエンド層):
  責務:
    - 統一メディアAPI提供
    - ファイルストレージ管理
    - メディアメタデータ永続化
    - AI画像補正処理
    - クロスシステム共有管理
```

### **2. API呼び出しパターン**

#### **✅ 正しい実装パターン**
```typescript
// hotel-saas/server/api/v1/admin/room-grades/[id]/media/upload.post.ts
export default defineEventHandler(async (event) => {
  // 1. 認証チェック
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 2. ファイルデータ取得
  const formData = await readMultipartFormData(event)
  const roomGradeId = getRouterParam(event, 'id')

  // 3. hotel-common統合メディアAPIに転送
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  
  try {
    const response = await $fetch(`${hotelCommonApiUrl}/api/v1/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authUser.token}`,
      },
      body: {
        ...formData,
        context: {
          system: 'saas',
          entity_type: 'room_grade',
          entity_id: roomGradeId,
          tenant_id: authUser.tenantId
        }
      }
    })

    return response
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 503,
      statusMessage: error.response?.data?.message || 'Media upload failed'
    })
  }
})
```

#### **❌ 禁止されるパターン**
```typescript
// ❌ 絶対に使用禁止
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // ❌ Prisma直接使用は設計違反
  const media = await prisma.roomGradeMedia.create({
    data: { ... }
  })
})
```

---

## 📁 **ファイル保存パス仕様**

### **統一ストレージ構成**

```yaml
Docker統合ストレージ: /var/lib/hotel-unified/media/
  ├── saas/
  │   ├── room-grades/
  │   │   └── {tenant_id}/
  │   │       └── {room_grade_id}/
  │   │           ├── images/
  │   │           │   ├── primary/
  │   │           │   └── gallery/
  │   │           └── videos/
  │   ├── articles/
  │   │   └── {tenant_id}/
  │   │       └── {article_id}/
  │   └── menus/
  │       └── {tenant_id}/
  │           └── {menu_id}/
  ├── pms/
  │   └── handover-notes/
  └── member/
      └── profiles/

アクセスURL: https://domain.com/media/{system}/{path}
```

### **パス生成ルール**

```typescript
// hotel-common/src/services/MediaPathService.ts
export class MediaPathService {
  /**
   * 統一メディアパス生成
   */
  generatePath(context: MediaContext): string {
    const { system, entity_type, entity_id, tenant_id, media_type, filename } = context
    
    // パターン: /{system}/{entity_type}/{tenant_id}/{entity_id}/{media_type}/{filename}
    return `${system}/${entity_type}/${tenant_id}/${entity_id}/${media_type}/${filename}`
  }

  /**
   * 物理ファイルパス取得
   */
  getPhysicalPath(relativePath: string): string {
    const baseStoragePath = process.env.UNIFIED_MEDIA_STORAGE_PATH || '/var/lib/hotel-unified/media'
    return path.join(baseStoragePath, relativePath)
  }

  /**
   * 公開URL生成
   */
  generatePublicUrl(relativePath: string): string {
    const baseUrl = process.env.MEDIA_BASE_URL || 'https://media.hotel-unified.com'
    return `${baseUrl}/media/${relativePath}`
  }
}
```

---

## 🔄 **実装手順**

### **Phase 1: hotel-common統合メディアAPI実装**

1. **統合メディアテーブル作成**
```sql
-- hotel-common/prisma/schema.prisma に追加
model UnifiedMedia {
  id                String   @id @default(cuid())
  tenantId         String   @map("tenant_id")
  
  // ファイル情報
  originalFilename String   @map("original_filename")
  storedFilename   String   @map("stored_filename")
  filePath         String   @map("file_path")
  fileSize         BigInt   @map("file_size")
  mimeType         String   @map("mime_type")
  
  // 画像情報
  width            Int?
  height           Int?
  format           String?
  
  // システム情報
  sourceSystem     String   @map("source_system") // 'saas', 'pms', 'member'
  entityType       String   @map("entity_type")   // 'room_grade', 'article', 'menu'
  entityId         String   @map("entity_id")
  
  // メタデータ
  title            String?
  description      String?
  displayOrder     Int      @default(1) @map("display_order")
  isPrimary        Boolean  @default(false) @map("is_primary")
  isActive         Boolean  @default(true) @map("is_active")
  
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  @@map("unified_media")
  @@index([tenantId, sourceSystem, entityType, entityId])
  @@index([sourceSystem, entityType, isActive])
}
```

2. **統合メディアAPI実装**
```typescript
// hotel-common/src/routes/api/v1/media/upload.post.ts
export default defineEventHandler(async (event) => {
  const { context, files } = await parseMediaUploadRequest(event)
  
  // 1. ファイル検証
  await validateMediaFiles(files)
  
  // 2. ファイル保存
  const savedFiles = await saveMediaFiles(files, context)
  
  // 3. メタデータ永続化
  const mediaRecords = await createMediaRecords(savedFiles, context)
  
  // 4. AI画像補正（非同期）
  if (context.enableAiEnhancement) {
    scheduleAiEnhancement(mediaRecords)
  }
  
  return {
    success: true,
    media: mediaRecords,
    urls: mediaRecords.map(record => generatePublicUrl(record.filePath))
  }
})
```

### **Phase 2: hotel-saas透明プロキシ実装**

```typescript
// hotel-saas/server/api/v1/admin/room-grades/[id]/media/upload.post.ts
export default defineEventHandler(async (event) => {
  const roomGradeId = getRouterParam(event, 'id')
  const authUser = await verifyAuth(event)
  
  // hotel-common統合APIに透明プロキシ
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  
  const formData = await readMultipartFormData(event)
  
  return await $fetch(`${hotelCommonApiUrl}/api/v1/media/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authUser.token}`,
    },
    body: {
      files: formData,
      context: {
        system: 'saas',
        entity_type: 'room_grade',
        entity_id: roomGradeId,
        tenant_id: authUser.tenantId,
        enable_ai_enhancement: true
      }
    }
  })
})
```

---

## ⚠️ **重要な制約事項**

### **1. Prisma使用の完全禁止**
- hotel-saasでは一切のPrismaClient使用を禁止
- メディア関連の全操作はhotel-common API経由のみ

### **2. ファイルシステム直接操作の禁止**
- hotel-saasでのファイル保存・削除は禁止
- 全てhotel-common統合ストレージ経由

### **3. 後方互換性の維持**
- 既存の `/api/v1/uploads/image` エンドポイントは透明プロキシで維持
- フロントエンドの変更を最小限に抑制

---

## 🔍 **実装確認チェックリスト**

### **hotel-common側**
- [ ] 統合メディアテーブル作成
- [ ] 統合メディアAPI実装
- [ ] ファイルストレージ設定
- [ ] AI画像補正機能統合

### **hotel-saas側**
- [ ] 既存Prisma使用箇所の完全削除
- [ ] 透明プロキシAPI実装
- [ ] 環境変数設定 (HOTEL_COMMON_API_URL)
- [ ] エラーハンドリング実装

### **テスト項目**
- [ ] メディアアップロード動作確認
- [ ] ファイルパス生成確認
- [ ] 公開URL生成確認
- [ ] エラー時のフォールバック確認

---

## 📅 **実装スケジュール**

| Phase | 期間 | 担当 | 内容 |
|-------|------|------|------|
| Phase 1 | Week 1 | hotel-common | 統合メディアAPI実装 |
| Phase 2 | Week 2 | hotel-saas | 透明プロキシ実装 |
| Phase 3 | Week 3 | 統合テスト | 動作確認・性能テスト |

**緊急度**: 🔴 **CRITICAL** - 客室ランクメディア管理機能が現在動作していないため、即座の実装が必要。
