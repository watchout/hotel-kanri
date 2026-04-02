# SSOT-5: Cross-Cutting Concerns

**Doc-ID**: SSOT-5
**Version**: 1.0.1
**Created**: 2026-03-05
**Status**: Approved
**Source**: Consolidated from SSOT_SAAS_AUTHENTICATION.md, SSOT_SAAS_MULTITENANT.md, SSOT_MULTILINGUAL_SYSTEM.md, SSOT_OPERATIONAL_LOG_ARCHITECTURE.md, NFR-QAS.md, and related SSOTs

---

## §1 Authentication

### §1.1 Architecture Overview

```
┌──────────────────┐    ┌──────────────────┐    ┌────────────┐
│  hotel-saas      │    │  hotel-common    │    │   Redis    │
│  (Nuxt 3)        │───►│  (Express)       │───►│  Sessions  │
│  Cookie 送信     │    │  Session 検証    │    │  TTL=3600s │
└──────────────────┘    └──────────────────┘    └────────────┘
```

### §1.2 Session Authentication

| Attribute | Value |
|-----------|-------|
| Cookie Name | `hotel-session-id` |
| Session Store | Redis |
| Redis Key | `hotel:session:{sessionId}` |
| TTL | 3600 seconds (1 hour) |
| Cookie httpOnly | `true` |
| Cookie secure | `process.env.NODE_ENV === 'production'` |
| Cookie sameSite | `strict` |
| Cookie path | `/` |
| Password Hash | bcrypt |

- **MUST**: Cookie 名は `hotel-session-id` で全システム統一すること。 **Accept**: ブラウザ DevTools の Application > Cookies で `hotel-session-id` が 1 件確認できること。
- **MUST**: セッションストアは Redis を使用し、メモリ実装は禁止すること。 **Accept**: `redis-cli KEYS "hotel:session:*"` でセッションキーが 1 件以上存在すること。
- **MUST**: Redis キー形式は `hotel:session:{sessionId}` で統一すること。 **Accept**: `redis-cli KEYS "hotel:session:*"` の結果が 100% `hotel:session:{uuid}` 形式であること。
- **MUST**: セッション TTL は 3600 秒で統一すること。 **Accept**: `redis-cli TTL "hotel:session:{id}"` が 0〜3600 の範囲を返すこと。
- **MUST**: Cookie httpOnly は `true` に設定すること。 **Accept**: ブラウザ DevTools で Cookie の HttpOnly フラグが true であること。
- **MUST**: Cookie secure は本番環境で `true` に設定すること。 **Accept**: 本番環境でブラウザ DevTools の Cookie に Secure フラグが true であること。
- **MUST**: Cookie sameSite は `strict` に設定すること。 **Accept**: ブラウザ DevTools で Cookie の SameSite 属性が `Strict`（1 件）であること。
- **MUST**: Cookie path は `/` に設定すること。 **Accept**: ブラウザ DevTools で Cookie の Path が `/`（1 件）であること。
- **MUST**: パスワードハッシュは bcrypt を使用すること。 **Accept**: `staff` テーブルの `password_hash` カラムが `$2b$` プレフィックスで始まること。

### §1.3 Session Data Structure

```typescript
interface SessionData {
  user_id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: string;      // ISO 8601
  last_accessed: string;   // ISO 8601
}
```

- **MUST**: Redis セッションのフィールド名は `snake_case` を使用すること。 **Accept**: `redis-cli GET "hotel:session:{id}"` の JSON キーが 100% `snake_case` 形式であること。

### §1.4 Auth Types

| Auth Type | Method | Store | Target |
|-----------|--------|-------|--------|
| Staff Login | Email + Password → Session | Redis | Admin dashboard |
| Device Auth | MAC/IP address lookup | PostgreSQL (`device_rooms`) | Guest UI |
| Super Admin | Email + Password + 2FA → Session | Redis | Super admin panel |

