# Prismaアダプター移行ガイド

## 概要

hotel-commonプロジェクトでは、Prismaスキーマで`@@map`ディレクティブを使用してデータベーステーブル名とPrismaモデル名のマッピングを明示的に定義しています。これにより、データベース設計とコード設計の分離が可能になりますが、Prismaクライアントの使用方法に変更が必要になります。

このドキュメントでは、既存のコードをPrismaアダプターを使用するように移行する方法について説明します。

## 問題点

Prismaスキーマで`@@map`ディレクティブを使用すると、生成されるPrismaクライアントのプロパティ名がデータベーステーブル名（スネークケース・複数形）になります。しかし、既存のコードはPascalCase/camelCase・単数形のモデル名を使用しています。

例:
```typescript
// 既存のコード
const campaign = await prisma.campaign.findUnique({ where: { id } });

// 生成されたPrismaクライアント
// エラー: Property 'campaign' does not exist on type 'PrismaClient'
// 正しくは: prisma.campaigns
```

## 解決策: Prismaアダプター

この問題を解決するために、Prismaアダプターを導入しました。アダプターは従来の命名規則（キャメルケース・単数形）でのアクセスを、新しい命名規則（スネークケース・複数形）に変換します。

```typescript
// アダプターを使用
const db = hotelDb.getAdapter();
const campaign = await db.campaign.findUnique({ where: { id } });
```

## 移行手順

### 1. インポートの更新

```typescript
// 変更前
import { PrismaClient } from '@prisma/client';

// 変更後
import { hotelDb } from '../database/prisma';
```

### 2. Prismaクライアントの取得方法の変更

```typescript
// 変更前
const prisma = new PrismaClient();
// または
const prisma = hotelDb.getClient();

// 変更後
const db = hotelDb.getAdapter();
```

### 3. トランザクションの使用方法の変更

```typescript
// 変更前
await prisma.$transaction(async (tx) => {
  await tx.campaign.create({...});
});

// 変更後
await hotelDb.transaction(async (tx) => {
  await tx.campaign.create({...});
});
```

### 4. リポジトリパターンを使用している場合

```typescript
// 変更前
constructor(private prisma: PrismaClient) {}

// 変更後
constructor(private db = hotelDb.getAdapter()) {}
```

## 自動移行ツール

移行を支援するために、以下のスクリプトを用意しています：

1. `scripts/update-prisma-references.js` - Prismaクライアントの参照を更新
2. `scripts/update-prisma-imports.js` - インポート文を更新

使用方法:
```bash
# ドライラン（変更を適用せず、何が変更されるかを確認）
node scripts/update-prisma-references.js --dry-run
node scripts/update-prisma-imports.js --dry-run

# 実際に変更を適用
node scripts/update-prisma-references.js
node scripts/update-prisma-imports.js
```

## 注意事項

1. **自動ツールの限界**: 自動ツールはすべてのケースをカバーできません。特に複雑なコードパターンや変数名の再利用がある場合は、手動での確認が必要です。

2. **型の問題**: アダプターを使用しても、TypeScriptの型の問題が完全に解決されない場合があります。その場合は、適切な型アサーションを使用するか、型定義を更新してください。

3. **トランザクション内のコード**: トランザクション内でのPrismaクライアントの使用方法も変更が必要です。

4. **テストコード**: テストコードでモックを使用している場合は、モックの実装も更新する必要があります。

## トラブルシューティング

### エラー: Property 'X' does not exist on type 'PrismaAdapter'

**原因**: アダプターに新しいモデルのマッピングが追加されていない

**解決策**:
1. `src/database/prisma-adapter.ts`を開く
2. 新しいモデルのゲッターを追加する
3. `src/database/prisma.ts`のゲッターも追加する

### エラー: Cannot find module '../database/prisma'

**原因**: インポートパスが正しくない

**解決策**: 正しい相対パスを使用するか、パスエイリアスを設定する

## 参考リソース

- [Prismaドキュメント: モデルとテーブル名のマッピング](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#mapping-model-names-to-tables)
- [命名規則ガイド](./prisma-naming-convention-guide.md)
