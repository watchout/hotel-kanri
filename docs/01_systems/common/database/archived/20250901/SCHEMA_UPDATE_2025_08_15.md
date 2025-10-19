# データベーススキーマ更新報告（2025年8月15日）

**作成者**: システム管理チーム  
**日付**: 2025年8月15日  
**対象**: 開発チーム全員

## 1. 更新概要

本日、データベーススキーマとPrismaスキーマ定義の間に不一致が発見され、修正を行いました。主な変更点は以下の通りです：

1. **Staffモデルの認証フィールド追加**
   - `password_hash`: パスワードハッシュ値
   - `failed_login_count`: ログイン失敗回数
   - `last_login_at`: 最終ログイン日時
   - `locked_until`: アカウントロック期限

2. **データベース安全性ルールの策定**
   - 直接SQLの実行を禁止
   - Prismaを通じたデータベース操作の標準化
   - マイグレーション管理の徹底

## 2. 問題の発見

認証システムのコードレビュー中に、以下の不一致が発見されました：

1. 実際のデータベースとPrismaスキーマファイル（schema.prisma）の間に不一致があった
2. 認証システムのコードではStaffモデルの`passwordHash`フィールドを参照していたが、スキーマ定義には存在しなかった
3. マイグレーションファイルには`password_hash`フィールドが含まれていたが、スキーマに反映されていなかった

## 3. 実施した対応

### 3.1 スキーマ更新

Staffモデルに以下のフィールドを追加：

```prisma
model Staff {
  id              String    @id @default(cuid())
  tenant_id       String
  email           String
  name            String
  role            String
  department      String?
  password_hash   String?   // 追加
  failed_login_count Int    @default(0) // 追加
  last_login_at   DateTime? // 追加
  locked_until    DateTime? // 追加
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@unique([tenant_id, email])
  @@index([tenant_id])
  @@index([role])
  @@index([email]) // 追加
  @@map("staff")
}
```

### 3.2 マイグレーション作成

以下のマイグレーションファイルを作成し、適用：

```sql
-- AlterTable
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Staff_email_idx" ON "staff"("email");
```

### 3.3 データベース安全性ルールの策定

新たに`DATABASE_SAFETY_RULES.md`ドキュメントを作成し、以下のルールを定義：

1. Prismaを唯一のデータベースアクセス手段とする
2. 直接的なSQL操作は原則として禁止
3. スキーマ変更はマイグレーションを通じてのみ実施

## 4. 今後の対策

### 4.1 定期的なスキーマ検証

- 週1回、実際のデータベース構造とPrismaスキーマの一致を確認
- CI/CDパイプラインに検証ステップを追加

### 4.2 開発プロセスの改善

- マイグレーション作成時のレビュープロセスを強化
- スキーマ変更時のチェックリストを作成

### 4.3 教育・周知

- 全開発者に対してデータベース安全性ルールの説明会を実施
- 新規参画メンバーのオンボーディングに追加

## 5. 影響範囲

今回の変更による影響範囲は以下の通りです：

1. **認証システム**: 正常に動作するようになりました
2. **開発プロセス**: 直接SQLの実行が禁止されます
3. **既存データ**: 影響なし（既存のデータは保持されます）

## 6. 参照ドキュメント

- [データベース安全性ルール](./DATABASE_SAFETY_RULES.md)
- [認証システム設計](../unified-authentication-infrastructure-design.md)
- [スタッフログイン実装ガイド](../staff-login-guide.md)

---

ご質問やご不明点がございましたら、システム管理チームまでお問い合わせください。
