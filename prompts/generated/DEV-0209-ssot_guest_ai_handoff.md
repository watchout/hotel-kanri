# DEV-0209: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフへエスカレーション機能の実装

**タスクタイプ**: fullstack
**推定工数**: 39時間
**生成日時**: 2026-01-18T01:05:08.399Z

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
- `import { PrismaClient } from '@prisma/client'`
- 直接SQL実行
- `$fetch` 直接使用（Cookie転送なし）

### hotel-common（API層）での禁止
- `server/api/` 構成
- Nitroサーバーハンドラー
- `defineEventHandler` 

---

## 📋 要件一覧 <!-- FIXED -->

### HDF-001: エスカレーション機能の基本動作
- AIチャットで解決困難な問い合わせを検知した際、60秒以内にスタッフへエスカレーション
- ゲストからのエスカレーション要求を即座に処理し、スタッフに通知
- Accept条件: エスカレーション要求から60秒以内にスタッフに通知される

### HDF-002: タイムアウト処理
- 60秒以内にスタッフが応答しない場合、フォールバック処理を実行
- 自動的にTIMEOUTステータスに更新し、電話問い合わせCTAを表示
- Accept条件: 60秒経過時に電話での問い合わせCTAが表示される

### HDF-003: エスカレーション状態管理
- エスカレーション要求の状態（PENDING/ACCEPTED/TIMEOUT）を管理
- 状態遷移のビジネスルールに基づく厳密な制御
- Accept条件: 各状態が正しく遷移し、重複処理が発生しない

### HDF-004: スタッフ通知機能
- エスカレーション要求をリアルタイムでスタッフに通知
- WebSocketによる即時通知とブラウザ通知機能
- Accept条件: WebSocket経由で即座にスタッフ画面に通知表示される

### HDF-100: HandoffRequest API作成
- エスカレーション要求の作成APIエンドポイント
- ゲストからの問い合わせ内容とコンテキスト情報を受信
- Accept条件: `POST /api/v1/handoff/requests` が正常動作

### HDF-101: HandoffRequest API取得
- エスカレーション要求の一覧・詳細取得APIエンドポイント
- スタッフが対応可能な要求リストを取得
- Accept条件: `GET /api/v1/handoff/requests` が正常動作

### HDF-102: HandoffRequest API更新
- エスカレーション要求の状態更新APIエンドポイント
- スタッフによる受付・完了処理を実行
- Accept条件: `PATCH /api/v1/handoff/requests/{id}` が正常動作

### HDF-200: HandoffRequestテーブル設計
- エスカレーション要求を管理するデータベーステーブル
- 問い合わせ内容、ゲスト情報、状態、タイムスタンプを管理
- Accept条件: Prismaスキーマに適切なテーブル定義が追加される

### HDF-201: HandoffStatus enum定義
- エスカレーション状態を表すenum定義
- PENDING（待機中）/ACCEPTED（受付済み）/TIMEOUT（タイムアウト）の3状態
- Accept条件: PENDING/ACCEPTED/TIMEOUT の3状態が定義される

### HDF-202: テナント分離対応
- HandoffRequestテーブルのテナント分離実装
- tenant_idによる完全なデータ分離とアクセス制御
- Accept条件: tenant_idによる完全なデータ分離が実現される

### HDF-300: スタッフ画面UI実装
- エスカレーション通知を表示するスタッフ画面
- リアルタイム通知リスト、詳細表示、受付ボタン機能
- Accept条件: リアルタイム通知とエスカレーション受付機能が動作

### HDF-301: WebSocket通信実装
- リアルタイム通知のためのWebSocket通信
- サーバー側とクライアント側の双方向通信機能
- Accept条件: エスカレーション要求の双方向通信が正常動作

---

## 🏗️ API仕様 <!-- FIXED -->

### 1. エスカレーション要求作成
- **エンドポイント**: `POST /api/v1/handoff/requests`
- **認証**: ゲスト認証必須
- **リクエスト**: