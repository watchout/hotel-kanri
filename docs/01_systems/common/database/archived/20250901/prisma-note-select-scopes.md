# Prisma Note モデルと Select Scopes の解説

## 1. Noteモデルについて

現在のスキーマでは、主に `HandoverNote` モデルがノート機能を提供しています。このモデルはスタッフ間の引き継ぎ情報を管理するために使用されます。

### HandoverNoteモデルの主要フィールド

```prisma
model HandoverNote {
  id                      String    @id
  tenant_id               String
  from_staff_id           String
  to_staff_id             String?
  to_department           String?
  shift_handover_id       String?
  title                   String
  content                 String
  priority                String    @default("MEDIUM")
  category                String
  related_reservation_id  String?
  related_room_id         String?
  related_customer_id     String?
  photo_urls              Json      @default("[]")
  video_urls              Json      @default("[]")
  document_urls           Json      @default("[]")
  media_metadata          Json      @default("{}")
  status                  String    @default("PENDING")
  acknowledged_at         DateTime?
  acknowledged_by_staff_id String?
  resolved_at             DateTime?
  resolution_notes        String?
  requires_immediate_action Boolean  @default(false)
  follow_up_required      Boolean   @default(false)
  follow_up_deadline      DateTime?
  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt
  deleted_at              DateTime?
}
```

### 特徴
- スタッフ間の引き継ぎ情報を管理
- 優先度設定機能（MEDIUM、HIGH、LOW等）
- メディア添付機能（写真、動画、ドキュメント）
- ステータス管理（PENDING、ACKNOWLEDGED、RESOLVED等）
- フォローアップ機能

## 2. Select Scopes について

Prisma Clientでは、クエリ実行時に返されるデータを制御するための「Select Scopes」機能が提供されています。これにより、必要なフィールドのみを選択してデータベースから取得できます。

### 基本的な使用方法

#### 1. 特定のフィールドを選択

```typescript
// HandoverNoteの特定フィールドのみを取得
const notes = await prisma.handoverNote.findMany({
  where: { tenant_id: 'tenant-001' },
  select: {
    id: true,
    title: true,
    content: true,
    priority: true,
    status: true
  }
});
```

#### 2. リレーションを含める

```typescript
// 関連するスタッフ情報を含めて取得（仮定のリレーション）
const notes = await prisma.handoverNote.findMany({
  where: { tenant_id: 'tenant-001' },
  include: {
    fromStaff: true  // fromStaffリレーションが定義されている場合
  }
});
```

#### 3. ネストされた選択

```typescript
// 関連するスタッフの特定フィールドのみを取得
const notes = await prisma.handoverNote.findMany({
  where: { tenant_id: 'tenant-001' },
  select: {
    id: true,
    title: true,
    content: true,
    fromStaff: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});
```

### 実際の使用例

#### 基本的なノート一覧取得

```typescript
// 基本的なノート一覧を取得
const notes = await prisma.handoverNote.findMany({
  where: {
    tenant_id: tenantId,
    deleted_at: null
  },
  orderBy: {
    created_at: 'desc'
  },
  select: {
    id: true,
    title: true,
    content: true,
    priority: true,
    status: true,
    category: true,
    created_at: true,
    from_staff_id: true
  }
});
```

#### 詳細なノート情報の取得

```typescript
// 詳細なノート情報を取得（メディア情報を含む）
const noteDetail = await prisma.handoverNote.findUnique({
  where: {
    id: noteId,
    tenant_id: tenantId
  },
  select: {
    id: true,
    title: true,
    content: true,
    priority: true,
    status: true,
    category: true,
    photo_urls: true,
    video_urls: true,
    document_urls: true,
    requires_immediate_action: true,
    follow_up_required: true,
    follow_up_deadline: true,
    created_at: true,
    updated_at: true,
    from_staff_id: true,
    to_staff_id: true,
    to_department: true,
    acknowledged_at: true,
    acknowledged_by_staff_id: true,
    resolved_at: true,
    resolution_notes: true
  }
});
```

#### 特定カテゴリのノート集計

```typescript
// カテゴリ別のノート数を集計
const noteCounts = await prisma.$queryRaw`
  SELECT category, COUNT(*) as count
  FROM "HandoverNote"
  WHERE tenant_id = ${tenantId}
  AND deleted_at IS NULL
  GROUP BY category
  ORDER BY count DESC
`;
```

## 3. Select Scopesの利点

1. **パフォーマンス最適化**：
   - 必要なフィールドのみを取得することでデータ転送量を削減
   - 大量のレコードを扱う場合に特に効果的

2. **型安全性**：
   - TypeScriptと組み合わせることで、選択したフィールドのみを含む型が自動生成される

3. **柔軟なデータ取得**：
   - API要件に応じて必要なフィールドのみを選択可能
   - フロントエンドの要件に合わせたデータ構造を構築可能

## 4. 実装のベストプラクティス

1. **必要なフィールドのみを選択する**：
   - 常に必要最小限のフィールドのみを選択
   - 特に大きなテキストフィールドや JSON フィールドは必要な場合のみ取得

2. **一貫したセレクションの再利用**：
   - 共通のフィールド選択を定数として定義
   ```typescript
   const NOTE_LIST_SELECT = {
     id: true,
     title: true,
     content: true,
     priority: true,
     status: true,
     created_at: true
   };
   
   const notes = await prisma.handoverNote.findMany({
     where: { tenant_id: tenantId },
     select: NOTE_LIST_SELECT
   });
   ```

3. **ページネーションとの組み合わせ**：
   ```typescript
   const notes = await prisma.handoverNote.findMany({
     where: { tenant_id: tenantId },
     select: NOTE_LIST_SELECT,
     skip: (page - 1) * pageSize,
     take: pageSize,
     orderBy: { created_at: 'desc' }
   });
   ```

## 5. 注意点

1. **N+1クエリ問題**：
   - 関連データを個別に取得すると多数のクエリが発生
   - `include`を適切に使用して関連データを一度に取得

2. **深いネストの回避**：
   - 過度に深いネストされた選択は避ける
   - 必要に応じて複数のクエリに分割

3. **デフォルト選択の設定**：
   - セキュリティ上重要なフィールドはデフォルトで除外
   - 常に明示的な選択を行う習慣をつける
