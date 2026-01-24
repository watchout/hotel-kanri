# DEV-0206: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフへエスカレーション機能実装

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:47:31.079Z

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
| 有人ハンドオフ機能 | `docs/03_ssot/SSOT_有人ハンドオフ機能.md` | ハンドオフ仕様 | <!-- FIXED -->

### 実装ガイド
| ドキュメント | パス | 用途 |
|:------------|:-----|:-----|
| 実装ガード | `.cursor/prompts/ssot_implementation_guard.md` | エラー対応 |
| 実装チェック | `.cursor/prompts/implement_from_ssot.md` | 実装フロー |

---

## ✅ 【自動挿入】禁止パターンチェックリスト

### hotel-saas（プロキシ層）での禁止
- ❌ Prisma直接使用（`prisma.*`）
- ❌ $fetch直接使用（Cookieなし）
- ❌ `index.*`ファイル作成
- ❌ `/api/api/`の二重パス
- ❌ tenant_idのハードコード

### hotel-common（API層）での禁止
- ❌ Nitro設定（`server/api/`）
- ❌ フロントエンド依存（`@nuxt/*`）
- ❌ tenant_idフォールバック

### 共通禁止
- ❌ 環境分岐（`process.env.NODE_ENV`）
- ❌ Prismaスキーマ変更
- ❌ 直接SQL実行

---

## 🔍 SSOT要件定義 <!-- FIXED -->

### 機能要件（HDF-001～099）
- **HDF-001**: ゲスト用エスカレーション要求API（認証なし）
- **HDF-002**: スタッフ用ハンドオフ管理API（Session認証）
- **HDF-003**: リアルタイム通知システム（WebSocket/SSE）
- **HDF-004**: 自動タイムアウト処理（60秒後）

### 非機能要件（HDF-100～199）
- **HDF-100**: 応答時間60秒以内の保証
- **HDF-101**: 夜間無効化（23:00-07:00）
- **HDF-102**: マルチテナント分離（tenant_id）
- **HDF-103**: 多言語対応（日英中韓）

### UI/UX要件（HDF-200～299）
- **HDF-200**: ゲストチャット画面のエスカレーションボタン
- **HDF-201**: スタッフ管理画面の要求一覧
- **HDF-202**: リアルタイム状態更新
- **HDF-203**: タイムアウト通知表示

### ビジネス要件（HDF-300～399）
- **HDF-300**: エスカレーション履歴管理
- **HDF-301**: 運用時間制限（営業時間内のみ）
- **HDF-302**: スタッフワークロード分散

---

## 🗄️ データベース仕様 <!-- FIXED -->

### HandoffRequestテーブル定義