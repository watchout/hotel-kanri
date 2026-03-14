# SSOT: 客室端末デバイス認証システム

**作成日**: 2025-10-02  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最優先（Phase 1）

**関連SSOT**:
- [SSOT_SAAS_AUTHENTICATION.md](./SSOT_SAAS_AUTHENTICATION.md) - 親SSOT（認証システム全体）
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 兄弟SSOT（管理画面認証）
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テスト環境・テストアカウント情報

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [認証方式](#認証方式)
5. [データベース設計](#データベース設計)
6. [認証フロー](#認証フロー)
7. [API仕様](#api仕様)
8. [システム間連携](#システム間連携)
9. [セキュリティ](#セキュリティ)
10. [既存実装状況](#既存実装状況)
11. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的
ホテル客室に設置されたSTB/タブレット端末からの**明示的なログイン操作なし**での自動認証を実現する。

### 基本方針
- **認証方式**: MAC/IPアドレスベースのデバイス認証
- **ユーザー体験**: ゼロタッチ認証（ログイン画面不要）
- **セキュリティ**: 登録デバイスのみアクセス許可
- **認証分離**: 管理画面認証（Session認証）とは完全に独立

### 管理画面認証との違い

| 項目 | 管理画面認証 | 客室端末認証 |
|------|-------------|-------------|
| 認証方式 | Session認証（Redis + Cookie） | デバイス認証（MAC/IP） |
| ログイン操作 | 必要（ID/パスワード） | 不要（自動） |
| 認証ストア | Redis | PostgreSQL（device_rooms） |
| 対象ユーザー | スタッフ | 宿泊客 |
| アクセス範囲 | 管理画面全体 | 客室UI（トップ、注文等） |

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-saas**: メイン実装（ミドルウェア + フロントエンド）
- ✅ **hotel-common**: デバイス管理API（CRUD）
- ❌ **hotel-pms**: 対象外（デバイス認証は使用しない）
- ❌ **hotel-member**: 対象外（会員認証を使用）

### 機能範囲

#### ✅ 実装済み
- デバイス登録・管理（`/admin/devices`）
- デバイス自動認証（MAC/IPベース）
- 未登録デバイスのリダイレクト
- 認証分離（管理画面と客室UI）
- アクセス制御（トップページ `/`）

#### ❌ 未実装
- デバイスアクセスログ記録
- 不正アクセス検知
- デバイス利用統計

---

## 🛠️ 技術スタック

### 認証方式
- **プライマリ**: MACアドレス認証
- **セカンダリ**: IPアドレス認証（補助）
- **識別子**: UserAgent（ログ用）

### データベース
- **RDBMS**: PostgreSQL（統一DB）
- **ORM**: Prisma
- **テーブル**: `device_rooms`

### フロントエンド
- **Framework**: Nuxt 3
- **Middleware**: `device-guard.ts`（サーバーミドルウェア）

### バックエンド
- **hotel-saas**: デバイス認証API（プロキシ）
- **hotel-common**: デバイス管理API（実処理）

### 命名規則統一

**重要**: 全システムで同じ概念は同じ名称を使用

| 概念 | データベース | Prisma | API/JSON |
|------|-------------|--------|----------|
| デバイスID | `device_id` | `deviceId` | `deviceId` |
| テナントID | `tenant_id` | `tenantId` | `tenantId` |
| 部屋ID | `room_id` | `roomId` | `roomId` |
| MACアドレス | `mac_address` | `macAddress` | `macAddress` |
| IPアドレス | `ip_address` | `ipAddress` | `ipAddress` |
| 作成日時 | `created_at` | `createdAt` | `createdAt` |
| 更新日時 | `updated_at` | `updatedAt` | `updatedAt` |

**命名規則**:
- **データベース（PostgreSQL）**: `snake_case`
- **Prisma Model**: `camelCase`
- **API/JSON**: `camelCase`
- **変数名**: `camelCase`（JavaScript/TypeScript標準）

---

## 🔐 認証方式

### デバイス識別方法

#### 優先順位
1. **MACアドレス** - 最優先（端末固有ID）
2. **IPアドレス** - 補助（ネットワーク識別）
3. **UserAgent** - 参考（ログ記録用）

#### MACアドレス取得不可時の挙動

**シナリオ1**: MACアドレスが取得できない場合
- リクエストに `macAddress` フィールドが空またはnull
- 結果: 認証失敗 → `/unauthorized-device` へリダイレクト
- 理由: MACアドレスは必須識別子

**シナリオ2**: MACアドレスは取得できたがIPアドレスが取得できない場合
- MACアドレスのみで認証可能
- IPアドレスは補助情報のため認証には影響しない
- デバイステーブルのIPアドレスフィールドは更新されない

**推奨対応**:
- ネットワーク設定でMAC取得を確保
- 取得不可の場合は以下の手順で対応:
  1. `/unauthorized-device` ページを表示
  2. フロントに連絡を促すメッセージを表示
  3. フロントスタッフが管理画面 `/admin/devices` で即座にデバイスを登録
  4. ゲストにページ再読み込みを依頼

### 認証判定ロジック

```
1. MACアドレスで検索
   └─ 一致 → デバイス特定
   └─ 不一致 → 認証失敗

2. デバイス状態確認
   └─ isActive = true → 認証成功
   └─ isActive = false → 認証失敗

3. 最終使用日時更新
   └─ lastUsedAt = 現在時刻
```

### 認証スコープ

**保護対象ページ**:
- `/` (トップページ)
- `/order/*` (注文関連)
- `/services/*` (サービス一覧)
- その他の客室UI全般

**保護対象外**:
- `/admin/*` (管理画面 - 別認証)
- `/api/*` (API - 個別認証)
- `/unauthorized-device` (認証失敗ページ)
- 静的リソース

---

## 🗄️ データベース設計

### device_rooms テーブル

**概要**: デバイス情報と部屋の紐づけを管理

**主要フィールド**:

| フィールド | 型 | NULL | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| id | Int | ❌ | auto | 主キー |
| tenantId | String | ❌ | - | テナントID |
| roomId | String | ❌ | - | 部屋番号 |
| roomName | String | ⭕ | - | 部屋名称 |
| deviceId | String | ⭕ | - | デバイス識別子 |
| deviceType | String | ⭕ | - | デバイスタイプ |
| placeId | String | ⭕ | - | プレイスID |
| status | String | ⭕ | 'active' | ステータス |
| ipAddress | String | ⭕ | - | IPアドレス |
| macAddress | String | ⭕ | - | MACアドレス |
| lastUsedAt | DateTime | ⭕ | - | 最終使用日時 |
| isActive | Boolean | ❌ | true | 有効/無効 |
| createdAt | DateTime | ❌ | now() | 作成日時 |
| updatedAt | DateTime | ❌ | auto | 更新日時 |

**Prismaマッピング**:
- Prismaモデル名: `device_rooms`（直接マッピング）
- PostgreSQLテーブル名: `device_rooms`
- 命名規則: Prisma=camelCase, DB=snake_case
- マッピング方法: `@@map("device_rooms")`

**インデックス**:
```
- tenantId (テナント分離)
- roomId (部屋検索)
- deviceId (デバイス検索)
- placeId (プレイス検索)
- status (ステータス検索)
```

**マルチテナント対応**:
- 全クエリに `tenantId` フィルタ必須
- テナント間のデータ完全分離

### Placeテーブルとの連携

**概要**: プレイス管理システムとの統合

**連携内容**:
- `device_rooms.placeId` → `places.id`
- プレイス単位でのデバイス管理
- 将来的な拡張対応

---

## 🔄 認証フロー

### 1. ページアクセス時の自動認証

```
[客室端末ブラウザ]
  ↓ GET / (トップページアクセス)
[hotel-saas: server/middleware/device-guard.ts]
  ↓ 1. パス判定（保護対象か？）
  ↓ 2. デバイス情報取得（IP、MAC、UA）
  ↓ 3. hotel-common APIコール
[hotel-common: /api/v1/devices/check-status]
  ↓ 4. device_rooms テーブル検索
  ↓ 5. デバイス存在確認 + 有効性チェック
  ↓ 6. 最終使用日時更新
  ↓ 7. 認証結果を返却
[hotel-saas: middleware]
  ├─ 認証成功 → ページ表示
  └─ 認証失敗 → /unauthorized-device へリダイレクト
```

### 2. デバイス管理フロー

```
[管理画面: /admin/devices]
  ↓ 管理者ログイン（Session認証）
[hotel-saas: 管理画面UI]
  ↓ CRUD操作
[hotel-saas: /api/v1/admin/devices/*]
  ↓ API中継（認証ヘッダー付与）
[hotel-common: /api/v1/devices/*]
  ↓ デバイスCRUD処理
[PostgreSQL: device_rooms]
  ↓ データ永続化
```

### 3. IP取得フロー

```
[管理画面: デバイス登録]
  ↓ クライアントIP取得ボタンクリック
[hotel-saas: /api/v1/devices/client-ip]
  ↓ ヘッダー解析
  ├─ X-Forwarded-For (優先)
  ├─ X-Real-IP
  └─ RemoteAddress
  ↓ IP正規化（IPv6 → IPv4）
  ↓ IPアドレス返却
[管理画面: UI]
  ↓ フォーム自動入力
```

---

## 🔌 API仕様

### ⚠️ 重要: APIの役割分担

デバイス認証関連のAPIは**2つの異なる実装**があります：

| システム | 用途 | 認証 | 呼び出し元 |
|---------|------|------|-----------|
| **hotel-common** | デバイス認証 | ❌ 不要 | device-guard.ts（ミドルウェア） |
| **hotel-saas** | 管理画面用 | ✅ 必須 | 管理画面UI |

**混同注意**: hotel-saasの`/api/v1/devices/check-status.post.ts`は**管理画面用API**であり、**Session認証が必須**です。

---

### 1. デバイスステータス確認API

#### 1-A. hotel-common版（デバイス認証用）

**エンドポイント**: `POST /api/v1/devices/check-status`

**場所**: hotel-common

**認証**: ❌ 不要（パブリックAPI）

**用途**: device-guard.tsミドルウェアからの自動認証

**リクエスト**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.101",
  "userAgent": "Mozilla/5.0 ...",
  "pagePath": "/menu"
}
```

**レスポンス（成功）**:
```json
{
  "found": true,
  "isActive": true,
  "deviceId": "device-001",
  "deviceName": "Room 101",
  "roomId": "101",
  "ipAddress": "192.168.1.101",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

**レスポンス（未登録）**:
```json
{
  "found": false,
  "isActive": false
}
```

**認証ロジック**:
1. MACアドレスで検索（優先）
2. 見つからない場合、IPアドレスで検索（フォールバック）
3. `isActive = true` のみ認証成功

**システム間連携**:
- hotel-saas: device-guard.tsから呼び出し
- hotel-common: device_rooms検索 + lastUsedAt更新

---

#### 1-B. hotel-saas版（管理画面用）

**エンドポイント**: `POST /api/v1/devices/check-status`

**場所**: hotel-saas (`/server/api/v1/devices/check-status.post.ts`)

**認証**: ✅ Session認証必須（管理者のみ）

**用途**: 管理画面からデバイス状態を確認

**実装**:
```typescript
// 認証チェック（必須）
const authUser = event.context.user
if (!authUser) {
  throw createError({ statusCode: 401 })
}

// hotel-commonのAPIを認証付きで中継
const response = await deviceApi.checkDeviceStatus({
  macAddress, ipAddress, userAgent, pagePath
}, {
  'Authorization': `Bearer ${authUser.token}`
})
```

**注意**: 
- ⚠️ **この認証チェックは削除してはいけません**
- セキュリティ上、管理者のみがアクセス可能にする必要がある
- device-guard.tsとは別の目的（管理画面用）

---

### 2. クライアントIP取得API

**エンドポイント**: `GET /api/v1/devices/client-ip`

**場所**: hotel-saas (`/server/api/v1/devices/client-ip.get.ts`)

**認証**: ✅ Session認証必須（管理者のみ）

**レスポンス**:
```json
{
  "ip": "192.168.1.50",
  "localIp": "192.168.1.50",
  "source": "local",
  "headers": {
    "x-forwarded-for": null,
    "x-real-ip": null,
    "x-client-ip": null
  }
}
```

**用途**: デバイス登録時のIP自動入力（管理画面）

**実装**:
```typescript
// 認証チェック（必須）
const authUser = event.context.user
if (!authUser) {
  throw createError({ statusCode: 401 })
}

// クライアントIPを取得
// X-Forwarded-For > X-Real-IP > getRequestIP > remoteAddress
```

**注意**: 
- ⚠️ **この認証チェックは削除してはいけません**
- 管理画面からのデバイス登録時にのみ使用
- セキュリティ上、管理者のみがアクセス可能

---

### 3. デバイス一覧取得API

**エンドポイント**: `GET /api/v1/devices`

**認証**: Session認証必須（管理者のみ）

**ヘッダー**:
- `Authorization`: `Bearer {token}`
- `X-Tenant-ID`: `{tenantId}`

**レスポンス**:
```json
{
  "success": true,
  "count": 10,
  "devices": [
    {
      "id": 1,
      "tenantId": "tenant-001",
      "roomId": "101",
      "roomName": "Room 101",
      "deviceId": "device-001",
      "deviceType": "tablet",
      "ipAddress": "192.168.1.101",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "isActive": true,
      "lastUsedAt": "2025-10-02T10:30:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-10-02T10:30:00Z"
    }
  ]
}
```

---

### 4. その他のデバイスAPI

**実装済みAPI一覧**:

| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/v1/devices/room/:roomId` | 必須 | 部屋別デバイス取得 |
| GET | `/api/v1/devices/device/:deviceId` | 必須 | デバイス詳細取得 |
| GET | `/api/v1/devices/place/:placeId` | 必須 | プレイス別デバイス取得 |
| GET | `/api/v1/devices/type/:deviceType` | 必須 | タイプ別デバイス取得 |
| GET | `/api/v1/devices/status/:status` | 必須 | ステータス別取得 |
| GET | `/api/v1/devices/count` | 必須 | デバイス数集計 |
| POST | `/api/v1/devices` | 必須 | デバイス新規登録 |
| POST | `/api/v1/devices/bulk` | 必須 | デバイス一括登録 |
| PUT | `/api/v1/devices/:id` | 必須 | デバイス情報更新 |
| PATCH | `/api/v1/devices/:id/last-used` | 必須 | 最終使用日時更新 |
| DELETE | `/api/v1/devices/:id/deactivate` | 必須 | デバイス非アクティブ化 |
| DELETE | `/api/v1/devices/:id` | 必須 | デバイス物理削除 |

---

## 🔗 システム間連携

### 連携パターン1: デバイス自動認証（認証不要）

```
[客室端末ブラウザ]
  ↓ ページアクセス
[hotel-saas: server/middleware/device-guard.ts]
  ↓ deviceApi.checkDeviceStatus() ← 認証ヘッダーなし
[hotel-common: POST /api/v1/devices/check-status]
  ↓ パブリックAPIとしてデバイス検証
  ↓ MAC/IPで検索 → found/isActive 返却
[hotel-saas: device-guard.ts]
  ↓ found=true & isActive=true → 認証成功
  ↓ それ以外 → /unauthorized-device へリダイレクト
```

**重要**: 
- ✅ hotel-commonのAPIは**パブリック**（認証不要）
- ✅ MAC/IP 2段階認証（MAC優先、なければIP）
- ✅ 認証ヘッダー不要

---

### 連携パターン2: 管理画面からのデバイス管理（認証必須）

```
[管理画面: /admin/devices]
  ↓ 管理者ログイン（Session認証済み）
[hotel-saas: /api/v1/devices/check-status.post.ts]
  ↓ authUser確認（必須）
  ↓ deviceApi.checkDeviceStatus() + Authorization ヘッダー
[hotel-common: POST /api/v1/devices/check-status]
  ↓ デバイス状態返却
[管理画面UI]
  ↓ デバイス状態表示
```

**重要**: 
- ✅ hotel-saasの管理画面APIは**Session認証必須**
- ✅ `authUser`チェックを削除してはいけない
- ✅ 管理者のみがアクセス可能

---

### APIクライアント実装

**実装場所**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

**メソッド**:
- `deviceApi.checkDeviceStatus(data, headers?)` - デバイス状態確認
- `deviceApi.getClientIp(headers?)` - クライアントIP取得

**使い分け**:

| 呼び出し元 | ヘッダー | 用途 |
|-----------|---------|------|
| device-guard.ts | なし | デバイス自動認証 |
| check-status.post.ts | `Authorization: Bearer` | 管理画面用 |
| client-ip.get.ts | `Authorization: Bearer` | 管理画面用 |

---

### ミドルウェア実行順序

```
1. 00.unified-auth.ts （未実行: /admin/* 以外）
2. device-guard.ts （実行: 客室UI保護）← パブリックAPI呼び出し
3. 01.admin-auth.ts （未実行: /admin/* 以外）
```

---

### 環境変数

```bash
# hotel-saas
HOTEL_COMMON_API_URL=http://localhost:3400  # 開発
# HOTEL_COMMON_API_URL=https://api.hotel-common.production  # 本番
```

---

### 認証ヘッダーの使い分け（重要）

#### パターンA: デバイス認証（device-guard.ts）
```typescript
// 認証ヘッダー不要（パブリックAPI）
const status = await deviceApi.checkDeviceStatus({
  macAddress,
  ipAddress,
  userAgent,
  pagePath
})
// ↑ ヘッダーなし
```

#### パターンB: 管理画面API（check-status.post.ts, client-ip.get.ts）
```typescript
// Session認証必須
const authUser = event.context.user  // ← 必須チェック
if (!authUser) { throw createError({ statusCode: 401 }) }

// 認証ヘッダー付きで呼び出し
const response = await deviceApi.checkDeviceStatus(data, {
  'Authorization': `Bearer ${authUser.token}`,
  'X-Tenant-ID': authUser.tenantId
})
```

**注意**: 
- ⚠️ **パターンAとパターンBを混同しないこと**
- ⚠️ **管理画面APIの認証チェックは削除禁止**

---

## 🔒 セキュリティ

### デバイス認証のセキュリティ

#### 脅威モデル
1. **未登録デバイスからのアクセス** → リダイレクトで防御
2. **MACアドレス偽装** → ホテル内ネットワークに限定
3. **非アクティブデバイスの悪用** → isActiveフラグで防御

#### 対策
- **ネットワーク分離**: ホテル内専用VLAN
- **デバイス登録**: 管理者のみ可能
- **定期監査**: アクセスログ（未実装）

### 認証分離の重要性

**管理画面認証と完全分離**:
- 客室端末から管理画面へのアクセス不可
- 管理画面認証（Session）と客室認証（Device）は独立
- 相互に影響しない設計

**ミドルウェア適用スコープ**:
```
device-guard.ts:
  保護: / (トップ), /order/*, /services/*
  除外: /admin/*, /api/*, /unauthorized-device

admin-auth.ts:
  保護: /admin/*
  除外: /admin/login, /api/*, /
```

---

## ✅ 既存実装状況

### hotel-saas（実装済み）

**ミドルウェア**:
- ✅ `/server/middleware/device-guard.ts` - デバイス認証ミドルウェア

**API（中継）**:
- ✅ `/server/api/v1/devices/check-status.post.ts` - ステータス確認
- ✅ `/server/api/v1/devices/client-ip.get.ts` - IP取得
- ✅ `/server/api/v1/admin/devices/list.get.ts` - デバイス一覧
- ✅ `/server/api/v1/admin/devices/create.post.ts` - デバイス作成
- ✅ `/server/api/v1/admin/devices/[id].put.ts` - デバイス更新
- ✅ `/server/api/v1/admin/devices/[id].delete.ts` - デバイス削除
- ✅ その他多数（bulk-actions, validate, seed等）

**ページ**:
- ✅ `/pages/admin/devices/index.vue` - デバイス管理画面
- ✅ `/pages/unauthorized-device.vue` - 未認証デバイス用ページ

### hotel-common（実装済み）

**ルーター**:
- ✅ `/src/routes/systems/saas/device.routes.ts` - デバイスCRUD API
- ✅ `/src/routes/systems/saas/device-status.routes.ts` - ステータス確認API

**サービス**:
- ✅ `/src/services/device/device-room.service.ts` - DeviceRoomサービス

**データベース**:
- ✅ `device_rooms` テーブル（PostgreSQL）

---

## 🚧 未実装機能

### 優先度: 高

#### 1. デバイスアクセスログ機能（詳細仕様）

**目的**: 不正アクセス検知、監査証跡、利用統計

##### 1-1. DeviceAccessLogテーブル設計

**テーブル名**: `device_access_logs`

**フィールド**:

| フィールド | 型 | NULL | デフォルト | インデックス | 説明 |
|-----------|-----|------|-----------|-------------|------|
| id | BigInt | ❌ | auto | PRIMARY | 主キー（大量ログ対応） |
| tenantId | String | ❌ | - | ✅ | テナントID |
| deviceId | Int | ⭕ | - | ✅ | device_rooms.id（外部キー） |
| macAddress | String | ⭕ | - | ✅ | MACアドレス |
| ipAddress | String | ❌ | - | ✅ | IPアドレス |
| userAgent | String | ⭕ | - | - | User-Agent |
| pagePath | String | ❌ | - | - | アクセスページ |
| authMethod | String | ❌ | - | ✅ | 認証方法（mac/ip/fallback） |
| authResult | String | ❌ | - | ✅ | 認証結果（success/failed） |
| failureReason | String | ⭕ | - | - | 失敗理由 |
| accessedAt | DateTime | ❌ | now() | ✅ | アクセス日時 |
| responseTime | Int | ⭕ | - | - | レスポンス時間（ms） |
| createdAt | DateTime | ❌ | now() | ✅ | 作成日時 |

**Prismaスキーマ例**:
```prisma
model DeviceAccessLog {
  id             BigInt    @id @default(autoincrement())
  tenantId       String
  deviceId       Int?
  macAddress     String?
  ipAddress      String
  userAgent      String?
  pagePath       String
  authMethod     String    // 'mac' | 'ip' | 'fallback'
  authResult     String    // 'success' | 'failed'
  failureReason  String?
  accessedAt     DateTime  @default(now())
  responseTime   Int?
  createdAt      DateTime  @default(now())
  
  device         DeviceRoom? @relation(fields: [deviceId], references: [id])
  
  @@index([tenantId])
  @@index([deviceId])
  @@index([macAddress])
  @@index([ipAddress])
  @@index([authMethod])
  @@index([authResult])
  @@index([accessedAt])
  @@index([createdAt])
  @@map("device_access_logs")
}
```

**インデックス戦略**:
- `tenantId`: テナント分離
- `deviceId`: デバイス別ログ検索
- `macAddress`, `ipAddress`: デバイス特定
- `authMethod`, `authResult`: 統計集計
- `accessedAt`, `createdAt`: 日時範囲検索

**データ保持期間**:
- **推奨**: 90日間
- **最大**: 180日間
- 古いログは自動削除（バッチ処理）

---

##### 1-2. ログ記録のタイミング

**回答**: **A) check-status API呼び出し時に自動記録**

**実装場所**: `hotel-common: POST /api/v1/devices/check-status`

**記録タイミング**:
```typescript
// hotel-common/src/routes/systems/saas/device-status.routes.ts
router.post('/api/v1/devices/check-status', async (req, res) => {
  const startTime = Date.now()
  const { macAddress, ipAddress, userAgent, pagePath } = req.body
  
  try {
    // 1. デバイス検索
    const device = await findDevice(macAddress, ipAddress)
    
    // 2. 認証判定
    const authResult = device && device.isActive ? 'success' : 'failed'
    const authMethod = device?.foundBy || 'unknown' // 'mac' | 'ip'
    
    // 3. デバイス情報更新（認証成功時のみ）
    if (authResult === 'success') {
      await updateLastUsedAt(device.id)
    }
    
    // 4. アクセスログ記録（常に）← ここで記録
    await logDeviceAccess({
      tenantId: device?.tenantId || extractTenantFromRequest(req),
      deviceId: device?.id || null,
      macAddress,
      ipAddress,
      userAgent,
      pagePath,
      authMethod,
      authResult,
      failureReason: authResult === 'failed' ? 'device_not_found_or_inactive' : null,
      accessedAt: new Date(),
      responseTime: Date.now() - startTime
    })
    
    // 5. レスポンス返却
    return res.json({ found: !!device, isActive: device?.isActive || false })
  } catch (error) {
    // エラー時もログ記録
    await logDeviceAccess({
      // ... error情報
      authResult: 'failed',
      failureReason: error.message
    })
    throw error
  }
})
```

**記録するケース**:
- ✅ 認証成功（found=true, isActive=true）
- ✅ デバイス未登録（found=false）
- ✅ デバイス非アクティブ（found=true, isActive=false）
- ✅ APIエラー発生時

**記録しないケース**:
- ❌ なし（全てのアクセスを記録）

---

##### 1-3. 統計・分析API仕様

**回答**: 以下の統計情報を提供

###### API 1: デバイス統計サマリー

**エンドポイント**: `GET /api/v1/devices/stats/summary`

**認証**: Session認証必須（管理者のみ）

**クエリパラメータ**:
- `tenantId`: テナントID（必須）
- `from`: 開始日時（オプション）
- `to`: 終了日時（オプション）

**レスポンス**:
```json
{
  "success": true,
  "summary": {
    "total": {
      "devices": 50,           // デバイス総数
      "activeDevices": 45,     // アクティブデバイス数
      "inactiveDevices": 5     // 非アクティブデバイス数
    },
    "byType": {
      "tablet": 30,
      "stb": 15,
      "unknown": 5
    },
    "byStatus": {
      "active": 45,
      "inactive": 5
    },
    "recentActivity": {
      "last24h": 120,          // 過去24時間のアクセス数
      "last7days": 850,        // 過去7日間のアクセス数
      "last30days": 3200       // 過去30日間のアクセス数
    }
  }
}
```

---

###### API 2: デバイスアクセス統計

**エンドポイント**: `GET /api/v1/devices/stats/access`

**認証**: Session認証必須（管理者のみ）

**クエリパラメータ**:
- `tenantId`: テナントID（必須）
- `from`: 開始日時（必須）
- `to`: 終了日時（必須）
- `groupBy`: 集計単位（`hour` | `day` | `month`）

**レスポンス**:
```json
{
  "success": true,
  "period": {
    "from": "2025-10-01T00:00:00Z",
    "to": "2025-10-31T23:59:59Z",
    "groupBy": "day"
  },
  "stats": [
    {
      "date": "2025-10-01",
      "totalAccess": 150,      // 総アクセス数
      "successAccess": 145,    // 成功アクセス数
      "failedAccess": 5,       // 失敗アクセス数
      "uniqueDevices": 40,     // ユニークデバイス数
      "avgResponseTime": 120   // 平均レスポンス時間（ms）
    },
    // ... 他の日
  ],
  "totals": {
    "totalAccess": 4500,
    "successAccess": 4350,
    "failedAccess": 150,
    "successRate": 96.67      // 成功率（%）
  }
}
```

---

###### API 3: デバイス利用ランキング

**エンドポイント**: `GET /api/v1/devices/stats/ranking`

**認証**: Session認証必須（管理者のみ）

**クエリパラメータ**:
- `tenantId`: テナントID（必須）
- `from`: 開始日時（必須）
- `to`: 終了日時（必須）
- `limit`: 取得件数（デフォルト: 10）

**レスポンス**:
```json
{
  "success": true,
  "ranking": [
    {
      "rank": 1,
      "deviceId": 101,
      "roomId": "101",
      "roomName": "Room 101",
      "deviceType": "tablet",
      "accessCount": 250,      // アクセス回数
      "lastAccessedAt": "2025-10-02T12:30:00Z",
      "avgDailyAccess": 8.3    // 1日平均アクセス数
    },
    // ... 他のデバイス
  ]
}
```

---

###### API 4: 最終使用日時別集計

**エンドポイント**: `GET /api/v1/devices/stats/last-used`

**認証**: Session認証必須（管理者のみ）

**クエリパラメータ**:
- `tenantId`: テナントID（必須）

**レスポンス**:
```json
{
  "success": true,
  "stats": {
    "today": 35,             // 今日使用
    "yesterday": 8,          // 昨日使用
    "within7days": 5,        // 7日以内使用
    "within30days": 2,       // 30日以内使用
    "moreThan30days": 0,     // 30日以上未使用
    "neverUsed": 0           // 一度も未使用
  },
  "details": [
    {
      "category": "today",
      "devices": [
        {
          "deviceId": 101,
          "roomId": "101",
          "lastUsedAt": "2025-10-02T14:30:00Z"
        }
        // ...
      ]
    }
    // ... 他のカテゴリ
  ]
}
```

---

###### API 5: 認証失敗ログ

**エンドポイント**: `GET /api/v1/devices/stats/failures`

**認証**: Session認証必須（管理者のみ）

**用途**: セキュリティ監視・不正アクセス検知

**クエリパラメータ**:
- `tenantId`: テナントID（必須）
- `from`: 開始日時（必須）
- `to`: 終了日時（必須）
- `limit`: 取得件数（デフォルト: 100）

**レスポンス**:
```json
{
  "success": true,
  "failures": [
    {
      "id": 12345,
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "ipAddress": "192.168.1.200",
      "userAgent": "...",
      "pagePath": "/menu",
      "failureReason": "device_not_found",
      "accessedAt": "2025-10-02T15:30:00Z",
      "attemptCount": 5        // 同一MAC/IPでの連続失敗回数
    }
    // ...
  ],
  "summary": {
    "totalFailures": 50,
    "uniqueMacs": 10,
    "uniqueIps": 8,
    "suspiciousIps": [         // 失敗回数が多いIP
      {
        "ipAddress": "192.168.1.200",
        "failureCount": 15
      }
    ]
  }
}
```

---

##### 1-4. ログ閲覧UI

**場所**: `/admin/devices/logs`

**機能**:
- 日時範囲でのログ検索
- デバイスIDでのフィルタリング
- 認証結果でのフィルタリング
- CSVエクスポート
- リアルタイム監視（WebSocket）

---

#### 2. デバイス管理の機能拡張
- 一括操作（複数デバイスの一括更新/削除）
- デバイス詳細情報表示
- デバイス利用状況の可視化

#### 4. 統計・分析機能
- デバイス利用率分析
- アクセスパターン分析
- レポート機能

### 優先度: 低

#### 5. 高度なセキュリティ機能
- 多要素認証（MFA）
- リアルタイム監視
- 異常検知アラート

---

## 🌐 環境設定

### ⚠️ 環境統一要件

**開発環境と本番環境で実装を変えてはいけない**

- ✅ 正しい: 環境変数で接続先を変える（実装は同じ）
- ❌ 間違い: 開発環境だけ別実装を使う

**理由**:
- 本番デプロイ時の予期せぬバグを防ぐ
- 開発環境で本番と同じ動作を保証
- デプロイリスクを最小化

### hotel-saas

```bash
# hotel-common API接続先
HOTEL_COMMON_API_URL=http://localhost:3400  # 開発
# HOTEL_COMMON_API_URL=https://api.hotel-common.production  # 本番

# Redis接続（Session認証用・管理画面用）
REDIS_URL=redis://localhost:6379
```

### hotel-common

```bash
# データベース接続
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_db

# サーバーポート
PORT=3400
```

---

## 📊 実装チェックリスト

### hotel-saas
- [x] デバイス認証ミドルウェア
- [x] デバイス管理画面UI
- [x] API中継実装
- [x] 未認証デバイス用ページ
- [ ] アクセスログ記録

### hotel-common
- [x] デバイスCRUD API
- [x] デバイスステータス確認API
- [x] クライアントIP取得API
- [x] デバイスサービスクラス
- [ ] アクセスログAPI
- [ ] 統計・分析API

### データベース
- [x] device_roomsテーブル
- [x] インデックス設定
- [x] マルチテナント対応
- [x] Prismaマイグレーション適用済み
- [ ] DeviceAccessLogテーブル

---

## 🧪 検証方法

### 1. デバイス認証の動作確認

#### ステップ1: デバイス登録
```bash
# 管理画面にログイン
1. http://localhost:3100/admin/login にアクセス
2. 管理者アカウントでログイン
3. /admin/devices に移動

# デバイスを登録
4. 「新規デバイス登録」をクリック
5. 以下を入力:
   - 部屋番号: 101
   - 部屋名: Room 101
   - MACアドレス: AA:BB:CC:DD:EE:FF
   - IPアドレス: 192.168.1.101 （または「取得」ボタン）
   - デバイスタイプ: tablet
   - ステータス: active
6. 登録完了
```

#### ステップ2: デバイス認証確認
```bash
# 登録したデバイスからアクセス
1. 登録したMACアドレスを持つ端末から http://localhost:3100/ にアクセス
2. 認証成功 → トップページが表示される
3. /order ページにもアクセス可能
```

#### ステップ3: 未登録デバイス確認
```bash
# 未登録のデバイスからアクセス
1. 別のMACアドレスを持つ端末から http://localhost:3100/ にアクセス
2. 認証失敗 → /unauthorized-device にリダイレクト
3. 「このデバイスは登録されていません」と表示される
```

### 2. APIの動作確認

#### デバイスステータス確認API
```bash
curl -X POST http://localhost:3400/api/v1/devices/check-status \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "ipAddress": "192.168.1.101",
    "userAgent": "Mozilla/5.0",
    "pagePath": "/"
  }'

# 期待されるレスポンス（登録済み）:
{
  "found": true,
  "isActive": true,
  "deviceId": "device-001",
  "deviceName": "Room 101",
  "roomId": "101",
  "ipAddress": "192.168.1.101",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

#### クライアントIP取得API（認証必須）
```bash
curl -X GET http://localhost:3100/api/v1/devices/client-ip \
  -H "Cookie: hotel-session-id={sessionId}"

# 期待されるレスポンス:
{
  "ip": "192.168.1.50",
  "localIp": "192.168.1.50",
  "source": "local"
}
```

### 3. データベース確認

```sql
-- デバイスが正しく登録されているか確認
SELECT * FROM device_rooms WHERE tenant_id = 'your-tenant-id';

-- 最終使用日時が更新されているか確認
SELECT 
  room_id, 
  device_name, 
  last_used_at, 
  is_active 
FROM device_rooms 
WHERE tenant_id = 'your-tenant-id'
ORDER BY last_used_at DESC;
```

### 4. ミドルウェア動作確認

```bash
# ブラウザの開発者ツールで確認
1. http://localhost:3100/ にアクセス
2. Network タブを開く
3. リクエストヘッダーを確認:
   - X-Forwarded-For
   - X-Real-IP
   - User-Agent
4. リダイレクトの有無を確認
```

---

## 🔗 関連ドキュメント

### 実装ドキュメント
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/DEVICE_AUTH_SPEC.md` - デバイス認証仕様書（詳細）
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/DEVICE_AUTH_IMPLEMENTATION.md` - 実装ガイド
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/api/DEVICE_API_IMPLEMENTATION_SUMMARY.md` - API実装サマリー

### 関連SSOT
- [SSOT_SAAS_AUTHENTICATION.md](./SSOT_SAAS_AUTHENTICATION.md) - 認証システム全体
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

**最終更新**: 2025年10月2日  
**作成者**: Iza（統合管理者）  
**レビュー**: 未実施  
**承認**: 未実施

