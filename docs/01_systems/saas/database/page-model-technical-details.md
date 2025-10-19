# ページ管理モデル - 技術詳細

## モデル設計の詳細説明

### Page モデル

| フィールド名 | 型 | 説明 | 制約 |
|------------|-----|------|------|
| id | String | 一意識別子 | @id @default(cuid()) |
| tenantId | String | テナントID | 外部キー |
| slug | String | ページ識別子 | テナント内で一意 |
| title | String | ページタイトル | 必須 |
| html | String? | HTML形式のコンテンツ | @db.Text |
| css | String? | CSSスタイル | @db.Text |
| content | String? | BlockNoteのJSONコンテンツ | @db.Text |
| template | String? | テンプレート識別子 | - |
| isPublished | Boolean | 公開状態 | @default(false) |
| publishedAt | DateTime? | 公開日時 | null許容 |
| version | Int | バージョン番号 | @default(1) |
| createdAt | DateTime | 作成日時 | @default(now()) |
| updatedAt | DateTime | 更新日時 | @updatedAt |

### PageHistory モデル

| フィールド名 | 型 | 説明 | 制約 |
|------------|-----|------|------|
| id | String | 一意識別子 | @id @default(cuid()) |
| pageId | String | 親ページID | 外部キー |
| html | String? | HTML形式のコンテンツ | @db.Text |
| css | String? | CSSスタイル | @db.Text |
| content | String? | BlockNoteのJSONコンテンツ | @db.Text |
| template | String? | テンプレート識別子 | - |
| version | Int | バージョン番号 | - |
| createdAt | DateTime | 作成日時 | @default(now()) |
| createdBy | String? | 作成者ID | null許容 |

## 設計上の利点

### 1. マルチテナント対応

- `Page`テーブルに`tenantId`フィールドを追加
- `@@unique([tenantId, slug])`制約により、テナントごとに同じslugのページを持つことが可能
- `@@index([tenantId])`によりテナントごとのクエリパフォーマンスを最適化

### 2. バージョン管理

- `Page`テーブルの`version`フィールドで現在のバージョンを管理
- `PageHistory`テーブルに各バージョンの履歴を保存
- 履歴テーブルに`createdBy`フィールドを追加し、変更者を追跡

### 3. コンテンツ管理

- `html`, `css`, `content`フィールドにより、複数の形式でコンテンツを保存可能
- `content`フィールドにBlockNoteのJSONデータを保存し、エディタとの互換性を確保
- `template`フィールドによりテンプレートベースのデザインをサポート

### 4. 公開管理

- `isPublished`フィールドで公開状態を管理
- `publishedAt`フィールドで公開日時を記録
- `@@index([isPublished])`により公開ページの高速検索が可能

## 使用例

### 1. ページの作成

```typescript
const newPage = await prisma.page.create({
  data: {
    tenantId: "tenant-123",
    slug: "top",
    title: "トップページ",
    content: JSON.stringify({ blocks: [] }),
    template: "luxury-classic",
    isPublished: false,
    version: 1
  }
});
```

### 2. ページの更新と履歴作成

```typescript
// 既存のページを取得
const page = await prisma.page.findUnique({
  where: {
    tenantId_slug: {
      tenantId: "tenant-123",
      slug: "top"
    }
  }
});

// 履歴を作成
await prisma.pageHistory.create({
  data: {
    pageId: page.id,
    html: page.html,
    css: page.css,
    content: page.content,
    template: page.template,
    version: page.version,
    createdBy: "user-456"
  }
});

// ページを更新
await prisma.page.update({
  where: { id: page.id },
  data: {
    content: JSON.stringify(newContent),
    version: page.version + 1,
    updatedAt: new Date()
  }
});
```

### 3. ページの公開

```typescript
await prisma.page.update({
  where: { id: "page-123" },
  data: {
    isPublished: true,
    publishedAt: new Date()
  }
});
```

### 4. 特定テナントの公開ページ取得

```typescript
const publishedPages = await prisma.page.findMany({
  where: {
    tenantId: "tenant-123",
    isPublished: true
  },
  orderBy: {
    updatedAt: 'desc'
  }
});
```

### 5. ページの履歴取得

```typescript
const pageHistory = await prisma.pageHistory.findMany({
  where: { pageId: "page-123" },
  orderBy: { version: 'desc' }
});
```

## インデックス最適化

提案されたスキーマには以下のインデックスが含まれています：

1. `@@unique([tenantId, slug])` - テナントごとのページ一意性を保証
2. `@@index([tenantId])` - テナントごとのページ検索を最適化
3. `@@index([slug])` - スラグによるページ検索を最適化
4. `@@index([isPublished])` - 公開ページの検索を最適化
5. `@@index([pageId])` - ページIDによる履歴検索を最適化
6. `@@index([version])` - バージョンによる履歴検索を最適化

これらのインデックスにより、一般的な検索パターンが最適化され、アプリケーションのパフォーマンスが向上します。
