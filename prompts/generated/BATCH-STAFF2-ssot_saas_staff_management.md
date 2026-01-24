# BATCH-STAFF2: SAAS STAFF MANAGEMENT

**タスクタイプ**: fullstack
**推定工数**: 47時間
**生成日時**: 2026-01-19T23:38:22.654Z

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
- [ ] Prismaクライアント直接使用
- [ ] $fetch直接使用（Cookie転送なし）
- [ ] tenant_idハードコード・フォールバック
- [ ] DBスキーマ変更・直接SQL

### hotel-common（ビジネスロジック層）での禁止
- [ ] Nitroサーバー構成（server/api/）
- [ ] フロントエンド固有の処理

---

## 📋 タスク概要

### 目的
SaaSシステムのスタッフ管理機能を実装する。管理者がスタッフの追加・編集・削除・一覧表示を行えるフルスタック機能を提供。

### 機能要件
1. スタッフ一覧表示（ページネーション付き）
2. スタッフ詳細表示
3. 新規スタッフ追加
4. スタッフ情報編集
5. スタッフ削除（論理削除）
6. 権限管理（役職別アクセス制御）

---

## 📝 実装計画

### Item 1: SSOT定義確認とAPI設計
**Step 1-1: SSOT文書の照合**