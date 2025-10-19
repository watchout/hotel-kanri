# Prisma Usage Reduction Plan

## 🎯 Goals
- Remove direct `PrismaClient` usage from `hotel-saas` in staged phases.
- Migrate data access to hotel-common transparent APIs per ADR-2025-003.
- Maintain production stability while reducing regression risk.

## 📅 Timeline Overview
| Week | Focus Area | Key Outcomes |
| ---- | ---------- | ------------ |
| Week 1 | Media management | ✅ Transparent proxy live<br>✅ Media endpoints Prisma-free<br>✅ Type alignment completed |
| Weeks 2-3 | Authentication & tenant context | Replace `server/utils/db-service.ts` mock Prisma<br>Migrate auth endpoints to hotel-common auth APIs |
| Weeks 4-5 | Operational CRUD (orders, rooms, memos) | Batch remove Prisma from remaining admin endpoints<br>Backfill unit/integration tests via hotel-common stubs |
| Week 6 | Consolidation | Final regression run<br>Documentation + deprecation of residual helpers |

## 🔍 Current Usage Inventory
Command reference:
```bash
find server/ -name "*.ts" -exec rg --files-with-matches "prisma\\|PrismaClient" {} +
```

Priority buckets (snapshot 2025-09-XX):
1. **Media related** – ✅ completed (week 1)
2. **Auth & tenant utilities** – high priority (`server/utils/authService.v2.ts`, `server/utils/db-service.ts`, `server/api/v1/auth/*`)
3. **Receipts & billing** – medium priority (`server/api/v1/receipts/[receiptId].get.ts`, billing calculators)
4. **Legacy disabled endpoints** – low priority but tracked for cleanup (`server/api/v1/admin/... .disabled`)

## 🚀 Next Actions
- [ ] Re-run inventory command weekly and update this document.
- [ ] Define replacement hotel-common endpoints per category before refactor.
- [ ] Align testing strategy: add integration tests that hit proxy endpoints.
- [ ] Coordinate with hotel-common team for missing API prerequisites.

## 🛡️ Risk Mitigation
- Feature-flag phased rollouts in Nuxt runtime config.
- Maintain rollback scripts referencing previous Prisma-backed version.
- Monitor logs (`.logs/`) for upstream error rates post-migration.

## 📞 Points of Contact
- Migration Lead: hotel-saas core team
- API Coordination: hotel-common maintainers

Document owner: Kaneko / hotel-saas team (updates weekly or after each milestone).
