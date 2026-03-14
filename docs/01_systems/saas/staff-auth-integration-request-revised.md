# hotel-common統合データベース変更申請書（改訂版）

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

## 現状分析

### 現在のデータベース構造

データベース分析の結果、以下の事実が判明しました：

1. **staffテーブルの存在**: 統合データベースには既に`staff`テーブルが存在しています
2. **staffテーブルの現在の構造**:
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

3. **hotel-commonスキーマとの不一致**: hotel-commonの`schema.prisma`には`staff`テーブルではなく`User`モデル（`users`テーブル）が定義されています。このモデルには、パスワード管理や権限管理に必要なカラムが既に含まれています。

### 現状の課題

1. **認証情報の不足**: 現在の`staff`テーブルにはパスワードハッシュを保存するカラムがない
2. **権限管理の制限**: システムアクセスや権限レベルを管理するカラムがない
3. **スキーマの不一致**: hotel-commonの定義と実際のデータベース構造に不一致がある
4. **命名規則の不一致**: `staff`テーブルは`snake_case`、hotel-commonの定義は`camelCase`を使用

## 変更内容

### 1. staffテーブルへのカラム追加

現在の`staff`テーブルに以下のカラムを追加します（既存のテーブル構造と命名規則を維持）：

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
  "base_level",
  "created_at",
  "updated_at"
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
  5,
  NOW(),
  NOW()
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
  4,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
```

## 影響範囲

### 影響を受けるシステム
- hotel-saas: 認証システムの完全移行
- hotel-member: 影響なし（`staff`テーブルを使用していない可能性が高い）
- hotel-pms: 影響なし（`staff`テーブルを使用していない可能性が高い）

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
| スキーマ不一致 | 高 | 高 | hotel-commonのスキーマ定義の更新検討 |

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

## 長期的な推奨事項

1. **スキーマ統一の検討**:
   - hotel-commonの`schema.prisma`と実際のデータベース構造の不一致を解消
   - `staff`テーブルと`User`モデルの統合または明確な役割分担の定義

2. **命名規則の統一**:
   - データベース全体で一貫した命名規則（`snake_case`または`camelCase`）の採用
   - Prismaモデル定義と実際のテーブル名・カラム名の一致

3. **ドキュメントの更新**:
   - 実際のデータベース構造を反映した正確なドキュメントの作成
   - 各テーブルの役割と関連性の明確化

## 承認依頼

以上の変更内容について、hotel-common統合データベース管理チームの承認をお願いいたします。ご不明点や懸念事項がございましたら、ご連絡ください。

担当者：hotel-saasチーム 開発責任者
