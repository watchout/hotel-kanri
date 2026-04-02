# hotel-saas APIエンドポイント統合データベース移行計画

## 概要

hotel-saasシステムのAPIエンドポイントをhotel-common統合データベースに完全移行するための計画書です。認証システムの統合が完了したため、次のステップとして他のAPIエンドポイントも統合データベースを使用するように移行します。

## 移行の目的

1. **データの一元管理**: すべてのデータをhotel-common統合データベースで一元管理
2. **整合性の確保**: 複数システム間でのデータ整合性を確保
3. **運用効率の向上**: データベース管理の効率化
4. **スケーラビリティの向上**: 将来的な拡張に対応しやすい構造の実現

## 現状分析

現在、以下のAPIエンドポイントが独自のPrismaClientを使用しています：

| カテゴリ | APIエンドポイント | 優先度 | 複雑度 |
|---------|-----------------|-------|-------|
| 認証・権限 | `/api/v1/auth/*` | 高 | 高 |
| 部屋管理 | `/api/v1/admin/rooms/*` | 高 | 中 |
| オーダー管理 | `/api/v1/orders/*` | 高 | 高 |
| メニュー管理 | `/api/v1/menu/*` | 中 | 中 |
| カテゴリ管理 | `/api/v1/categories/*` | 中 | 低 |
| タグ管理 | `/api/v1/tags/*` | 低 | 低 |
| 統計情報 | `/api/v1/statistics/*` | 中 | 高 |
| コンシェルジュ | `/api/v1/concierge/*` | 中 | 高 |

## 移行方針

### 1. 段階的移行アプローチ

移行は以下の3フェーズで実施します：

1. **フェーズ1**: 認証・権限系API（完了）
2. **フェーズ2**: 基幹業務系API（部屋管理、オーダー管理）
3. **フェーズ3**: 補助機能系API（メニュー、カテゴリ、タグ、統計情報）
4. **フェーズ4**: 高度機能系API（コンシェルジュ）

### 2. テナント分離の徹底

すべてのAPIエンドポイントで以下のテナント分離パターンを適用します：

```typescript
// テナントコンテキストの取得
const { tenant, tenantId } = event.context

// テナント分離されたPrismaクライアントの使用
const result = await prisma.$extend({
  query: {
    $allModels: {
      async $allOperations({ args, query, model, operation }) {
        // テナントIDによるフィルタリング
        if (model !== 'Tenant' && operation !== 'findUnique' && operation !== 'findFirst') {
          args.where = {
            ...args.where,
            tenant_id: tenantId
          }
        }
        return query(args)
      }
    }
  }
})
```

### 3. 共通ユーティリティの作成

移行を効率化するため、以下の共通ユーティリティを作成します：

- `useUnifiedDatabase.ts`: 統合データベース接続用ユーティリティ
- `tenantFilter.ts`: テナント分離フィルタリング用ユーティリティ
- `errorHandler.ts`: 統一エラーハンドリング用ユーティリティ

## 移行手順（APIエンドポイントごと）

各APIエンドポイントの移行手順は以下の通りです：

1. **コード分析**: 現在のAPIコードを分析し、データベースアクセスパターンを特定
2. **スキーマ確認**: 統合データベースのスキーマと現在のスキーマの差異を確認
3. **テスト作成**: 移行前の動作を検証するテストを作成
4. **コード変更**: APIコードを統合データベースを使用するように変更
5. **テスト実行**: 変更後のコードでテストを実行し、動作を検証
6. **デプロイ**: 検証が完了したらステージング環境にデプロイ
7. **モニタリング**: 本番環境への適用後、動作をモニタリング

## 優先度の高いAPIエンドポイントの移行計画

### 部屋管理API (`/api/v1/admin/rooms/*`)

#### 現状

```typescript
// server/api/v1/admin/rooms/index.get.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const rooms = await prisma.room.findMany({
    // ...
  })
  return rooms
})
```

#### 移行後

```typescript
// server/api/v1/admin/rooms/index.get.ts
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenantId } = event.context

  const rooms = await prisma.Room.findMany({
    where: {
      tenant_id: tenantId
    },
    // ...
  })
  return rooms
})
```

### オーダー管理API (`/api/v1/orders/*`)

#### 現状

```typescript
// server/api/v1/orders/index.get.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const orders = await prisma.order.findMany({
    // ...
  })
  return orders
})
```

#### 移行後

```typescript
// server/api/v1/orders/index.get.ts
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenantId } = event.context

  const orders = await prisma.Order.findMany({
    where: {
      tenant_id: tenantId
    },
    // ...
  })
  return orders
})
```

## テスト戦略

### 単体テスト

各APIエンドポイントに対して以下のテストを実施：

- 正常系テスト: 期待通りのデータが取得できるか
- 異常系テスト: エラー処理が適切に行われるか
- テナント分離テスト: 異なるテナントのデータにアクセスできないか

### 統合テスト

- 複数APIを組み合わせた業務フローのテスト
- パフォーマンステスト: レスポンス時間が許容範囲内か

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|------|--------|---------|------|
| データアクセスエラー | 高 | 中 | フォールバックメカニズムの実装 |
| パフォーマンス低下 | 中 | 中 | クエリの最適化、インデックス追加 |
| テナント分離の不備 | 高 | 低 | 厳格なテストと検証 |
| 移行中のダウンタイム | 高 | 低 | ブルー/グリーンデプロイメント |

## スケジュール

| フェーズ | 作業内容 | 開始日 | 終了日 | 担当者 |
|---------|---------|-------|-------|-------|
| 準備 | 共通ユーティリティ作成 | 2025/7/19 | 2025/7/20 | 開発チーム |
| フェーズ1 | 認証・権限系API | 2025/7/15 | 2025/7/18 | 開発チーム |
| フェーズ2 | 基幹業務系API | 2025/7/21 | 2025/7/25 | 開発チーム |
| フェーズ3 | 補助機能系API | 2025/7/26 | 2025/7/31 | 開発チーム |
| フェーズ4 | 高度機能系API | 2025/8/1 | 2025/8/5 | 開発チーム |
| 検証 | 総合テスト | 2025/8/6 | 2025/8/10 | QAチーム |
| リリース | 本番環境適用 | 2025/8/11 | 2025/8/11 | 運用チーム |

## 結論

hotel-saasシステムのAPIエンドポイントをhotel-common統合データベースに移行することで、データの一元管理、整合性の確保、運用効率の向上、スケーラビリティの向上を実現します。段階的な移行アプローチと厳格なテストにより、リスクを最小限に抑えながら移行を進めます。