- **MUST**: 管理画面認証とデバイス認証は完全に独立していること。 **Accept**: 管理画面セッションのみで Guest API `/api/guest/*` にアクセスし 401 が返ること。
- **MUST**: 環境（開発/本番）で実装を変えないこと。環境変数で接続先のみ切り替える。 **Accept**: `grep -r "NODE_ENV.*==.*development" src/` の結果がログレベル設定以外で 0 件であること。

### §1.5 Verification

```bash
# Redis が起動していることを確認
redis-cli ping  # Expected: PONG

# セッション保存を確認
redis-cli KEYS "hotel:session:*"

# セッション内容を確認
redis-cli GET "hotel:session:{sessionId}"

# クロスシステム検証
# hotel-common でログイン → hotel-saas でアクセス → 401 が出ないこと
```

---

## §2 Multi-Tenancy

### §2.1 Architecture

| Attribute | Value |
|-----------|-------|
| Separation Method | Row Level Security (RLS) + Application-level filtering |
| Tenant Identifier | `tenant_id` column (TEXT) on all tables |
| Tenant Resolution | Login-based (staff) / Device-based (guest) |
| Scalability Target | 数千テナント対応 |
| Cost Model | Single DB, Single Redis |

### §2.2 Data Isolation Rules

- **MUST**: `tenants` テーブル自体を除き、全テーブル（29 テーブル以上）に `tenant_id NOT NULL` カラムを持つこと。 **Accept**: SQL クエリ `SELECT table_name FROM information_schema.columns WHERE column_name='tenant_id' AND is_nullable='NO'` の結果が `tenants` 以外の全テーブルを含むこと。
- **MUST**: 全 API クエリで `tenant_id` フィルタを自動適用すること。 **Accept**: SQL クエリ `SELECT * FROM {table} WHERE tenant_id IS NULL` が 0 行を返すこと。
- **MUST**: テナント間でデータが見えないことをテストで検証すること。 **Accept**: テナント A のセッションでテナント B のリソースに GET リクエストし 404 または空配列が返ること。
- **MUST**: staff テーブルの `tenant_id` はデフォルトテナント（主所属）を示す。複数テナント所属は `staff_tenant_assignments` で管理。 **Accept**: `SELECT COUNT(*) FROM staff WHERE tenant_id IS NULL` が 0 を返し、複数テナント所属スタッフが `staff_tenant_assignments` に対応行を持つこと。

### §2.3 Tenant Identification Flow

#### Staff (Admin Dashboard)

```
1. Staff login (email + password)
2. Staff table lookup (email search)
3. Password verification + tenant_id retrieval
4. Session に tenant_id 設定
5. Tenant context 設定
6. Prisma extension 適用 (全クエリに tenant_id 自動追加)
7. Data access (tenant isolated)
```

#### Guest Device

```
1. Device access (browser launch)
2. Device info retrieval (MAC/IP)
3. device_rooms table lookup
4. tenant_id + room_id resolution
5. checkin_session lookup
6. Guest context 設定
```

### §2.4 Plan Management

| Plan | Features | Limits |
|------|----------|--------|
| ECONOMY | Basic ordering | Limited devices, orders |
| PROFESSIONAL | + AI concierge, statistics | Higher limits |
| ENTERPRISE | Full features | Unlimited |

- **MUST**: プラン制限は `system_plan_restrictions` テーブルで動的に管理すること。 **Accept**: `SELECT COUNT(*) FROM system_plan_restrictions` が 1 以上を返し、プラン変更が DB 更新のみで反映されること。

---

## §3 Security

### §3.1 OWASP Top 10 Compliance

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | RBAC permission system, tenant isolation |
| A02 Cryptographic Failures | bcrypt for passwords, HTTPS in production |
| A03 Injection | Prisma ORM (parameterized queries), input validation |
| A04 Insecure Design | SSOT-driven development, security review |
| A05 Security Misconfiguration | Production parity rules, env-based config |
| A06 Vulnerable Components | Dependency audit (npm audit) |
| A07 Auth Failures | Session-based auth, rate limiting, account locking |
| A08 Software/Data Integrity | Audit logs, checksums |
| A09 Security Logging | Comprehensive audit_logs, auth_logs |
| A10 SSRF | API whitelist, input validation |

