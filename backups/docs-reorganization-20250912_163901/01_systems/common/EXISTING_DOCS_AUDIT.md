# 既存ドキュメント監査結果

## 監査日時
2025-01-03

## 分類結果

### 🔵 SPECS候補 (仕様書)
- `Room_Grade_Management_System_Design.md`
- `Room_Management_Cross_System_Design.md`
- `Hotel_Group_Hierarchy_Management_Architecture.md`
- `unified-authentication-infrastructure-design.md`
- `event-driven-architecture-design.md`
- `token-optimization-specification.md`
- `pin-jwt-integration-spec.md`
- `pms-permission-management-spec.md`
- `dev-server-specification.md`

### 🟡 ADR候補 (技術判断)
- `api-client-standardization-design.md`
- `development-strategy-revision.md`
- `staged-minimum-integration-strategy.md`
- `domain-management-strategy.md`
- `documentation-sharing-strategy.md`

### 🟢 MINUTES候補 (会議・議論記録)
- 現在該当なし（新規作成が必要）

### 🟠 RELEASE候補 (リリースノート)
- `COMPLETE_INTEGRATION_REPORT.md`
- `DATABASE_INTEGRATION_COMPLETION_REPORT.md`
- `IMPLEMENTATION_STATUS.md`
- `INTEGRATION_UPDATE.md`

### 🟣 SUMMARY候補 (サマリ)
- `NEXT_STEPS.md`
- `system-integration-map.md`

### 📚 ガイド・手順書 (既存位置維持)
- `hotel-saas-phase1-integration-guide.md`
- `hotel-saas-phase2-5-implementation-guide.md`
- `sso-frontend-implementation-guide.md`
- `staff-login-guide.md`
- `sun-demo-release-support-guide.md`
- `dev-server-setup-guide.md`
- `conoha-vps-setup-guide.md`
- `conoha-vps-db-setup-guide.md`
- `docker-environment-setup.md`
- `deployment-workflow.md`
- `server-deployment-plan.md`
- `how-to-use-framework.md`

### 🔧 開発関連 (既存位置維持)
- `CODING_STANDARDS.md`
- `development-rules-and-documentation-standards.md`
- `TYPESCRIPT_ERRORS_SUMMARY.md`
- `QUALITY_GUARD_APPLY.md`
- `G2_TEST_REPORT.md`
- `zod-integration-examples.md`

### 🏢 ビジネス関連 (既存位置維持)
- `CRM_Implementation_Priority_Matrix.md`
- `CRM_System_Implementation_Guide.md`
- `hotel-member-migration-setup.md`
- `handover-to-hotel-kanri.md`

### 📋 テンプレート・戦略 (既存位置維持)
- `clear-instruction-template.md`
- `ai-agent-compliance-strategy.md`

### 🗂️ 既存ディレクトリ (統合検討)
- `api/` → 一部をspecs/に移行
- `database/` → 一部をspecs/に移行  
- `integration/` → specs/とadr/に分散移行
- `roadmap/` → summary/に移行
- `sales-strategy/` → 既存位置維持

## 移行優先度

### Phase 1 (即座に移行)
1. 明確な仕様書 → specs/
2. 技術判断文書 → adr/
3. 完了報告 → release/

### Phase 2 (段階的移行)
1. integration/配下の分析・分散移行
2. database/配下の分析・分散移行
3. api/配下の分析・分散移行

### Phase 3 (長期)
1. ガイド類の整理統合
2. 重複文書の統合
3. 古い文書のSuperseded化