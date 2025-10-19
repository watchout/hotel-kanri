# データモデル整合性確認・調整ガイド

## 概要
客室一覧・デバイス管理のAPI方式移行に伴うデータモデルの整合性確認と調整指示書です。

---

## 🏗️ 現在のデータモデル状況

### hotel-saas（移行前）
- **データベース**: SQLite（開発環境）
- **ORM**: Prisma Client（直接アクセス）
- **状態**: 248個のAPI無効化済み、10個のダミーAPI稼働中

### hotel-common（移行先）
- **データベース**: PostgreSQL（統合データベース）
- **ORM**: Prisma Client（統合管理）
- **状態**: 基本APIは実装済み、DeviceRoomテーブル未作成

---

## 📊 データモデル対応表

### 1. 客室管理関連テーブル

#### Room テーブル（既存）
| フィールド | 型 | 制約 | SaaS対応 | Common対応 | 備考 |
|-----------|---|------|----------|------------|------|
| `id` | String | PK | ✅ | ✅ | UUID形式 |
| `tenantId` | String | FK, Index | ✅ | ✅ | テナント分離 |
| `room_number` | String | NOT NULL | ✅ | ✅ | 部屋番号 |
| `room_type` | String | NOT NULL | ✅ | ✅ | 部屋タイプ |
| `floor` | Int | - | ✅ | ✅ | 階数 |
| `status` | String | Default: 'available' | ✅ | ✅ | 客室状態 |
| `capacity` | Int | Default: 2 | ✅ | ✅ | 収容人数 |
| `amenities` | Json | - | ✅ | ✅ | 設備一覧 |
| `notes` | String | - | ✅ | ✅ | 備考 |
| `createdAt` | DateTime | Default: now() | ✅ | ✅ | 作成日時 |
| `updatedAt` | DateTime | Auto update | ✅ | ✅ | 更新日時 |

#### RoomStatus テーブル（既存）
| フィールド | 型 | 制約 | SaaS対応 | Common対応 | 備考 |
|-----------|---|------|----------|------------|------|
| `id` | Int | PK, Auto increment | ✅ | ✅ | ID |
| `placeId` | Int | FK, Unique | ✅ | ✅ | Place テーブルとの関連 |
| `status` | String | Default: 'available' | ✅ | ✅ | 状態 |
| `checkinAt` | DateTime | - | ✅ | ✅ | チェックイン日時 |
| `checkoutAt` | DateTime | - | ✅ | ✅ | チェックアウト日時 |
| `guestCount` | Int | - | ✅ | ✅ | 宿泊人数 |
| `createdAt` | DateTime | Default: now() | ✅ | ✅ | 作成日時 |
| `updatedAt` | DateTime | Auto update | ✅ | ✅ | 更新日時 |

### 2. デバイス管理関連テーブル

#### DeviceRoom テーブル（🚨 新規作成必要）
| フィールド | 型 | 制約 | 説明 | 実装状況 |
|-----------|---|------|------|----------|
| `id` | Int | PK, Auto increment | デバイスID | 🔄 要作成 |
| `tenantId` | String | FK, Index | テナントID | 🔄 要作成 |
| `roomId` | String | Index | 部屋番号 | 🔄 要作成 |
| `roomName` | String | - | 部屋名称 | 🔄 要作成 |
| `deviceId` | String | Index | デバイス識別子 | 🔄 要作成 |
| `deviceType` | String | - | デバイスタイプ | 🔄 要作成 |
| `placeId` | String | FK, Index | 場所ID | 🔄 要作成 |
| `status` | String | Default: 'active' | デバイス状態 | 🔄 要作成 |
| `ipAddress` | String | - | IPアドレス | 🔄 要作成 |
| `macAddress` | String | - | MACアドレス | 🔄 要作成 |
| `lastUsedAt` | DateTime | - | 最終使用日時 | 🔄 要作成 |
| `isActive` | Boolean | Default: true | アクティブ状態 | 🔄 要作成 |
| `createdAt` | DateTime | Default: now() | 作成日時 | 🔄 要作成 |
| `updatedAt` | DateTime | Auto update | 更新日時 | 🔄 要作成 |

#### Place テーブル（既存・関連）
| フィールド | 型 | 制約 | SaaS対応 | Common対応 | 備考 |
|-----------|---|------|----------|------------|------|
| `id` | Int | PK, Auto increment | ✅ | ✅ | 場所ID |
| `tenantId` | String | FK, Index | ✅ | ✅ | テナント分離 |
| `name` | String | NOT NULL | ✅ | ✅ | 場所名 |
| `code` | String | - | ✅ | ✅ | 場所コード |
| `type` | String | - | ✅ | ✅ | 場所タイプ |

---

## 🔧 必要な調整作業

### Phase 1: DeviceRoomテーブル作成

