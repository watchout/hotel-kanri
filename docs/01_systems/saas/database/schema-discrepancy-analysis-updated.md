# 統合データベーススキーマ不一致分析（更新版）

## 現状分析

### 確認した不一致点

1. **スキーマ定義と実際のテーブル構造の不一致**:
   - hotel-commonの`schema.prisma`では`User`モデルが定義され`users`テーブルにマッピングされている
   - 実際のデータベースには`users`テーブルが存在せず、代わりに`staff`テーブルが存在している

2. **実際のstaffテーブルの構造**:
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

3. **認証に必要なカラムの欠落**:
   - `password_hash`カラムがなく、パスワード認証ができない
   - `system_access`カラムがなく、システムアクセス権限を管理できない
   - `base_level`カラムがなく、権限レベルを管理できない
   - `last_login_at`カラムがなく、最終ログイン日時を記録できない

4. **データの状況**:
   - staffテーブルにはデータが存在しない（0件）
   - 外部キー制約も設定されていない

5. **hotel-common Prismaスキーマとの比較**:
   - hotel-commonの`schema.prisma`では`User`モデルに以下のフィールドが定義されている:
     - id, tenantId, email, passwordHash, role, systemAccess, isActive, lastLoginAt, createdAt, updatedAt
   - 実際の`staff`テーブルには上記の一部のみが存在し、重要なフィールドが欠けている

## 問題点

1. **認証システムの不整合**:
   - JWT認証は実装されているが、実際のデータベースとの連携が不完全
   - パスワードハッシュを保存するカラムがないため、本番環境での認証が機能しない

2. **テーブル名の不一致**:
   - Prismaスキーマでは`users`テーブルを参照しているが、実際には`staff`テーブルが存在
   - これにより、Prismaのモデル定義が機能せず、直接SQLクエリを使用する必要がある

3. **カラム名の不一致**:
   - Prismaスキーマでは`passwordHash`、`systemAccess`などのカラムを参照しているが、実際のテーブルにはこれらが存在しない

4. **データ不足**:
   - 実際のテーブルにデータが存在しないため、認証テストができない

## 対応方針

### 短期的な対応（現在実施中）

1. **モックアカウントによる認証維持**:
   - 現在のモックアカウント（professional@example.com, economy@example.com, test@example.com）による認証を維持
   - `login.post.ts`でのフォールバック処理を継続

2. **統合データベース変更申請の提出**:
   - `staff`テーブルに以下のカラムの追加を申請:
     - `password_hash` (text, NULL)
     - `system_access` (jsonb, NULL)
     - `base_level` (integer, DEFAULT 1)
     - `last_login_at` (timestamp, NULL)

3. **テスト用データの追加申請**:
   - 基本的なテスト用スタッフアカウントの追加を申請

### 中期的な対応

1. **マッピングレイヤーの実装**:
   - hotel-commonのPrismaスキーマと実際のデータベース構造の間にマッピングレイヤーを実装
   - `staff`テーブルを`User`モデルにマッピングするアダプターを作成

2. **コードの修正**:
   - 実際のデータベース構造に合わせたコードの修正
   - 認証システムの完全な統合

3. **テナント分離の実装強化**:
   - テナントIDに基づくデータ分離の徹底
   - 権限管理システムの強化

### 長期的な対応

1. **スキーマ統一の検討**:
   - hotel-commonの`schema.prisma`と実際のデータベース構造の不一致を解消するための調整
   - `User`モデルと`staff`テーブルの関係を明確にし、統一的な認証システムを構築

2. **マイグレーション計画の立案**:
   - 段階的なマイグレーション計画の立案と実行
   - 既存システムへの影響を最小限に抑えつつ、スキーマの整合性を確保

## 結論

hotel-commonの`schema.prisma`と実際のデータベース構造に重大な不一致が確認されました。特に`User`モデルが`users`テーブルを参照しているのに対し、実際には`staff`テーブルが存在しており、必要なカラムも不足しています。

短期的には現在のモックアカウントによる認証を維持しつつ、必要なカラムの追加を申請します。中長期的にはマッピングレイヤーの実装やスキーマ統一の検討を行い、最終的には完全に整合性のとれた認証システムを構築します。
