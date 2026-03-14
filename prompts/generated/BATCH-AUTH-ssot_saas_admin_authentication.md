# BATCH-AUTH: SAAS ADMIN AUTHENTICATION

**タスクタイプ**: fullstack
**推定工数**: 16時間
**生成日時**: 2026-01-19T09:09:45.081Z

---

# 共通セクション テンプレート

---

## 🚨 【自動挿入】実装中断の基準（全タスク共通）

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）
1. **SSOT照合失敗（0件）** or **SSOT複数一致**
   - grep -nE でSSO**T**定義を検索したが0件、または2件以上
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
- ❌ Prisma直接使用: `import { prisma } from`
- ❌ DB直接アクセス: `prisma.user.findMany()`
- ❌ $fetch単体使用: `$fetch('/api/v1/common')`

### hotel-common（API層）での禁止
- ❌ Nitro構成: `server/api/` フォルダ作成
- ❌ フロントエンド要素: `<template>`, `useState`

---

<!-- FIXED: 認証実装の具体的なステップとセキュリティ対策を追加 -->
## 🔐 SaaS Admin Authentication 実装要件

### FEAT-AUTH-001: ログイン機能
**目的**: 管理者がメールアドレスとパスワードでログインできる

**実装ステップ**:
1. **認証API実装** (`/api/v1/admin/auth/login`)
   - メールアドレス・パスワードのバリデーション
   - BCryptによるパスワードハッシュ検証
   - セッションCookie発行（httpOnly, secure, sameSite設定）
   - ログイン失敗回数制限（ブルートフォース対策）

2. **セキュリティ対策**:
   - SQL Injection対策: Prismaによるパラメータ化クエリ
   - XSS対策: サニタイゼーション実装
   - CSRF対策: トークン検証
   - 列挙攻撃対策: 一律「認証に失敗しました」エラー

### FEAT-AUTH-002: セッション管理
**目的**: ログイン状態を安全に維持し検証する

**実装ステップ**:
1. **セッション検証API** (`/api/v1/admin/auth/verify`)
   - JWT/Session Tokenの検証
   - 有効期限チェック
   - tenant_idによるアクセス制御
   - セッションリフレッシュ機能

2. **テナント分離**:
   - 必須: 全DBクエリに`tenant_id`フィルタ
   - クロステナントアクセス防止
   - 管理者権限レベル検証

### FEAT-AUTH-003: ログアウト機能
**目的**: セッションを安全に破棄する

**実装ステップ**:
1. **ログアウトAPI** (`/api/v1/admin/auth/logout`)
   - セッション無効化
   - Cookie削除
   - サーバーサイドセッション破棄
   - ログ記録（セキュリティ監査用）

---

## 📁 実装ファイル構成

### hotel-common (API層)