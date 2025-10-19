# Prismaアダプター実装サマリー

## 概要

hotel-commonプロジェクトにおけるデータベーススキーマとコードの整合性を維持するために、Prismaアダプターを実装しました。このドキュメントでは、実装の詳細と今後の方針について説明します。

## 実装内容

### 1. Prismaアダプターの作成

`src/database/prisma-adapter.ts`にPrismaアダプタークラスを実装しました。このアダプターは、従来の命名規則（キャメルケース・単数形）でのアクセスを、新しい命名規則（スネークケース・複数形）に変換します。

```typescript
export class PrismaAdapter {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  // 例: campaign -> campaigns のマッピング
  get campaign() {
    return this.prisma.campaigns;
  }

  // トランザクション実行のラッパー
  async $transaction<T>(
    action: (tx: any) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const txAdapter = new TransactionAdapter(tx);
      return action(txAdapter);
    }, options);
  }

  // 他のPrismaClientメソッドを直接転送
  $connect() { return this.prisma.$connect(); }
  $disconnect() { return this.prisma.$disconnect(); }
  $on(eventType: any, callback: any) { return this.prisma.$on(eventType, callback); }
}
```

### 2. データベースクライアントの更新

`src/database/prisma.ts`を更新し、アダプターを使用するためのメソッドを追加しました。

```typescript
export class HotelDatabaseClient {
  // ...

  // アダプターを使用したPrismaクライアントを取得
  public getAdapter(): PrismaAdapter {
    return this.adapter;
  }

  // トランザクションを実行
  public async transaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    return this.adapter.$transaction(fn, options);
  }

  // 互換性のためのゲッター
  public get page() { return this.adapter.page; }
  public get campaign() { return this.adapter.campaign; }
  // ...
}
```

### 3. 自動化スクリプトの作成

コード修正を支援するために、以下のスクリプトを作成しました：

- `scripts/update-prisma-references.js` - Prismaクライアントの参照を更新
- `scripts/update-prisma-imports.js` - インポート文を更新
- `scripts/create-prisma-adapter.js` - アダプターコードを生成

### 4. ドキュメントの作成

- `docs/database/prisma-naming-convention-guide.md` - 命名規則ガイド
- `docs/database/prisma-adapter-migration-guide.md` - 移行ガイド

## 今後の方針

### 短期的な対応

1. **コードの修正**: 既存のコードをアダプターを使用するように修正
   - `scripts/update-prisma-references.js`と`scripts/update-prisma-imports.js`を使用
   - 型エラーの修正

2. **テスト**: アダプターの動作を確認
   - 単体テスト
   - 統合テスト

### 中長期的な対応

1. **命名規則の統一**: スキーマとコードの命名規則を完全に統一
   - すべてのモデルに`@@map`ディレクティブを追加
   - コードをアダプターを使用するように更新

2. **CI/CD**: スキーマとデータベースの整合性を自動的に検証
   - `scripts/check-schema-db.js`をCI/CDパイプラインに組み込む

3. **開発ガイドライン**: 開発者向けのガイドラインを整備
   - 新しいモデルを追加する際の手順
   - アダプターを使用するためのベストプラクティス

## 課題と解決策

### 1. 型の問題

**課題**: アダプターを使用しても、TypeScriptの型の問題が完全に解決されない場合がある

**解決策**:
- アダプターの型定義を改善
- 必要に応じて型アサーションを使用

### 2. トランザクション内のコード

**課題**: トランザクション内でのPrismaクライアントの使用方法も変更が必要

**解決策**:
- `TransactionAdapter`クラスを実装
- `hotelDb.transaction()`メソッドを使用

### 3. テストコード

**課題**: テストコードでモックを使用している場合は、モックの実装も更新する必要がある

**解決策**:
- テストヘルパー関数を作成
- モックアダプターを実装

## まとめ

Prismaアダプターの実装により、データベーススキーマとコードの整合性を維持しながら、既存のコードの互換性も確保することができました。今後は、アダプターを使用するようにコードを修正し、命名規則の統一を進めていくことで、より堅牢なデータベース操作を実現します。
