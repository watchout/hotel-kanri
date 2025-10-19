# 📐 SSOT作成プロンプト - Phase 1（基盤SSOT）

**対象**: Phase 1の6件のSSOT作成  
**期間**: 2週間  
**担当**: Iza、Sun、Luna  
**最終更新**: 2025-10-07  
**バージョン**: 2.0.0（120点満点ガイド追加）

---

## 🎯 重要: 120点満点を目指す

このガイドは、**多文化おもてなしAIシステムのSSOT作成**で得た知見を反映しています。

**目標**: 全てのSSOTを**120点満点**で作成する

- **100点**: 基本要件（概要、DB、API、アーキテクチャ等）
- **+20点**: 詳細実装手順書、テスト戦略、デプロイ戦略、ロールバック手順

**参考SSOT**:
- `SSOT_MULTILINGUAL_SYSTEM.md` (v1.1.0)
- `SSOT_MULTICULTURAL_AI.md` (v1.1.0) - 3,251行の完全ドキュメント

---

## 🎯 Phase 1で作成するSSO

1. **SSOT_SAAS_SUPER_ADMIN.md**（2日・Iza）
2. **SSOT_ADMIN_SYSTEM_LOGS.md**（2日・Iza）
3. **SSOT_ADMIN_BILLING.md**（2日・Luna）
4. **SSOT_SAAS_PERMISSION_SYSTEM.md**（3日・Iza）
5. **SSOT_SAAS_MEDIA_MANAGEMENT.md**（2日・Sun）
6. **SSOT_SAAS_PAYMENT_INTEGRATION.md**（2日・Iza）

---

## 📋 SSOT作成手順（全SSOT共通）

### Phase 0: 準備

1. **必須ドキュメント読み込み**
   ```
   /Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md
   /Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md
   /Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md
   ```

2. **既存SSOT読み込み**（整合性確保のため）
   ```
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md
   ```

3. **本番同等ルール確認**
   ```
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md
   ```

### Phase 1-3: 実装調査・差分分析

**実行内容**: `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`の手順に従う

1. 既存ドキュメント読み込み
2. 実装ファイル読み込み
3. ドキュメント・実装の差異分析
4. 本番同等性チェック

### Phase 4-7: SSOT記述・レビュー

1. SSOT記述（正しい仕様を定義）
2. 必須要件・問題予防を明記
3. 既存SSOTとの整合性確認
4. 最終チェック

---

## 🎯 120点満点のSSOT作成ガイド

### 100点（基本要件）

以下の要素を**必ず**含めること：

- ✅ **概要・目的**
- ✅ **データベース設計**（Prismaスキーマ付き）
- ✅ **API仕様**（hotel-common + hotel-saas）
- ✅ **アーキテクチャ設計**（システム構成図）
- ✅ **フロントエンド実装**（Composable、ページ、コンポーネント）
- ✅ **既存実装状況**
- ✅ **マイグレーション計画**
- ✅ **他機能実装時の必須ルール**
- ✅ **実装チェックリスト**

### +20点（追加価値）

以下を追加すると**120点満点**になる：

#### 1. 📝 詳細実装手順書（+10点）

**Phase別のステップバイステップ手順**を記載：

```markdown
## 📝 詳細実装手順書

### Phase 0: 基盤整備（X週間）

#### Step 0-1: 実装前提条件チェック
- チェックリスト形式
- 必要な環境・ツール・権限

#### Step 0-2: データベーステーブル作成
- **所要時間**: X時間
- **作業ディレクトリ**: 絶対パス
- **実行コマンド**: コピペ可能
- **検証方法**: 期待結果付き

#### Step 0-3: [次のステップ]
...
```

**重要ポイント**:
- 各ステップに**所要時間**を明記
- **実行可能なコマンド**を記載（コピペで動く）
- **検証方法**と**期待結果**を明記
- **作業ディレクトリ**を絶対パスで指定

#### 2. 🧪 テスト戦略（+5点）

**包括的なテスト手順**を記載：

```markdown
## 🧪 テスト戦略

### 単体テスト（Unit Tests）
- **対象**: 各メソッド・関数
- **ツール**: Jest / Vitest
- **カバレッジ目標**: 80%以上
- **テストケース例**: 実行可能なコード

### 統合テスト（Integration Tests）
- **対象**: API + DB + Redis
- **ツール**: Supertest
- **テストケース例**: 実行可能なコード

### E2Eテスト（End-to-End Tests）
- **対象**: フロントエンド + バックエンド + DB
- **ツール**: Playwright / Cypress
- **テストケース例**: 実行可能なコード

### パフォーマンステスト
- **ツール**: Apache Bench / k6
- **目標値**: 応答時間、スループット
```

