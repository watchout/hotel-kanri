# Prisma開発ルール

## 基本原則

1. **スキーマとコードの一貫性を保つ**
   - Prismaスキーマは唯一の信頼できる情報源（Single Source of Truth）として扱う
   - スキーマに存在しないフィールドをコードで参照しない

2. **命名規則の統一**
   - データベーステーブル: スネークケース、複数形（例: `user_profiles`）
   - Prismaモデル: PascalCase、単数形（例: `UserProfile`）
   - アダプターゲッター: キャメルケース、単数形（例: `userProfile`）

3. **スキーマ変更プロセス**
   - スキーマ変更は必ずマイグレーションを通して行う
   - 直接データベースを変更することは禁止

## 必須手順

### スキーマ変更時
1. スキーマファイル（`prisma/schema.prisma`）を編集
2. マイグレーションを作成: `npx prisma migrate dev --name 変更内容の説明`
3. 型定義を更新: `npx prisma generate`
4. アダプターレイヤーを更新（新しいモデルの場合）

### アダプターレイヤー更新
新しいモデルを追加した場合:
1. `src/database/prisma-adapter.ts`のPrismaAdapterクラスにゲッターを追加
2. 同ファイルのTransactionAdapterクラスにも同じゲッターを追加

```typescript
// PrismaAdapterクラス内
get newModel() {
  return this.prisma.new_model;
}

// TransactionAdapterクラス内
get newModel() {
  return this.tx.new_model;
}
```

## コーディングルール

1. **null/undefinedチェック**
   - Prismaから返されるデータは常にnull/undefinedチェックを行う
   - 特に集計関数（`_count`, `_sum`など）の結果は必ずチェックする
   ```typescript
   const count = result._count?.total || 0;
   ```

2. **型アノテーション**
   - 関数パラメータには明示的な型アノテーションを使用する
   - 特にコールバック関数では必ず型を指定する
   ```typescript
   items.map((item: ItemType) => { ... })
   ```

3. **フィールド参照**
   - スキーマに存在するフィールド名のみを参照する
   - フィールド名が不明な場合は、スキーマを確認する

## 自動化ツール

1. **pre-commitフック**
   - コミット前にスキーマと型定義の整合性をチェック
   - `scripts/git-hooks/pre-commit`に設定

2. **CIチェック**
   - プルリクエスト時に`npx tsc --noEmit`を実行して型エラーをチェック
   - スキーマと型定義の不一致を検出するカスタムスクリプトを実行

## トラブルシューティング

1. **「Property does not exist on type」エラー**
   - スキーマを確認し、正しいフィールド名を使用する
   - アダプターレイヤーが正しく更新されているか確認する
   - `npx prisma generate`を実行して型定義を更新する

2. **「Object literal may only specify known properties」エラー**
   - スキーマに存在しないフィールドを参照している
   - スキーマを確認し、不要なフィールドを削除するか、必要なフィールドをスキーマに追加する

## レビュープロセス

1. **コードレビュー時のチェックリスト**
   - [ ] スキーマ変更がある場合、マイグレーションファイルが含まれているか
   - [ ] `npx prisma generate`が実行されているか
   - [ ] アダプターレイヤーが更新されているか
   - [ ] null/undefinedチェックが適切に行われているか
   - [ ] 型アノテーションが適切に使用されているか

