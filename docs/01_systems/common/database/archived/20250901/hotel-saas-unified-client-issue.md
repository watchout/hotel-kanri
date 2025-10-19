# hotel-saas統合クライアント問題分析レポート

**作成日**: 2025年8月18日  
**作成者**: hotel-common データベース管理チーム  
**対象**: hotel-saasチーム

## 問題の概要

hotel-saasプロジェクトの管理画面（`/admin/devices`）でデータが取得できない問題が報告されています。調査の結果、以下の問題点が特定されました。

## 調査結果

### 1. deviceRoomテーブルの存在確認

統合データベース（hotel_unified_db）に`deviceRoom`または`device_room`テーブルが存在しないことを確認しました。

```
$ psql -h 127.0.0.1 -p 5432 -U kaneko -d hotel_unified_db -c "\dt *device*"
               List of relations
 Schema |        Name         | Type  | Owner  
--------+---------------------+-------+--------
 public | device_video_caches | table | kaneko
```

デバイス関連のテーブルは`device_video_caches`のみ存在します。

### 2. スキーマ定義の確認

Prismaスキーマ（`prisma/schema.prisma`）には`DeviceRoom`モデルが定義されていないことを確認しました。

```
$ cat prisma/schema.prisma | grep -A 20 "model DeviceRoom" 
DeviceRoomモデルが見つかりません
```

### 3. 統合クライアントの実装分析

hotel-common側の統合クライアント実装を分析した結果、以下の点を確認しました：

1. **統合クライアント実装**:
   - `src/database/unified-client.ts`: 完全なマルチテナント対応の統合クライアント
   - `src/database/unified-client-simple.ts`: シンプル版の統合クライアント
   - `src/database/prisma.ts`: シングルトンパターンのデータベースクライアント

2. **正しいトランザクション実装**:
   - `unified-client.ts`では、トランザクション内でPrismaクライアントが正しく渡されています
   ```typescript
   async transaction<T>(fn: (client: UnifiedPrismaClient) => Promise<T>): Promise<T> {
     return await this.prisma.$transaction(async (tx) => {
       const txClient = new UnifiedPrismaClient({...})
       ;(txClient as any).prisma = tx
       return await fn(txClient)
     })
   }
   ```

3. **モデルアクセス方法**:
   - `prisma.ts`では、各モデルへの直接アクセスが提供されています
   ```typescript
   public get staff() { return this.prisma.staff }
   ```

## 問題の原因

1. **テーブル不在の問題**:
   - `deviceRoom`テーブルが統合データベースに存在しないため、クエリが失敗しています
   - このテーブルはhotel-saas側で定義されている可能性があります

2. **統合クライアントの使用方法の問題**:
   - hotel-saas側の`unified-prisma.ts`実装が、hotel-common側の実装と整合していない可能性があります
   - トランザクション内でPrismaクライアントが正しく使用されていない可能性があります

3. **テナント分離の問題**:
   - テナントIDが自動的に追加されていない可能性があります
   - クエリにテナントIDが含まれていない可能性があります

## 解決策の提案

### 1. テーブル定義の確認と修正

1. **テーブル存在の確認**:
   - hotel-saas側でDeviceRoomモデルが定義されているか確認してください
   - 統合データベースにテーブルを作成する必要がある場合は、マイグレーションを作成してください

2. **スキーマ定義**:
   ```prisma
   model DeviceRoom {
     id          String    @id @default(cuid())
     tenant_id   String
     name        String
     description String?
     status      String    @default("active")
     // 必要なフィールドを追加
     created_at  DateTime  @default(now())
     updated_at  DateTime  @updatedAt
     
     @@index([tenant_id])
     @@map("device_rooms")
   }
   ```

### 2. 統合クライアントの正しい使用方法

1. **推奨される実装**:
   ```typescript
   // server/utils/unified-prisma.ts
   import { UnifiedPrismaClient } from 'hotel-common/dist/database/unified-client';

   const unifiedClient = new UnifiedPrismaClient({
     tenantId: process.env.TENANT_ID || 'default',
     systemName: 'hotel-saas',
   });

   export const hotelDb = {
     async transaction(fn) {
       return await unifiedClient.transaction(fn);
     },
     
     // テナント操作
     async withTenant(tenantId, operation) {
       return await unifiedClient.withTenant(tenantId, operation);
     },
     
     // 生のクライアント取得
     getRawClient() {
       return unifiedClient.getRawClient();
     }
   };
   ```

2. **APIエンドポイントでの使用例**:
   ```typescript
   // server/api/v1/admin/devices/index.get.ts
   import { hotelDb } from '~/server/utils/unified-prisma';

   export default defineEventHandler(async (event) => {
     const tenantId = getTenantId(event);
     
     try {
       // 方法1: 統合クライアントを使用
       return await hotelDb.withTenant(tenantId, async () => {
         const client = hotelDb.getRawClient();
         return await client.deviceRoom.findMany({
           where: { tenant_id: tenantId }
         });
       });
       
       // 方法2: トランザクションを使用
       return await hotelDb.transaction(async (prisma) => {
         return await prisma.findMany('deviceRoom', { 
           tenant_id: tenantId 
         });
       });
     } catch (error) {
       console.error('デバイス取得エラー:', error);
       throw createError({
         statusCode: 500,
         message: 'デバイス情報の取得に失敗しました'
       });
     }
   });
   ```

### 3. テナント分離の確保

1. **テナントIDの自動追加**:
   - 統合クライアントは自動的にテナントIDを追加しますが、生のPrismaクライアントを使用する場合は明示的に指定する必要があります
   ```typescript
   const devices = await prisma.deviceRoom.findMany({
     where: { tenant_id: tenantId }
   });
   ```

2. **テナントIDの取得**:
   ```typescript
   function getTenantId(event) {
     // リクエストヘッダーまたはセッションからテナントIDを取得
     const session = event.context.session;
     return session?.tenant_id || 'default';
   }
   ```

## 次のステップ

1. hotel-saas側の`unified-prisma.ts`実装を確認し、上記の推奨実装に合わせて修正してください
2. DeviceRoomモデルの定義を確認し、必要に応じてマイグレーションを作成してください
3. APIエンドポイントの実装を見直し、テナント分離が正しく行われていることを確認してください
4. 修正後、再度テストを実施し、データが正しく取得できるか確認してください

## サポート

問題が解決しない場合は、以下の情報を提供してください：

1. hotel-saas側の`unified-prisma.ts`の実装
2. DeviceRoomモデルの定義
3. APIエンドポイントの実装
4. 発生しているエラーメッセージ（存在する場合）

hotel-common統合データベースチームが引き続きサポートいたします。
