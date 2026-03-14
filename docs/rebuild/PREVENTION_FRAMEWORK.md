## 未病予防 → 早期発見 → 診断（三層ガード）

### 1) 未病予防（SSOT/実装プロンプト/テンプレ）
- 認証: JWT禁止、Session Cookie（HttpOnly/SameSite/Secure/固定名）
- 境界: hotel-saasでPrisma直使用禁止、`callHotelCommonAPI`必須
- DB: snake_case＋`@@map/@map`必須、CRUDは`tenant_id`必須、複合UNIQUE/INDEXに`tenant_id`
- ルーティング: 深いネスト・`index.*`禁止（API_ROUTING_GUIDELINES）
- JSON列: 入出力は正規化（parse/stringify規約）

### 2) 早期発見（ローカル/PRフック）
- pre-commit: Denylist, Prisma命名監査
- pre-push: prisma migrate status
- インストール: `scripts/hooks/install-hooks.sh /path/to/repo`

### 3) 診断（CI: Rebuild Quality Gate）
- Denylist（JWT/PrismaClient/NODE_ENV/tenantIdフォールバック）
- Prisma命名監査（@@map/@map/snake_case）
- Prisma migrate status
- テンプレ配置: `templates/ci/rebuild-quality.yml`

### 運用ルール
- スキーマ変更はPrisma Migrateのみ（直SQL禁止）
- SSOT準拠差分のみ許容。旧ドキュメント参照禁止
- Planeに統一（進捗の唯一の真実）





