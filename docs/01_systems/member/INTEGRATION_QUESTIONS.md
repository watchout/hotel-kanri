# 🔗 Hotel Member システム連携仕様 質問ドキュメント 【回答済み】

**作成日**: 2025-07-15  
**対象**: hotel-integration / hotel-common 担当者  
**回答期限**: 開発スケジュールに応じて設定  

**回答者**: システム統合管理者  
**回答日**: 2024年12月  
**回答形式**: ✅ 決定事項 / 🔄 検討中事項 / ⚠️ 要相談事項

---

## 📝 **概要**

hotel-memberシステムの開発において、統合認証・データベース連携・API連携の詳細仕様が必要です。
以下の質問にご回答いただき、整合性のある実装を進めたいと思います。

---

## 🔐 **1. 認証・セッション管理**

### 1.1 JWT Token仕様

**Q1-1**: JWTのpayload構造を教えてください
> ✅ **決定事項**: **hotel-common JWT統一仕様**
> ```json
> {
>   "user_id": "uuid-v4-format",
>   "tenant_id": "uuid-v4-format", 
>   "role": "staff|manager|admin|owner",
>   "permissions": ["reservation_read", "member_write", "point_manage"],
>   "hotel_group_id": "uuid-v4-format",
>   "exp": "8時間後のUnixタイムスタンプ",
>   "refresh_exp": "30日後のUnixタイムスタンプ"
> }
> ```

**Q1-2**: JWT Token の有効期限と更新方法は？
> ✅ **決定事項**: **hotel-common JWT基盤による統一管理**
> - **アクセストークン有効期限**: 8時間（勤務時間考慮）
> - **リフレッシュトークン有効期限**: 30日
> - **自動更新のタイミング**: 有効期限30分前に自動リフレッシュ
> - **更新方法**: hotel-common/auth モジュール経由

**Q1-3**: システム間認証の具体的な流れは？
> ✅ **決定事項**: **段階的SSO実装（hotel-common JWT基盤）**
> - **Phase 1**: hotel-saas + hotel-member（優先実装）
> - **hotel-member → hotel-saas**: JWT Bearer Token + API Key
> - **hotel-member → hotel-pms**: JWT + ローカルPINフォールバック
> - **認証失敗時**: ローカル認証フォールバック + エラーログ記録

### 1.2 Redis Session Store

**Q1-4**: Redis接続設定とキー命名規則は？
> ✅ **決定事項**: **hotel-common Redis統一設定**
> ```
> 接続先: redis://localhost:6379/1 (DB 1専用使用)
> キー形式: hotel:session:{tenant_id}:{user_id}
> TTL設定: 28800秒（8時間、JWT有効期限と同期）
> 接続プール: 最大10接続
> ```

**Q1-5**: セッションデータの構造は？
> ✅ **決定事項**: **統一セッション構造**
> ```json
> {
>   "user_id": "uuid-v4",
>   "tenant_id": "uuid-v4",
>   "last_activity": "ISO8601タイムスタンプ",
>   "permissions": ["array", "of", "permissions"],
>   "login_device": "web|mobile|pos",
>   "ip_address": "xxx.xxx.xxx.xxx"
> }
> ```

---

## 🗃️ **2. データベース設計**

### 2.1 統合データベース構造

**Q2-1**: テナント分離の具体的な実装方法は？
> ✅ **決定事項**: **PostgreSQL + RLS（Row Level Security）**
> - **RLS設定**: 全テーブルで有効化
> - **テナントID管理**: hotel-commonで統一UUID管理
> - **自動フィルタリング**: app.current_tenant_id設定値による自動制御
> ```sql
> ALTER TABLE users ENABLE ROW LEVEL SECURITY;
> CREATE POLICY tenant_policy ON users
>   FOR ALL TO hotel_member_role
>   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
> ```

