# SSOT: 汎用CRUD API（管理画面用 / Generic Resources API）

作成日: 2025-10-23  
最終更新: 2025-10-23  
バージョン: 1.0.0  
所有者: Iza（hotel-kanri統合管理AI）

---

## 1. 目的（Why）
- 管理系リソースのCRUDを汎用APIに統一し、実装重複・仕様不整合・修正コストを低減する
- hotel-saas側は `callHotelCommonAPI<T>()` に一本化して呼び出し統一、hotel-common側はメタデータ駆動で柔軟に拡張

## 2. スコープ / 非スコープ
- スコープ: 一覧/詳細/作成/更新/削除（ソフトデリート）
- 非スコープ: 特殊操作（例: staff 招待/受諾/再送/キャンセル/ロック/解除）は個別APIを維持

## 3. API定義（概要）
- Base Path: `/api/v1/admin/resources/{resource}`
- Endpoints:
  - GET    `/api/v1/admin/resources/{resource}`          … 一覧 + 検索 + ページネーション
  - POST   `/api/v1/admin/resources/{resource}`          … 作成
  - GET    `/api/v1/admin/resources/{resource}/{id}`     … 詳細
  - PUT    `/api/v1/admin/resources/{resource}/{id}`     … 更新
  - DELETE `/api/v1/admin/resources/{resource}/{id}`     … ソフトデリート

## 4. セキュリティ / 権限 / テナント
- 認証: SessionAuth（Redis + HttpOnly Cookie: `hotel_session`）必須
- 権限: `checkPermission(user_id, resource, action)`
  - action: list/create/get/update/delete を標準化
- テナント分離: 全操作で `tenant_id` フィルタ必須
- ソフトデリート: `is_deleted=true` / `deleted_at` / `deleted_by` を標準実装

## 5. メタデータ設計（例）
```ts
// src/config/resource-metadata.ts（common側想定）
export const resourceMetadata = {
  staff: {
    model: 'staff',
    perms: { list: 'system:staff:view', write: 'system:staff:manage' },
    searchFields: ['email', 'name'],
    orderByDefault: { created_at: 'desc' }
  },
  roles: {
    model: 'roles',
    perms: { list: 'system:roles:view', write: 'system:roles:manage' },
    searchFields: ['name', 'description']
  }
} as const;
```

## 6. 互換ポリシー
- 既存個別CRUDは当面併存（2週間）し、段階的に `/resources/{resource}` へ切替
- deprecate注記を個別OpenAPIに付与し、移行ガイドを提示

## 7. OpenAPI
- ファイル: `docs/03_ssot/openapi/generic-resources.yaml`
- `SessionAuth` / 典型的クエリ（page/limit/search/includeDeleted）/ 標準エラーを定義

## 8. 受入基準（Accept / DoD）
- 認証/権限/テナント/ソフトデリートの共通ミドルウェアが全generic経路に適用される
- OpenAPI（generic-resources.yaml）spectralエラー0
- staff 一覧/詳細/更新/削除が `/resources/staff` で既存テスト合格
- 併存期間はfeature flagで切替可能（回帰容易）

## 9. テスト方針
- 単体: メタデータ分岐、ソフトデリート、権限拒否
- 統合: `/resources/staff` のCRUD一式
- E2E: 既存staff画面のCRUD動作（saas→common）

---

作成者: Iza / 最終更新: 2025-10-23 / v1.0.0