### §3.2 XSS Prevention

- **MUST**: Vue 3 のテンプレートバインディング (`{{ }}`) を使用し、`v-html` は禁止すること。 **Accept**: `grep -r "v-html" src/` の結果が 0 件であること。
- **MUST**: ユーザー入力を HTML に埋め込む場合はサニタイズすること。 **Accept**: OWASP ZAP スキャンで XSS カテゴリの警告が 0 件であること。

### §3.3 CSRF Prevention

- **MUST**: Cookie に `sameSite: 'strict'` を設定すること。 **Accept**: ブラウザ DevTools で Cookie の SameSite 属性が `Strict`（1 件）であること。
- **MUST**: 状態変更 API は POST/PUT/DELETE メソッドのみ許可すること。 **Accept**: 状態変更エンドポイントに GET リクエストを送信し 405 Method Not Allowed が返ること。

### §3.4 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 requests | 15 minutes |
| Admin API | 100 requests | 1 minute |
| Guest API | 30 requests | 1 minute |
| AI Chat | 10 requests | 1 minute |

### §3.5 Account Locking

- **MUST**: ログイン 5 回連続失敗でアカウントを 15 分間ロックすること。 **Accept**: 同一アカウントに誤パスワードで 5 回ログイン後、正しいパスワードでも 423 Locked が返り、15 分後に再ログイン可能であること。

### §3.6 Super Admin Security

- **MUST**: Super Admin 認証は通常スタッフ認証と完全分離すること。 **Accept**: 通常スタッフのセッションで `/api/super-admin/*` にアクセスし 403 が返ること。
- **MUST**: 2FA（二要素認証）を必須とすること。 **Accept**: Super Admin ログイン時に TOTP コードなしで認証を試み 401 が返ること。
- **MUST**: IP ホワイトリストを使用すること。 **Accept**: ホワイトリスト外の IP から Super Admin エンドポイントにアクセスし 403 が返ること。
- **MUST**: セッションタイムアウトは 15 分とすること。 **Accept**: `redis-cli TTL "hotel:session:{superAdminId}"` が 0〜900 の範囲を返すこと。

---

## §4 Logging & Audit

### §4.1 Log Types

| Log Type | Table | Purpose |
|----------|-------|---------|
| Audit Log | `audit_logs` | 全操作の記録 |
| Auth Log | `auth_logs` | 認証イベント |
| AI Operation Log | `ai_operation_logs` | AI 利用記録 |
| Integration Log | `integration_logs` | システム間連携 |
| Alert Log | `alert_logs` | 異常検知アラート |

### §4.2 Audit Log Requirements

- **MUST**: 以下の操作を `audit_logs` に記録すること: データ作成・更新・削除、権限変更、設定変更、エクスポート操作。 **Accept**: 各操作実行後に `SELECT COUNT(*) FROM audit_logs WHERE action IN ('create','update','delete','permission_change','config_change','export') AND created_at > NOW() - INTERVAL '1 minute'` が 1 以上を返すこと。
- データ作成・更新・削除
- 権限変更
- 設定変更
- エクスポート操作

- **MUST**: 監査ログは読み取り専用（変更・削除不可）とすること。 **Accept**: `audit_logs` テーブルに対して UPDATE/DELETE を実行し `permission denied` error が返ること。

### §4.3 Anomaly Detection Patterns (6 patterns)

1. 異常なログイン試行回数
2. 通常時間外のアクセス
3. 大量データエクスポート
4. 権限昇格の試行
5. 複数テナントへの連続アクセス
6. API エラー率の急増

---

## §5 Operational / Log Dual Management

### §5.1 Principles