**Q2-2**: 共通テーブルの定義は？
> ✅ **決定事項**: **統一テーブル構造（hotel-commonで定義）**
> ```sql
> -- tenants テーブル（hotel-memberのgroupsテーブルと統合）
> CREATE TABLE tenants (
>   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   domain VARCHAR(100) UNIQUE NOT NULL,
>   name VARCHAR(200) NOT NULL,
>   created_at TIMESTAMP DEFAULT NOW(),
>   updated_at TIMESTAMP DEFAULT NOW()
> );
> 
> -- users テーブル（共通）
> CREATE TABLE users (
>   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   tenant_id UUID REFERENCES tenants(id),
>   email VARCHAR(255) UNIQUE NOT NULL,
>   phone VARCHAR(20),
>   name VARCHAR(100),
>   role VARCHAR(20) DEFAULT 'staff',
>   created_at TIMESTAMP DEFAULT NOW(),
>   updated_at TIMESTAMP DEFAULT NOW()
> );
> ```

**Q2-3**: hotel-member専用テーブルとの関係は？
> ✅ **決定事項**: **段階的移行戦略**
> - **既存テーブル**: `groups` → `tenants`, `users`（共通化）, `ranks`（hotel-member専用維持）
> - **移行方法**: SQLite → PostgreSQL移行スクリプト提供
> - **命名規則**: hotel-member専用テーブルは `hm_` プレフィックス
> - **整合性**: hotel-common Prismaスキーマで型定義統一

### 2.2 Row Level Security設定

**Q2-4**: RLS の具体的な設定例は？
> ✅ **決定事項**: **統一RLS実装パターン**
> ```sql
> -- hotel-member専用テーブル例
> ALTER TABLE hm_members ENABLE ROW LEVEL SECURITY;
> CREATE POLICY hm_members_tenant_policy ON hm_members
>   FOR ALL TO hotel_member_role
>   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
> 
> -- 共通テーブル例
> ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
> CREATE POLICY reservations_tenant_policy ON reservations
>   FOR ALL TO hotel_app_role
>   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
> ```

---

## 🔌 **3. API連携**

### 3.1 システム間API通信

**Q3-1**: 統一レスポンス形式の詳細は？
> ✅ **決定事項**: **hotel-common統一APIレスポンス**
> ```json
> {
>   "success": true,
>   "data": {},
>   "error": null,
>   "metadata": {
>     "timestamp": "2024-12-XX:XX:XX.XXXZ",
>     "request_id": "uuid-v4",
>     "system": "hotel-member",
>     "version": "v1"
>   }
> }
> ```

**Q3-2**: エラーハンドリングの統一仕様は？
> ✅ **決定事項**: **統一エラーコード体系**
> ```json
> {
>   "success": false,
>   "data": null,
>   "error": {
>     "code": "M001", // M=Member, S=SaaS, P=PMS, C=Common
>     "message": "会員情報が見つかりません",
>     "details": {
>       "member_id": "uuid",
>       "tenant_id": "uuid"
>     }
>   }
> }
> ```

**Q3-3**: システム間API認証の方法は？
> ✅ **決定事項**: **JWT Bearer Token + API Key併用**
> - **ユーザー認証**: JWT Bearer Token
> - **システム間認証**: API Key（X-API-Key ヘッダー）
> - **TLS必須**: 開発環境含む全環境でHTTPS強制

### 3.2 具体的な連携API

**Q3-4**: hotel-memberが提供すべきAPIエンドポイントは？
> ✅ **決定事項**: **RESTful API設計（hotel-common準拠）**
> ```
> GET    /api/v1/members/{member_id}        # 会員情報取得
> PATCH  /api/v1/members/{member_id}        # 会員情報部分更新
> GET    /api/v1/members/{member_id}/points # ポイント残高取得
> POST   /api/v1/points/earn               # ポイント加算
> POST   /api/v1/points/use                # ポイント使用
> GET    /api/v1/ranks                     # ランク一覧
> POST   /api/v1/reservations              # 予約作成（hotel-pms連携）
> ```

**Q3-5**: hotel-memberが呼び出すAPIエンドポイントは？
> ✅ **決定事項**: **システム間連携API**
> ```
> hotel-saas: 
>   POST /api/v1/orders/member            # 会員注文連携
>   GET  /api/v1/services/available       # 利用可能サービス取得
> 
> hotel-pms:  
>   GET  /api/v1/rooms/availability       # 客室空室状況
>   POST /api/v1/reservations             # 予約データ送信
>   GET  /api/v1/stay-status/{member_id}  # 滞在状況確認
> ```

