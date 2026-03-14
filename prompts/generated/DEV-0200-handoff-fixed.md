# DEV-0200: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:02:44.751Z

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

# DEV-0200: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ - Backend API実装

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

<!-- FIXED -->
## 📋 要件一覧（SSOT準拠）

### 基本機能要件
- **HDF-001**: AIチャット判定機能 - 対応困難な問い合わせをAIが自動判定し、スタッフ引き継ぎをトリガー
- **HDF-002**: 60秒以内通知 - 判定から60秒以内にスタッフに通知を完了する（Accept: レスポンス時間 < 60s）
- **HDF-003**: リアルタイム状態管理 - handoff_requestテーブルで引き継ぎ状態をリアルタイム追跡
- **HDF-004**: チャット履歴保持 - 引き継ぎ時に過去5メッセージの履歴を保持（Accept: message_history配列に5件格納）

### システム連携要件
- **HDF-100**: WebSocket通知 - スタッフダッシュボードにWebSocket経由でリアルタイム通知
- **HDF-101**: メール通知 - スタッフ不在時は自動メール通知を送信（Accept: メール送信ログ確認可能）
- **HDF-102**: 多重通知防止 - 同一問い合わせの重複通知を防止（Accept: 1問い合わせ = 1通知）

### 管理機能要件
- **HDF-200**: スタッフダッシュボード - 引き継ぎ一覧とステータス管理画面
- **HDF-201**: 応答時間計測 - 引き継ぎから初回応答までの時間を記録（Accept: response_time_seconds記録）
- **HDF-202**: 優先度管理 - VIPゲスト、緊急度に応じた優先度付け（Accept: priority enum適用）

### 品質・運用要件
- **HDF-300**: 多言語対応 - 日本語、英語、中国語の3言語対応（Accept: i18nキー設定完了）
- **HDF-301**: アクセシビリティ - WCAG 2.1 AA準拠のUI（Accept: lighthouse accessibility score > 90）

## 🔒 セキュリティ要件（必読）
- **認証**: 全APIエンドポイントでJWT認証を必須とする
- **権限管理**: ゲスト操作には`guest:handoff:create`、管理操作には`admin:handoff:read`権限が必要
- **入力バリデーション**: 全ユーザー入力にzodスキーマによるバリデーションを実装
- **XSS対策**: レスポンスデータにはsanitize-htmlによるエスケープを適用
<!-- FIXED -->
- **ログ保護**: メッセージ内容、個人情報は絶対にログに記録しない（request_id、status、timestamp のみ記録を許可）
- **エラーハンドリング**: エラーメッセージは一般的な内容に留め、詳細はサーバーログに記録

<!-- FIXED -->
## 📊 データベース・API仕様（SSOT準拠）

### 依存関係