#### 3. 🚀 デプロイ戦略（+3点）

**環境別デプロイ手順**を記載：

```markdown
## 🚀 デプロイ戦略

### 開発環境デプロイ
- 前提条件チェックリスト
- 実行コマンド
- 動作確認手順

### ステージング環境デプロイ
- マイグレーション手順
- デプロイコマンド
- 動作確認手順

### 本番環境デプロイ
- バックアップ手順
- メンテナンスモード制御
- デプロイ手順（ステップバイステップ）
- 動作確認手順
- 監視確認
```

#### 4. 🔙 ロールバック手順（+2点）

**緊急時の復旧手順**を記載：

```markdown
## 🔙 ロールバック手順

### 緊急ロールバック（5分以内）
- トリガー条件
- 実行コマンド
- 検証手順

### 段階的ロールバック（30分以内）
- トリガー条件
- 問題特定方法
- 修正・再デプロイ手順

### データベースロールバック
- マイグレーション巻き戻し手順
- データ復旧手順
```

---

## 📚 参考SSOT（120点満点の例）

以下のSSOTは120点満点で作成されています。参考にしてください：

- **SSOT_MULTILINGUAL_SYSTEM.md** (v1.1.0)
  - 多言語化システムの完全仕様
  - 詳細実装手順、テスト戦略、デプロイ戦略を含む

- **SSOT_MULTICULTURAL_AI.md** (v1.1.0)
  - 多文化おもてなしAIシステムの完全仕様
  - Phase 0-6の詳細実装手順、包括的テスト戦略、デプロイ・ロールバック手順を含む
  - 3,251行の完全ドキュメント

**これらのSSOTを読んで、構造と記載レベルを理解してください。**

---

## ✅ 120点満点チェックリスト

SSOT作成完了前に、以下を確認してください：

### 基本要件（100点）
- [ ] 概要・目的が明確
- [ ] データベース設計（Prismaスキーマ付き）
- [ ] API仕様（hotel-common + hotel-saas）
- [ ] アーキテクチャ設計（システム構成図）
- [ ] フロントエンド実装
- [ ] 既存実装状況
- [ ] マイグレーション計画
- [ ] 他機能実装時の必須ルール
- [ ] 実装チェックリスト

### 追加価値（+20点）
- [ ] 詳細実装手順書（Phase別、ステップバイステップ）
- [ ] 各ステップに所要時間を明記
- [ ] 実行可能なコマンド（コピペで動く）
- [ ] 検証方法と期待結果
- [ ] テスト戦略（単体・統合・E2E・パフォーマンス）
- [ ] テストケース例（実行可能なコード）
- [ ] デプロイ戦略（開発・ステージング・本番）
- [ ] ロールバック手順（緊急・段階的・DB）

### 品質チェック
- [ ] 想像・推測ゼロ（全て実装・ドキュメントベース）
- [ ] 実行可能なコマンド（コピペで動く）
- [ ] 検証可能（期待結果付き）
- [ ] 既存SSOTとの整合性
- [ ] 本番同等性（環境分岐なし）

---

## 🔍 SSOT 1: SSOT_SAAS_SUPER_ADMIN.md

**担当**: Iza  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/super-admin/
  ├─ index.vue
  ├─ dashboard.vue
  ├─ analytics.vue
  ├─ security.vue
  └─ settings.vue

/Users/kaneko/hotel-saas/server/api/v1/admin/super-admin/
  （存在する場合）
```

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/common/super-admin.routes.ts
  （存在する場合）

/Users/kaneko/hotel-common/prisma/schema.prisma
  （Tenantテーブル、SystemPlanRestrictionsテーブル等）
```

### 確認項目

- [ ] スーパーアドミン機能の実装状況
- [ ] 代理店管理機能
- [ ] テナント管理機能
- [ ] AIモデル管理機能
- [ ] 料金設定機能
- [ ] プラン制限機能
- [ ] 権限チェック機構

### SSOT記載内容

1. **概要**
   - スーパーアドミン機能の目的
   - 適用範囲
   - 技術スタック

2. **機能詳細**
   - 代理店管理（CRUD）
   - テナント管理（CRUD）
   - AIモデル管理
   - 料金設定
   - プラン制限