---

## 🎨 **4. UI Builder連携**

### 4.1 カスタマイゼーション適用

**Q4-1**: UI Builderで作成したテーマの適用方法は？
> 🔄 **検討中事項**: **CSS変数 + Tailwind設定併用**
> - **CSS変数**: リアルタイム色変更
> - **Tailwind設定**: ビルド時設定上書き
> - **適用方法**: テナント毎の動的CSS注入
> ```css
> :root {
>   --primary: #{theme.primary_color};
>   --secondary: #{theme.secondary_color};
> }
> ```

**Q4-2**: テナント毎のUI設定管理は？
> ✅ **決定事項**: **tenant_ui_settings テーブル管理**
> ```json
> {
>   "tenant_id": "uuid",
>   "subscription_plan": "premium",
>   "theme": {
>     "primary_color": "#3498db",
>     "secondary_color": "#2ecc71",
>     "font_family": "Noto Sans JP",
>     "border_radius": "8px"
>   },
>   "custom_css": "compressed-css-string",
>   "logo_url": "https://cdn.hotel.../logo.png"
> }
> ```

**Q4-3**: リアルタイムUI更新の仕組みは？
> 🔄 **検討中事項**: **WebSocket + CSS注入併用**
> - **WebSocket**: テーマ変更通知（hotel-common Socket.io基盤）
> - **更新方法**: 部分的CSS注入（ページリロード不要）
> - **フォールバック**: WebSocket切断時は次回アクセス時適用

### 4.2 カスタムコンポーネント

**Q4-4**: hotel-memberで提供すべきカスタマイズ可能なコンポーネントは？
> 🔄 **検討中事項**: **段階的カスタマイズ対応**
> - **Phase 1**: ヘッダー・フッター、カラーテーマ
> - **Phase 2**: 会員登録フォーム、ポイント表示エリア
> - **Phase 3**: 予約フォーム、会員ダッシュボード
> - **技術**: Vue 3 Composition API + CSS変数

---

## 🔄 **5. WebSocket連携**

### 5.1 リアルタイム通信

**Q5-1**: WebSocketの用途と接続方法は？
> ✅ **決定事項**: **hotel-common Socket.io基盤活用**
> ```javascript
> // hotel-common Socket.io-client v4.8.1
> const socket = io('ws://localhost:3400', {
>   auth: {
>     token: 'JWT_TOKEN',
>     system: 'hotel-member'
>   }
> });
> ```

**Q5-2**: メッセージング形式は？
> ✅ **決定事項**: **統一メッセージング形式**
> ```json
> {
>   "type": "MEMBER_POINT_UPDATE",
>   "tenant_id": "uuid",
>   "user_id": "uuid",
>   "timestamp": "ISO8601",
>   "data": {
>     "member_id": "uuid",
>     "points": 1500,
>     "rank": "GOLD",
>     "transaction_type": "earn"
>   }
> }
> ```

**Q5-3**: hotel-memberで処理すべきWebSocketイベントは？
> ✅ **決定事項**: **優先度ベースWebSocketイベント**
> - **高優先度**: ポイント更新通知、会員ランク変更、緊急システム通知
> - **中優先度**: 予約状況変更、キャンペーン通知
> - **低優先度**: システムメンテナンス通知、統計更新

---

## ⚙️ **6. 開発・デプロイ環境**

### 6.1 開発環境設定

**Q6-1**: 統合開発環境の構築方法は？
> ✅ **決定事項**: **ポート固定構成**
> ```yaml
> # docker-compose.yml の構成例
> services:
>   hotel-member:
>     ports: ["3200:3200", "8080:8080"]
>   hotel-saas:
>     ports: ["3100:3100"]
>   hotel-pms:
>     ports: ["3300:3300"]
>   hotel-common:
>     ports: ["3400:3400"]
>   postgres:
>     ports: ["5432:5432"]
>   redis:
>     ports: ["6379:6379"]
> ```

