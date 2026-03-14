# Staff/Usersテーブル不一致分析

**作成日**: 2025年8月17日  
**作成者**: システム管理チーム  
**対象**: 開発チーム・運用チーム

## 1. 現状分析

### 1.1 hotel-commonデータベースの状況

現在のhotel-commonデータベースを調査した結果、以下の状況が確認されました：

1. **テーブル構造**:
   - `staff`テーブルは存在する
   - `users`テーブルは存在しない
   - `staff`テーブルには以下のカラムがある:
     - id (text, NOT NULL)
     - tenant_id (text, NOT NULL)
     - email (text, NOT NULL)
     - name (text, NOT NULL)
     - role (text, NOT NULL)
     - department (text, NULL可)
     - is_active (boolean, NOT NULL)
     - created_at (timestamp without time zone, NOT NULL)
     - updated_at (timestamp without time zone, NOT NULL)

2. **不足カラム**:
   - `staff`テーブルには認証に必要な以下のカラムが不足している:
     - password_hash
     - failed_login_count
     - last_login_at
     - locked_until
     - system_access（hotel-saasの指摘による）
     - base_level（hotel-saasの指摘による）

3. **データ状況**:
   - `staff`テーブルにはデータが存在しない（0件）

### 1.2 Prismaスキーマの状況

Prismaスキーマ（schema.prisma）の内容は以下の通りです：

```prisma
model Staff {
  id              String    @id @default(cuid())
  tenant_id       String
  email           String
  name            String
  role            String
  department      String?
  password_hash   String?
  failed_login_count Int    @default(0)
  last_login_at   DateTime?
  locked_until    DateTime?
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@unique([tenant_id, email])
  @@index([tenant_id])
  @@index([role])
  @@index([email])
  @@map("staff")
}
```

Prismaスキーマでは`password_hash`、`failed_login_count`、`last_login_at`、`locked_until`フィールドが定義されていますが、実際のデータベースにはこれらのカラムが存在していません。

### 1.3 hotel-saasからの指摘内容

hotel-saasからの指摘によると：

1. hotel-commonの`schema.prisma`では`User`モデルが定義され`users`テーブルにマッピングされている
2. 実際のデータベースには`users`テーブルが存在せず、代わりに`staff`テーブルが存在している
3. `staff`テーブルには認証に必要な`password_hash`、`system_access`、`base_level`、`last_login_at`などのカラムが欠落している

しかし、現在のhotel-commonの`schema.prisma`には`User`モデルは定義されておらず、`Staff`モデルのみが定義されています。

## 2. 不一致の原因

この不一致の考えられる原因は以下の通りです：

1. **環境の違い**:
   - hotel-saasが参照している環境とhotel-commonの環境が異なる可能性がある
   - 開発環境と本番環境でスキーマが異なる可能性がある

2. **スキーマ更新の不整合**:
   - 過去に`User`モデルから`Staff`モデルへの移行が行われたが、すべての環境で完全に適用されていない可能性がある
   - マイグレーションが一部の環境でのみ実行された可能性がある

3. **コード参照の問題**:
   - hotel-saasのコードが古いスキーマ定義を参照している可能性がある
   - 認証システムが`User`モデルを想定して実装されている可能性がある

## 3. 対応方針

### 3.1 短期対応

1. **スキーマの整合性確保**:
   - 作成済みのマイグレーションファイル（`20250817000000_sync_schema_with_database/migration.sql`）を適用し、`staff`テーブルに必要なカラムを追加する
   - 必要に応じて`system_access`、`base_level`カラムも追加する

2. **hotel-saasとの連携確認**:
   - hotel-saasチームと連携し、認証システムが参照しているスキーマとテーブルを確認する
   - 必要に応じて、hotel-saasの認証システムが`staff`テーブルを使用するように修正する

3. **テストアカウントの作成**:
   - `staff`テーブルにテスト用のアカウントを作成し、認証システムが正常に動作するか確認する

### 3.2 中期対応

1. **認証システムの統一**:
   - 全システム（hotel-common, hotel-member, hotel-pms, hotel-saas）で共通の認証システムを実装する
   - JWTベースの認証システムを完全に実装し、すべてのシステムで統一する

2. **スキーマ管理の強化**:
   - スキーマ検証の自動化を実装し、環境間の不一致を検出する
   - マイグレーション適用状況を監視するシステムを導入する

### 3.3 長期対応

1. **統合認証システムの構築**:
   - マイクロサービスアーキテクチャに適した認証サービスを構築する
   - OAuth2.0やOpenID Connectなどの標準プロトコルを採用する

2. **データベース構造の最適化**:
   - ユーザー管理とスタッフ管理の関係を整理し、最適なデータモデルを設計する
   - 権限管理システムを改善し、柔軟なアクセス制御を実現する

## 4. 結論

現在のhotel-commonデータベースには`staff`テーブルのみが存在し、`users`テーブルは存在しません。hotel-saasからの指摘は、異なる環境または古いスキーマ定義に基づいている可能性があります。

短期的には、`staff`テーブルに必要なカラムを追加し、認証システムが`staff`テーブルを使用するように修正することが最も現実的な対応策です。中長期的には、認証システムの統一とスキーマ管理の強化が必要です。

## 5. 次のステップ

1. マイグレーションファイルを適用し、`staff`テーブルに必要なカラムを追加する
2. hotel-saasチームと連携し、認証システムの整合性を確保する
3. テストアカウントを作成し、認証システムのテストを実施する
4. スキーマ検証の自動化を実装し、環境間の不一致を検出する仕組みを構築する
