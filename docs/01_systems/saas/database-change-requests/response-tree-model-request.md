# ResponseTree モデル追加リクエスト

## 変更概要
AIコンシェルジュの質問＆回答ツリー機能のために、以下のモデルを統合データベースに追加したいと思います：
- `ResponseTree`：質問と回答の階層構造を管理するツリー
- `ResponseNode`：ツリー内のノード（カテゴリまたは質問）
- `ResponseNodeTranslation`：ノードの多言語翻訳
- `ResponseTreeVersion`：ツリーのバージョン履歴

## 変更理由
TVリモコン操作に最適化された質問＆回答ナビゲーションシステムを提供するため。ホテルスタッフが直感的に質問と回答のツリー構造を管理できる機能を実装します。これにより、ゲストはTVリモコンで簡単に情報にアクセスできるようになります。

## 技術的詳細

```prisma
model ResponseTree {
  id          String   @id @default(cuid())
  tenantId    String   @default("test-tenant-001") // 将来的にはテナントごとに管理
  name        String
  description String?
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publishedAt DateTime?
  version     Int      @default(1)

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

## 影響範囲
- 既存のモデルへの変更はありません
- 新規モデルの追加のみのため、既存データへの影響はありません
- AIコンシェルジュ機能のみで使用されるモデルです

## 期待される結果
- TVリモコン操作に最適化された質問＆回答ツリーの管理が可能になります
- ホテルスタッフが直感的に情報を整理・提供できるようになります
- ゲストの利便性が向上します

## 申請者
AIコンシェルジュ開発チーム

## 申請日
2025年8月1日
