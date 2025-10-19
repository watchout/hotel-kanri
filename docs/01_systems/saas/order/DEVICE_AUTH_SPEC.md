# デバイス識別による自動認証仕様書
*Status: approved — 2025-05-14*
*Updated: 2025-01-XX（実装状況反映）*

---

## 1. 目的
- ホテル客室のSTB/タブレットからオーダー画面へのアクセス時に、**明示的なログイン操作なし**で利用可能にする
- MACアドレス/IPアドレスと部屋番号を紐づけることで、セキュリティを維持しつつユーザー体験を向上させる
- 運用管理を簡素化し、宿泊客の利便性を高める
- **客室UI**と**管理画面**の認証を明確に分離し、それぞれに適した認証方式を適用する

---

## 2. 要件一覧と実装状況

| ID | カテゴリ | 内容 | DoD | 実装状況 |
|----|----------|------|-----|----------|
| **D-01** | デバイス認証 | MACアドレス/IPによる部屋認証 | デバイス情報で部屋を自動特定 | ✅ 実装済み |
| **D-02** | 管理画面 | デバイス登録・管理機能 | `/admin/devices`でCRUD操作可能 | ✅ 実装済み |
| **D-03** | セキュリティ | 登録デバイス以外のアクセス制限 | 未登録デバイスは専用画面にリダイレクト | ✅ 実装済み |
| **D-04** | フォールバック | 認証失敗時の代替手段 | 部屋番号入力による認証も残す | 🚧 部分実装 |
| **D-05** | ログ記録 | デバイスアクセスログ | 不正アクセス検知と監査証跡の保持 | 🚧 未実装 |
| **D-06** | 認証分離 | 客室UIと管理画面の認証分離 | 異なる認証システムで管理し、相互に影響しない | ✅ 実装済み |
| **D-07** | アクセス制御 | トップページ(/)のアクセス制御 | 有効なデバイスからのみアクセス可能 | ✅ 実装済み |

---

## 3. 実装済み機能

### 3.1 デバイス管理画面
- **パス**: `/admin/devices`
- **機能**: 
  - デバイス一覧表示（検索・フィルタリング機能付き）
  - 新規デバイス登録
  - 既存デバイス編集（アイコンボタンUI）
  - デバイス削除（論理削除、アイコンボタンUI）
  - ステータス管理（有効/無効）
- **UIの特徴**: 
  - 編集・削除操作はアイコンボタン（鉛筆・ゴミ箱アイコン）
  - ホバー効果とツールチップ
  - レスポンシブテーブル設計

### 3.2 認証機能
- **デバイス認証ミドルウェア**: `middleware/device-auth.ts`
- **未認証デバイス用ページ**: `pages/unauthorized-device.vue`
- **認証分離**: 客室UI認証と管理画面認証の完全分離

### 3.3 データベース構造
- **DeviceRoomモデル**: 実装済み（Prismaスキーマ）
- **プレイス管理**: Place、PlaceType、PlaceGroupモデル実装済み

---

## 4. データモデル（実装済み）

```prisma
model DeviceRoom {
  id          Int      @id @default(autoincrement())
  macAddress  String?  @unique // MACアドレス
  ipAddress   String?  // IPアドレス
  deviceName  String   // デバイス識別名（例: "Room 101 Tablet"）
  roomId      String   // 部屋番号
  deviceType  String?  // デバイスタイプ（タブレット、STB、スマートTV等）
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime?
  
  // プレイス管理との統合
  placeId     Int?     // プレイスID（Place統合後）
  place       Place?   @relation(fields: [placeId], references: [id])
  
  @@map("device_rooms")
}

// プレイス管理（実装済み）
model Place {
  id          Int          @id @default(autoincrement())
  code        String       @unique
  name        String
  placeTypeId Int
  description String?
  attributes  Json?
  floor       Int?
  capacity    Int?
  area        Float?
  order       Int          @default(0)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?

  placeType   PlaceType    @relation(fields: [placeTypeId], references: [id])
  devices     DeviceRoom[]
  groupMembers PlaceGroupMember[]
  
  @@map("places")
}
```

---

## 5. API仕様（実装済み）

```
# デバイス管理（管理者認証必須）
GET    /api/v1/admin/devices           # デバイス一覧取得（検索・フィルタ対応）
POST   /api/v1/admin/devices           # 新規デバイス登録
PUT    /api/v1/admin/devices/{id}      # デバイス更新
DELETE /api/v1/admin/devices/{id}      # デバイス削除（論理削除）

# プレイス管理（実装済み）
GET    /api/admin/places               # プレイス一覧取得
POST   /api/admin/places               # プレイス作成
PUT    /api/admin/places/{id}          # プレイス更新
DELETE /api/admin/places/{id}          # プレイス削除

GET    /api/admin/place-types          # プレイスタイプ一覧取得
POST   /api/admin/place-types          # プレイスタイプ作成
PUT    /api/admin/place-types/{id}     # プレイスタイプ更新
DELETE /api/admin/place-types/{id}     # プレイスタイプ削除
```

---

## 6. 追加実装が必要な機能

### 6.1 優先度: 高
1. **デバイスアクセスログ機能**
   - DeviceAccessLogモデルの実装
   - アクセス履歴の記録・表示
   - 不正アクセス検知

2. **フォールバック認証の完全実装**
   - 部屋番号による手動認証画面
   - 一時的なアクセス許可機能

3. **デバイス管理の機能拡張**
   - 一括操作（複数デバイスの一括更新/削除）
   - デバイス詳細情報表示
   - デバイス利用状況の可視化

### 6.2 優先度: 中
1. **統計・分析機能**
   - デバイス利用率分析
   - アクセスパターン分析
   - レポート機能

2. **プレイス・デバイス統合管理**
   - デバイス管理画面からのプレイス関連付け
   - プレイス別デバイス管理

### 6.3 優先度: 低
1. **高度なセキュリティ機能**
   - 多要素認証（MFA）
   - リアルタイム監視
   - 異常検知アラート

---

## 7. UI/UX改善済み項目

### 7.1 デバイス管理画面の改善
- ✅ 編集・削除ボタンのアイコン化
- ✅ ホバー効果とツールチップの追加
- ✅ 統一されたデザインシステム適用

### 7.2 推奨する追加UI改善
1. **ステータスインジケーターの強化**
   - オンライン/オフライン状態の表示
   - 最終アクセス時間の視覚化

2. **検索・フィルタリング機能の拡張**
   - 高度な検索条件
   - 保存可能なフィルタープリセット

---

## 8. セキュリティ考慮事項（実装済み・計画中）

### 8.1 実装済み
- ✅ 客室UIと管理画面の認証分離
- ✅ デバイス認証による自動アクセス制御
- ✅ 未認証デバイスのリダイレクト処理

### 8.2 今後の実装予定
- 🚧 アクセスログ監視
- 🚧 不正アクセス検知
- 🚧 管理者アクセスの監査ログ

---

## 9. 変更履歴

| 日付 | 担当者 | 変更内容 |
|------|--------|----------|
| 2025-05-12 | Team | 初版作成 |
| 2025-05-14 | Team | 客室UIと管理画面の認証分離を明確化 |
| 2025-01-XX | Team | 実装状況反映、UIアイコン化対応、追加機能要件整理 | 