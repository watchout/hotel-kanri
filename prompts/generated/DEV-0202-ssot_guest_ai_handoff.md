# DEV-0202: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:16:47.214Z

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

# DEV-0202: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ - Backend API実装

## 🚨 重要：実装中断の基準（必読）

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）
1. SSOT照合失敗（0件）or SSOT複数一致
2. ルーティング不一致（深いネスト/二重付与/index.*ファイル）
3. システム境界違反（saasでPrisma直/saasで$fetch直）
4. 依存ファイル非実在
5. 型エラー連鎖（>5件）
6. Prismaスキーマ変更
7. tenant_idフォールバック/環境分岐
8. エラー原因不明（15分以上）

---

## 📖 必読SSOT
- **メインSSOT**: `docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md`
- **APIレジストリ**: `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`
- **ルーティング**: `docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- **命名規則**: `docs/standards/DATABASE_NAMING_STANDARD.md`

---

## 📋 実装対象

### 要件一覧

| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-001 | ハンドオフリクエスト作成 | FR | API応答<500ms、リクエスト正常作成、通知送信成功 |
| HDF-002 | スタッフ通知 | FR | WebSocket接続確立、リアルタイム通知配信、未読状態管理 |
| HDF-003 | タイムアウト処理 | FR | 60秒自動無効化、ゲスト通知、ログ記録 |
| HDF-004 | 夜間自動無効化 | FR | 22時-6時自動無効、業務時間外メッセージ表示 |
| HDF-100 | 性能要件 | NFR | 同時接続100件、応答時間500ms以内 |
| HDF-101 | セキュリティ要件 | NFR | JWT認証、テナント分離、入力値検証 |
| HDF-102 | 可用性要件 | NFR | 99.9%稼働率、障害復旧5分以内 |
| HDF-200 | 画面一覧 | UI | バックエンド実装では対象外 | <!-- FIXED: 実装対象外であることを明記 -->
| HDF-201 | 多言語対応 | UI | バックエンド実装では対象外 | <!-- FIXED: 実装対象外であることを明記 -->
| HDF-202 | アクセシビリティ | UI | バックエンド実装では対象外 | <!-- FIXED: 実装対象外であることを明記 -->
| HDF-300 | ROI | BIZ | スタッフ対応時間30%短縮 |
| HDF-301 | KPI | BIZ | ハンドオフ成功率90%以上 |

### API一覧

| Method | Path | 説明 |
|:-------|:-----|:-----|
| POST | `/api/v1/handoff/requests` | ハンドオフリクエストを作成 |
| GET | `/api/v1/handoff/requests/:id` | ハンドオフリクエストの詳細を取得 |
| PATCH | `/api/v1/handoff/requests/:id/status` | ステータスを更新 |
| GET | `/api/v1/handoff/requests` | リクエスト一覧を取得 |

<!-- FIXED: APIレスポンス詳細仕様を追加 -->
### APIレスポンス仕様

#### POST /api/v1/handoff/requests
**リクエスト例**: