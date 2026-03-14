# レスポンスツリーテーブル追加申請書

*作成日: 2025-08-01*

## 概要

AIコンシェルジュ機能のTV向け質問選択型インターフェースを実装するために、hotel-common統合データベースに「レスポンスツリー」関連のテーブルを追加する必要があります。

## 背景

AIコンシェルジュ機能では、TVではリモコン操作に最適化された質問選択型インターフェース、スマホではテキスト入力による対話型インターフェースを提供する計画です。TV向けインターフェースでは、質問と回答を階層構造で管理するための「レスポンスツリー」機能が必要となります。

## 提案内容

hotel-common統合データベース（PostgreSQL）に以下のテーブルを追加することを提案します。

### テーブル構造

```prisma
model ResponseTree {
  id          String    @id @default(cuid())
  tenantId    String    @default("test-tenant-001")
  name        String
  description String?
  isActive    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
  version     Int       @default(1)

  // 関連
  nodes       ResponseNode[]
  versions    ResponseTreeVersion[]

  @@index([tenantId])
  @@index([isActive])
}

model ResponseNode {
  id          String   @id @default(cuid())
  treeId      String
  type        String   // 'category' or 'question'
  title       String
  description String?
  icon        String?
  order       Int      @default(0)
  parentId    String?
  isRoot      Boolean  @default(false)

  // 質問ノード固有のフィールド
  answer      Json?    // テキスト、メディア、関連質問を含む

  // 関連
  tree        ResponseTree @relation(fields: [treeId], references: [id], onDelete: Cascade)
  parent      ResponseNode? @relation("NodeHierarchy", fields: [parentId], references: [id])
  children    ResponseNode[] @relation("NodeHierarchy")
  translations ResponseNodeTranslation[]

  @@index([treeId])
  @@index([parentId])
  @@index([type])
}

model ResponseNodeTranslation {
  id          String   @id @default(cuid())
  nodeId      String
  language    String
  title       String
  answer      Json?

  // 関連
  node        ResponseNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@unique([nodeId, language])
  @@index([language])
}

model ResponseTreeVersion {
  id          String   @id @default(cuid())
  treeId      String
  version     Int
  data        Json     // ツリー全体のスナップショット
  createdAt   DateTime @default(now())
  createdBy   String
  comment     String?

  // 関連
  tree        ResponseTree @relation(fields: [treeId], references: [id], onDelete: Cascade)

  @@unique([treeId, version])
}
```

## 主管理システム

AIコンシェルジュ機能は「LOW重複（独立保持可能）」に分類され、hotel-saasが主管理システムとなります。

## 影響範囲

- **hotel-saas**: AIコンシェルジュ機能の実装に必要なテーブルとして使用
- **hotel-member**: 影響なし
- **hotel-pms**: 影響なし

## データ量と性能への影響

- 想定レコード数: 1テナントあたり数十〜数百レコード程度
- インデックス: 適切なインデックスを設定済み
- クエリパターン: 主にツリー構造の読み取りと更新操作

## セキュリティ考慮事項

- テナントIDによるデータ分離を徹底
- 管理者権限を持つユーザーのみがツリー構造を編集可能
- 公開状態（isActive）によるアクセス制御

## マイグレーション計画

1. マイグレーションファイルの作成
2. テスト環境での検証
3. 本番環境への適用

## テスト計画

1. テーブル作成後のCRUD操作テスト
2. 外部キー制約の動作確認
3. インデックスの効果検証

## 申請者

AIコンシェルジュ開発チーム