> Nuxt 開発サーバ設定（抜粋）
> ```ts
> // nuxt.config.ts
> export default defineNuxtConfig({
>   devServer: { port: 8080, strictPort: true }
> })
> ```

**Q6-2**: 環境変数の統一設定は？
> ✅ **決定事項**: **プレフィックス統一環境変数**
> ```bash
> # 共通環境変数（hotel-common）
> DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<HOST>:5432/hotel_unified_db
> REDIS_URL=redis://localhost:6379/1
> JWT_SECRET=統一シークレット
> 
> # hotel-member固有環境変数（正準値）
> PORT=3200
> MEMBER_UI_PORT=8080
> HM_SAAS_API_URL=http://localhost:3100/api/v1
> HM_PMS_API_URL=http://localhost:3300/api/v1
> ```

### 6.3 ヘルスチェック手順（統一）
> ✅ **決定事項**: 全システム共通ヘルスエンドポイント
> - hotel-member API: `GET http://localhost:3200/health`（実装により`/api/health`併記可）
> - フロントエンド: `GET http://localhost:8080/health`
> - hotel-saas API: `GET http://localhost:3100/health`
> - hotel-pms API: `GET http://localhost:3300/health`
> 
> 検証コマンド例:
> ```bash
> curl -i http://localhost:3200/health
> curl -i http://localhost:8080/health
> ```

### 6.3 統合テスト

**Q6-3**: システム間の統合テスト方法は？
> 🔄 **検討中事項**: **段階的統合テスト**
> - **テストデータ**: hotel-common共通テストデータセット
> - **実行順序**: hotel-common → hotel-member → hotel-saas → hotel-pms
> - **期待動作**: 会員登録→予約→ポイント加算→ランクアップの一連フロー

---

## 🚀 **7. 移行・展開**

### 7.1 既存システムからの移行

**Q7-1**: hotel-memberの既存データ移行方法は？
> ✅ **決定事項**: **段階的データ移行戦略**
> - **移行スクリプト**: SQLite → PostgreSQL自動変換スクリプト提供
> - **テーブル変更**: `groups` → `tenants`, 既存`users`構造は継承
> - **整合性チェック**: Prisma migrationsでスキーマ検証
> - **ロールバック**: 移行前SQLiteバックアップ保持

**Q7-2**: 段階的統合の進め方は？
> ✅ **決定事項**: **段階的統合ロードマップ**
> 1. **Phase 1**: hotel-common基盤 + hotel-member認証統合
> 2. **Phase 2**: hotel-saas連携（ポイント・注文連携）
> 3. **Phase 3**: hotel-pms統合（予約・滞在管理連携）

### 7.2 本番デプロイ

**Q7-3**: 本番環境の構成は？
> 🔄 **検討中事項**: **クラウドネイティブ構成**
> - **デプロイ先**: VPS or クラウド（AWS/GCP）
> - **ロードバランサー**: Nginx reverse proxy
> - **監視**: hotel-common統合ログ + Prometheus/Grafana

---

## 📅 **8. 回答依頼 - 実装済み**

### 8.1 優先順位 - 更新版
**✅ 解決済み** (hotel-member開発の基盤):
- ✅ Q1-1, Q1-2, Q1-3 (認証仕様) → **hotel-common JWT基盤統一**
- ✅ Q2-1, Q2-2, Q2-3 (DB設計) → **PostgreSQL + RLS統一設計**
- ✅ Q6-1, Q6-2 (開発環境) → **ポート固定・環境変数統一**

**🔥 即座対応** (UI Builder連携):
- Q4-1, Q4-2, Q4-3 (UI連携) → **CSS変数 + WebSocket更新**
- ✅ Q3-1, Q3-2 (API仕様) → **RESTful統一仕様決定済み**

**📋 中長期対応** (本格統合時):
- ✅ Q5-1, Q5-2, Q5-3 (WebSocket) → **hotel-common Socket.io基盤活用**
- 🔄 Q7-1, Q7-2, Q7-3 (移行・デプロイ) → **段階的移行戦略**

---

## 🔄 **9. フォローアップ**

