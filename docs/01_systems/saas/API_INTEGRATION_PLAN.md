# 🔄 hotel-common API統合計画

## **🎯 目的**

hotel-saasアプリケーションをhotel-common APIと統合し、直接データベースアクセスを排除する。これにより、統合アーキテクチャの設計思想に準拠したシステムを実現する。

## **📋 現状分析**

1. **現在の状態**:
   - hotel-saasは直接Prismaを使用せず、`db-service.ts`モックを経由
   - hotel-commonサーバーは起動しており、一部のAPIが利用可能
   - 多くの必要なAPIがhotel-common側で未実装

2. **利用可能なAPI**:
   - `POST /api/auth/validate` - トークン検証
   - `GET /api/tenants` - テナント一覧
   - `GET /api/hotel-member/integration/health` - 統合ヘルスチェック

3. **主な課題**:
   - 認証系APIの不足（ログイン、トークン更新など）
   - 注文・メニュー系APIの不足
   - 統計・管理系APIの不足

## **🚀 統合アプローチ**

### **1️⃣ フェーズ1: 認証系統合（最優先）**

**目標**: 既存の認証APIを活用し、hotel-saasの認証機能をhotel-commonと統合する

**タスク**:
- `POST /api/auth/validate`を使用したトークン検証機能の実装
- `server/utils/authService.ts`の修正
- `server/middleware/00.unified-auth.ts`の更新
- `server/utils/db-service.ts`の認証関連部分を実APIに置き換え

**想定期間**: 1-2日

### **2️⃣ フェーズ2: テナント情報統合（高優先）**

**目標**: テナント情報をhotel-common APIから取得するよう修正

**タスク**:
- `GET /api/tenants`を使用したテナント情報取得機能の実装
- `server/utils/db-service.ts`のテナント関連部分を実APIに置き換え
- テナントコンテキスト関連機能の更新

**想定期間**: 1日

### **3️⃣ フェーズ3: 注文系統合（高優先）**

**目標**: 注文関連機能をAPIベースに移行（hotel-common側の実装待ち）

**タスク**:
- 注文関連APIが実装され次第、`db-service.ts`の注文関連部分を置き換え
- 一時的なモック実装の継続

**想定期間**: hotel-common側の実装完了後2-3日

### **4️⃣ フェーズ4: 統計・管理系統合（中優先）**

**目標**: 統計・管理系機能をAPIベースに移行

**タスク**:
- 統計・管理系APIが実装され次第、対応する機能を置き換え
- 一時的なモック実装の継続

**想定期間**: hotel-common側の実装完了後3-5日

## **⚙️ 実装戦略**

### **1. APIクライアント層の作成**

```typescript
// server/utils/api-client.ts
import { $fetch } from 'ofetch';

const BASE_URL = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400';

export const apiClient = $fetch.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const authApi = {
  validateToken: (token: string) =>
    apiClient('/api/auth/validate', {
      method: 'POST',
      body: { token }
    }),
  // 他の認証系API...
};

export const tenantApi = {
  getAllTenants: () =>
    apiClient('/api/tenants'),
  // 他のテナント系API...
};

// 他のAPI群...
```

### **2. db-serviceの段階的置き換え**

```typescript
// server/utils/db-service.ts (一部抜粋)
import { authApi, tenantApi } from './api-client';

// 認証関連の実装をAPI呼び出しに置き換え
const staffMethods = {
  findUnique: async ({ where }) => {
    // APIが実装されたら置き換え
    if (where.id) {
      // return await staffApi.getStaffById(where.id);
      return mockStaffData.find(s => s.id === where.id);
    }
    // ...他の条件
  },
  // ...他のメソッド
};

// テナント関連の実装をAPI呼び出しに置き換え
const tenantMethods = {
  findMany: async () => {
    try {
      return await tenantApi.getAllTenants();
    } catch (error) {
      console.error('テナント情報取得エラー:', error);
      return mockTenantData;
    }
  },
  // ...他のメソッド
};
```

### **3. 認証フローの更新**

```typescript
// server/utils/authService.ts
import { authApi } from './api-client';

export const getAuthService = () => {
  return {
    verifyToken: async (token: string) => {
      try {
        const result = await authApi.validateToken(token);
        return result.valid ? result.user : null;
      } catch (error) {
        console.error('トークン検証エラー:', error);
        return null;
      }
    },
    // 他の認証メソッド...
  };
};
```

## **🧪 テスト戦略**

1. **単体テスト**:
   - API呼び出し層のモックテスト
   - 認証フローの検証

2. **統合テスト**:
   - 認証フローのエンドツーエンドテスト
   - テナント情報取得のテスト

3. **フォールバック検証**:
   - API障害時のフォールバック動作確認

## **⚠️ リスクと対策**

| リスク | 影響度 | 対策 |
|-------|--------|------|
| API未実装 | 高 | モック実装の継続、優先度に基づく段階的移行 |
| API仕様の不一致 | 中 | アダプターパターンの採用、変換層の実装 |
| パフォーマンス低下 | 中 | キャッシュ戦略の導入、重要データの事前読み込み |
| 認証障害 | 高 | フォールバック機構の実装、タイムアウト設定 |

## **📅 タイムライン**

| フェーズ | 内容 | 期間 | 依存関係 |
|---------|------|------|----------|
| 準備 | API分析、統合計画策定 | 1日 | なし |
| フェーズ1 | 認証系統合 | 1-2日 | 既存API |
| フェーズ2 | テナント情報統合 | 1日 | 既存API |
| フェーズ3 | 注文系統合 | 2-3日 | hotel-common実装 |
| フェーズ4 | 統計・管理系統合 | 3-5日 | hotel-common実装 |

## **🏁 成功基準**

1. hotel-saasからの直接データベースアクセスが完全に排除されている
2. 全ての機能がhotel-common APIを通じて動作する
3. パフォーマンスが許容範囲内である
4. エラーハンドリングが適切に実装されている

---
**作成日時**: 2025-08-22
**更新履歴**: 初回作成
