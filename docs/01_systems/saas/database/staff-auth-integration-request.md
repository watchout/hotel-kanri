# hotel-common統合データベース変更申請書

## 申請概要

| 項目 | 内容 |
|------|------|
| 申請日 | 2025年7月18日 |
| 申請者 | hotel-saasチーム |
| システム名 | hotel-saas |
| 変更種別 | スキーマ拡張 |
| 優先度 | 高 |
| 希望適用日 | 2025年7月25日 |

## 変更目的

hotel-saasシステムをhotel-common統合データベースと完全に連携させるため、認証システムの統合を実現する必要があります。現在、hotel-saasはモックアカウントを使用していますが、統合認証を実装することで、以下の効果が期待できます：

1. **セキュリティの向上**: 一元管理された認証システムによるセキュリティリスクの低減
2. **運用効率の向上**: 複数システム間でのアカウント管理の一元化
3. **ユーザー体験の向上**: シングルサインオンによる利便性の向上
4. **データ整合性の確保**: テナント情報とスタッフ情報の一貫性維持

## 現状の課題

現在、hotel-saasシステムでは以下の課題があります：

1. **モックアカウントの使用**: 開発環境でモックアカウントを使用しているため、本番環境での認証システムの整合性が保証されていない
2. **テーブル構造の不一致**: `Staff`テーブルの構造がhotel-common統合データベースと完全に一致していない
3. **カラム名の不一致**: 一部のカラム名が異なるため、クエリの互換性に問題がある
4. **パスワードハッシュの扱い**: パスワード認証の実装方法が統一されていない

## 変更内容

### 1. Staffテーブルのスキーマ調整

現在のhotel-common統合データベースの`Staff`テーブルに以下のカラムを追加または調整します：

```sql
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "system_access" JSONB DEFAULT '["saas"]';
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "base_level" INTEGER DEFAULT 1;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP;
```

### 2. インデックスの追加

パフォーマンス向上のため、以下のインデックスを追加します：

```sql
CREATE INDEX IF NOT EXISTS "idx_staff_email" ON "staff" ("email");
CREATE INDEX IF NOT EXISTS "idx_staff_tenant_id" ON "staff" ("tenant_id");
```

### 3. 既存データの移行

既存のモックアカウントを統合データベースに移行します：

```sql
INSERT INTO "staff" (
  "id",
  "email",
  "name",
  "role",
  "tenant_id",
  "is_active",
  "password_hash",
  "system_access",
  "base_level"
) VALUES
(
  'staff-professional-001',
  'professional@example.com',
  'プロフェッショナル管理者',
  'admin',
  'tenant-professional-001',
  true,
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  '["saas", "pms", "member"]',
  5
),
(
  'staff-economy-001',
  'economy@example.com',
  'エコノミー管理者',
  'admin',
  'tenant-economy-001',
  true,
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  '["saas"]',
  4
)
ON CONFLICT ("id") DO NOTHING;
```

## 影響範囲

### 影響を受けるシステム
- hotel-saas: 認証システムの完全移行
- hotel-member: 認証情報の共有（影響なし）
- hotel-pms: 認証情報の共有（影響なし）

### 影響を受けるAPI
- `/api/v1/auth/login`: 認証APIの挙動が変更
- `/api/v1/auth/verify-permissions`: 権限検証APIの挙動が変更

### データ移行の必要性
- 既存のモックアカウントを統合データベースに移行する必要あり
- 既存の認証情報は維持され、互換性は保たれる

## リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|------|--------|---------|------|
| 認証失敗 | 高 | 低 | フォールバック認証メカニズムの実装 |
| パフォーマンス低下 | 中 | 低 | インデックス追加による最適化 |
| データ不整合 | 中 | 低 | マイグレーション前後の検証テスト実施 |

## テスト計画

1. **単体テスト**
   - 各認証APIエンドポイントの動作確認
   - パスワード認証のテスト
   - 権限検証のテスト

2. **統合テスト**
   - 複数システム間での認証情報共有テスト
   - テナント分離のテスト
   - 権限に基づく機能制限テスト

3. **負荷テスト**
   - 同時多数ログインのパフォーマンステスト
   - DBクエリのパフォーマンス測定

## ロールバック計画

問題発生時は以下の手順でロールバックを行います：

1. モックアカウント認証に一時的に戻す
2. 追加したカラムを無効化（削除はしない）
3. インデックスの削除
4. 問題の原因特定と修正

## 承認依頼

以上の変更内容について、hotel-common統合データベース管理チームの承認をお願いいたします。ご不明点や懸念事項がございましたら、ご連絡ください。

担当者：hotel-saasチーム 開発責任者
