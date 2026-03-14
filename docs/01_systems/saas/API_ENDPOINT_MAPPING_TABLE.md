# 客室一覧・デバイス管理 APIエンドポイントマッピング表

## 概要
hotel-saasからhotel-common APIへの移行における、客室一覧とデバイス管理機能のエンドポイントマッピング表です。

---

## 🏨 客室一覧管理API

| 機能 | SaaS側エンドポイント | Common側エンドポイント | メソッド | 認証レベル | 実装状況 |
|------|---------------------|----------------------|---------|-----------|----------|
| 客室一覧取得 | `GET /api/v1/admin/front-desk/rooms` | `GET /api/v1/admin/front-desk/rooms` | GET | ADMIN/STAFF | 🔄 要実装 |
| 客室詳細取得 | `GET /api/v1/admin/front-desk/rooms/{id}` | `GET /api/v1/admin/front-desk/rooms/{id}` | GET | ADMIN/STAFF | 🔄 要実装 |
| 客室状態更新 | `PUT /api/v1/admin/front-desk/rooms/{id}` | `PUT /api/v1/admin/front-desk/rooms/{id}` | PUT | ADMIN | 🔄 要実装 |

### クエリパラメータ対応表

#### 客室一覧取得
| パラメータ | 型 | デフォルト値 | 説明 | SaaS対応 | Common対応 |
|-----------|---|-------------|------|----------|------------|
| `page` | number | 1 | ページ番号 | ✅ | 🔄 要実装 |
| `limit` | number | 20 | 取得件数（最大1000） | ✅ | 🔄 要実装 |
| `status` | string | - | 客室状態フィルタ | ✅ | 🔄 要実装 |
| `room_type` | string | - | 客室タイプフィルタ | ✅ | 🔄 要実装 |
| `floor` | number | - | 階数フィルタ | ✅ | 🔄 要実装 |

#### 客室状態更新
| パラメータ | 型 | 必須 | 説明 | 許可値 |
|-----------|---|------|------|--------|
| `status` | string | ❌ | 客室状態 | `available`, `occupied`, `maintenance`, `cleaning` |
| `notes` | string | ❌ | 備考 | 任意のテキスト |
| `maintenance_reason` | string | ❌ | メンテナンス理由 | 任意のテキスト |

---

## 🖥️ デバイス管理API

| 機能 | SaaS側エンドポイント | Common側エンドポイント | メソッド | 認証レベル | 実装状況 |
|------|---------------------|----------------------|---------|-----------|----------|
| デバイス一覧取得 | `GET /api/v1/admin/devices` | `GET /api/v1/admin/devices` | GET | ADMIN/STAFF | ✅ 実装済み |
| デバイス詳細取得 | `GET /api/v1/admin/devices/{id}` | `GET /api/v1/admin/devices/{id}` | GET | ADMIN/STAFF | ✅ 実装済み |
| デバイス作成 | `POST /api/v1/admin/devices` | `POST /api/v1/admin/devices` | POST | ADMIN | ✅ 実装済み |
| デバイス更新 | `PUT /api/v1/admin/devices/{id}` | `PUT /api/v1/admin/devices/{id}` | PUT | ADMIN | ✅ 実装済み |
| デバイス削除 | `DELETE /api/v1/admin/devices/{id}` | `DELETE /api/v1/admin/devices/{id}` | DELETE | ADMIN | ✅ 実装済み |
| デバイス数取得 | `GET /api/v1/admin/devices/count` | `GET /api/v1/devices/count` | GET | ADMIN | ✅ 実装済み |
| デバイスステータス確認 | `POST /api/v1/device/check-status` | `POST /api/v1/devices/check-status` | POST | PUBLIC | ✅ 実装済み |
| クライアントIP取得 | `GET /api/v1/device/client-ip` | `GET /api/v1/devices/client-ip` | GET | PUBLIC | ✅ 実装済み |

### デバイス管理 クエリパラメータ対応表

#### デバイス一覧取得
| パラメータ | 型 | デフォルト値 | 説明 | SaaS対応 | Common対応 |
|-----------|---|-------------|------|----------|------------|
| `page` | number | 1 | ページ番号 | ✅ | ✅ |
| `limit` | number | 20 | 取得件数 | ✅ | ✅ |
| `status` | string | - | デバイス状態フィルタ | ✅ | ✅ |
| `deviceType` | string | - | デバイスタイプフィルタ | ✅ | ✅ |
| `roomId` | string | - | 客室IDフィルタ | ✅ | ✅ |

#### デバイス作成・更新
| パラメータ | 型 | 必須 | 説明 | 作成時 | 更新時 |
|-----------|---|------|------|--------|--------|
| `roomId` | string | ✅ | 客室ID | 必須 | オプション |
| `roomName` | string | ❌ | 客室名 | オプション | オプション |
| `deviceId` | string | ❌ | デバイス識別子 | オプション | オプション |
| `deviceType` | string | ❌ | デバイスタイプ | オプション | オプション |
| `placeId` | string | ❌ | 場所ID | オプション | オプション |
| `ipAddress` | string | ❌ | IPアドレス | オプション | オプション |
| `macAddress` | string | ❌ | MACアドレス | オプション | オプション |
| `status` | string | ❌ | ステータス | オプション | オプション |

