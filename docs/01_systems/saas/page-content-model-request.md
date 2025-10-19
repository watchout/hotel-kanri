# ページコンテンツモデル追加リクエスト

## 概要
TV向けトップページエディタ機能の実装に必要なページコンテンツモデルを追加します。

## 背景
ホテル客室のテレビに表示するトップページを管理者が編集できるようにするため、ページコンテンツを保存するデータモデルが必要です。

## 提案するスキーマ変更

```prisma
model PageContent {
  id          Int       @id @default(autoincrement())
  tenantId    String
  slug        String    // ページの識別子（例: "top", "info", "facilities"）
  title       String    // ページのタイトル
  components  Json      // GrapesJSのコンポーネント構造（JSONBとして保存）
  styles      Json?     // スタイル定義
  assets      Json?     // 画像等のアセット情報
  html        String?   // 事前生成されたHTML
  css         String?   // 最適化されたCSS
  metadata    Json?     // SEO情報など
  version     Int       @default(1)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  versions    PageVersion[]

  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([slug])
  @@map("page_contents")
}

model PageVersion {
  id          Int      @id @default(autoincrement())
  pageId      Int
  components  Json
  styles      Json?
  version     Int
  createdAt   DateTime @default(now())
  createdBy   String?

  page        PageContent @relation(fields: [pageId], references: [id])

  @@index([pageId])
  @@map("page_versions")
}
```

## 影響範囲
- 新規モデルの追加のため、既存データへの影響はありません
- 統合データベースに新しいテーブルが2つ追加されます

## 必要な理由
- ビジュアルエディタで作成したページコンテンツを保存するため
- 複数バージョンの管理とロールバック機能をサポートするため
- テナントごとに異なるページコンテンツを管理するため

## 実装計画
1. スキーマ変更の適用
2. Prismaクライアントの再生成
3. APIエンドポイントの実装
4. 管理画面の実装

## セキュリティ考慮事項
- テナントIDによるアクセス制限を実装
- 管理者権限を持つユーザーのみが編集可能

## 要求者
- 開発チーム

## 優先度
- 高（新機能開発のブロッカー）
