# データ移行仕様書

## 概要

既存の`DeviceRoom`テーブルのデータを新しいプレイス管理システムに移行するための詳細仕様。

## 移行対象データ

### 現在のDeviceRoomテーブル構造
```sql
DeviceRoom {
  id: Int
  macAddress: String?
  ipAddress: String?
  deviceName: String
  roomId: String        # ← これをPlaceのcodeとして使用
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
  lastUsedAt: DateTime?
  deviceType: String?
  isDeleted: Boolean
  deletedAt: DateTime?
}
```

## 移行手順

### Step 1: データベーススキーマ適用
```bash
npx prisma db push
npx prisma generate
```

### Step 2: デフォルトプレイスタイプ作成
```javascript
const defaultPlaceType = {
  name: "客室",
  description: "ホテル客室",
  color: "#3B82F6",
  icon: "bed",
  order: 1,
  isActive: true
}
```

### Step 3: 既存roomIdからPlace作成
```javascript
// 既存のDeviceRoomからユニークなroomIdを抽出
const uniqueRoomIds = await prisma.deviceRoom.findMany({
  where: { isDeleted: false },
  select: { roomId: true },
  distinct: ['roomId']
})

// 各roomIdに対してPlaceを作成
for (const { roomId } of uniqueRoomIds) {
  await prisma.place.create({
    data: {
      code: roomId,
      name: `${roomId}号室`,
      placeTypeId: defaultPlaceType.id,
      description: `客室 ${roomId}`,
      isActive: true,
      order: parseInt(roomId) || 999
    }
  })
}
```

### Step 4: DeviceRoomとPlaceの関連付け
```javascript
// 各DeviceRoomに対応するPlaceのIDを設定
const deviceRooms = await prisma.deviceRoom.findMany({
  where: { isDeleted: false }
})

for (const deviceRoom of deviceRooms) {
  const place = await prisma.place.findUnique({
    where: { code: deviceRoom.roomId }
  })
  
  if (place) {
    await prisma.deviceRoom.update({
      where: { id: deviceRoom.id },
      data: { placeId: place.id }
    })
  }
}
```

## 移行スクリプト仕様

### ファイル名
`scripts/migrate-device-to-place.js`

### 実行方法
```bash
node scripts/migrate-device-to-place.js
```

### 機能要件

#### 1. 事前チェック
- データベース接続確認
- 既存データの整合性チェック
- バックアップファイルの存在確認

#### 2. バックアップ作成
```javascript
const backupPath = `./prisma/dev.db.backup.migration.${new Date().toISOString().replace(/[:.]/g, '-')}`
await fs.copyFile('./prisma/dev.db', backupPath)
```

#### 3. データ移行処理
- トランザクション内で実行
- エラー時のロールバック対応
- 進捗表示

#### 4. 整合性チェック
- 全DeviceRoomがPlaceに関連付けられているか確認
- 重複データの検出
- 孤立データの検出

#### 5. レポート出力
```javascript
const migrationReport = {
  startTime: Date,
  endTime: Date,
  placeTypesCreated: Number,
  placesCreated: Number,
  deviceRoomsUpdated: Number,
  errors: Array,
  warnings: Array
}
```

## エラーハンドリング

### 想定されるエラー

#### 1. 重複するroomId
```javascript
// 対処法: 既存のPlaceがある場合はスキップ
const existingPlace = await prisma.place.findUnique({
  where: { code: roomId }
})
if (existingPlace) {
  console.warn(`Place with code ${roomId} already exists, skipping...`)
  continue
}
```

#### 2. 無効なroomId
```javascript
// 対処法: デフォルト値を設定
const sanitizedRoomId = roomId || `UNKNOWN_${deviceRoom.id}`
const placeName = roomId ? `${roomId}号室` : `不明な部屋 ${deviceRoom.id}`
```

#### 3. データベース制約違反
```javascript
// 対処法: トランザクションでロールバック
try {
  await prisma.$transaction(async (tx) => {
    // 移行処理
  })
} catch (error) {
  console.error('Migration failed, rolling back...', error)
  throw error
}
```

## 検証手順

### 移行前チェック
```sql
-- 移行対象のDeviceRoom数
SELECT COUNT(*) FROM DeviceRoom WHERE isDeleted = false;

-- ユニークなroomId数
SELECT COUNT(DISTINCT roomId) FROM DeviceRoom WHERE isDeleted = false;

-- roomIdの分布
SELECT roomId, COUNT(*) FROM DeviceRoom WHERE isDeleted = false GROUP BY roomId;
```

### 移行後チェック
```sql
-- 作成されたPlace数
SELECT COUNT(*) FROM Place WHERE isDeleted = false;

-- PlaceTypeの確認
SELECT * FROM PlaceType;

-- DeviceRoomとPlaceの関連付け確認
SELECT 
  dr.id,
  dr.roomId,
  dr.placeId,
  p.code,
  p.name
FROM DeviceRoom dr
LEFT JOIN Place p ON dr.placeId = p.id
WHERE dr.isDeleted = false;

-- 関連付けされていないDeviceRoom
SELECT * FROM DeviceRoom WHERE placeId IS NULL AND isDeleted = false;
```

## ロールバック手順

### 緊急時のロールバック
```bash
# バックアップからの復元
cp ./prisma/dev.db.backup.migration.* ./prisma/dev.db

# Prismaクライアント再生成
npx prisma generate
```

### 部分的なロールバック
```javascript
// 新しく作成されたデータのみ削除
await prisma.placeGroupMember.deleteMany()
await prisma.placeGroup.deleteMany()
await prisma.place.deleteMany()
await prisma.placeType.deleteMany()

// DeviceRoomのplaceIdをNULLに戻す
await prisma.deviceRoom.updateMany({
  data: { placeId: null }
})
```

## 移行後の確認項目

### 機能テスト
1. **デバイス認証**: 既存のデバイスで正常にアクセスできるか
2. **注文機能**: 注文が正常に作成・処理されるか
3. **管理画面**: デバイス一覧が正常に表示されるか

### データ整合性テスト
1. **全DeviceRoomがPlaceに関連付けられているか**
2. **重複するPlaceが存在しないか**
3. **無効なデータが残っていないか**

### パフォーマンステスト
1. **プレイス一覧の表示速度**
2. **検索機能のレスポンス時間**
3. **大量データでの動作確認**

## 移行スケジュール

### 開発環境
1. スキーマ適用
2. 移行スクリプト実行
3. 機能テスト
4. 問題があれば修正・再実行

### 本番環境（将来）
1. メンテナンス時間の設定
2. データベースバックアップ
3. 移行スクリプト実行
4. 動作確認
5. サービス再開

## 注意事項

### データベース管理ルール遵守
- 移行前に必ずバックアップを作成
- 単一データベースファイルの原則を維持
- Prismaクライアントを使用したデータ操作

### 既存機能への影響最小化
- 既存のroomIdベースの処理は当面維持
- 段階的な移行でサービス停止を回避
- 問題発生時の迅速なロールバック体制

### 移行データの品質保証
- 全データの移行完了を確認
- データの整合性を検証
- 異常データの早期発見・対処 