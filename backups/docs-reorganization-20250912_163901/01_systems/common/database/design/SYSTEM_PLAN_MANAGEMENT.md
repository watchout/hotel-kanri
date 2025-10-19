# システム別プラン管理設計書

## 1. 概要

本設計書は、ホテル統合システムにおける各サブシステム（AIコンシェルジュ、PMS、CRM）ごとのプラン管理機能の設計について記述します。

## 2. 背景と目的

### 背景

現在のシステムでは、テナントに対して単一のプラン（`planType`, `planCategory`）が設定されていますが、実際には各サブシステム（saas, pms, member）ごとに異なるプランを持つ必要があります。また、業態（一般ホテル向け、レジャー向け、海外向け）によっても異なるプラン体系が必要です。

### 目的

- 各サブシステム（saas, pms, member）ごとに独立したプラン管理を実現する
- 業態別（一般ホテル向け、レジャー向け、海外向け）のプラン設定を可能にする
- テナントごとの利用システムとプランを明確に管理する
- 将来的なプラン変更や新システム追加に柔軟に対応できる設計とする

## 3. データベース設計

### 3.1 新規テーブル

#### SystemPlanRestrictions

システム別のプラン制限を管理するテーブル

| フィールド名 | 型 | 説明 |
|-------------|------|------|
| id | String | 主キー |
| systemType | String | システム種別 ("saas", "pms", "member") |
| businessType | String | 業態種別 ("general", "leisure", "overseas") |
| planType | String | プラン種別 ("economy", "professional", "enterprise", "ultimate") |
| planCategory | String | プランカテゴリ |
| monthlyPrice | Int | 月額料金 |
| maxDevices | Int | 最大デバイス数 |
| additionalDeviceCost | Int | 追加デバイス料金 |
| enableAiConcierge | Boolean | AIコンシェルジュ機能有効化 |
| enableMultilingual | Boolean | 多言語機能有効化 |
| maxMonthlyOrders | Int | 月間最大注文数 |
| maxMonthlyAiRequests | Int | 月間最大AIリクエスト数 |
| maxStorageGB | Float | 最大ストレージ容量 (GB) |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

#### TenantSystemPlan

テナントとシステムプランの関連付けを管理するテーブル

| フィールド名 | 型 | 説明 |
|-------------|------|------|
| id | String | 主キー |
| tenantId | String | テナントID (外部キー) |
| systemType | String | システム種別 ("saas", "pms", "member") |
| planId | String | プランID (外部キー) |
| startDate | DateTime | 開始日 |
| endDate | DateTime? | 終了日 (null=無期限) |
| isActive | Boolean | アクティブ状態 |
| monthlyPrice | Int | 月額料金（契約時点） |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

#### DatabaseChangeLog

データベース変更履歴を記録するテーブル

| フィールド名 | 型 | 説明 |
|-------------|------|------|
| id | Int | 主キー (自動採番) |
| changeType | String | 変更種別 |
| description | String | 変更内容説明 |
| details | Json? | 詳細情報 |
| createdBy | String? | 作成者 |
| createdAt | DateTime | 作成日時 |

### 3.2 既存テーブルの変更

#### Tenant

| フィールド名 | 変更内容 |
|-------------|--------|
| planType | 従来のプラン（下位互換性のため残す） |
| planCategory | 従来のプラン（下位互換性のため残す） |
| monthlyPrice | 従来の料金（下位互換性のため残す） |
| TenantSystemPlan | 新しいリレーション追加 |

#### PlanRestrictions

従来のプラン制限テーブル。新システムでは使用しないが、下位互換性のために残します。

## 4. リレーションシップ

```
Tenant 1--* TenantSystemPlan *--1 SystemPlanRestrictions
```

- 1つのテナントは複数のシステムプランを持つことができる
- 1つのシステムプランは複数のテナントに関連付けられる
- 1つのテナントにつき、各システム種別で1つのアクティブなプランのみ持つことができる

## 5. インデックス

### SystemPlanRestrictions
- `@@unique([systemType, businessType, planType, planCategory])`

### TenantSystemPlan
- `@@index([tenantId])`
- `@@index([systemType])`
- `@@index([planId])`
- `@@index([isActive])`
- `@@unique([tenantId, systemType], where: isActive = true)`

### DatabaseChangeLog
- `@@index([changeType])`
- `@@index([createdAt])`

## 6. マイグレーション

マイグレーションファイル: `prisma/migrations/20250731163216_add_system_plan_management/migration.sql`

## 7. 利用例

### 例1: 複数システムの利用

あるテナントが以下のシステムとプランを利用している場合：
- AIコンシェルジュ: レジャー向けプロフェッショナル
- CRM: 一般ホテル向けエコノミー

TenantSystemPlanテーブルには2つのレコードが作成され、それぞれが対応するSystemPlanRestrictionsを参照します。

### 例2: プラン変更

テナントがAIコンシェルジュのプランをプロフェッショナルからエンタープライズにアップグレードする場合：
1. 既存のTenantSystemPlanレコードの`isActive`をfalseに設定し、`endDate`を設定
2. 新しいTenantSystemPlanレコードを作成し、新しいプランIDを設定

## 8. 今後の拡張性

- 各システム固有の機能制限の追加
- プラン変更履歴の詳細な管理
- 料金計算ロジックの拡張
- 請求管理との連携

## 9. 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|----------|--------|
| 2025/07/31 | 1.0 | 初版作成 | システム |