# 🚨 重大な問題点レポート（調査中間報告）

**作成日**: 2025年10月7日  
**調査者**: Iza（統合管理者）  
**目的**: 正確なロードマップ作成のための現状把握

---

## 📋 調査状況

### 完了した調査
- ✅ 既存SSOT精読（20件）
- ✅ ドキュメント分析（認証・注文管理関連）

### 未完了の調査
- ⏳ hotel-saas実装コード検証（composables/middleware/API）
- ⏳ hotel-common実装コード検証（API/認証/DB）
- ⏳ 差分分析（SSOT vs 実装）

**理由**: hotel-kanriリポジトリ内にhotel-saas/hotel-commonの実装コードが存在しない
- hotel-saasの実装: `/Users/kaneko/hotel-saas/`（別リポジトリ）
- hotel-commonの実装: `/Users/kaneko/hotel-common/`（別リポジトリ）

---

## 🚨 判明した重大な問題

### 🔴 Critical Issue 1: 認証システムの混乱

#### 問題の詳細
SSOTでは「Session認証（Redis + HttpOnly Cookie）」と明記されているが、ドキュメント内に複数の認証方式が混在：

1. **Session認証（SSOT準拠）**
   - Redis + HttpOnly Cookie
   - Cookie名: `hotel_session` または `hotel-session-id`

2. **JWT認証（非推奨・旧仕様）**
   - `JWT_DEPRECATION_NOTICE.md`で非推奨と明記
   - しかし`JWT_AUTHENTICATION_CONSOLIDATION_PLAN.md`等が存在

3. **複数の認証実装が混在**
   - `useAuth` (Nuxt Auth)
   - `useJwtAuth` (カスタムJWT)
   - `useSessionAuth` (Session認証・SSOT準拠)

#### 影響
- ✅ SSOTは正しい（Session認証）
- ❌ 実装が混乱している可能性
- ❌ 開発環境で認証スキップのコードが存在（環境分岐実装）

#### 証拠
```javascript
// 開発環境では認証をスキップ（一時的な対応）
if (process.env.NODE_ENV === 'development') {
  console.log('開発環境のため認証をスキップします')
  return {
    id: 'dev-admin',
    email: 'admin@example.com',
    tenantId: 'dev-tenant-001',
    role: 'admin'
  }
}
```

**参照**: 
- `docs/01_systems/saas/current-auth-issues-analysis.md`
- `docs/01_systems/saas/auth/current-auth-issues-analysis.md`

---

### 🔴 Critical Issue 2: Redis実装の不整合

#### 問題の詳細
SSOTでは「全システムで実Redis必須」と明記されているが、hotel-commonで`SimpleRedis`（メモリ実装）が使用されている証拠：

**SSOT記載**:
```markdown
### 🔴 Critical: Redis不一致

**症状**: ログイン後すぐに401エラー
**原因**: hotel-commonはSimpleRedis、hotel-saasは実Redis
**対応**: hotel-commonも実Redisを使用すべき
**修正必須箇所**: /path/to/file.ts (line 10-20)
```

**参照**: `SSOT_SAAS_ADMIN_AUTHENTICATION.md` (line 162-167)

#### 影響
- ❌ 開発環境と本番環境で動作が異なる
- ❌ ログイン後すぐに401エラーの可能性
- ❌ セッション共有ができない

---

### 🔴 Critical Issue 3: 注文管理の設計問題

#### 問題の詳細
注文が部屋番号に直接紐づいているため、複数回の宿泊時に注文データが混在するリスク：

**現在の問題のある構造**:
```sql
Order {
  id: Int
  roomId: String  -- 部屋番号に直接紐づき（問題）
  tenantId: String
  status: String
  items: Json
  total: Int
  createdAt: DateTime
}
```

**具体的なリスク**:
- ❌ **注文混在**: 同じ部屋の前回宿泊者の注文が表示される
- ❌ **会計エラー**: 異なる宿泊者の料金が合算される
- ❌ **データ整合性**: チェックアウト後の注文履歴が不正確
- ❌ **プライバシー**: 他の宿泊者の注文情報が漏洩する可能性

#### 解決策（提案済み）
`CheckInSession`テーブルの導入（チェックインセッション概念）

**参照**: 
- `docs/01_systems/saas/CHECKIN_SESSION_DESIGN_PROPOSAL.md`
- `docs/architecture/CHECKIN_SESSION_DESIGN_PROPOSAL.md`

---

### 🟡 High Issue 4: 環境変数の問題

#### 問題の詳細
```
> UNIFY_ENV=local bash scripts/verify-db-url.sh && UNIFY_ENV=local pnpm run verify:db && ./scripts/dev-server.sh start
NG: DATABASE_URL not set
```

開発サーバー起動時に`DATABASE_URL`環境変数が設定されていない

**参照**: `docs/01_systems/saas/current-auth-issues-analysis.md` (line 34-41)

---

### 🟡 High Issue 5: API認証エラー

