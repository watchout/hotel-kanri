# SSOT-0: Product Requirements Document (PRD)

**Doc-ID**: SSOT-0
**Version**: 1.0.0
**Created**: 2026-03-05
**Status**: Approved
**Source**: Consolidated from 96 legacy SSOTs in `docs/03_ssot/`

---

## §1 Vision & Mission

### §1.1 Product Vision

hotel-kanri は、ホテル客室向けルームサービス・情報提供を SaaS で提供するマルチテナントプラットフォームである。日本国内を起点にアジア・東南アジア圏へ展開し、AI コンシェルジュと多文化おもてなしで「唯一無二のゲスト体験」を実現する。

### §1.2 Mission Statements

| System | Codename | Mission |
|--------|----------|---------|
| hotel-saas | Amaterasu | 唯一無二のおもてなし体験を管理画面・客室端末で提供 |
| hotel-common | Izanagi | 全システム統合基盤（認証・DB・API） |
| hotel-pms | Tsukuyomi | 経営の羅針盤となる PMS |
| hotel-member | Susanoo | 業界の競争力を高める会員システム |

### §1.3 Target Users

| User Type | Description | Auth Method |
|-----------|-------------|-------------|
| Hotel Staff (Admin) | ホテル運営スタッフ（管理画面操作） | Session 認証（Redis + Cookie） |
| Hotel Guest | 宿泊ゲスト（客室端末操作） | デバイス認証（MAC/IP ベース、ゼロタッチ） |
| Super Admin | システム管理者（テナント・プラン管理） | 専用認証（2FA 必須） |

---

## §2 Product Scope

### §2.1 Core Capabilities

1. **Room Service Ordering** — ゲストが客室端末からメニュー閲覧・注文・追跡を行う
2. **Admin Dashboard** — スタッフが注文管理・メニュー管理・統計分析を行う
3. **AI Concierge** — RAG ベースの多言語 AI チャットでゲストを支援
4. **Multi-tenant SaaS** — 単一インフラで複数ホテルを完全データ分離で運用
5. **Guest Device App** — Capacitor + Nuxt 3 の WebView アプリ（Google TV/Android TV）

### §2.2 Out of Scope (Current Release)

- PMS 連携（Phase 4）
- 会員システム（Phase 4）
- オフラインモード（将来計画）
- ネイティブ iOS/Android アプリ

---

## §3 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Admin) | Nuxt 3, Vue 3, Tailwind CSS, TypeScript |
| Frontend (Guest) | Nuxt 3, Capacitor (WebView), Tailwind CSS |
| Backend API | Express.js (hotel-common), TypeScript |
| Database | PostgreSQL 14+, Prisma 5.x ORM |
| Session Store | Redis |
| Auth | Session-based (Redis + HttpOnly Cookie `hotel-session-id`) |
| Real-time | WebSocket (`ws://*/ws/orders`) |
| AI | OpenAI API, Anthropic API (multi-provider) |
| Deployment | Vercel (frontend), Node.js (backend) |

---

## §4 Non-Functional Requirements (NFR Summary)

NFR は ISO/IEC 25010:2011 に準拠。詳細は legacy `docs/03_ssot/00_foundation/NFR-QAS.md` を参照。

| Quality Attribute | Target | Verification |
|-------------------|--------|-------------|
| Performance | API 応答 < 200ms (p95)、ページロード < 3s | Load test with k6 |
| Availability | 99.9% uptime (月間ダウンタイム < 43min) | Uptime monitoring |
| Security | OWASP Top 10 対策、テナント分離、暗号化通信 | Penetration test |
| Scalability | 数千テナント対応可能な RLS + tenant_id 設計 | Capacity planning |
| Usability | TV 最適化 UI (10ft, 80-120px タッチターゲット) | Usability test |
| Maintainability | SSOT 駆動開発、Prisma マイグレーション | Code review |
| Portability | Capacitor WebView で Google TV/Android TV 対応 | Device test matrix |

---

## §5 Global Expansion Strategy

| Phase | Period | Target Market |
|-------|--------|--------------|
| Phase 1 | 2025 | 国内基盤確立 |
| Phase 2 | 2026-2027 | アジア展開（台湾・韓国・タイ・ベトナム・シンガポール・マレーシア・インドネシア） |
| Phase 3 | 2028-2030 | アジア全域（中国・インド・UAE・サウジアラビア・フィリピン） |

### §5.1 Cultural Considerations

- 15 言語完全対応（日本語デフォルト + 英語 + 13 言語）
- 200+ 国の文化プロファイル対応
- ハラール・ベジタリアン・ビーガン等の食文化フィルタ
- 宗教的配慮（祈祷時間・ラマダン・安息日）
- AI 駆動の文化理解・配慮自動化

---

## §6 Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | 認証基盤統一（JWT→Session） | Completed |
| Phase 1 | 管理機能基盤完成（権限・メディア・統計） | In Progress |
| Phase 2 | 客室端末機能（注文フロー・メニュー・AI チャット） | Planned |
| Phase 3 | 多言語・監視・拡張機能 | Planned |
| Phase 4 | PMS 連携・会員システム | Planned |

