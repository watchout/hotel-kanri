# データベーススキーマドキュメント

**作成日**: 2025年8月17日  
**バージョン**: 1.0  
**対象**: 開発チーム・運用チーム

## 1. 概要

本ドキュメントは、hotel-commonプロジェクトで使用されているデータベーススキーマの完全な構造を説明するものです。データベースはPostgreSQLを使用し、Prisma ORMを通じてアクセスされます。

## 2. 主要モデル

### 2.1 テナント関連

#### Tenant
マルチテナントシステムの基本となるテナント情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| name | String | テナント名 |
| domain | String? | テナント固有のドメイン（オプション、一意） |
| status | String | テナントのステータス（デフォルト: "active"） |
| contactEmail | String? | 連絡先メールアドレス |
| createdAt | DateTime | 作成日時 |
| features | String[] | 有効な機能のリスト |
| planType | String? | プランタイプ |
| settings | Json? | テナント設定（JSON形式） |

**リレーション**:
- `pages`: Pageモデルへの1対多リレーション
- `TenantSystemPlan`: TenantSystemPlanモデルへの1対多リレーション
- `service_usage_statistics`: service_usage_statisticsモデルへの1対多リレーション
- `tenant_services`: tenant_servicesモデルへの1対多リレーション

#### TenantSystemPlan
テナントのシステムプラン情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| tenantId | String | テナントID（外部キー） |
| systemType | String | システムタイプ |
| planId | String | プランID（外部キー） |
| startDate | DateTime | 開始日 |
| endDate | DateTime? | 終了日（オプション） |
| isActive | Boolean | アクティブ状態 |
| monthlyPrice | Int | 月額料金 |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

**リレーション**:
- `SystemPlanRestrictions`: SystemPlanRestrictionsモデルへの多対1リレーション
- `Tenant`: Tenantモデルへの多対1リレーション

### 2.2 スタッフ関連

#### Staff
システムを利用するスタッフ情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| tenant_id | String | テナントID |
| email | String | メールアドレス |
| name | String | 名前 |
| role | String | 役割 |
| department | String? | 部署（オプション） |
| password_hash | String? | パスワードハッシュ（オプション） |
| failed_login_count | Int | ログイン失敗回数 |
| last_login_at | DateTime? | 最終ログイン日時（オプション） |
| locked_until | DateTime? | アカウントロック期限（オプション） |
| is_active | Boolean | アクティブ状態 |
| created_at | DateTime | 作成日時 |
| updated_at | DateTime | 更新日時 |

**インデックス**:
- `tenant_id`: テナントIDでのインデックス
- `role`: 役割でのインデックス
- `email`: メールアドレスでのインデックス

**ユニーク制約**:
- `[tenant_id, email]`: テナントごとのメールアドレスの一意性

#### Admin
システム管理者情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| email | String | メールアドレス（一意） |
| username | String | ユーザー名（一意） |
| display_name | String | 表示名 |
| password_hash | String | パスワードハッシュ |
| admin_level | AdminLevel | 管理者レベル（列挙型） |
| accessible_group_ids | String[] | アクセス可能なグループID |
| accessible_chain_ids | String[] | アクセス可能なチェーンID |
| accessible_tenant_ids | String[] | アクセス可能なテナントID |
| last_login_at | DateTime? | 最終ログイン日時（オプション） |
| login_attempts | Int | ログイン試行回数 |
| locked_until | DateTime? | アカウントロック期限（オプション） |
| totp_secret | String? | TOTP秘密鍵（オプション） |
| totp_enabled | Boolean | TOTP有効状態 |
| created_at | DateTime | 作成日時 |
| updated_at | DateTime | 更新日時 |
| created_by | String? | 作成者（オプション） |
| is_active | Boolean | アクティブ状態 |

**リレーション**:
- `logs`: AdminLogモデルへの1対多リレーション

### 2.3 ページ管理

#### Page
テナントごとのページ情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| Id | String | 主キー |
| TenantId | String | テナントID（外部キー） |
| Slug | String | ページスラッグ |
| Title | String | ページタイトル |
| Html | String? | HTMLコンテンツ（オプション） |
| Css | String? | CSSスタイル（オプション） |
| Content | String? | コンテンツ（オプション） |
| Template | String? | テンプレート（オプション） |
| IsPublished | Boolean | 公開状態 |
| PublishedAt | DateTime? | 公開日時（オプション） |
| Version | Int | バージョン |
| CreatedAt | DateTime | 作成日時 |
| UpdatedAt | DateTime | 更新日時 |

**リレーション**:
- `History`: PageHistoryモデルへの1対多リレーション
- `Tenant`: Tenantモデルへの多対1リレーション

**インデックス**:
- `TenantId`: テナントIDでのインデックス
- `Slug`: スラッグでのインデックス
- `IsPublished`: 公開状態でのインデックス

**ユニーク制約**:
- `[TenantId, Slug]`: テナントごとのスラッグの一意性

