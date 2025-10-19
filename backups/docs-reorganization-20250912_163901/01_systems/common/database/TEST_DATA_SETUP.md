# テスト用データセットアップガイド

## 概要

このドキュメントでは、開発環境でのテスト用データの作成方法について説明します。統合データベース（hotel_unified_db）のデータが消失した場合や、新しい開発環境をセットアップする場合に、このガイドを参照してください。

## 1. データ消失の原因

マイグレーションエラーの調査により、以下の問題が確認されました：

1. Prismaマイグレーションが失敗している
   - `20250805000000_add_response_tree_sessions`: `DeviceRoom`テーブルが存在しないエラー
   - `20250809000000_add_is_deleted_to_order`: `Order`テーブルが存在しないエラー
   - `20250810000000_add_page_models`: `pages`テーブルが既に存在するエラー

2. マイグレーション失敗後、データベースが不完全な状態になっている可能性があります

3. 完全統合モードへの移行時に、データベースが初期化された可能性があります

## 2. テスト用データセットアップ手順

### 2.1 データベースのリセット

既存のデータをクリアして、クリーンな状態からスタートします：

```bash
# データベースをリセット
npm run db:reset
```

このコマンドは以下のテーブルをクリアします：
- DeviceRoom
- TenantSystemPlan
- SystemPlanRestrictions
- staff（存在する場合）
- Tenant

### 2.2 テスト用データの作成

基本的なテスト用データをデータベースに作成します：

```bash
# テスト用データを作成
npm run db:seed-test
```

このコマンドは以下のデータを作成します：
- テナント（デフォルトテナントとテスト用テナント）
- デバイスルーム（各テナントに複数のデバイス）
- スタッフ（各テナントに管理者とスタッフ）
- システムプラン関連のデータ

### 2.3 リセットとシードを一度に実行

データベースのリセットとテスト用データの作成を一度に行うには：

```bash
# リセットとシードを一度に実行
npm run db:reset-and-seed
```

## 3. 作成されるテスト用データ

### 3.1 テナント

| ID | 名前 | ドメイン | プラン |
|----|------|---------|--------|
| default | デフォルトテナント | default.omotenasuai.com | premium |
| test | テスト用テナント | test.omotenasuai.com | basic |

### 3.2 デバイス

#### デフォルトテナント

| ID | 部屋ID | 部屋名 | デバイスID | デバイスタイプ | ステータス |
|----|-------|-------|-----------|--------------|----------|
| 1 | room101 | デラックスルーム101 | device001 | tablet | active |
| 2 | room102 | スイートルーム102 | device002 | tablet | active |
| 3 | room103 | スタンダードルーム103 | device003 | kiosk | maintenance |

#### テスト用テナント

| ID | 部屋ID | 部屋名 | デバイスID | デバイスタイプ | ステータス |
|----|-------|-------|-----------|--------------|----------|
| 4 | test101 | テストルーム101 | test001 | tablet | active |
| 5 | test102 | テストルーム102 | test002 | kiosk | inactive |

### 3.3 スタッフ

| ID | テナントID | メール | ロール | 名前 |
|----|-----------|-------|-------|------|
| staff1 | default | admin@omotenasuai.com | admin | 管理者 |
| staff2 | default | staff@omotenasuai.com | staff | スタッフ |
| staff3 | test | test@omotenasuai.com | admin | テスト管理者 |

※ すべてのスタッフのパスワードは `password` です

### 3.4 システムプラン

#### プラン制限

| ID | 名前 | 最大ユーザー数 | 最大デバイス数 | 機能 |
|----|------|--------------|--------------|------|
| basic | ベーシックプラン | 5 | 10 | basic_analytics, standard_support |
| premium | プレミアムプラン | 20 | 50 | advanced_analytics, premium_support, ai_concierge |

#### テナントプラン

| ID | テナントID | プランID | 有効期限 |
|----|-----------|---------|---------|
| default-premium | default | premium | 1年後 |
| test-basic | test | basic | 1年後 |

## 4. テスト用データの確認

データベースに作成されたテスト用データを確認するには：

```bash
# テナントの確認
psql -U hotel_app -d hotel_unified_db -c "SELECT * FROM \"Tenant\";"

# デバイスの確認
psql -U hotel_app -d hotel_unified_db -c "SELECT * FROM device_rooms;"

# スタッフの確認
psql -U hotel_app -d hotel_unified_db -c "SELECT * FROM staff;"

# システムプランの確認
psql -U hotel_app -d hotel_unified_db -c "SELECT * FROM \"SystemPlanRestrictions\";"
psql -U hotel_app -d hotel_unified_db -c "SELECT * FROM \"TenantSystemPlan\";"
```

## 5. 注意事項

- このスクリプトは開発環境専用です。本番環境では絶対に実行しないでください。
- `NODE_ENV=production` の場合、データベースリセットスクリプトは実行されません。
- スクリプトの実行前にデータベースのバックアップを取得することをお勧めします。
- マイグレーションエラーが解決されていない場合、一部のテーブル作成が失敗する可能性があります。

## 6. トラブルシューティング

### 6.1 スタッフテーブルが存在しない

スタッフテーブルが存在しない場合、スタッフデータの作成はスキップされます。この場合、以下のコマンドでスタッフテーブルを手動で作成できます：

```sql
CREATE TABLE staff (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id)
);
```

### 6.2 その他のエラー

その他のエラーが発生した場合は、エラーメッセージを確認し、必要に応じてデータベース管理者に相談してください。