このドキュメントへの回答をもとに：
1. ✅ **hotel-memberの実装方針確定** → **完了**
2. 🔄 **開発環境の統合設定** → **進行中**
3. 🔄 **段階的な機能実装** → **Phase 1実装中**

を進めさせていただきます。

ご質問やご相談がございましたら、随時お聞かせください。

---

## 💰 **10. 料金プラン・サブスクリプション管理**

### 10.1 プランベース機能制御

**Q10-1**: UI Builderの有料プラン制限の実装方法は？
> 🔄 **検討中事項**: **subscription_plans テーブル管理**
> ```json
> {
>   "tenant_id": "uuid",
>   "subscription_plan": "premium", // basic, premium, enterprise
>   "features": {
>     "ui_builder": true,
>     "ai_build": true,
>     "custom_templates": 8
>   },
>   "limits": {
>     "max_customizations": 10,
>     "max_ai_builds_per_month": 50
>   },
>   "billing_cycle": "monthly",
>   "next_billing_date": "2024-XX-XX"
> }
> ```

**Q10-2**: プラン変更時のダウングレード処理は？
> 🔄 **検討中事項**: **段階的機能制限**
> - **Premium → Basic**: UI設定を読み取り専用に変更、カスタマイゼーション凍結
> - **適用タイミング**: 次回ログイン時にプラン制限適用
> - **通知方法**: WebSocket即座通知 + メール通知

**Q10-3**: 課金・請求データの連携方法は？
> ⚠️ **要相談事項**: **外部課金システム統合**
> - **使用量トラッキング**: hotel-memberでのAPI呼び出し計測
> - **請求システム連携**: Stripe/Square等の決済サービス連携
> - **制限監視**: 月次使用量チェック + アラート

### 10.2 中小レジャーホテル特化機能

**Q10-4**: ターゲット特化の要件は？
> ✅ **決定事項**: **中小レジャーホテル特化設計**
> - **客室数制限**: 150室以下対象、料金体系最適化
> - **業界特化機能**: 短時間利用・時間課金対応
> - **簡易運用**: フロント業務効率化、少人数運営対応

---

## 🤖 **11. AIビルド機能統合**

### 11.1 AI API統合仕様

**Q11-1**: LLM API統合の技術仕様は？
> 🔄 **検討中事項**: **マルチLLMプロバイダー対応**
> ```python
> # 統合予定のLLM API
> api_providers = ["openai", "anthropic", "local_llm"]  
> api_key_management = "tenant毎の設定管理"
> rate_limiting = "プラン別API制限管理"
> fallback_strategy = "primary失敗時の代替プロバイダー"
> ```

**Q11-2**: 段階的実装（質問形式→フリーテキスト→画像アップ）の連携は？
> 🔄 **検討中事項**: **段階的AI機能拡張**
> - **Phase 1**: 質問形式AIビルド（プリセット選択）
> - **Phase 2**: フリーテキスト入力対応（自然言語解析）
> - **Phase 3**: 画像アップロード＋解析（Computer Vision連携）
> - **統合認証**: 各段階でhotel-common JWT認証

**Q11-3**: AI生成コンテンツの管理は？
> 🔄 **検討中事項**: **ai_build_history テーブル設計**
> ```json
> {
>   "ai_build_id": "uuid",
>   "tenant_id": "uuid",
>   "user_id": "uuid",
>   "input_type": "question_form", // question_form, free_text, image_upload
>   "input_data": {"questions": [], "answers": []},
>   "generated_css": "minified-css-string",
>   "generated_config": {"theme": {}, "layout": {}},
>   "approval_status": "pending", // pending, approved, rejected
>   "version": 1,
>   "ai_model": "gpt-4",
>   "generation_cost": 0.05
> }
> ```

### 11.2 履歴管理・ロールバック

**Q11-4**: AIビルド履歴の管理方法は？
> 🔄 **検討中事項**: **バージョニング + 履歴管理**
> - **保存期間**: 6ヶ月間（プランによる）
> - **バージョン管理**: セマンティックバージョニング（1.0.1形式）
> - **ロールバック権限**: manager以上の権限で実行可能