---

## 📊 レスポンス形式統一

### 成功レスポンス（統一形式）
```json
{
  "success": true,
  "data": {
    // 実際のデータ
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": "2025-10-01T10:00:00.000Z",
  "request_id": "req-1234567890"
}
```

### エラーレスポンス（統一形式）
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      // 詳細情報（オプション）
    }
  },
  "timestamp": "2025-10-01T10:00:00.000Z",
  "request_id": "req-1234567890"
}
```

---

## 🔐 認証・認可マッピング

### 認証レベル定義
| レベル | 説明 | 対象ロール | 実装方法 |
|--------|------|-----------|----------|
| PUBLIC | 認証不要 | - | 認証ミドルウェアなし |
| DEVICE | デバイス認証 | device | デバイストークン検証 |
| STAFF | スタッフ認証 | staff, admin | JWT + ロール確認 |
| ADMIN | 管理者認証 | admin | JWT + admin ロール確認 |

### JWT認証ヘッダー
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-ID: tenant-123
Content-Type: application/json
```

---

## 🚨 エラーコード対応表

| HTTPステータス | エラーコード | 説明 | 対応方法 |
|---------------|-------------|------|----------|
| 400 | `VALIDATION_ERROR` | バリデーションエラー | リクエストパラメータを確認 |
| 400 | `MISSING_PARAMETER` | 必須パラメータ不足 | 必須フィールドを追加 |
| 401 | `UNAUTHORIZED` | 認証エラー | ログインまたはトークン更新 |
| 403 | `FORBIDDEN` | 権限エラー | 適切な権限を付与 |
| 404 | `RESOURCE_NOT_FOUND` | リソース未発見 | 存在するIDを指定 |
| 409 | `RESOURCE_CONFLICT` | リソース競合 | 重複しない値を指定 |
| 500 | `INTERNAL_SERVER_ERROR` | サーバーエラー | サーバーログを確認 |
| 502 | `HOTEL_COMMON_ERROR` | Common API エラー | Common側の状態を確認 |
| 503 | `SERVICE_UNAVAILABLE` | サービス利用不可 | Common API の接続を確認 |

---

## 🔄 データフロー図

### 客室一覧取得フロー
```
[ブラウザ] 
    ↓ GET /api/v1/admin/front-desk/rooms
[hotel-saas API] 
    ↓ 認証・認可チェック
[hotel-saas プロキシ] 
    ↓ GET /api/v1/admin/front-desk/rooms + JWT
[hotel-common API] 
    ↓ JWT検証・テナント確認
[統合データベース] 
    ↓ クエリ実行
[hotel-common API] 
    ↓ レスポンス整形
[hotel-saas プロキシ] 
    ↓ レスポンス転送
[ブラウザ]
```

### デバイス管理フロー
```
[管理画面] 
    ↓ POST /api/v1/admin/devices
[hotel-saas API] 
    ↓ 管理者権限チェック
[hotel-saas プロキシ] 
    ↓ POST /api/v1/admin/devices + JWT
[hotel-common API] 
    ↓ バリデーション・重複チェック
[統合データベース] 
    ↓ DeviceRoom テーブル操作
[hotel-common API] 
    ↓ 作成結果返却
[hotel-saas プロキシ] 
    ↓ レスポンス転送
[管理画面]
```

---

## 📝 実装チェックポイント

### Phase 1: 基盤準備
- [ ] DeviceRoomテーブルが正しく作成されている
- [ ] Common側ルーターが正しく登録されている
- [ ] SaaS側HotelCommonApiClientが動作する
- [ ] 認証ミドルウェアが正しく動作する

### Phase 2: 客室一覧API
- [ ] Common側客室一覧APIが正しいレスポンスを返す
- [ ] SaaS側プロキシAPIが正しく転送する
- [ ] フィルタリング機能が動作する
- [ ] ページネーションが正しく動作する

### Phase 3: デバイス管理API
- [ ] デバイスCRUD操作がすべて動作する
- [ ] バリデーションが正しく動作する
- [ ] エラーハンドリングが適切に動作する
- [ ] テナント分離が正しく動作する

### Phase 4: 統合テスト
- [ ] エンドツーエンドテストがパスする
- [ ] パフォーマンス要件を満たす
- [ ] セキュリティテストがパスする
- [ ] ログ出力が適切に動作する

---

## 🛠️ 開発・テスト用コマンド

### API動作確認
```bash
# 客室一覧取得
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3100/api/v1/admin/front-desk/rooms?page=1&limit=10"

# デバイス一覧取得
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3100/api/v1/admin/devices?page=1&limit=10"

# デバイス作成
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"101","deviceType":"room"}' \
  "http://localhost:3100/api/v1/admin/devices"
```

### Common API直接確認
```bash
# Common側客室一覧
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3400/api/v1/admin/front-desk/rooms"

# Common側デバイス一覧
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3400/api/v1/admin/devices"
```

---

**作成日**: 2025年10月1日  
**更新日**: 2025年10月1日  
**バージョン**: 1.0  
**作成者**: システム統合チーム

