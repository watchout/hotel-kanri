# BATCH-MENU: SAAS MENU MANAGEMENT

**タスクタイプ**: fullstack
**推定工数**: 32時間
**生成日時**: 2026-01-19T22:17:36.384Z

---

# 共通セクション テンプレート

---

## 🚨 【自動挿入】実装中断の基準（全タスク共通）

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）
1. **SSOT照合失敗（0件）** or **SSOT複数一致**
   - grep -nE でSSOT定義を検索したが0件、または2件以上
2. **ルーティング不一致**
   - `/api/v1/admin` 形式外
   - 深いネスト（`/api/v1/admin/[親]/[id]/[子]/[id]`）
   - 二重`/api`（`/api/api/`）
   - `index.*`ファイル（hotel-saas）
3. **システム境界違反**
   - hotel-commonにNitro構成（`server/api/`）存在
   - hotel-saasでPrisma直接使用
   - hotel-saasで`$fetch`直接使用（Cookie未転送）
4. **依存ファイル非実在・未生成**
5. **型エラー連鎖（>5件/1ステップ）**
6. **Prismaスキーマ変更・直接SQL**
7. **tenant_idフォールバック/環境分岐**
8. **矛盾の発見**
9. **エラー原因不明（15分以上）**

---

## 📖 【自動挿入】必読ドキュメント

### 基盤SSOT（必須）
| ドキュメント | パス | 用途 |
|:------------|:-----|:-----|
| APIレジストリ | `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` | エンドポイント定義 |
| ルーティング | `docs/01_systems/saas/API_ROUTING_GUIDELINES.md` | ルーティング規則 |
| DB命名規則 | `docs/standards/DATABASE_NAMING_STANDARD.md` | テーブル・カラム命名 |
| 認証SSOT | `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` | Session認証 |
| マルチテナント | `docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` | テナント分離 |

### 実装ガイド
| ドキュメント | パス | 用途 |
|:------------|:-----|:-----|
| 実装ガード | `.cursor/prompts/ssot_implementation_guard.md` | エラー対応 |
| 実装チェック | `.cursor/prompts/implement_from_ssot.md` | 実装フロー |

---

## ✅ 【自動挿入】禁止パターンチェックリスト

### hotel-saas（プロキシ層）での禁止
- ❌ Prisma直接使用（`import { PrismaClient }`）
- ❌ `$fetch`直接使用（Cookie転送なし）
- ❌ `tenant_id`なしでhotel-common API呼び出し

### hotel-common（データ層）での禁止
- ❌ Nitro構成（`server/api/`フォルダ）
- ❌ フロントエンド依存（Vue/Nuxt imports）

---

# メニュー管理システム実装

<!-- FIXED: 認証フローと権限管理を明確化 -->
## 🔐 セキュリティ要件

### 認証フロー
1. **Session認証**: `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`に従う
2. **権限管理**: 管理者ロール必須（`role: 'admin'`）
3. **テナント分離**: 全APIで`tenant_id`フィルタ必須

### セキュリティ対策 <!-- FIXED -->
- **SQLインジェクション**: Prismaのタイプセーフクエリのみ使用
- **XSS対策**: サニタイゼーション実装（DOMPurify等）
- **テナント分離**: クロステナントアクセス防止、列挙攻撃対策
- **エラーハンドリング**: 情報漏洩防止（汎用エラーメッセージ）

---

## Item 1: APIエンドポイント実装 <!-- FIXED: 実装手順を段階化 -->

### Step 1.1: hotel-common API実装