#### 問題の詳細
```
:3100/api/v1/integration/validate-token:1 Failed to load resource: the server responded with a status of 403 (Forbidden)
useJwtAuth.ts:48 JWT token validation failed: FetchError: [POST] "/api/v1/integration/validate-token": 403 Forbidden
```

APIエンドポイントへのアクセスが403 Forbiddenエラーで失敗

**参照**: `docs/01_systems/saas/current-auth-issues-analysis.md` (line 43-50)

---

### 🟡 High Issue 6: hotel-commonログインAPIの仕様不一致

#### 問題の詳細
仕様書では`{email, password}`のみ必要と記載されているが、実際のAPIは追加フィールドを要求：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "必須フィールドが不足しています"
  }
}
```

**参照**: `docs/01_systems/saas/AUTH_API_LOGIN_ISSUE.md`

---

## 📊 SSOT vs ドキュメントの整合性

### ✅ SSOTは正しい

以下のSSOTは詳細に作成されており、仕様として正しい：

1. ✅ `SSOT_SAAS_AUTHENTICATION.md` - 認証システム全体
2. ✅ `SSOT_SAAS_ADMIN_AUTHENTICATION.md` - 管理画面認証
3. ✅ `SSOT_SAAS_DEVICE_AUTHENTICATION.md` - 客室端末認証
4. ✅ `SSOT_SAAS_MULTITENANT.md` - マルチテナント
5. ✅ `SSOT_SAAS_DATABASE_SCHEMA.md` - DBスキーマ
6. ✅ `SSOT_SAAS_ORDER_MANAGEMENT.md` - 注文管理
7. ✅ `SSOT_SAAS_MENU_MANAGEMENT.md` - メニュー管理
8. ✅ `SSOT_SAAS_ROOM_MANAGEMENT.md` - 客室管理

### ❌ 実装がSSOTに準拠していない可能性

- ❌ 認証システム（JWT混在、環境分岐、SimpleRedis使用）
- ❌ 注文管理（部屋番号直接紐付け）
- ❌ 環境変数設定（DATABASE_URL未設定）

---

## 🎯 次のステップ

### 必須の調査（実装コード確認）

#### 1. hotel-saas実装コード検証
**場所**: `/Users/kaneko/hotel-saas/`（別リポジトリ）

**確認項目**:
- [ ] `composables/useSessionAuth.ts` の実装
- [ ] `composables/useAuth.ts` の実装（存在するか？）
- [ ] `composables/useJwtAuth.ts` の実装（存在するか？）
- [ ] `middleware/admin-auth.ts` の実装
- [ ] `server/api/v1/auth/login.post.ts` の実装
- [ ] `server/api/v1/order/` 配下の実装
- [ ] `.env` ファイルの設定状況

#### 2. hotel-common実装コード検証
**場所**: `/Users/kaneko/hotel-common/`（別リポジトリ）

**確認項目**:
- [ ] `src/auth/SessionAuthService.ts` の実装（SimpleRedis使用？）
- [ ] `src/routes/systems/common/auth.routes.ts` の実装
- [ ] `src/middleware/UnifiedSessionMiddleware.ts` の実装
- [ ] Redis接続の実装
- [ ] `.env` ファイルの設定状況
- [ ] `prisma/schema.prisma` の実装

#### 3. 差分分析
- [ ] SSOTで定義された仕様
- [ ] 実際の実装
- [ ] 両者の差異
- [ ] 修正が必要な箇所（ファイルパス・行番号）

---

## 🚀 ロードマップ作成の前提条件

正確なロードマップを作成するには、以下が必要：

### 1. 実装コードの完全な確認
- hotel-saas実装の詳細確認
- hotel-common実装の詳細確認
- 実際に動作するか検証

### 2. 問題の優先順位付け
- Critical: システムが動作しない問題
- High: 機能が不完全な問題
- Medium: 改善が必要な問題

### 3. 修正工数の見積もり
- 各問題の修正にかかる時間
- 依存関係の整理
- Phase別の実装計画

---

## 💡 推奨アクション

### オプション1: 実装コードを確認してから正確なロードマップを作成
**メリット**:
- ✅ 正確な現状把握
- ✅ 実装可能な計画
- ✅ リスクの明確化

**デメリット**:
- ❌ 時間がかかる（1-2日）

### オプション2: 暫定ロードマップを作成し、実装しながら調整
**メリット**:
- ✅ すぐに開始できる
- ✅ 実装しながら問題を発見

**デメリット**:
- ❌ 計画の変更が頻繁に発生する可能性
- ❌ 手戻りのリスク

---

## 📝 ユーザーへの質問

以下のいずれかを選択してください：

### A. 実装コードを確認してから正確なロードマップを作成
→ hotel-saas/hotel-commonの実装コードへのアクセスが必要

### B. 現時点の情報で暫定ロードマップを作成
→ SSOTを基準とし、実装は「SSOT準拠」と仮定して計画

### C. 特定の問題から優先的に調査・修正
→ どの問題を最優先で解決すべきか指示してください

---

**最終更新**: 2025年10月7日  
**作成者**: Iza（統合管理者）  
**ステータス**: 調査中間報告
