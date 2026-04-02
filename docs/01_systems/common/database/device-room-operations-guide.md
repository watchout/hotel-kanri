# DeviceRoomテーブル運用ガイド

**作成日**: 2025年8月20日  
**作成者**: データベース管理チーム  
**対象**: 開発チーム、運用チーム

## 1. 概要

本ドキュメントは、新しく作成された`DeviceRoom`テーブルの運用に関するガイドラインを提供します。このテーブルはhotel-saasのデバイス管理機能で使用され、統合データベース内で管理されます。

## 2. テーブル構造

```prisma
model DeviceRoom {
  id         Int       @id @default(autoincrement())
  tenantId   String
  roomId     String
  roomName   String?
  deviceId   String?
  deviceType String?
  placeId    String?
  status     String?   @default("active")
  ipAddress  String?
  macAddress String?
  lastUsedAt DateTime?
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  tenant     Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([roomId])
  @@index([deviceId])
  @@index([placeId])
  @@index([status])
  @@map("device_rooms")
}
```

## 3. 運用上の注意点

### 3.1 アクセス方法

`DeviceRoom`テーブルへのアクセスは、以下の方法で行ってください：

1. **統合クライアント経由**:
   ```typescript
   import { UnifiedPrismaClient } from 'hotel-common/dist/database/unified-client';

   const unifiedClient = new UnifiedPrismaClient({
     tenantId: 'tenant-id',
     systemName: 'hotel-saas'
   });

   // デバイス一覧取得
   const devices = await unifiedClient.getRawClient().deviceRoom.findMany({
     where: { tenantId: 'tenant-id' }
   });
   ```

2. **テナント分離を考慮したアクセス**:
   ```typescript
   // テナント分離を考慮したアクセス
   await unifiedClient.withTenant('tenant-id', async () => {
     const client = unifiedClient.getRawClient();
     return await client.deviceRoom.findMany();
   });
   ```

### 3.2 命名規則の考慮

現在の実装では、以下の命名規則の例外があります：

- データベースカラム名がキャメルケース (`tenantId`) になっている
- 理想的にはスネークケース (`tenant_id`) とすべきだが、既存のパターンに合わせている

これらの例外を考慮し、クエリ作成時には正確なカラム名を使用してください。

### 3.3 外部キー制約

`tenantId`フィールドは`Tenant`テーブルの`id`フィールドを参照する外部キー制約があります。そのため：

- 存在しない`tenantId`でレコードを作成することはできません
- `Tenant`レコードを削除する前に、関連する`DeviceRoom`レコードを削除する必要があります

## 4. 一般的な操作例

### 4.1 レコードの作成

```typescript
const newDevice = await prisma.deviceRoom.create({
  data: {
    tenantId: 'tenant-001',
    roomId: 'room-101',
    roomName: 'デラックスルーム101',
    deviceType: 'tablet',
    status: 'active',
    ipAddress: '192.168.1.100',
    macAddress: '00:1A:2B:3C:4D:5E',
    isActive: true
  }
});
```

### 4.2 レコードの検索

```typescript
// テナントIDとルームIDで検索
const devices = await prisma.deviceRoom.findMany({
  where: {
    tenantId: 'tenant-001',
    roomId: 'room-101'
  }
});

// ステータスで検索
const activeDevices = await prisma.deviceRoom.findMany({
  where: {
    tenantId: 'tenant-001',
    status: 'active'
  }
});
```

### 4.3 レコードの更新

```typescript
const updatedDevice = await prisma.deviceRoom.update({
  where: { id: 1 },
  data: {
    status: 'maintenance',
    lastUsedAt: new Date()
  }
});
```

### 4.4 レコードの削除

```typescript
const deletedDevice = await prisma.deviceRoom.delete({
  where: { id: 1 }
});
```

## 5. パフォーマンスの考慮事項

### 5.1 インデックス

以下のフィールドにはインデックスが設定されています：

- `tenantId`
- `roomId`
- `deviceId`
- `placeId`
- `status`

これらのフィールドを使用した検索は効率的に行われます。

### 5.2 大量データの処理

大量のデバイスデータを処理する場合は、以下の点に注意してください：

- ページネーションを使用する：
  ```typescript
  const devices = await prisma.deviceRoom.findMany({
    where: { tenantId: 'tenant-001' },
    skip: 0,
    take: 50
  });
  ```

- 必要なフィールドのみを取得する：
  ```typescript
  const devices = await prisma.deviceRoom.findMany({
    where: { tenantId: 'tenant-001' },
    select: {
      id: true,
      roomId: true,
      roomName: true,
      status: true
    }
  });
  ```

## 6. 今後の運用における潜在的な問題と対策

### 6.1 命名規則の不一致

**問題**: 現在のカラム命名規則（キャメルケース）は、データベース設計のベストプラクティス（スネークケース）と一致していません。

**対策**:
- 短期的には現在の命名規則を維持し、一貫性を確保
- 長期的には、すべてのテーブルの命名規則を統一するマイグレーション計画を検討

### 6.2 `placeId`の外部キー制約の欠如

**問題**: `placeId`フィールドには外部キー制約がありません。これは、存在しない場所IDを参照する可能性があります。

**対策**:
- アプリケーションレベルでの検証を実装
- 将来的に`Place`テーブルが作成された場合は、外部キー制約を追加するマイグレーションを検討

### 6.3 スキーマ変更の管理

**問題**: 今後のスキーマ変更が必要になった場合、マイグレーションの競合が発生する可能性があります。

**対策**:
- スキーマ変更は必ず`npx prisma migrate dev`を通じて行う
- マイグレーションファイルは慎重にレビューする
- 直接SQLを実行せず、Prismaのマイグレーション機能を使用する

## 7. 監視とメンテナンス

### 7.1 定期的な確認

- テーブルサイズの監視
- インデックスの使用状況の確認
- クエリパフォーマンスの分析

### 7.2 バックアップ

- 定期的なデータベースバックアップを確保
- 特に大規模な変更前には必ずバックアップを取得

## 8. 結論

`DeviceRoom`テーブルは、現在の命名規則に一部例外がありますが、機能的には問題なく使用できます。長期的には命名規則の統一を検討すべきですが、短期的な運用には影響ありません。

このガイドラインに従うことで、`DeviceRoom`テーブルの効率的かつ安全な運用が可能になります。
