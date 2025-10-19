# TOPページ編集機能のためのデータベース変更実装報告

**実装日**: 2025年8月10日  
**実装者**: システム管理者  
**関連チケット**: TOP Page Editor 開発チーム変更申請  
**マイグレーションID**: 20250810000000_add_page_models

## 実装概要

hotel-saasのTOPページUI編集機能のために申請されたページ管理用のデータベーステーブルを追加しました。命名規則に従い、フィールド名をパスカルケース（PascalCase）に修正して実装しています。

## 変更内容

### 追加したテーブル

1. `pages` - ページ本体を管理するテーブル
2. `page_histories` - ページの変更履歴を管理するテーブル

### 命名規則の適用

データベース命名規則に従い、以下の修正を行いました：

1. テーブル名は小文字スネークケース（snake_case）を使用
   - `pages`, `page_histories`

2. フィールド名はパスカルケース（PascalCase）を使用
   - 例: `Id`, `TenantId`, `IsPublished` など

3. インデックス名は規則に従って命名
   - 例: `pages_TenantId_idx`, `pages_IsPublished_idx` など

## 実装の詳細

### Prismaスキーマ

```prisma
model Page {
  Id          String    @id @default(cuid())
  TenantId    String    
  Slug        String    
  Title       String    
  Html        String?   @db.Text 
  Css         String?   @db.Text 
  Content     String?   @db.Text 
  Template    String?   
  IsPublished Boolean   @default(false) 
  PublishedAt DateTime? 
  Version     Int       @default(1) 
  CreatedAt   DateTime  @default(now())
  UpdatedAt   DateTime  @updatedAt

  Tenant  Tenant       @relation(fields: [TenantId], references: [id])
  History PageHistory[]

  @@unique([TenantId, Slug])
  @@index([TenantId])
  @@index([Slug])
  @@index([IsPublished])
  @@map("pages")
}

model PageHistory {
  Id        String   @id @default(cuid())
  PageId    String   
  Html      String?  @db.Text 
  Css       String?  @db.Text 
  Content   String?  @db.Text 
  Template  String?  
  Version   Int      
  CreatedAt DateTime @default(now())
  CreatedBy String?  

  Page Page @relation(fields: [PageId], references: [Id], onDelete: Cascade)

  @@index([PageId])
  @@index([Version])
  @@map("page_histories")
}
```

### マイグレーションSQL

マイグレーションファイル `20250810000000_add_page_models/migration.sql` を作成し、必要なテーブル、インデックス、外部キー制約を定義しました。

## テスト結果

テスト項目：
- [x] マイグレーションの実行確認
- [x] 外部キー制約の動作確認
- [x] インデックスの作成確認
- [x] 命名規則の準拠確認

## 今後の対応

1. hotel-saas側でページ管理機能の実装を進める
2. 必要に応じてAPIエンドポイントを追加する
3. 古いページ履歴の自動アーカイブ機能を検討する

## 結論

申請内容に基づき、命名規則に準拠したページ管理テーブルを追加しました。これにより、hotel-saasのTOPページUI編集機能の開発が可能になります。
