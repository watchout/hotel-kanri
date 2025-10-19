# Hotel SaaS 開発ロードマップ

## 概要
クライアント要望に応えるため、マルチテナント化を最優先で進めつつ、エコノミープラン提供とAIコンシェルジュ機能を段階的に実装する。

## 開発フェーズ

### Phase 1: マルチテナント基盤構築 (4-6週間)

#### 1.1 データベーススキーマ対応 (1-2週間)
- [ ] 全テーブルにtenantIdカラム追加
- [ ] 既存データの移行スクリプト作成
- [ ] Row Level Security (RLS) ポリシー設定
- [ ] テナント管理テーブル作成

#### 1.2 認証システム改修 (1-2週間)  
- [ ] テナント識別ミドルウェア実装
- [ ] サブドメインベース認証
- [ ] 管理画面の認証改修
- [ ] セッション管理の分離

#### 1.3 API層の分離 (1-2週間)
- [ ] テナント分離ミドルウェア
- [ ] 全APIエンドポイントの改修
- [ ] データアクセス制御の実装
- [ ] エラーハンドリング強化

### Phase 2: エコノミープラン対応 (3-4週間)

#### 2.1 テナント登録システム (1-2週間)
- [ ] 即時アカウント開設フロー
- [ ] 初期設定ウィザード
- [ ] 無料トライアル期間管理
- [ ] 自動プロビジョニング

#### 2.2 プラン制限システム (1週間)
- [ ] デバイス数制限（30台）
- [ ] 機能制限ミドルウェア
- [ ] プランアップグレード誘導
- [ ] 使用量監視

#### 2.3 Stripe決済統合 (1-2週間)
- [ ] サブスクリプション管理
- [ ] 自動課金システム
- [ ] 請求書発行
- [ ] 支払い失敗時の処理

### Phase 3: AIコンシェルジュフル実装 (3-4週間)

#### 3.1 キャラクター管理システム (1週間)
- [ ] キャラクター設定画面
- [ ] 音声・画像アップロード
- [ ] プリセットキャラクター
- [ ] カスタマイズ機能

#### 3.2 多言語対応強化 (1-2週間)
- [ ] Google Translate API統合
- [ ] 15言語対応
- [ ] 自動翻訳バックグラウンド処理
- [ ] 翻訳品質管理

#### 3.3 履歴・学習機能 (1-2週間)
- [ ] 会話履歴管理
- [ ] ホテル固有情報学習
- [ ] FAQ自動生成
- [ ] 応答品質向上

### Phase 4: 単体サービス対応 (4-6週間)

#### 4.1 スタンドアロン会員システム (2-3週間)
- [ ] 会員登録・管理機能
- [ ] ポイントシステム
- [ ] 会員特典管理
- [ ] 専用管理画面

#### 4.2 スタンドアロンPMS (2-3週間)
- [ ] 予約管理システム
- [ ] 客室管理
- [ ] 売上管理
- [ ] レポート機能

#### 4.3 モジュラー管理画面 (1週間)
- [ ] サービス別アクセス制御
- [ ] 統合ダッシュボード
- [ ] 権限管理システム
- [ ] 監査ログ

## 技術的変更箇所

### データベース変更
```sql
-- 主要テーブルの変更
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE menu_items ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE categories ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE devices ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE places ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) NOT NULL;

-- 新規テーブル
CREATE TABLE tenants (...);
CREATE TABLE subscription_plans (...);
CREATE TABLE tenant_features (...);
```

### ファイル変更一覧

#### 新規作成ファイル
- `middleware/tenant-resolver.ts` - テナント識別
- `server/utils/tenant-context.ts` - テナントコンテキスト管理
- `composables/useTenant.ts` - テナント情報管理
- `composables/usePlanFeatures.ts` - プラン機能管理
- `pages/onboarding/` - テナント登録フロー
- `server/api/v1/tenants/` - テナント管理API

#### 主要変更ファイル
- `prisma/schema.prisma` - スキーマ変更
- `server/api/v1/**/*.ts` - 全APIのテナント分離
- `middleware/admin-auth.ts` - 認証強化
- `layouts/admin.vue` - モジュラー管理画面
- `nuxt.config.ts` - サブドメイン設定

### 環境変数追加
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# テナント設定
DEFAULT_TENANT_ID=default
ENABLE_MULTITENANT=true

# サブドメイン設定
MAIN_DOMAIN=hotel-saas.com
ADMIN_SUBDOMAIN=admin
```

## リスク管理

### 技術的リスク
- **データ移行**: 既存データの安全な移行
- **パフォーマンス**: テナント分離による性能影響
- **セキュリティ**: テナント間データ漏洩防止

### ビジネスリスク
- **開発期間**: クライアント要望への対応遅延
- **機能品質**: 急速開発による品質低下
- **運用負荷**: 新システムの運用習熟

### 対策
- 段階的リリースによるリスク分散
- 十分なテスト期間の確保
- ロールバック計画の策定
- 監視・アラート体制の強化

## 成功指標

### Phase 1完了時
- [ ] 単一テナントでの完全動作
- [ ] パフォーマンス劣化なし
- [ ] セキュリティテスト通過

### Phase 2完了時
- [ ] エコノミープラン提供開始
- [ ] 自動課金システム稼働
- [ ] 無料トライアル運用開始

### Phase 3完了時
- [ ] AIコンシェルジュ完全機能
- [ ] 15言語対応完了
- [ ] プロフェッショナルプラン提供

### Phase 4完了時
- [ ] 全サービス単体提供可能
- [ ] 統合管理画面完成
- [ ] エンタープライズプラン対応

## 次期開発計画

### 拡張機能
- ホテル会計システム完全版
- 外部PMS連携
- IoTデバイス連携
- 分析・レポート機能強化

### 国際展開
- 地域別サーバー展開
- 現地法令対応
- 多通貨対応
- 現地パートナー連携 