---

## §7 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Order Conversion Rate | > 30% (ゲストの注文率) | Analytics |
| Average Order Time | < 2 min (閲覧→注文完了) | Session tracking |
| Staff Efficiency | 注文処理時間 50% 削減 | Before/after comparison |
| Tenant Onboarding | < 1 day (新ホテル導入) | Onboarding log |
| System Uptime | 99.9% | Monitoring |
| Guest Satisfaction | NPS > 50 | Survey |

---

## §8 Constraints

| Constraint | Detail | Acceptance Criteria |
|-----------|--------|---------------------|
| MUST: Single DB | 全システムが同一 PostgreSQL を使用（hotel-common が管理）。ref: [SSOT-4 §1](../design/core/SSOT-4_DATA_MODEL.md#1-architecture) | `psql -c "\l"` で単一 DB を確認。hotel-saas に Prisma クライアント生成がないこと。 |
| MUST: Redis Unified | 全環境で同一 Redis インスタンス（開発/本番で実装差異禁止）。ref: [SSOT-5 §1](../design/core/SSOT-5_CROSS_CUTTING.md#1-authentication) | `redis-cli ping` → PONG。hotel-common/hotel-saas 両方の `.env` で同一 `REDIS_URL`。 |
| MUST: Cookie Unified | Cookie 名 `hotel-session-id`、設定は全システム統一。ref: [SSOT-5 §1.2](../design/core/SSOT-5_CROSS_CUTTING.md#12-session-authentication) | ブラウザ DevTools で Cookie 名・属性を確認。`httpOnly=true`, `sameSite=strict`。 |
| MUST: Tenant Isolation | 全テーブルに `tenant_id`、RLS + アプリレベルフィルタリング。ref: [SSOT-5 §2](../design/core/SSOT-5_CROSS_CUTTING.md#2-multi-tenancy) | テナント A でログイン → テナント B のデータが API レスポンスに含まれないこと。 |
| MUST: Naming Convention | DB=snake_case、Prisma=camelCase+@map、API/JSON=camelCase。ref: [SSOT-4 §2](../design/core/SSOT-4_DATA_MODEL.md#2-naming-conventions) | `prisma/schema.prisma` の全モデルに `@@map` と `@map` が存在すること。 |
| MUST: SSOT Authority | SSOT が最高権威。実装と矛盾する場合は実装を SSOT に合わせる。ref: [SSOT-1](../requirements/SSOT-1_FEATURE_CATALOG.md) | コードレビューで SSOT 参照を必須チェック項目とすること。 |

---

## §9 Stakeholders

| Role | Responsibility |
|------|---------------|
| Iza (hotel-common) | 統合管理・認証・DB・API 基盤 |
| Sun (hotel-saas) | 管理画面フロントエンド・客室端末 |
| Luna (hotel-pms) | PMS 連携（Phase 4） |
| Suno (hotel-member) | 会員システム（Phase 4） |

---

## §10 Cross-SSOT References

| SSOT | Relationship | Referenced Sections |
|------|-------------|---------------------|
| [SSOT-1 Feature Catalog](../requirements/SSOT-1_FEATURE_CATALOG.md) | §2 Core Capabilities → SSOT-1 §3-§5 feature lists | §2.1 maps to F-xxx/G-xxx/C-xxx |
| [SSOT-2 UI/State](../design/core/SSOT-2_UI_STATE.md) | §3 Tech Stack frontend → SSOT-2 §1 Design System | §1.3 Target Users → SSOT-2 §2/§3 screen maps |
| [SSOT-3 API Contract](../design/core/SSOT-3_API_CONTRACT.md) | §3 Tech Stack backend → SSOT-3 §1 Conventions | §8 Constraints → SSOT-3 §1.3 Auth |
| [SSOT-4 Data Model](../design/core/SSOT-4_DATA_MODEL.md) | §3 Tech Stack DB → SSOT-4 §1 Architecture | §8 MUST: Single DB → SSOT-4 §1.1 |
| [SSOT-5 Cross-Cutting](../design/core/SSOT-5_CROSS_CUTTING.md) | §4 NFR → SSOT-5 §3 Security | §8 Constraints → SSOT-5 §1-§8 |

---

## §11 References

| Document | Path |
|----------|------|
| Legacy SSOT Master | `docs/03_ssot/README.md` |
| Phase 1 Overview | `docs/03_ssot/PHASE_1_OVERVIEW.md` |
| Global Strategy | `docs/03_ssot/00_foundation/STRATEGIC_VISION_GLOBAL_EXPANSION.md` |
| NFR/QAS | `docs/03_ssot/00_foundation/NFR-QAS.md` |

---

## §12 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-05 | Initial creation from 96 legacy SSOTs |
| 1.0.1 | 2026-03-05 | Add acceptance criteria to MUST constraints, add cross-SSOT refs, add §12 |