3. **API仕様**
   - エンドポイント一覧
   - リクエスト・レスポンス
   - 認証・認可

4. **データベース設計**
   - Tenantテーブル
   - SystemPlanRestrictionsテーブル
   - TenantSystemPlanテーブル

5. **権限管理**
   - スーパーアドミン専用機能
   - アクセス制御

6. **セキュリティ**
   - 監査ログ
   - アクセス制限

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_SUPER_ADMIN.md
```

---

## 🔍 SSOT 2: SSOT_ADMIN_SYSTEM_LOGS.md

**担当**: Iza  
**優先度**: 🔴 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/logs/
  ├─ index.vue
  ├─ auth.vue
  ├─ security.vue
  ├─ ai.vue
  ├─ billing.vue
  └─ device.vue

/Users/kaneko/hotel-saas/server/api/v1/admin/logs/
  （存在する場合）
```

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/common/logs.routes.ts
  （存在する場合）

/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ AuthLogs
  ├─ SecurityLogs
  ├─ AiOperationLogs
  ├─ BillingLogs
  └─ DeviceUsageLogs
```

### 確認項目

- [ ] 統合ログ管理の実装状況
- [ ] 認証ログ
- [ ] セキュリティログ
- [ ] AIログ
- [ ] 課金ログ
- [ ] デバイスログ
- [ ] ログ検索・フィルタ機能

### SSOT記載内容

1. **概要**
   - システムログ管理の目的
   - ログの種類
   - 技術スタック

2. **ログ種別**
   - 認証ログ（AuthLogs）
   - セキュリティログ（SecurityLogs）
   - AIログ（AiOperationLogs）
   - 課金ログ（BillingLogs）
   - デバイスログ（DeviceUsageLogs）
   - 運用ログ（OperationLogs）

3. **API仕様**
   - ログ取得API
   - ログ検索API
   - ログフィルタAPI

4. **データベース設計**
   - 各ログテーブルの詳細
   - インデックス設計
   - パーティショニング

5. **ログ保持期間**
   - 認証ログ: 1年
   - セキュリティログ: 3年
   - AIログ: 6ヶ月
   - 課金ログ: 7年
   - デバイスログ: 1年

6. **セキュリティ**
   - ログ改ざん防止
   - アクセス制限

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_SYSTEM_LOGS.md
```

---

## 🔍 SSOT 3: SSOT_ADMIN_BILLING.md

**担当**: Luna  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/front-desk/
  ├─ billing.vue
  └─ accounting.vue

/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/
  ├─ billing.post.ts
  ├─ accounting.get.ts
  └─ billing-settings.get.ts
```

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/common/billing.routes.ts
  （存在する場合）

/Users/kaneko/hotel-common/prisma/schema.prisma
  （請求関連テーブル）
```

### 確認項目

- [ ] 請求管理の実装状況
- [ ] 会計管理機能
- [ ] 売上管理機能
- [ ] 領収書発行機能
- [ ] 請求書発行機能
- [ ] 決済方法管理

### SSOT記載内容

1. **概要**
   - 請求管理の目的
   - 適用範囲
   - 技術スタック

2. **機能詳細**
   - 請求作成
   - 会計管理
   - 売上管理
   - 領収書発行
   - 請求書発行

3. **API仕様**
   - 請求作成API
   - 会計取得API
   - 領収書発行API

4. **データベース設計**
   - 請求テーブル
   - 会計テーブル
   - 決済方法テーブル

5. **決済連携**
   - 決済方法（現金、クレジットカード等）
   - 決済ステータス管理

6. **セキュリティ**
   - 請求データの暗号化
   - アクセス制限

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_BILLING.md
```

---

## 🔍 SSOT 4: SSOT_SAAS_PERMISSION_SYSTEM.md

**担当**: Iza  
**優先度**: 🟡 High  
**工数**: 3日（未実装のため設計含む）

### 調査対象

#### 既存実装（部分的）
```
/Users/kaneko/hotel-saas/middleware/admin-auth.ts
  （ロールチェックの基本実装）

/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts
  （権限チェックメソッド）

