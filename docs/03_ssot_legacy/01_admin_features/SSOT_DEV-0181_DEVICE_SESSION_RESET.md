# SSOT: 客室端末セッションリセット機能（DEV-0181 / COM-247）

**作成日**: 2026-01-24
**最終更新**: 2026-01-24
**バージョン**: v1.0.0
**ステータス**: ✅ 確定
**優先度**: 🔴 最高（Phase 2）

**関連SSOT**:
- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md) - デバイス認証システム（必読）
- [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) - 客室端末WebViewアプリ（必読）
- [SSOT_SAAS_ROOM_MANAGEMENT.md](./SSOT_SAAS_ROOM_MANAGEMENT.md) - 客室管理システム
- [SSOT_SAAS_FRONT_DESK_OPERATIONS.md](./SSOT_SAAS_FRONT_DESK_OPERATIONS.md) - フロント業務

**注**: 本SSOTは **管理画面とQRコードから客室端末のセッションをリセットする機能** を定義します。

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [要件ID一覧](#要件id一覧)
4. [ユースケース](#ユースケース)
5. [データベース設計](#データベース設計)
6. [API設計](#api設計)
7. [UI設計](#ui設計)
8. [QRコード設計](#qrコード設計)
9. [セキュリティ](#セキュリティ)
10. [システム間連携](#システム間連携)
11. [実装ガイド](#実装ガイド)
12. [Accept条件](#accept条件)

---

## 📖 概要

### 目的

ホテルのフロントスタッフおよび清掃スタッフが、客室端末（TV/タブレット）のセッションをリモートでリセットできる機能を提供する。

### 背景

**課題**:
- チェックアウト後、客室端末に前のゲストの情報が残る可能性がある
- 手動で端末を操作してリセットする手間がかかる
- 清掃時に端末の状態を確認・リセットする必要がある

**解決策**:
- **管理画面から**: フロントスタッフが客室を指定してリモートリセット
- **QRコードから**: 清掃スタッフが客室のQRコードをスキャンしてリセット

### 基本方針

- **リモートリセット**: WebSocket経由でリアルタイムにリセット指示
- **QRコード認証**: セキュアな短期トークンを使用
- **監査ログ**: 全リセット操作を記録
- **マルチテナント**: テナント分離を厳守

### アーキテクチャ概要

```
[管理画面: フロントデスク]
  ↓ リセットボタンクリック
[hotel-saas: POST /api/v1/admin/devices/reset/:deviceId]
  ↓ 認証チェック（Session + Permission）
[hotel-common: POST /api/v1/devices/:deviceId/reset]
  ↓ WebSocketイベント配信
[客室端末: hotel-saas WebView]
  ↓ DEVICE_RESETイベント受信
[useDeviceReset.ts]
  ├─ localStorage.clear()
  ├─ sessionStorage.clear()
  ├─ IndexedDB削除
  └─ リロード

[清掃スタッフ: スマホ]
  ↓ QRコードスキャン
[hotel-saas: /device-reset?token={jwt}]
  ↓ トークン検証
[hotel-common: POST /api/v1/devices/reset-by-token]
  ↓ WebSocketイベント配信
[客室端末]
  ↓ 同上
```

---

## 🎯 スコープ

### 対象システム

| システム | 役割 | 実装範囲 |
|:---------|:-----|:--------|
| **hotel-saas** | 管理画面UI + API中継 | ✅ リセットボタンUI、APIプロキシ、QRコードページ |
| **hotel-common** | コアAPI | ✅ デバイスリセットAPI、トークン生成/検証、WebSocket配信 |
| **客室端末** | WebViewアプリ | ✅ useDeviceReset.ts（既存）強化 |

### 機能範囲

#### ✅ 本SSOTの対象

- 管理画面からのリモートリセット（フロントスタッフ）
- QRコードスキャンによるリセット（清掃スタッフ）
- リセットトークンの生成・検証（短期有効）
- WebSocketイベント配信（DEVICE_RESET）
- リセット操作の監査ログ記録

#### ❌ 本SSOTの対象外

- チェックアウト時の自動リセット → [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md)
- デバイス認証の基本機能 → [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md)
- 清掃状態管理 → 別SSOT（SSOT_CLEANING_MANAGEMENT.md）

---

## 📝 要件ID一覧

### 機能要件（Functional Requirements）

| 要件ID | 要件名 | 説明 | 優先度 |
|:-------|:-------|:-----|:-----:|
| REQ-RST-001 | 管理画面リセットボタン | フロントスタッフが客室を選択してリセット | 🔴 |
| REQ-RST-002 | QRコードリセット | 清掃スタッフがQRをスキャンしてリセット | 🔴 |
| REQ-RST-003 | リセットトークン生成 | 短期有効なJWTトークンを生成（15分） | 🔴 |
| REQ-RST-004 | WebSocketリアルタイム配信 | 客室端末へイベント即座配信 | 🔴 |
| REQ-RST-005 | リセット監査ログ | 誰が・いつ・どの端末をリセットしたか記録 | 🔴 |
| REQ-RST-006 | リセット進捗表示 | 客室端末にリセット中の進捗を表示 | 🟡 |
| REQ-RST-007 | 複数端末一括リセット | 選択した複数の客室を一括リセット | 🟢 |

### 非機能要件（Non-Functional Requirements）

| 要件ID | 要件名 | 説明 | 優先度 |
|:-------|:-------|:-----|:-----:|
| NFR-RST-001 | セキュリティ | リセット操作は認証+権限チェック必須 | 🔴 |
| NFR-RST-002 | パフォーマンス | WebSocketイベント配信は3秒以内 | 🔴 |
| NFR-RST-003 | 可用性 | WebSocket接続エラー時の再試行 | 🔴 |
| NFR-RST-004 | 監査証跡 | 全操作を永続ログに記録 | 🔴 |
| NFR-RST-005 | マルチテナント | テナントIDによる完全分離 | 🔴 |

---

## 📖 ユースケース

### UC-1: フロントスタッフによるリモートリセット

**アクター**: フロントスタッフ

**前提条件**:
- フロントスタッフが管理画面にログイン済み
- デバイスリセット権限（`device:reset`）を保有

**メインフロー**:
1. フロントスタッフが管理画面 `/admin/devices` にアクセス
2. リセットしたい客室端末を選択
3. 「リセット」ボタンをクリック
4. 確認モーダルが表示される（「客室101の端末をリセットしますか？」）
5. 「リセット実行」をクリック
6. システムがWebSocket経由で端末にリセット指示を送信
7. 客室端末がリセット処理を実行（localStorage/sessionStorage削除、リロード）
8. 管理画面に「リセット完了」通知が表示される

**例外フロー**:
- 端末がオフライン → エラーメッセージ「端末がオフラインです。端末の電源を確認してください。」
- 権限不足 → エラーメッセージ「この操作を実行する権限がありません。」
- WebSocketエラー → エラーメッセージ「リセット指示の送信に失敗しました。再試行してください。」

**Accept条件**: [AC-1](#ac-1-管理画面リセット)

---

### UC-2: 清掃スタッフによるQRコードリセット

**アクター**: 清掃スタッフ

**前提条件**:
- 清掃スタッフがスマートフォンを所持
- 客室にQRコードが掲示されている

**メインフロー**:
1. 清掃スタッフが客室入室
2. 客室内のQRコードをスマホでスキャン
3. QRコードに含まれるURLにアクセス（`https://hotel-saas/device-reset?token={jwt}`）
4. システムがトークンを検証（有効期限、テナントID、部屋番号）
5. トークンが有効 → リセット確認画面が表示される
6. 「端末をリセットする」ボタンをタップ
7. システムがWebSocket経由で端末にリセット指示を送信
8. 客室端末がリセット処理を実行
9. スマホに「リセット完了」画面が表示される

**例外フロー**:
- トークン期限切れ → エラーメッセージ「QRコードの有効期限が切れています。フロントにお問い合わせください。」
- トークン不正 → エラーメッセージ「無効なQRコードです。」
- 端末オフライン → エラーメッセージ「端末がオフラインです。フロントにお問い合わせください。」

**Accept条件**: [AC-2](#ac-2-qrコードリセット)

---

### UC-3: リセット履歴の確認

**アクター**: 管理者/フロントスタッフ

**前提条件**:
- ログ閲覧権限（`device:view-logs`）を保有

**メインフロー**:
1. 管理画面 `/admin/devices/logs` にアクセス
2. リセット履歴一覧が表示される
3. 日時、客室番号、実行者、実行方法（管理画面/QRコード）が表示される
4. フィルタリング機能で特定の客室・期間を検索可能

**Accept条件**: [AC-5](#ac-5-監査ログ)

---

## 🗄️ データベース設計

### device_reset_tokens（リセットトークン）

**概要**: QRコードスキャン用の短期トークンを管理

**Prismaモデル**:

```prisma
model device_reset_tokens {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  deviceId     String    @map("device_id")
  roomId       String    @map("room_id")
  token        String    @unique
  tokenHash    String    @map("token_hash")
  expiresAt    DateTime  @map("expires_at")
  isUsed       Boolean   @default(false) @map("is_used")
  usedAt       DateTime? @map("used_at")
  usedBy       String?   @map("used_by")
  createdBy    String    @map("created_by")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([tenantId, deviceId, token])
  @@index([tenantId])
  @@index([deviceId])
  @@index([token])
  @@index([expiresAt])
  @@index([isUsed])
  @@map("device_reset_tokens")
}
```

**主要フィールド**: id, tenantId, deviceId, roomId, token, tokenHash, expiresAt(15分), isUsed, usedAt, usedBy, createdBy, createdAt

---

### device_reset_logs（リセットログ）

**概要**: 全リセット操作の監査ログ

**Prismaモデル**:

```prisma
model device_reset_logs {
  id               String    @id @default(uuid())
  tenantId         String    @map("tenant_id")
  deviceId         String    @map("device_id")
  roomId           String    @map("room_id")
  resetMethod      String    @map("reset_method")  // 'admin_panel' | 'qr_code'
  executedBy       String    @map("executed_by")
  executedByName   String?   @map("executed_by_name")
  tokenId          String?   @map("token_id")
  status           String    // 'success' | 'failed'
  errorMessage     String?   @map("error_message")
  executedAt       DateTime  @default(now()) @map("executed_at")

  @@index([tenantId])
  @@index([deviceId])
  @@index([executedAt])
  @@index([resetMethod])
  @@index([status])
  @@map("device_reset_logs")
}
```

**主要フィールド**: id, tenantId, deviceId, roomId, resetMethod, executedBy, executedByName, tokenId, status, errorMessage, executedAt

---

## 🔌 API設計

### 1. デバイスリセットAPI（管理画面用）

**エンドポイント**: `POST /api/v1/admin/devices/:deviceId/reset`

**実装箇所**:
- hotel-saas: `/server/api/v1/admin/devices/[deviceId]/reset.post.ts`（プロキシ）
- hotel-common: `/src/routes/api/v1/devices/[deviceId]/reset.post.ts`（実装）

**認証**: Session認証 + 権限チェック（`device:reset`）

**リクエスト**:

```typescript
// Path Parameters
{
  deviceId: string  // device_rooms.id
}

// Headers
{
  'Authorization': 'Bearer {sessionId}',
  'X-Tenant-ID': '{tenantId}',
  'Content-Type': 'application/json'
}

// Body（オプション）
{
  reason?: string  // リセット理由（任意）
}
```

**レスポンス（成功）**:

```typescript
{
  success: true,
  data: {
    deviceId: "device-uuid-001",
    roomId: "101",
    resetMethod: "admin_panel",
    executedBy: "staff-uuid-001",
    executedAt: "2026-01-24T10:30:00Z",
    logId: "log-uuid-001"
  }
}
```

**レスポンス（エラー）**:

```typescript
// 権限不足
{
  success: false,
  error: {
    code: "PERMISSION_DENIED",
    message: "この操作を実行する権限がありません"
  }
}

// デバイス未登録
{
  success: false,
  error: {
    code: "DEVICE_NOT_FOUND",
    message: "指定されたデバイスが見つかりません"
  }
}

// WebSocketエラー
{
  success: false,
  error: {
    code: "WEBSOCKET_ERROR",
    message: "リセット指示の送信に失敗しました"
  }
}
```

**実装状況**: ❌ 未実装

---

### 2. リセットトークン生成API

**エンドポイント**: `POST /api/v1/admin/devices/:deviceId/reset-token`

**実装箇所**:
- hotel-saas: `/server/api/v1/admin/devices/[deviceId]/reset-token.post.ts`（プロキシ）
- hotel-common: `/src/routes/api/v1/devices/[deviceId]/reset-token.post.ts`（実装）

**認証**: Session認証 + 権限チェック（`device:generate-reset-token`）

**リクエスト**:

```typescript
// Path Parameters
{
  deviceId: string
}

// Headers（同上）
```

**レスポンス**:

```typescript
{
  success: true,
  data: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    tokenId: "token-uuid-001",
    deviceId: "device-uuid-001",
    roomId: "101",
    expiresAt: "2026-01-24T10:45:00Z",  // 15分後
    qrCodeUrl: "https://hotel-saas/device-reset?token=eyJhbG..."
  }
}
```

**実装状況**: ❌ 未実装

---

### 3. トークン検証＋リセット実行API

**エンドポイント**: `POST /api/v1/devices/reset-by-token`

**実装箇所**:
- hotel-saas: `/server/api/v1/devices/reset-by-token.post.ts`（プロキシ）
- hotel-common: `/src/routes/api/v1/devices/reset-by-token.post.ts`（実装）

**認証**: トークンベース（JWTトークン検証）

**リクエスト**:

```typescript
// Body
{
  token: string  // JWTトークン
}
```

**レスポンス（成功）**:

```typescript
{
  success: true,
  data: {
    deviceId: "device-uuid-001",
    roomId: "101",
    resetMethod: "qr_code",
    executedAt: "2026-01-24T10:32:00Z",
    logId: "log-uuid-002"
  }
}
```

**レスポンス（エラー）**:

```typescript
// トークン期限切れ
{
  success: false,
  error: {
    code: "TOKEN_EXPIRED",
    message: "QRコードの有効期限が切れています"
  }
}

// トークン不正
{
  success: false,
  error: {
    code: "INVALID_TOKEN",
    message: "無効なQRコードです"
  }
}

// トークン使用済み
{
  success: false,
  error: {
    code: "TOKEN_ALREADY_USED",
    message: "このQRコードは既に使用されています"
  }
}
```

**実装状況**: ❌ 未実装

---

### 4. リセットログ一覧取得API

**エンドポイント**: `GET /api/v1/admin/devices/reset-logs`

**実装箇所**:
- hotel-saas: `/server/api/v1/admin/devices/reset-logs.get.ts`（プロキシ）
- hotel-common: `/src/routes/api/v1/devices/reset-logs.get.ts`（実装）

**認証**: Session認証 + 権限チェック（`device:view-logs`）

**リクエスト**:

```typescript
// Query Parameters
{
  page?: number        // ページ番号（デフォルト: 1）
  limit?: number       // 取得件数（デフォルト: 20、最大: 100）
  roomId?: string      // 部屋番号フィルタ
  resetMethod?: string // リセット方法フィルタ（'admin_panel', 'qr_code'）
  from?: string        // 開始日時（ISO 8601）
  to?: string          // 終了日時（ISO 8601）
}
```

**レスポンス**:

```typescript
{
  success: true,
  data: {
    logs: [
      {
        id: "log-uuid-001",
        deviceId: "device-uuid-001",
        roomId: "101",
        resetMethod: "admin_panel",
        executedBy: "staff-uuid-001",
        executedByName: "田中太郎",
        status: "success",
        executedAt: "2026-01-24T10:30:00Z"
      },
      // ...
    ],
    total: 150,
    page: 1,
    limit: 20,
    totalPages: 8
  }
}
```

**実装状況**: ❌ 未実装

---

## 🎨 UI設計

### 1. 管理画面リセットボタン

**実装箇所**: `/Users/kaneko/hotel-saas-rebuild/pages/admin/devices/index.vue`（既存ページに追加）

**配置**: デバイス一覧テーブルの各行に「リセット」ボタンを追加

**UI構成**:
- デバイス一覧テーブルに「リセット」アクションボタン追加
- クリック時に確認モーダル表示（客室番号、削除対象データの明示）
- リセット実行後に完了通知を表示

**主要コンポーネント**:
- `confirmReset()`: リセット確認モーダル表示
- `executeReset()`: `/api/v1/admin/devices/${deviceId}/reset` をPOST
- エラーハンドリング: 権限不足、デバイス未登録、WebSocketエラー

---

### 2. QRコードリセットページ

**実装箇所**: `/Users/kaneko/hotel-saas-rebuild/pages/device-reset.vue`（新規作成）

**URL**: `https://hotel-saas/device-reset?token={jwt}`

**UI構成**:
- トークン検証中: ローディングスピナー表示
- 検証成功: 客室番号・デバイスID表示、リセットボタン配置
- 検証失敗: エラーメッセージ表示（期限切れ、不正トークン）
- リセット完了: 完了メッセージ表示

**主要処理**:
- `onMounted()`: クエリパラメータからトークン取得、JWT検証
- `executeReset()`: `/api/v1/devices/reset-by-token` をPOST
- `decodeJWT()`: Base64デコードでトークンペイロード取得

---

## 📱 QRコード設計

**トークンフォーマット（JWT）**:
- iss: "hotel-saas"
- sub: "device-reset"
- tenantId, deviceId, roomId
- exp: 15分後のUNIX timestamp
- iat: 発行時刻

**QRコードURL**: `https://hotel-saas/device-reset?token={jwt}`

**実装サービス**:
- `generateResetToken()`: JWT生成（有効期限15分）、SHA-256ハッシュ保存、QRコードURL生成
- `verifyToken()`: JWT検証、DB照合（未使用・有効期限内・テナントID一致）
- `markTokenAsUsed()`: 使用済みフラグ更新

---

## 🔒 セキュリティ

### 認証・権限

| 操作 | 認証方式 | 必要な権限 |
|:-----|:--------|:----------|
| 管理画面リセット | Session認証 | `device:reset` |
| トークン生成 | Session認証 | `device:generate-reset-token` |
| QRコードリセット | トークンベース | なし（トークン有効性のみ） |
| ログ閲覧 | Session認証 | `device:view-logs` |

### トークンセキュリティ

- **有効期限**: 15分（QRコード悪用防止）
- **使い捨て**: 1回限り（`is_used` フラグ）
- **ハッシュ保存**: SHA-256（監査用）

### テナント分離

- リクエストヘッダー: `X-Tenant-ID` 必須
- DBクエリ: `WHERE tenant_id = ?` フィルタ必須
- トークン: テナントID含める

### 監査ログ

全リセット操作を記録（executedBy、executedAt、deviceId、resetMethod、status）、保持期間90日

---

## 🔗 システム間連携

### hotel-saas → hotel-common

**APIプロキシパターン**:
1. Session認証チェック
2. 権限チェック（`device:reset`）
3. hotel-common API呼び出し（`X-Tenant-ID` ヘッダー付与）

### hotel-common → 客室端末

**WebSocketイベント**: `DEVICE_RESET`

**イベントデータ**: deviceId、roomId、resetMethod、executedBy、executedAt

**処理フロー**:
1. hotel-common: WebSocketイベント配信
2. 客室端末: `useDeviceReset.connectWebSocket()` でイベント受信
3. 客室端末: `resetDevice()` 実行（localStorage/IndexedDB/キャッシュ削除、リロード）
4. hotel-common: device_reset_logs記録（status='success' or 'failed'）

---

## 🛠️ 実装ガイド

### Phase 1: DB・API実装（hotel-common）

**担当**: hotel-common（Iza AI）

**実装内容**:
- Prismaスキーマ追加（device_reset_tokens、device_reset_logs）
- マイグレーション実行: `npx prisma migrate dev --name add_device_reset_tables`
- DeviceResetTokenService実装（トークン生成・検証）
- DeviceResetService実装（リセット処理・ログ記録）
- API Routes実装（4エンドポイント）

**実装ファイル**:
- `/prisma/schema.prisma`（修正）
- `/src/services/device/device-reset-token.service.ts`（新規）
- `/src/services/device/device-reset.service.ts`（新規）
- `/src/routes/api/v1/devices/[deviceId]/reset.post.ts`（新規）
- `/src/routes/api/v1/devices/[deviceId]/reset-token.post.ts`（新規）
- `/src/routes/api/v1/devices/reset-by-token.post.ts`（新規）
- `/src/routes/api/v1/devices/reset-logs.get.ts`（新規）

---

### Phase 2: APIプロキシ・UI実装（hotel-saas）

**担当**: hotel-saas（Sun AI）

**実装内容**:
- APIプロキシ実装（4エンドポイント）
- 管理画面リセットボタン追加
- QRコードリセットページ作成
- useDeviceReset拡張（DEVICE_RESETイベント処理）

**実装ファイル**:
- `/server/api/v1/admin/devices/[deviceId]/reset.post.ts`（新規）
- `/server/api/v1/admin/devices/[deviceId]/reset-token.post.ts`（新規）
- `/server/api/v1/devices/reset-by-token.post.ts`（新規）
- `/server/api/v1/admin/devices/reset-logs.get.ts`（新規）
- `/pages/admin/devices/index.vue`（修正）
- `/pages/device-reset.vue`（新規）
- `/composables/useDeviceReset.ts`（修正）

---

### Phase 3: 統合テスト

**テストシナリオ**:
- 管理画面リセット（正常系・エラー系）
- QRコードリセット（正常系・エラー系）
- トークン期限切れ・使用済み
- 権限チェック
- ログ記録確認

---

## ✅ Accept条件

### AC-1: 管理画面リセット

**Given**: フロントスタッフが管理画面にログインしている

**When**: デバイス一覧から客室101のリセットボタンをクリックし、確認モーダルで「リセット実行」をクリック

**Then**:
- [ ] WebSocket経由で客室端末にリセット指示が送信される
- [ ] 客室端末がlocalStorage/sessionStorage/IndexedDBを削除する
- [ ] 客室端末がリロードされる
- [ ] 管理画面に「リセット完了」通知が表示される
- [ ] device_reset_logsテーブルにログが記録される（resetMethod='admin_panel', status='success'）

---

### AC-2: QRコードリセット

**Given**: 清掃スタッフがスマートフォンを所持している

**When**: 客室101のQRコードをスキャンし、リセット確認画面で「端末をリセットする」をタップ

**Then**:
- [ ] トークンが検証される（有効期限内、未使用、正しいテナント）
- [ ] WebSocket経由で客室端末にリセット指示が送信される
- [ ] 客室端末がリセット処理を実行する
- [ ] スマートフォンに「リセット完了」画面が表示される
- [ ] device_reset_tokensテーブルのis_usedがtrueになる
- [ ] device_reset_logsテーブルにログが記録される（resetMethod='qr_code', status='success'）

---

### AC-3: トークン有効期限

**Given**: QRコードが生成されている

**When**: トークン生成から15分経過後にQRコードをスキャン

**Then**:
- [ ] 「QRコードの有効期限が切れています」エラーメッセージが表示される
- [ ] リセット処理は実行されない
- [ ] device_reset_logsテーブルにエラーログが記録される（status='failed', errorMessage='TOKEN_EXPIRED'）

---

### AC-4: トークン使い捨て

**Given**: QRコードでリセットが成功している

**When**: 同じQRコードを再度スキャン

**Then**:
- [ ] 「このQRコードは既に使用されています」エラーメッセージが表示される
- [ ] リセット処理は実行されない

---

### AC-5: 監査ログ

**Given**: リセット操作が複数回実行されている

**When**: 管理画面の「リセット履歴」ページにアクセス

**Then**:
- [ ] リセット履歴一覧が表示される
- [ ] 各ログに以下の情報が含まれる:
  - 実行日時
  - 客室番号
  - 実行者名
  - 実行方法（管理画面/QRコード）
  - 実行結果（成功/失敗）
- [ ] 客室番号・期間でフィルタリングできる
- [ ] ページネーション動作が正常

---

### AC-6: 権限チェック

**Given**: リセット権限（`device:reset`）を持たないスタッフがログインしている

**When**: リセットボタンをクリック

**Then**:
- [ ] 「この操作を実行する権限がありません」エラーメッセージが表示される
- [ ] リセット処理は実行されない

---

### AC-7: WebSocketエラーハンドリング

**Given**: 客室端末がオフラインまたはWebSocket未接続

**When**: 管理画面からリセット指示を送信

**Then**:
- [ ] 「リセット指示の送信に失敗しました。再試行してください。」エラーメッセージが表示される
- [ ] device_reset_logsテーブルにエラーログが記録される（status='failed', errorMessage='WEBSOCKET_ERROR'）
- [ ] 再試行ボタンが表示される

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2026-01-24 | 1.0.0 | 初版作成 | AI |

---

**作成者**: AI
**レビュー**: 未実施
**承認**: 未実施

---

**以上、SSOT: 客室端末セッションリセット機能（v1.0.0）**
