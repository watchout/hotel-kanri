# hotel-common統合データベース変更申請書

## 申請概要

**申請日**: 2023年8月9日
**申請者**: TOP Page Editor 開発チーム
**申請内容**: ページ管理機能のためのデータベーススキーマ追加
**優先度**: 高

## 背景と目的

現在、hotel-saasではTOPページのUI編集機能を開発しています。この機能は、コーディングスキルを持たないスタッフでも、16:9のTV画面に最適化されたTOPページを視覚的に編集・管理できるようにするものです。

現状、このデータを保存するための専用テーブルが存在しないため、以下の問題が発生しています：

1. ページコンテンツの保存先がない
2. バージョン管理ができない
3. マルチテナント対応ができない
4. 公開/非公開の状態管理ができない

これらの問題を解決するため、hotel-commonにページ管理用のテーブルを追加することを提案します。

## 提案するスキーマ変更

以下の2つのモデルを追加します：

1. `Page`: ページ本体を管理するテーブル
2. `PageHistory`: ページの変更履歴を管理するテーブル

```prisma
// ==============================================
// 📄 ページ管理（hotel-saas）
// ==============================================

model Page {
  id          String    @id @default(cuid())
  tenantId    String    // テナントID
  slug        String    // ページの識別子（例：'top', 'info', 'menu'）
  title       String    // ページタイトル
  html        String?   @db.Text // HTML形式のコンテンツ
  css         String?   @db.Text // CSSスタイル
  content     String?   @db.Text // JSON形式でBlockNoteのコンテンツを保存
  template    String?   // テンプレート識別子
  isPublished Boolean   @default(false) // 公開状態
  publishedAt DateTime? // 公開日時
  version     Int       @default(1) // バージョン番号
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // リレーション
  tenant  Tenant       @relation(fields: [tenantId], references: [id])
  history PageHistory[]

  @@unique([tenantId, slug]) // テナントごとにユニークなslug
  @@index([tenantId])
  @@index([slug])
  @@index([isPublished])
  @@map("pages")
}

model PageHistory {
  id        String   @id @default(cuid())
  pageId    String   // 親ページID
  html      String?  @db.Text // HTML形式のコンテンツ
  css       String?  @db.Text // CSSスタイル
  content   String?  @db.Text // JSON形式でBlockNoteのコンテンツを保存
  template  String?  // テンプレート識別子
  version   Int      // バージョン番号
  createdAt DateTime @default(now())
  createdBy String?  // 作成者

  // リレーション
  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([pageId])
  @@index([version])
  @@map("page_histories")
}
```

## 変更の影響範囲

### 影響を受けるシステム
- hotel-saas: ページ編集機能

### 影響を受けないシステム
- hotel-member: 影響なし
- hotel-pms: 影響なし

## マイグレーション計画

1. hotel-commonのPrismaスキーマに上記モデルを追加
2. マイグレーションを実行（`npx prisma migrate dev --name add_page_models`）
3. クライアントを再生成（`npx prisma generate`）

## セキュリティ考慮事項

- テナントIDによるデータ分離を実装（`tenantId`フィールド）
- 認証・認可チェックを全APIエンドポイントに実装（`checkAdminAuth`関数を使用）
- 履歴テーブルに作成者情報を記録（`createdBy`フィールド）

## 性能考慮事項

- 頻繁に使用されるフィールドにインデックスを追加
- 大きなテキストフィールドには`@db.Text`を使用
- 履歴テーブルは必要に応じて古いデータをアーカイブ可能な設計

## テスト計画

1. スキーマのマイグレーションテスト
2. CRUD操作の基本テスト
3. マルチテナント分離のテスト
4. バージョン履歴管理のテスト
5. 公開/非公開切り替えのテスト

## ロールバック計画

問題が発生した場合は以下の手順でロールバックします：

1. マイグレーションを元に戻す（`npx prisma migrate down`）
2. 影響を受けるコードの変更を元に戻す

## 結論

この変更により、hotel-saasのページ管理機能が大幅に改善され、より柔軟で安全なコンテンツ管理が可能になります。マルチテナント対応、バージョン管理、公開管理などの重要な機能が実現します。

hotel-commonチームのレビューと承認をお願いいたします。

---

## 承認フロー

- [ ] 技術レビュー完了
- [ ] セキュリティレビュー完了
- [ ] 性能レビュー完了
- [ ] 最終承認

**承認者**: _________________
**承認日**: _________________