/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ staff_tenant_memberships（role, level, permissions）
```

### 確認項目

- [ ] 現在の権限チェック実装
- [ ] ロール定義
- [ ] 権限レベル定義
- [ ] 権限チェック機構

### SSOT記載内容

1. **概要**
   - 権限管理システムの目的
   - RBAC（Role-Based Access Control）
   - 技術スタック

2. **ロール定義**
   - owner（レベル1）
   - admin（レベル2）
   - manager（レベル3）
   - staff（レベル4）

3. **権限定義**
   - リソース別権限
   - アクション別権限
   - 権限継承

4. **API仕様**
   - 権限チェックAPI
   - ロール管理API
   - 権限付与API

5. **データベース設計**
   - staff_tenant_memberships（拡張）
   - permissions定義

6. **実装ガイド**
   - ミドルウェア実装
   - APIでの権限チェック
   - フロントエンドでの権限制御

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PERMISSION_SYSTEM.md
```

---

## 🔍 SSOT 5: SSOT_SAAS_MEDIA_MANAGEMENT.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/media/
  （存在する場合）

/Users/kaneko/hotel-saas/server/api/v1/admin/media/
  ├─ reorder.post.ts
  └─ proxy/[...path].get.ts
```

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/common/media.routes.ts
  （存在する場合）

/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ UnifiedMedia
```

### 確認項目

- [ ] メディア管理の実装状況
- [ ] 画像アップロード機能
- [ ] 動画アップロード機能
- [ ] メディア一覧・検索機能
- [ ] メディア削除機能
- [ ] メディアプロキシ機能

### SSOT記載内容

1. **概要**
   - メディア管理の目的
   - 対応メディア種別
   - 技術スタック

2. **機能詳細**
   - メディアアップロード
   - メディア一覧・検索
   - メディア削除（論理削除）
   - メディアプロキシ

3. **API仕様**
   - アップロードAPI
   - 取得API
   - 削除API
   - プロキシAPI

4. **データベース設計**
   - UnifiedMediaテーブル

5. **ストレージ**
   - ローカルストレージ
   - S3連携（将来）

6. **セキュリティ**
   - アクセス制限
   - ファイルタイプ検証
   - ファイルサイズ制限

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MEDIA_MANAGEMENT.md
```

---

## 🔍 SSOT 6: SSOT_SAAS_PAYMENT_INTEGRATION.md

**担当**: Iza  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/common/payment.routes.ts
  （存在する場合）

/Users/kaneko/hotel-common/prisma/schema.prisma
  （決済関連テーブル）
```

### 確認項目

- [ ] 決済連携の実装状況
- [ ] 決済方法管理
- [ ] 決済処理フロー
- [ ] 決済ステータス管理

### SSOT記載内容

1. **概要**
   - 決済連携の目的
   - 対応決済方法
   - 技術スタック

2. **決済方法**
   - 現金
   - クレジットカード
   - 電子マネー
   - QRコード決済

3. **API仕様**
   - 決済作成API
   - 決済確認API
   - 決済キャンセルAPI

4. **データベース設計**
   - 決済テーブル
   - 決済ステータス

5. **決済フロー**
   - 決済作成
   - 決済処理
   - 決済完了
   - 決済キャンセル

6. **セキュリティ**
   - PCI DSS準拠
   - 決済情報の暗号化

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PAYMENT_INTEGRATION.md
```

---

## ✅ SSOT作成完了チェックリスト

各SSOTで以下を確認：

### Phase 0-3: 調査完了
- [ ] 既存SSOT全読み込み完了
- [ ] 既存ドキュメント読み込み完了
- [ ] 実装ファイル読み込み完了
- [ ] 差分分析完了
- [ ] 本番同等性チェック完了

### Phase 4-7: SSOT記述完了
- [ ] 正しい仕様定義完了
- [ ] 必須要件・問題予防明記完了
- [ ] 既存SSOTとの整合性確認完了
- [ ] 最終チェック完了

### レビュー完了
- [ ] `retest_new_ssot.md`でレビュー完了
- [ ] Izaレビュー合格
- [ ] 関連ドキュメント更新完了

---

## 📝 使用方法

### このプロンプトの使い方

1. **SSOT作成開始時**
   ```
   「SSOT_SAAS_SUPER_ADMIN.mdを作成してください」
   ```

2. **このプロンプトを参照**
   ```
   /Users/kaneko/hotel-kanri/.cursor/prompts/ssot_creation_prompt_phase1.md
   の「SSOT 1」セクションを参照して作成
   ```

3. **必須ドキュメント読み込み**
   ```
   write_new_ssot.md の手順に従って作成
   ```

4. **レビュー**
   ```
   retest_new_ssot.md でレビュー
   ```

---

**作成日**: 2025年10月7日  
**管理者**: Iza（統合管理者）  
**対象Phase**: Phase 1（基盤SSOT）