#### 1.1 Prismaスキーマ更新
**対象ファイル**: `hotel-common/prisma/schema.prisma`

```prisma
model DeviceRoom {
  id           Int       @id @default(autoincrement())
  tenantId     String
  roomId       String    // 部屋番号（文字列形式）
  roomName     String?   // 部屋名称
  deviceId     String?   // デバイス識別子
  deviceType   String?   // "room", "front", "kitchen" など
  placeId      String?   // 場所ID（文字列形式でPlace.idと関連）
  status       String?   @default("active") // デバイスステータス
  ipAddress    String?   // IPアドレス
  macAddress   String?   // MACアドレス
  lastUsedAt   DateTime? // 最終使用日時
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // リレーション
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  place        Place?    @relation(fields: [placeId], references: [id])

  @@index([tenantId])
  @@index([roomId])
  @@index([deviceId])
  @@index([placeId])
  @@index([status])
  @@map("device_rooms")
}

// 既存のPlaceモデルに追加
model Place {
  // ... 既存フィールド ...
  deviceRooms  DeviceRoom[]  // DeviceRoomとの関連を追加
}

// 既存のTenantモデルに追加
model Tenant {
  // ... 既存フィールド ...
  deviceRooms  DeviceRoom[]  // DeviceRoomとの関連を追加
}
```

#### 1.2 マイグレーション実行
```bash
cd hotel-common
npx prisma db push
npx prisma generate
```

### Phase 2: データ型整合性調整

#### 2.1 ID型の統一
| テーブル | フィールド | 現在の型 | 統一後の型 | 調整理由 |
|----------|-----------|----------|-----------|----------|
| Room | id | String (UUID) | String (UUID) | 変更なし |
| DeviceRoom | placeId | String | String | Place.id に合わせる |
| Place | id | Int | Int | 変更なし（既存システムとの互換性） |

#### 2.2 列挙型（Enum）の定義
```prisma
enum RoomStatus {
  AVAILABLE   @map("available")
  OCCUPIED    @map("occupied")
  MAINTENANCE @map("maintenance")
  CLEANING    @map("cleaning")
}

enum DeviceType {
  ROOM     @map("room")
  FRONT    @map("front")
  KITCHEN  @map("kitchen")
  TABLET   @map("tablet")
  TV       @map("tv")
}

enum DeviceStatus {
  ACTIVE      @map("active")
  INACTIVE    @map("inactive")
  MAINTENANCE @map("maintenance")
  ERROR       @map("error")
}
```

### Phase 3: インデックス最適化

#### 3.1 パフォーマンス向上のためのインデックス
```prisma
model DeviceRoom {
  // ... フィールド定義 ...

  @@index([tenantId, roomId])           // テナント + 部屋での検索
  @@index([tenantId, deviceType])       // テナント + デバイスタイプでの検索
  @@index([tenantId, status])           // テナント + ステータスでの検索
  @@index([tenantId, isActive])         // テナント + アクティブ状態での検索
  @@index([macAddress])                 // MACアドレスでの高速検索
  @@index([ipAddress])                  // IPアドレスでの高速検索
  @@index([lastUsedAt])                 // 最終使用日時での検索
}

model Room {
  // ... 既存フィールド ...

  @@index([tenantId, status])           // テナント + ステータスでの検索
  @@index([tenantId, room_type])        // テナント + 部屋タイプでの検索
  @@index([tenantId, floor])            // テナント + 階数での検索
}
```

---

## 🔄 データ移行戦略

### 移行方針
1. **新規データ**: Common側で直接作成
2. **既存データ**: 段階的移行（必要に応じて）
3. **テストデータ**: 開発環境で十分なテストデータを準備

### 移行手順

#### Step 1: 開発環境での検証
```bash
# 1. hotel-commonでテーブル作成
cd hotel-common
npx prisma db push

# 2. テストデータ投入
npx prisma db seed

# 3. API動作確認
npm run test:api
```