1. **運用データ**: 現在進行中のデータのみ保持（高速アクセス優先）
2. **ログデータ**: 全履歴を永続保存（完全性優先）
3. **自動移行**: 完了/終了時に運用→ログへ自動移行
4. **AI 用データ**: ログデータから最適化された形式で提供

### §5.2 Migration Flow

```typescript
// Order completion example
async function completeOrder(orderId: number) {
  await prisma.$transaction(async (tx) => {
    // 1. Update status
    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: 'completed', completedAt: new Date() }
    });
    // 2. Copy to log table (immediate)
    await tx.orderLog.create({ data: { ...order } });
    // 3. Operational cleanup (24h later via batch)
  });
}
```

- **MUST**: ステータス変更とログコピーは同一トランザクション（1 トランザクション）で実行すること。 **Accept**: 注文完了後に `order_logs` テーブルに対応レコードが存在し、トランザクション中断テストでは両テーブルとも変更がロールバックされること。

---

## §6 Multilingual System

### §6.1 Architecture

```
┌─────────────────────────────────────────┐
│  Translation Engine (hotel-common)       │
│  ├── Static UI: i18n files              │
│  ├── Dynamic Content: translations table │
│  └── AI Generated: OpenAI Translate API  │
└─────────────────────────────────────────┘
```

### §6.2 Three-Layer Approach

| Layer | Target | Method | Example |
|-------|--------|--------|---------|
| Static UI | ボタン、ラベル、メッセージ | i18n JSON files | "Order Now" / "注文する" |
| Dynamic Content | メニュー名、説明文 | DB columns (`name_ja`, `name_en`) + `translations` table | "特製カレー" / "Special Curry" |
| AI Generated | AI 応答、レコメンド文 | Runtime translation via AI | Context-aware translation |

### §6.3 Supported Languages (Target: 15)

| Code | Language | Priority |
|------|----------|----------|
| ja | Japanese | Default |
| en | English | Phase 1 |
| zh-CN | Chinese (Simplified) | Phase 2 |
| zh-TW | Chinese (Traditional) | Phase 2 |
| ko | Korean | Phase 2 |
| th | Thai | Phase 2 |
| vi | Vietnamese | Phase 2 |
| ms | Malay | Phase 2 |
| id | Indonesian | Phase 2 |
| hi | Hindi | Phase 3 |
| ar | Arabic | Phase 3 (RTL) |
| fr | French | Phase 3 |
| de | German | Phase 3 |
| es | Spanish | Phase 3 |
| pt | Portuguese | Phase 3 |

### §6.4 Database Hybrid Strategy

**Phase 1 (Current)**: Inline columns (`name_ja`, `name_en`)
**Phase 2+**: Unified `translations` table for all dynamic content

```sql
CREATE TABLE translations (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  entity_type TEXT NOT NULL,   -- 'menu_item', 'category', 'room', 'facility', 'announcement'
  entity_id   TEXT NOT NULL,
  field       TEXT NOT NULL,   -- 'name', 'description'
  locale      TEXT NOT NULL,   -- 'ja', 'en', 'zh-CN'
  value       TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),

  UNIQUE (tenant_id, entity_type, entity_id, field, locale)
);
```

---

## §7 Error Handling

### §7.1 Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### §7.2 Error Code Catalog

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Session expired or invalid |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Input validation failed |
| TENANT_MISMATCH | 403 | Tenant isolation violation |
| REDIS_UNAVAILABLE | 503 | Redis connection failure |
| DB_UNAVAILABLE | 503 | Database connection failure |
| RATE_LIMITED | 429 | Too many requests |

### §7.3 Frontend Error Handling

