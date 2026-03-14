# DEV-0205: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフへエスカレーションできるHandoff機能を実装

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:39:49.920Z

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
- [ ] `import { PrismaClient } from '@prisma/client'` 
- [ ] `$fetch()` 直接呼び出し（Cookieなし）
- [ ] `server/api/` ディレクトリ作成
- [ ] 環境変数での分岐処理
- [ ] tenant_id バリデーション省略

### hotel-common（API層）での禁止  
- [ ] `nuxt.config.ts` 存在
- [ ] `pages/` ディレクトリ存在
- [ ] Vue/Nuxtコンポーネント
- [ ] クライアントサイドコード

---

<!-- FIXED -->
## 📋 要件定義

### 機能概要
AIチャットボットでは対応が困難な問い合わせに対して、60秒以内にスタッフへエスカレーションできるHandoff（引き継ぎ）機能を実装する。

### 要件ID・Accept条件
| 要件ID | 要件名 | Accept条件 |
|:------|:------|:----------|
| **HDF-001** | Handoff要求作成 | ゲストがAIチャット画面で「スタッフと話したい」ボタンをクリックして引き継ぎ要求を作成できる |
| **HDF-002** | スタッフ通知 | 新しいHandoff要求が作成されると、オンラインスタッフ全員にWebブラウザ通知が送信される |
| **HDF-003** | タイムアウト処理 | 要求作成から60秒経過で自動的にタイムアウト状態になり、電話番号CTAが表示される |
| **HDF-004** | 夜間自動無効化 | 23:00-07:00の間はHandoffボタンが非表示となり、電話CTAのみ表示される |
| **HDF-005** | 要求情報収集 | 問い合わせ理由、優先度、現在の会話履歴を自動収集してHandoffRequestに保存される |
| **HDF-100** | スタッフ一覧表示 | フロントデスクシステムで現在のHandoff要求一覧が優先度順に表示される |
| **HDF-101** | 通知ポップアップ | 新規Handoff要求発生時、スタッフ画面に音声付きポップアップが即座に表示される |
| **HDF-102** | 要求詳細表示 | スタッフが個別のHandoff要求の詳細（ゲスト情報、会話履歴、問い合わせ内容）を確認できる |
| **HDF-103** | 要求受諾処理 | スタッフが「対応開始」ボタンでHandoff要求を受諾し、ゲストに対応開始通知を送信できる |
| **HDF-200** | ステータス管理 | HandoffRequestのステータス（pending/accepted/timeout/cancelled）が適切に管理される |
| **HDF-201** | テナント分離 | 各ホテルのHandoff要求は完全に分離され、他テナントのデータにアクセスできない |
| **HDF-202** | 履歴保存 | 全てのHandoff操作（作成/受諾/タイムアウト/キャンセル）が監査ログとして保存される |
| **HDF-300** | エラーハンドリング | ネットワーク障害時やシステムエラー時に適切なエラーメッセージを表示する |
| **HDF-301** | セキュリティ対策 | 全ての入力値に対してXSS対策・SQLインジェクション対策・CSRFトークン検証が適用されている |

---

<!-- FIXED -->
## 🔗 API仕様

### エンドポイント定義
| エンドポイント | メソッド | 用途 | 権限 |
|:------------|:---------|:-----|:-----|
| `/api/v1/handoff/requests` | POST | Handoff要求作成 | ゲスト認証 |
| `/api/v1/handoff/requests` | GET | 要求一覧取得 | スタッフ認証 |
| `/api/v1/handoff/requests/:id` | GET | 要求詳細取得 | スタッフ認証 |
| `/api/v1/handoff/requests/:id/status` | PATCH | ステータス更新 | スタッフ認証 |

### リクエスト/レスポンス形式

#### POST /api/v1/handoff/requests