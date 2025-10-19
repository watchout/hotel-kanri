# 統合データベース変更申請書（改訂版2）

## 申請概要

**申請日**: 2025年7月15日
**申請者**: hotel-saas開発チーム
**申請タイプ**: テーブル構造変更（カラム追加）
**対象テーブル**: staff
**優先度**: 高

## 変更内容

### 1. staffテーブルへのカラム追加

既存の`staff`テーブルに以下のカラムを追加する変更を申請します：

```sql
-- 認証に必要なカラムの追加
ALTER TABLE staff ADD COLUMN password_hash TEXT;
ALTER TABLE staff ADD COLUMN system_access JSONB;
ALTER TABLE staff ADD COLUMN base_level INTEGER DEFAULT 1;
ALTER TABLE staff ADD COLUMN last_login_at TIMESTAMP;

-- インデックスの追加（パフォーマンス向上）
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_tenant_role ON staff(tenant_id, role);
```

### 2. テスト用データの追加

```sql
-- テスト用スタッフアカウントの追加
INSERT INTO staff (
  id,
  tenant_id,
  email,
  name,
  role,
  is_active,
  password_hash,
  system_access,
  base_level,
  created_at,
  updated_at
)
VALUES
(
  'test-admin',
  'tenant-test',
  'test@example.com',
  'テスト管理者',
  'super_admin',
  true,
  '$2a$10$yCrKDqB6x5PKR.LFGUn1OeP0jUFJi2q9CwlAuVUBnUW9TFw5V.Bre', -- 'password'のハッシュ
  '["saas"]',
  5,
  NOW(),
  NOW()
),
(
  'test-prof',
  'tenant-professional',
  'professional@example.com',
  'プロフェッショナル管理者',
  'admin',
  true,
  '$2a$10$8KzS/fZVFYWJIgBXoVcTYO0mVCuWRqpHCtC9eGIkHB8A0nH1s3KAC', -- 'professional123'のハッシュ
  '["saas"]',
  4,
  NOW(),
  NOW()
),
(
  'test-eco',
  'tenant-economy',
  'economy@example.com',
  'エコノミー管理者',
  'admin',
  true,
  '$2a$10$vH4uHzDEKlZwV4ZRtcD9UOu5Eu5yQIgRjRNa3Nf7ETrN6WmXViBCe', -- 'economy123'のハッシュ
  '["saas"]',
  3,
  NOW(),
  NOW()
);
```

## 変更理由

1. **認証機能の完全実装**:
   - 現在、staffテーブルにはパスワード認証に必要な`password_hash`カラムがないため、本番環境での認証が機能しない
   - JWT認証の実装はあるが、データベースとの連携が不完全

2. **システムアクセス権限管理**:
   - `system_access`カラムを追加することで、ユーザーが複数のシステム（saas, member, pms）にアクセスする権限を管理可能に

3. **権限レベル管理**:
   - `base_level`カラムを追加することで、より詳細な権限レベル（1-5）の管理が可能に

4. **セキュリティ向上**:
   - 最終ログイン日時を記録する`last_login_at`カラムを追加し、セキュリティ監視を強化

## 現状分析

最新の調査結果から、以下の重要な不一致が確認されました：

1. **スキーマとテーブルの不一致**:
   - hotel-commonの`schema.prisma`では`User`モデルが定義され`users`テーブルにマッピングされている
   - 実際のデータベースには`users`テーブルが存在せず、代わりに`staff`テーブルが存在している

2. **現在のstaffテーブル構造**:
   ```
   - id (text, NOT NULL)
   - tenant_id (text, NOT NULL)
   - email (text, NOT NULL)
   - name (text, NOT NULL)
   - role (text, NOT NULL)
   - department (text, NULL)
   - is_active (boolean, NOT NULL)
   - created_at (timestamp, NOT NULL)
   - updated_at (timestamp, NOT NULL)
   ```

3. **データ状況**:
   - staffテーブルにはデータが存在しない（0件）
   - 外部キー制約も設定されていない

## 影響範囲

1. **hotel-saas**:
   - 認証システムが完全に機能するようになり、モックアカウントへの依存が解消される
   - JWT認証の実装とデータベースの連携が強化される

2. **hotel-member**:
   - 共通の認証基盤を使用するため、影響を受ける可能性がある
   - システムアクセス権限の管理が可能になる

3. **hotel-pms**:
   - 共通の認証基盤を使用するため、影響を受ける可能性がある
   - システムアクセス権限の管理が可能になる

## リスク評価

1. **データ整合性リスク**: 低
   - 既存のカラムには変更を加えず、新規カラムの追加のみ
   - NULLを許容する設計のため、既存の処理に影響しない

2. **パフォーマンスリスク**: 低
   - インデックスを適切に設定し、検索パフォーマンスを確保

3. **セキュリティリスク**: 低
   - パスワードは適切にハッシュ化して保存
   - 権限管理が強化され、セキュリティが向上

## テスト計画

1. **認証フローテスト**:
   - 追加したテストアカウントでのログインテスト
   - JWT生成と検証のテスト

2. **権限管理テスト**:
   - 異なる権限レベルでのアクセス制御テスト
   - システムアクセス権限に基づくアクセス制御テスト

3. **パフォーマンステスト**:
   - 認証処理のレスポンスタイム測定
   - インデックスの有効性確認

## 実装計画

1. **変更申請承認後（1日）**:
   - SQLスクリプトの実行
   - テストデータの投入

2. **認証システム適応（2日）**:
   - `login.post.ts`の修正
   - マッピングレイヤーの実装

3. **テストと検証（1日）**:
   - 認証フローの動作確認
   - 権限管理の動作確認

## 申請者連絡先

- **担当者**: hotel-saas開発チーム
- **メール**: dev-team@hotel-saas.example.com
- **内線**: 1234

## 承認フロー

1. **レビュー担当**: 統合データベース管理者
2. **承認者**: システム統括責任者
3. **実施担当**: DBエンジニア

---

**承認状況**: 申請中
