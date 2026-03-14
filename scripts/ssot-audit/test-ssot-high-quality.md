# SSOT: テスト用高品質ドキュメント

**Doc-ID**: SSOT-TEST-HIGH-001  
**Version**: 1.0.0  
**最終更新**: 2026-01-23

---

## 概要

### 目的

本ドキュメントは、チェックリスト精度検証用の高品質SSOTサンプルです。
全てのチェック項目を満たすように設計されています。

### スコープ

- **対象**: テスト機能の実装
- **対象外**: 本番環境への適用

---

## 要件一覧

### 機能要件

| 要件ID | 要件名 | 優先度 | Accept条件 |
|:-------|:-------|:-------|:-----------|
| REQ-001 | ユーザー登録 | P1 | メールアドレスでユーザーが登録できること |
| REQ-002 | ログイン認証 | P1 | 正しい認証情報でログインが成功すること |
| REQ-003 | テナント切替 | P1 | 複数テナントを切り替えられること |
| REQ-004 | データ取得 | P2 | tenant_idでフィルタされたデータが返されること |
| REQ-005 | エラーハンドリング | P2 | 適切なエラーメッセージが表示されること |

---

## Phase分け

### Phase 1: 基盤実装（マイルストーン1）

- データベーススキーマ設計
- 認証基盤構築

**完了条件**: ログインAPIが動作すること

### Phase 2: 機能実装（マイルストーン2）

- CRUD API実装
- UI実装

**完了条件**: 全APIが200を返すこと

---

## データベース設計

### テーブル定義

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique @map("email")
  tenantId  String   @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("users")
  @@index([tenantId])
}

model Tenant {
  id        String   @id @default(uuid())
  name      String   @map("name")
  createdAt DateTime @default(now()) @map("created_at")
  
  users     User[]
  
  @@map("tenants")
}
```

### 命名規則

- テーブル名: snake_case（例: `users`, `tenants`）
- カラム名: snake_case + @map（例: `tenant_id`, `created_at`）
- インデックス: tenant_id必須

---

## API設計

### エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|:---------|:-----|:-----|:-----|
| POST | /api/v1/admin/auth/login | ログイン | 不要 |
| POST | /api/v1/admin/auth/logout | ログアウト | 必要 |
| GET | /api/v1/admin/users | ユーザー一覧 | 必要 |
| POST | /api/v1/admin/users | ユーザー作成 | 必要 |
| GET | /api/v1/admin/tenants | テナント一覧 | 必要 |

### リクエスト/レスポンス形式

```typescript
// リクエスト
interface LoginRequest {
  email: string;
  password: string;
}

// レスポンス（成功）
interface ApiResponse<T> {
  success: true;
  data: T;
}

// レスポンス（エラー）
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

### エラーコード

| HTTPステータス | コード | 説明 |
|:---------------|:-------|:-----|
| 400 | BAD_REQUEST | リクエスト形式エラー |
| 401 | UNAUTHORIZED | 認証エラー |
| 403 | FORBIDDEN | 権限エラー |
| 404 | NOT_FOUND | リソース不在 |
| 500 | INTERNAL_ERROR | サーバーエラー |

---

## 認証・セキュリティ

### 認証方式

- **方式**: Session認証（Redis + HttpOnly Cookie）
- **Cookie名**: `hotel_session`
- **有効期限**: 8時間

### 権限チェック

- 全APIでtenant_id必須
- アクセス制御はRBACで実装
- 他テナントのデータは404を返す（列挙耐性）

### セキュリティ要件

- XSS対策: 出力エスケープ
- CSRF対策: SameSite Cookie
- SQLインジェクション対策: Prisma ORM使用

---

## エラーハンドリング

### エラーケース一覧

| ケース | HTTPステータス | ユーザーメッセージ |
|:-------|:---------------|:-------------------|
| 未認証 | 401 | ログインが必要です |
| 権限なし | 403 | アクセス権限がありません |
| データ不在 | 404 | データが見つかりません |
| サーバーエラー | 500 | システムエラーが発生しました |

---

## テストケース

### 正常系テスト

| ID | テスト内容 | 期待結果 |
|:---|:-----------|:---------|
| TC-001 | 正常ログイン | 200 + Cookie発行 |
| TC-002 | ユーザー一覧取得 | 200 + データ配列 |
| TC-003 | テナント切替 | 200 + セッション更新 |

### 異常系テスト

| ID | テスト内容 | 期待結果 |
|:---|:-----------|:---------|
| TC-101 | 不正パスワード | 401エラー |
| TC-102 | 未認証アクセス | 401エラー |
| TC-103 | 他テナントアクセス | 404エラー |

---

## チェックリスト

### 実装チェックリスト

- [ ] データベーススキーマ作成
- [ ] マイグレーション実行
- [ ] 認証API実装
- [ ] CRUD API実装
- [ ] エラーハンドリング実装
- [ ] テスト実行

---

## 多視点分析

### 技術視点

- **アーキテクチャ**: マイクロサービス対応設計
- **パフォーマンス**: tenant_idインデックスで高速化
- **スケーラビリティ**: 水平スケール対応

### ビジネス視点

- **価値**: マルチテナント対応で顧客数増加
- **KPI**: テナント数、月間アクティブユーザー数

### UX視点

- **ユーザー体験**: シームレスなテナント切替
- **UI**: 直感的なダッシュボード設計

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|:-----------|:-----|:---------|
| 1.0.0 | 2026-01-23 | 初版作成 |