#### Step 2: テストデータ作成スクリプト
**対象ファイル**: `hotel-common/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDeviceRooms() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error('テナントが見つかりません');
  }

  // サンプルデバイス作成
  const devices = [
    {
      tenantId: tenant.id,
      roomId: '101',
      roomName: 'スタンダードルーム 101',
      deviceId: 'tablet-101',
      deviceType: 'tablet',
      status: 'active',
      ipAddress: '192.168.1.101',
      macAddress: 'AA:BB:CC:DD:EE:01',
      isActive: true
    },
    {
      tenantId: tenant.id,
      roomId: '102',
      roomName: 'スタンダードルーム 102',
      deviceId: 'tablet-102',
      deviceType: 'tablet',
      status: 'active',
      ipAddress: '192.168.1.102',
      macAddress: 'AA:BB:CC:DD:EE:02',
      isActive: true
    },
    {
      tenantId: tenant.id,
      roomId: 'front',
      roomName: 'フロントデスク',
      deviceId: 'front-terminal',
      deviceType: 'front',
      status: 'active',
      ipAddress: '192.168.1.200',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      isActive: true
    }
  ];

  for (const device of devices) {
    await prisma.deviceRoom.create({
      data: device
    });
  }

  console.log('デバイスデータのシードが完了しました');
}

async function main() {
  await seedDeviceRooms();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🧪 データ整合性テスト

### テスト項目

#### 1. 基本CRUD操作テスト
```typescript
// テストファイル例: hotel-common/tests/deviceRoom.test.ts
describe('DeviceRoom CRUD操作', () => {
  test('デバイス作成', async () => {
    const device = await prisma.deviceRoom.create({
      data: {
        tenantId: 'test-tenant',
        roomId: '999',
        deviceType: 'tablet',
        status: 'active'
      }
    });
    
    expect(device.id).toBeDefined();
    expect(device.status).toBe('active');
  });

  test('テナント分離確認', async () => {
    // 異なるテナントのデータが取得されないことを確認
    const devices = await prisma.deviceRoom.findMany({
      where: { tenantId: 'other-tenant' }
    });
    
    expect(devices).toHaveLength(0);
  });
});
```

#### 2. リレーション整合性テスト
```typescript
describe('リレーション整合性', () => {
  test('Place との関連', async () => {
    const deviceWithPlace = await prisma.deviceRoom.findFirst({
      include: { place: true }
    });
    
    if (deviceWithPlace?.place) {
      expect(deviceWithPlace.place.id).toBeDefined();
    }
  });

  test('Tenant との関連', async () => {
    const deviceWithTenant = await prisma.deviceRoom.findFirst({
      include: { tenant: true }
    });
    
    expect(deviceWithTenant?.tenant).toBeDefined();
  });
});
```

#### 3. インデックス性能テスト
```typescript
describe('インデックス性能', () => {
  test('テナント + 部屋ID検索', async () => {
    const start = Date.now();
    
    await prisma.deviceRoom.findMany({
      where: {
        tenantId: 'test-tenant',
        roomId: '101'
      }
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // 100ms以内
  });
});
```

---

## ⚠️ 注意事項・制約

### データ制約
1. **テナント分離**: すべてのクエリでtenantIdフィルタが必須
2. **一意性制約**: 同一テナント内でdeviceIdは一意
3. **外部キー制約**: placeIdは存在するPlace.idを参照
4. **データ型制約**: IPアドレス、MACアドレスの形式検証

### パフォーマンス制約
1. **大量データ**: 10,000件以上のデバイスでもレスポンス1秒以内
2. **同時接続**: 100同時接続でも安定動作
3. **メモリ使用量**: 1GB以内でのクエリ実行

### セキュリティ制約
1. **認証**: すべてのAPI呼び出しでJWT認証必須
2. **認可**: テナント間のデータアクセス禁止
3. **入力検証**: SQLインジェクション対策の徹底

---

## 🚀 実装チェックリスト

### データベース準備
- [ ] DeviceRoomテーブルのPrismaスキーマ定義
- [ ] リレーション設定（Tenant, Place）
- [ ] インデックス設定
- [ ] マイグレーション実行
- [ ] シードデータ投入

### API実装
- [ ] DeviceRoom CRUD API実装
- [ ] テナント分離の実装
- [ ] バリデーション実装
- [ ] エラーハンドリング実装

### テスト実装
- [ ] 単体テスト作成
- [ ] 統合テスト作成
- [ ] パフォーマンステスト作成
- [ ] セキュリティテスト作成

### 本番準備
- [ ] 本番環境でのマイグレーション計画
- [ ] バックアップ・リストア手順
- [ ] 監視・アラート設定
- [ ] 運用手順書作成

---

## 📋 トラブルシューティング

### よくある問題

#### 1. マイグレーションエラー
```bash
# エラー: テーブルが既に存在する
# 解決方法
npx prisma db push --force-reset
npx prisma generate
```

#### 2. リレーションエラー
```bash
# エラー: 外部キー制約違反
# 解決方法: 参照先データの存在確認
SELECT * FROM places WHERE id = 'target-place-id';
```

#### 3. インデックス性能問題
```sql
-- クエリ実行計画の確認
EXPLAIN ANALYZE SELECT * FROM device_rooms 
WHERE tenant_id = 'xxx' AND room_id = '101';
```

#### 4. データ型不整合
```typescript
// 型安全性の確保
interface DeviceRoomCreateInput {
  tenantId: string;
  roomId: string;
  deviceType?: 'room' | 'front' | 'kitchen' | 'tablet' | 'tv';
  status?: 'active' | 'inactive' | 'maintenance' | 'error';
}
```

---

**作成日**: 2025年10月1日  
**更新日**: 2025年10月1日  
**バージョン**: 1.0  
**作成者**: データベース設計チーム

