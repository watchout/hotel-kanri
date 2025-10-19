=== hotel-common実装対象明確化回答書 ===

【回答日】2025年9月29日
【回答者】システム設計担当
【対象】hotel-commonチーム

【質問への回答】

## 1. 実装対象の明確化

**回答**: 既存の`src/routes/api/v1/orders/index.ts`の**修正・完成**を希望します

**理由**:
- 既存ファイルに基本構造が存在
- ゼロから作成するより効率的
- 既存のルーティング設定との整合性確保

**具体的作業**:
✅ 既存ファイルの技術的検証・修正
✅ 不足機能の追加実装
✅ 品質・安全性の向上

## 2. 機能スコープ

**Phase 1実装範囲**（優先度：高）:
✅ **注文作成・取得・更新の基本機能**
✅ **セッション連携機能**
✅ **基本的なエラーハンドリング**

**Phase 2実装範囲**（優先度：中）:
⚠️ **WebSocket通知機能**（基本実装のみ）
⚠️ **管理者向け基本機能**

**Phase 3実装範囲**（優先度：低）:
🔄 **削除機能**（論理削除）
🔄 **高度な管理者機能**

**実装しない範囲**:
❌ 複雑な在庫管理
❌ 決済処理
❌ 高度なレポート機能

## 3. 既存実装との関係

**A. `src/routes/systems/saas/orders.routes.ts`との関係**
- **統合方針**: `/api/v1/orders`を主要APIとして使用
- **既存routes**: 段階的に`/api/v1/orders`に統合
- **移行期間**: 両方並行稼働後、旧APIを非推奨化

**B. 管理者用APIとの連携**
- **統一方針**: 同一エンドポイントで権限別機能提供
- **認証**: 既存`authenticateToken`で役割判定
- **レスポンス**: 権限に応じた情報フィルタリング

## 4. 技術的要件

**A. 認証方式**
```typescript
// 必須使用: 既存認証ミドルウェア
import { authenticateToken } from '../../../auth/middleware';

// 使用方法
router.post('/', authenticateToken, async (req, res) => {
  // req.user.tenantId, req.user.role が利用可能
});
```

**B. エラーハンドリング方式**
```typescript
// 必須使用: 標準レスポンスビルダー
import { StandardResponseBuilder } from '../../../utils/response-builder';

// 成功時
res.status(201).json(
  StandardResponseBuilder.success(data, 'Order created successfully')
);

// エラー時
res.status(400).json(
  StandardResponseBuilder.error('Invalid request', details)
);
```

**C. レスポンス形式の統一**
```typescript
// 標準成功レスポンス
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// 標準エラーレスポンス
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
  traceId?: string;
}
```

## 5. データベースアクセス方式

**必須使用**: 既存データベースクライアント
```typescript
// 禁止: 新規PrismaClientインスタンス
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// 必須: 既存データベースクライアント使用
import { hotelDb } from '../../../database/prisma';

// 使用例
const order = await hotelDb.order.create({
  data: orderData
});
```

## 6. 具体的実装指示

**Phase 1: 既存ファイル修正**

**ファイル**: `/Users/kaneko/hotel-common/src/routes/api/v1/orders/index.ts`

**修正項目**:
1. **Prismaクライアント修正**
   ```typescript
   // 修正前
   import { PrismaClient } from '../../../generated/prisma';
   const prisma = new PrismaClient();
   
   // 修正後
   import { hotelDb } from '../../../database/prisma';
   ```

2. **レスポンス形式統一**
   ```typescript
   // 修正前
   res.status(201).json({
     success: true,
     data: order
   });
   
   // 修正後
   res.status(201).json(
     StandardResponseBuilder.success(order, 'Order created successfully')
   );
   ```

3. **エラーハンドリング強化**
   ```typescript
   try {
     // 処理
   } catch (error) {
     const traceId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     console.error(`[${traceId}] Order creation failed:`, error);
     
     res.status(500).json(
       StandardResponseBuilder.error(
         'Order creation failed', 
         error.message,
         traceId
       )
     );
   }
   ```

**Phase 2: 機能追加**

**追加エンドポイント**:
```typescript
// GET /api/v1/orders - 注文一覧取得（管理者用）
router.get('/', authenticateToken, async (req, res) => {
  // 実装詳細は技術仕様書参照
});

// DELETE /api/v1/orders/:id - 注文削除（論理削除）
router.delete('/:id', authenticateToken, async (req, res) => {
  // 実装詳細は技術仕様書参照
});
```

## 7. テスト要件

**必須テスト**:
```typescript
// テストファイル: src/__tests__/orders-api.test.ts
describe('Orders API', () => {
  test('POST /api/v1/orders - 正常系', async () => {
    // 実装
  });
  
  test('POST /api/v1/orders - 異常系（認証エラー）', async () => {
    // 実装
  });
  
  test('GET /api/v1/orders/by-session/:sessionId', async () => {
    // 実装
  });
});
```

## 8. 実装優先順位

**Week 1**:
1. 既存ファイルの技術的修正
2. 基本CRUD機能の完成
3. 単体テスト実装

**Week 2**:
1. セッション連携機能の強化
2. 統合テスト実装
3. hotel-saas連携テスト

**Week 3**:
1. WebSocket通知機能（基本）
2. 管理者機能
3. 本番デプロイ準備

## 9. 完了基準

**Phase 1完了基準**:
□ 既存実装の技術的修正完了
□ 基本CRUD機能動作確認完了
□ 単体テスト80%以上カバレッジ
□ hotel-saasからの接続テスト成功

**最終完了基準**:
□ 全機能の動作確認完了
□ 統合テスト成功
□ パフォーマンステスト合格
□ セキュリティチェック完了

## 10. 質問・相談窓口

**技術的質問**: システム設計担当
**仕様確認**: プロダクトオーナー
**緊急事項**: プロジェクトマネージャー

---

**次のアクション**: 
上記回答を確認いただき、実装作業を開始してください。
不明点があれば随時ご質問ください。

作成者: システム設計担当
承認者: プロジェクトマネージャー

