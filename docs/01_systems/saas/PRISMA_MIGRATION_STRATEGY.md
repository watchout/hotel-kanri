# Prisma統合アーキテクチャ移行戦略

## 1. 背景と課題

hotel-saasは本来、データベースに直接アクセスせず、hotel-commonが提供するAPIを使用する設計になっています。しかし、実装上は多くのコードがPrismaに直接依存しており、これが以下の問題を引き起こしていました：

- Prismaクライアントの多重生成によるメモリリーク
- 循環参照によるビルドエラー
- 重複インポートによる警告
- 統合アーキテクチャ設計への違反

## 2. 移行アプローチ：ハイブリッド戦略

### Phase 1: 緊急安定化（モック実装）

**目的**: アプリケーションを迅速に安定化させる
**期間**: 数時間〜1日
**アプローチ**:
- 単一のモックファイル（`db-service.ts`）を作成
- 全てのPrisma機能をモック化
- 既存の参照を新しいモックに向ける
- 互換レイヤーを作成して後方互換性を維持

**実装ファイル**:
- `server/utils/db-service.ts` - 主要モック実装
- `server/utils/prisma.ts` - 互換レイヤー
- `server/utils/unified-prisma.ts` - 互換レイヤー
- `server/utils/db-mock.ts` - 互換レイヤー

### Phase 2: 重要機能の直接移行（根本編集）

**目的**: 最も重要なAPIをhotel-common APIに移行
**期間**: 1〜3日
**アプローチ**:
- 優先度の高いAPI（認証、ダッシュボード等）を特定
- Prisma呼び出しをhotel-common API呼び出しに置き換え
- サービスレイヤーを導入してデータアクセスを抽象化

**優先順位**:
1. 認証・権限系API
2. ダッシュボード・統計系API
3. 注文・メニュー系API

### Phase 3: 段階的完全移行（根本編集）

**目的**: 全ての機能をhotel-common APIに移行
**期間**: 1〜2週間
**アプローチ**:
- 残りのAPIを優先度順に移行
- モック層への依存を徐々に削減
- 互換レイヤーを最終的に削除
- 統合アーキテクチャの完全準拠を達成

## 3. 実装ガイドライン

### モック実装（Phase 1）

```typescript
// db-service.ts
export const prisma = {
  staff: {
    findUnique: async (params) => ({ id: 'mock-id', email: 'mock@example.com' })
  }
  // 他のモック...
};
```

### API移行（Phase 2, 3）

```typescript
// userService.ts
export async function getUser(email: string) {
  const response = await $fetch(`${process.env.HOTEL_COMMON_API_URL}/staff`, {
    method: 'GET',
    query: { email }
  });
  return response.data;
}

// 呼び出し側のコード変更
// Before: const user = await prisma.staff.findUnique({ where: { email } });
// After: const user = await getUser(email);
```

## 4. 移行後のアーキテクチャ

```
hotel-saas (フロントエンド層)
  ↓ API呼び出し
hotel-common (バックエンド/データ層)
  ↓ Prisma
統合データベース
```

## 5. 注意事項

- **互換レイヤーは一時的な対応**: 最終的には削除する予定
- **モックはテスト用**: 本番環境では必ずhotel-common APIを使用
- **段階的移行**: 一度に全てを変更するのではなく、優先度に応じて段階的に移行
- **テスト**: 各フェーズで十分なテストを実施

## 6. 移行状況

- **Phase 1**: 完了（緊急安定化）
- **Phase 2**: 進行中（重要API移行）
- **Phase 3**: 未着手（完全移行）

最終更新日: 2024-12-19
