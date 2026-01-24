# BATCH-MT2: SAAS MULTITENANT

**タスクタイプ**: fullstack
**推定工数**: 55時間
**生成日時**: 2026-01-19T23:42:22.141Z

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
- ❌ Prisma直接import・使用
- ❌ `$fetch`直接使用（Cookie転送なし）
- ❌ hotel-common未経由のDB操作
- ❌ tenant_idフォールバック処理
- ❌ `index.*`ファイル作成

### hotel-common（API層）での禁止
- ❌ Session直接操作
- ❌ tenant_id検証なし
- ❌ WHERE句でのtenant_id省略

---

# 🎯 マルチテナント機能実装タスク

## 📋 実装要件定義 <!-- FIXED -->

### MT-REQ-001: テナント切り替え機能
**目的**: SaaS管理者が複数テナント間を安全に切り替え可能にする
**Acceptance Criteria**:
- テナント一覧の表示（認可されたテナントのみ）
- テナント選択によるセッション更新
- 現在のテナント情報の表示

### MT-REQ-002: テナント分離保証
**目的**: クロステナントアクセスを完全に防止する
**Acceptance Criteria**:
- 全API呼び出しでtenant_idフィルタ必須
- 不正テナントアクセス時は404返却（列挙攻撃防止）
- セッションテナントIDとリクエストテナントIDの一致検証

### MT-REQ-003: 権限管理統合
**目的**: テナント固有の権限管理を実装する
**Acceptance Criteria**:
- テナント管理者権限の検証
- テナント固有リソースへのアクセス制御
- 権限不足時の適切なエラー応答

---

## 🔒 セキュリティ要件 <!-- FIXED -->

### 認証・認可チェック（必須）
- セッション有効性の確認
- テナント管理者権限の検証
- CSRF保護の実装

### 入力検証（必須）
- 全ユーザー入力のバリデーション
- SQLインジェクション防止
- XSS対策（出力エスケープ）

### テナント分離（必須）
- tenant_idによる厳密なデータ分離
- クロステナントアクセス防止
- 列挙攻撃対策（存在しないテナント→404）

### 機密データ保護（必須）
- ログに機密情報を含めない
- エラーメッセージでの情報漏洩防止
- セッションデータの適切な管理

---

## Item 1: SSOT準拠確認とプロジェクト構造把握 <!-- FIXED -->

### Step 1: SSOTドキュメント確認