**Q11-5**: テンプレート管理（5-8種類）の仕様は？
> ✅ **決定事項**: **業界特化テンプレート**
> ```json
> {
>   "template_id": "modern_luxury",
>   "name": "モダンラグジュアリー",
>   "target_hotel_type": "レジャーホテル",
>   "base_config": {"colors": {}, "typography": {}, "layout": {}},
>   "customizable_elements": [
>     "primary_color", "secondary_color", "typography", "layout"
>   ],
>   "preview_url": "/templates/preview/modern_luxury.jpg",
>   "ai_optimization": "高級感重視"
> }
> ```

---

## 🏨 **12. 中小レジャーホテル業界特化**

### 12.1 業界特有の連携要件

**Q12-1**: レジャーホテル特有の予約・宿泊パターンへの対応は？
> ✅ **決定事項**: **レジャーホテル特化予約システム**
> - **短時間利用**: 休憩（3時間）vs 宿泊（12時間）の区別管理
> - **時間課金**: 時間単位料金体系対応
> - **客室回転**: リアルタイム清掃状況・回転率最適化

**Q12-2**: 業界標準システムとの連携は？
> 🔄 **検討中事項**: **既存システム連携API**
> - **既存PMS連携**: CSV/XML形式データエクスポート/インポート
> - **OTA連携**: hotel-pms経由でBooking.com、楽天トラベル等
> - **清算システム**: POS連携、会計ソフト連携

**Q12-3**: コンプライアンス・法規制対応は？
> ⚠️ **要相談事項**: **法規制対応**
> - **宿泊者名簿**: 電子化対応、警察提出機能
> - **個人情報保護**: GDPR準拠、データ保護レベル設計
> - **営業規制**: 地域別営業時間制限、年齢確認システム

### 12.2 競争力向上支援

**Q12-4**: 中小ホテルのDX化支援機能は？
> 🔄 **検討中事項**: **中小ホテル特化機能**
> - **運営効率化**: 自動チェックイン、清掃スケジュール最適化
> - **顧客満足度**: AIコンシェルジュ、パーソナライズサービス
> - **コスト削減**: 無人フロント、自動決済システム

---

## 🎯 **次のアクションプラン（hotel-member版）**

### **✅ 解決済み項目**
1. ✅ **Q1-1〜Q1-3**: 認証統合 → **hotel-common JWT基盤統一**
2. ✅ **Q2-1〜Q2-3**: DB設計 → **PostgreSQL + RLS統一設計**  
3. ✅ **Q3-1〜Q3-2**: API仕様 → **RESTful統一仕様**
4. ✅ **Q5-1〜Q5-3**: WebSocket → **hotel-common Socket.io基盤**
5. ✅ **Q6-1〜Q6-2**: 開発環境 → **ポート固定・環境変数統一**

### **🔥 即座対応必要（1週間以内）**
1. **Q4-1〜Q4-3**: UI Builder連携実装
2. **Q7-1**: SQLite → PostgreSQL移行スクリプト作成
3. **Q3-4〜Q3-5**: 連携API実装

### **⚠️ 重要事項（2週間以内）**
4. **Q10-1〜Q10-2**: 料金プラン機能制御実装
5. **Q11-1〜Q11-3**: AIビルド基盤構築
6. **Q12-1**: レジャーホテル特化機能設計

### **📋 中長期事項（1ヶ月以内）**
7. **Q11-4〜Q11-5**: AI履歴・テンプレート管理
8. **Q12-2〜Q12-4**: 業界連携・法規制対応
9. **Q7-2〜Q7-3**: 本番環境構築

---

**担当者**: hotel-member開発チーム  
**連絡先**: 統合システム管理者

**更新履歴**: 
- 2025-07-15: 初版質問書作成
- 2024年12月 (更新): 統合仕様決定により質問書を回答済み版に変更
  - ✅ hotel-common基盤統合（認証・DB・API）
  - ✅ システム間連携仕様確定
  - 🔄 UI Builder・AIビルド機能は実装段階
  - ⚠️ 料金プラン・法規制対応は要相談事項として継続 