- **MUST**: 401 → ログイン画面にリダイレクト。 **Accept**: API が 401 を返した際に Playwright テストで URL が `/login` に遷移していること。
- **MUST**: 403 → 権限不足メッセージ表示。 **Accept**: API が 403 を返した際に画面上に「権限がありません」メッセージが表示されること（Playwright `getByText` で検出）。
- **MUST**: 503 → リトライ可能メッセージ表示。 **Accept**: API が 503 を返した際に画面上に「再試行してください」メッセージが表示されること（Playwright `getByText` で検出）。
- **MUST**: ネットワークエラー → オフラインインジケータ表示。 **Accept**: Playwright `context.setOffline(true)` 後にオフラインインジケータ要素 `[data-testid="offline-indicator"]` が表示されること。

---

## §8 Production Parity

### §8.1 Core Rules

- **MUST**: 開発環境と本番環境で実装を変えないこと。 **Accept**: `grep -rn "NODE_ENV.*===.*development" src/` の結果がログレベル設定以外で 0 件であること。
- **MUST**: 環境差異は環境変数のみで吸収すること。 **Accept**: `.env.example` に記載された変数のみで開発環境と本番環境の差異が管理されていること（CI で `env-diff` チェックが pass し差異 0 件であること）。
- **MUST**: 開発環境で本番と同じミドルウェアスタックを使用すること。 **Accept**: `docker compose config` で開発・本番の services セクションが Redis・PostgreSQL を含み同一イメージ（2 サービス以上一致）を使用していること。

### §8.2 Prohibited Patterns

```typescript
// PROHIBITED
if (process.env.NODE_ENV === 'development') {
  // Different implementation for dev
}

// CORRECT
const redisUrl = process.env.REDIS_URL; // Same code, different config
```

### §8.3 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `REDIS_URL` | Redis connection | Yes |
| `NODE_ENV` | Environment flag | Yes |
| `OPENAI_API_KEY` | OpenAI API key | For AI features |
| `ANTHROPIC_API_KEY` | Anthropic API key | For AI features |

---

## §9 Requirement ID System

### §9.1 Format

```
{PREFIX}-{NUMBER}
```

| Prefix | Category | Example |
|--------|----------|---------|
| STAFF | Staff management | STAFF-001 |
| STAFF-SEC | Staff security | STAFF-SEC-001 |
| STAFF-UI | Staff UI | STAFF-UI-001 |
| PERM | Permission system | PERM-001 |
| PERM-DB | Permission DB | PERM-DB-001 |
| PERM-API | Permission API | PERM-API-001 |
| PERM-UI | Permission UI | PERM-UI-001 |

### §9.2 Traceability

```
Requirement ID → OpenAPI OperationId → Code Implementation → Tests
```

- **MUST**: 全 MUST 要件に検証可能な受入条件を記載すること。 **Accept**: 本ドキュメント内の全 `**MUST**` 行に `**Accept**:` が併記されていること（`grep -c "MUST" SSOT-5*.md` と `grep -c "Accept" SSOT-5*.md` が一致）。
- **MUST**: 要件 ID と OpenAPI OperationId のマッピングを維持すること。 **Accept**: `docs/design/core/SSOT-3_API_SPEC.md` 内の全 OperationId が要件 ID と 1:1 で対応付けられていること。

---

## §10 Testing Strategy

### §10.1 Test Types

| Type | Tool | Coverage Target |
|------|------|----------------|
| Unit Test | Vitest | 80%+ for business logic |
| API Test | Vitest + supertest | All endpoints |
| E2E Test | Playwright | Critical user flows |
| DB Test | Prisma test utils | Schema validation |

### §10.2 Test Database Policy

- **MUST**: テスト専用テナント (`test-tenant-xxx`) を使用すること。 **Accept**: テストコード内の `tenant_id` が全て `test-tenant-` プレフィックスであること（`grep -r "tenant_id" tests/ | grep -v "test-tenant-"` が 0 件）。
- **MUST**: テストデータは各テスト終了時にクリーンアップすること。 **Accept**: テストスイート実行後に `SELECT COUNT(*) FROM {table} WHERE tenant_id LIKE 'test-tenant-%'` が 0 を返すこと。
- **MUST**: 本番データベースに対してテストを実行しないこと（0 件）。 **Accept**: CI 環境の `DATABASE_URL` が `localhost` または `test` を含むことをテストセットアップで検証し、本番 URL の場合はテストが即座に中断されること。