### 2.4 キャンペーン管理

#### Campaign
マーケティングキャンペーン情報を管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| tenantId | String | テナントID |
| code | String | キャンペーンコード（一意） |
| status | CampaignStatus | キャンペーンステータス（列挙型） |
| displayType | CampaignDisplayType | 表示タイプ（列挙型） |
| startDate | DateTime? | 開始日（オプション） |
| endDate | DateTime? | 終了日（オプション） |
| priority | Int | 優先度 |
| ctaType | CampaignCtaType | CTAタイプ（列挙型） |
| ctaAction | String? | CTAアクション（オプション） |
| ctaLabel | String? | CTAラベル（オプション） |
| discountType | String? | 割引タイプ（オプション） |
| discountValue | Decimal? | 割引値（オプション） |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |
| dayRestrictions | Json? | 曜日制限（オプション） |
| description | String? | 説明（オプション） |
| displayPriority | Int | 表示優先度 |
| maxUsageCount | Int? | 最大使用回数（オプション） |
| name | String | キャンペーン名 |
| timeRestrictions | Json? | 時間制限（オプション） |
| welcomeSettings | Json? | ウェルカム設定（オプション） |

**リレーション**:
- `categories`: CampaignCategoryRelationモデルへの1対多リレーション
- `items`: CampaignItemモデルへの1対多リレーション
- `translations`: CampaignTranslationモデルへの1対多リレーション
- `usageLogs`: CampaignUsageLogモデルへの1対多リレーション

### 2.5 AIコンシェルジュ

#### ResponseTree
対話型レスポンスツリーを管理します。

| フィールド | 型 | 説明 |
|----------|------|------|
| id | String | 主キー |
| tenantId | String | テナントID |
| name | String | 名前 |
| description | String? | 説明（オプション） |
| isPublished | Boolean | 公開状態 |
| publishedAt | DateTime? | 公開日時（オプション） |
| version | Int | バージョン |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |
| isActive | Boolean | アクティブ状態 |

**リレーション**:
- `nodes`: ResponseNodeモデルへの1対多リレーション
- `sessions`: ResponseTreeSessionモデルへの1対多リレーション
- `versions`: ResponseTreeVersionモデルへの1対多リレーション

## 3. データベース設計原則

### 3.1 命名規則

- **モデル名**: パスカルケース（例: `Staff`, `Campaign`）
- **フィールド名**: キャメルケース（例: `createdAt`, `tenantId`）
- **テーブル名**: スネークケース（例: `staff`, `campaign_items`）
- **マッピング**: `@@map`ディレクティブを使用してモデル名とテーブル名をマッピング

### 3.2 インデックス戦略

- 頻繁に検索されるフィールドにはインデックスを設定
- 外部キーには常にインデックスを設定
- 複合インデックスは慎重に設計

### 3.3 リレーション管理

- カスケード削除は慎重に使用
- 多対多リレーションには中間テーブルを使用
- 外部キー制約を適切に設定

## 4. マイグレーション管理

### 4.1 マイグレーションファイルの命名

マイグレーションファイルは以下の形式で命名します：

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

例: `20250817000000_sync_schema_with_database.sql`

### 4.2 マイグレーションの適用

マイグレーションは以下のコマンドで適用します：

```bash
npx prisma migrate dev --name <migration_name>
```

本番環境では以下のコマンドを使用します：

```bash
npx prisma migrate deploy
```

### 4.3 マイグレーションの注意点

- 破壊的変更は避ける
- データ損失が発生する可能性のある変更は慎重に行う
- ロールバック戦略を常に考慮する

## 5. セキュリティ考慮事項

### 5.1 パスワード管理

- パスワードは常にハッシュ化して保存
- パスワードハッシュには強力なアルゴリズム（bcrypt, PBKDF2など）を使用
- ソルトを適切に使用

### 5.2 アクセス制御

- 権限レベルに基づくアクセス制御
- テナント間のデータ分離
- 最小権限の原則

## 6. パフォーマンス最適化

### 6.1 インデックス

- 検索パフォーマンスのためのインデックス
- 複合インデックスの適切な設計
- インデックスのオーバーヘッドの考慮

### 6.2 クエリ最適化

- N+1問題の回避
- 効率的なJOINの使用
- 大量データの取得時のページネーション

## 7. 今後の課題

### 7.1 スキーマ検証の自動化

- CI/CDパイプラインにスキーマ検証を追加
- 定期的なスキーマとデータベースの整合性チェック
- 不一致検出時の自動アラート

### 7.2 ドキュメントの自動生成

- スキーマからドキュメントを自動生成するツールの導入
- 変更履歴の自動記録
- ERD図の自動更新

## 8. 参考リソース

- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [PostgreSQLドキュメント](https://www.postgresql.org/docs/)
- [データベース安全性ルール](./DATABASE_SAFETY_RULES.md)
- [スキーマ更新レポート](./SCHEMA_UPDATE_2025_08_15.md)
