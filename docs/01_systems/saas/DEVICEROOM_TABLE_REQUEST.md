# DeviceRoomテーブル作成依頼

## 概要

hotel-saasの管理画面でデバイス管理機能を使用するため、統合データベースに`DeviceRoom`テーブルの作成を依頼します。現在、このテーブルが存在しないため、デバイス管理画面でデータが取得できない状態です。

## 現在の問題

1. `/admin/devices`ページにアクセスすると、データ取得エラーが発生
2. APIエンドポイント`/api/v1/admin/devices`が`deviceRoom`テーブルにアクセスしようとするが、テーブルが存在しない

## 必要なテーブル構造

現在のソースコードを分析した結果、以下のテーブル構造が必要です。この構造は、`prisma/schema.prisma`と`prisma/backup/schema.prisma`の両方を参照しています。

```prisma
model DeviceRoom {
  id           Int       @id @default(autoincrement())
  tenantId     String
  roomId       String    // 部屋番号（文字列形式）
  roomName     String?   // 部屋名称
  deviceId     String?   // デバイス識別子
  deviceType   String?   // "room", "front", "kitchen" など
  placeId      String?   // 場所ID
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
```

## APIの使用方法

デバイス管理画面では、以下のAPIエンドポイントを使用しています：

1. `GET /api/v1/admin/devices` - デバイス一覧取得
2. `POST /api/v1/admin/devices` - 新規デバイス作成
3. `PUT /api/v1/admin/devices/:id` - デバイス情報更新
4. `POST /api/v1/admin/devices/:id/reset` - デバイスリセット
5. `POST /api/v1/admin/devices/:id/checkout` - デバイスチェックアウト

## 実装の優先度

この機能はhotel-saasの管理画面の重要な部分であり、デバイス管理ができないとシステムの運用に支障をきたします。そのため、優先度は「高」とさせていただきます。

## 追加情報

1. 現在の実装では、`server/api/v1/admin/devices/index.get.ts`で`prisma.deviceRoom.findMany()`を呼び出していますが、テーブルが存在しないためエラーになっています。

2. 既存のスキーマファイル（`prisma/schema.prisma`）には`DeviceRoom`モデルの定義がありますが、実際のデータベースにテーブルが作成されていない状態です。

3. `prisma/backup/schema.prisma`と`prisma/schema.prisma`の両方に`DeviceRoom`モデルの定義がありますが、若干の違いがあります。最新の`schema.prisma`に合わせた形での実装を希望します。

## 依頼内容

1. 統合データベースに`DeviceRoom`テーブルを作成してください
2. 必要なインデックスを設定してください
3. テーブル作成後、基本的なデータアクセスが可能か確認してください

よろしくお願いいたします。