---

## §11 References

| Document | Path |
|----------|------|
| Authentication Master | `docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md` |
| Admin Authentication | `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` |
| Device Authentication | `docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md` |
| Multi-tenant | `docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` |
| Multilingual System | `docs/03_ssot/00_foundation/SSOT_MULTILINGUAL_SYSTEM.md` |
| Op Log Architecture | `docs/03_ssot/00_foundation/SSOT_OPERATIONAL_LOG_ARCHITECTURE.md` |
| Production Parity | `docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md` |
| NFR/QAS | `docs/03_ssot/00_foundation/NFR-QAS.md` |
| Requirement ID System | `docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md` |

---

## §12 Cross-SSOT References

| Section | Related SSOT | Relationship |
|---------|-------------|-------------|
| §1 Authentication | SSOT-3 API Spec | API 認証ミドルウェアの仕様定義 |
| §2 Multi-Tenancy | SSOT-2 DB Schema | `tenant_id` カラム定義・RLS ポリシー |
| §3 Security | SSOT-3 API Spec | Rate Limiting・CORS ヘッダー設定 |
| §4 Logging | SSOT-2 DB Schema | `audit_logs`, `auth_logs` テーブル定義 |
| §5 Dual Management | SSOT-2 DB Schema | 運用テーブル・ログテーブル設計 |
| §6 Multilingual | SSOT-4 UI/UX | i18n 表示切替・RTL 対応 |
| §7 Error Handling | SSOT-3 API Spec | エラーレスポンス形式統一 |
| §8 Production Parity | SSOT-6 Infra | Docker Compose・環境変数管理 |

---

## §13 Test Cases

| ID | Section | Test Description | Expected Result |
|----|---------|-----------------|-----------------|
| CC-T001 | §1.2 | Cookie 名が `hotel-session-id` であること | DevTools で確認可 |
| CC-T002 | §1.2 | Redis にセッションが保存されること | `redis-cli KEYS` で確認 |
| CC-T003 | §1.2 | セッション TTL が 3600 秒以内であること | `redis-cli TTL` で確認 |
| CC-T004 | §1.4 | 管理画面セッションで Guest API にアクセス不可 | 401 返却 |
| CC-T005 | §2.2 | 全テーブルに `tenant_id NOT NULL` が存在 | Schema クエリで確認 |
| CC-T006 | §2.2 | テナント A からテナント B のデータ不可視 | 404 または空配列 |
| CC-T007 | §3.2 | `v-html` がソースコードに存在しない | grep 0 件 |
| CC-T008 | §3.5 | 5 回連続失敗でアカウントロック | 423 返却 |
| CC-T009 | §3.6 | Super Admin に 2FA なしでアクセス不可 | 401 返却 |
| CC-T010 | §4.2 | CRUD 操作が `audit_logs` に記録される | SELECT COUNT >= 1 |
| CC-T011 | §4.2 | `audit_logs` が UPDATE/DELETE 不可 | permission denied |
| CC-T012 | §5.2 | ステータス変更とログが同一トランザクション | ロールバックテスト |
| CC-T013 | §7.3 | 401 でログイン画面リダイレクト | URL = `/login` |
| CC-T014 | §8.1 | 環境分岐コードが存在しない | grep 0 件 |
| CC-T015 | §10.2 | テスト後にテストデータがクリーンアップ済み | COUNT = 0 |

---

## §14 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-05 | Initial creation — cross-cutting concerns consolidated from 96 legacy SSOTs |
| 1.0.1 | 2026-03-05 | 全 MUST 要件に Accept 基準を追加、曖昧表現を修正、§12 Cross-SSOT References・§13 Test Cases を追加 |
