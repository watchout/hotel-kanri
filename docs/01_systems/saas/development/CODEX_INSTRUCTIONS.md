# 🤖 Hotel-SaaS Codex開発指示書

## 📋 **プロジェクト概要**

**プロジェクト名**: hotel-saas
**アーキテクチャ**: 統合型マイクロサービス
**技術スタック**: Nuxt 3, Vue 3, TypeScript, Prisma → hotel-common API
**現在フェーズ**: API統合移行（Phase 2）

---

## 🎯 **Codex実行指針**

### **🚨 絶対遵守ルール**

```yaml
禁止事項:
  - Prismaクライアントの直接使用（統合アーキテクチャ違反）
  - モックデータ・フォールバック処理の実装
  - 暫定実装・一時的対応の提案
  - hotel-saas内でのデータベース直接アクセス
  - any型の多用（型安全性確保必須）

必須事項:
  - hotel-common APIを経由したデータアクセス
  - useApiClient().authenticatedFetch()の使用
  - 本番レベルの実装品質
  - TypeScript型安全性の確保
  - エラーハンドリングの統一
```

### **🔧 技術仕様**

#### **API呼び出しパターン（必須）**
```typescript
// ✅ 正しいパターン
const apiClient = useApiClient();
const response = await apiClient.authenticatedFetch('/api/v1/admin/rooms', {
  method: 'GET',
  query: { status: 'available' }
});

// ❌ 禁止パターン
const data = await prisma.room.findMany(); // 直接Prisma使用禁止
const mockData = [{ id: 1, name: 'test' }]; // モックデータ禁止
```

#### **認証パターン（統一）**
```typescript
// JWT認証（統一キー: accessToken）
const token = localStorage.getItem('accessToken');
const { isAuthenticated } = useJwtAuth();

// サーバーサイド認証
const user = await verifyAuth(event);
if (!user) {
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
}
```

#### **エラーハンドリング（統一）**
```typescript
try {
  const response = await apiClient.authenticatedFetch(endpoint);
  return response.data;
} catch (error) {
  console.error(`❌ API呼び出しエラー: ${endpoint}`, error);
  throw createError({
    statusCode: error.status || 500,
    statusMessage: error.message || 'Internal Server Error'
  });
}
```

---

## 🎯 **優先実装タスク**

### **Phase 2A: 重要API復旧（Codex最適化領域）**

#### **1. 認証系API変換**
```bash
対象ファイル:
- server/api/v1/auth/login.post.ts
- server/api/v1/auth/logout.post.ts
- server/api/v1/integration/validate-token.*.ts

変換パターン:
Prisma呼び出し → hotel-common API呼び出し
```

#### **2. ダッシュボード系API変換**
```bash
対象ファイル:
- server/api/v1/admin/summary.get.ts
- server/api/v1/admin/devices/count.get.ts
- server/api/v1/admin/orders/monthly-count.get.ts

hotel-common連携:
GET /api/v1/admin/dashboard/summary
GET /api/v1/admin/devices/count
GET /api/v1/admin/orders/statistics
```

#### **3. フロントデスク系API変換**
```bash
対象ファイル:
- server/api/v1/admin/front-desk/checkin.post.ts
- server/api/v1/admin/front-desk/room-orders.get.ts
- server/api/v1/admin/front-desk/billing.post.ts

CheckInSession統合:
POST /api/v1/admin/checkin-sessions
GET /api/v1/admin/checkin-sessions/{id}/orders
POST /api/v1/admin/checkin-sessions/{id}/checkout
```

### **Phase 2B: 型定義自動生成**

#### **hotel-common APIレスポンス型**
```typescript
// 自動生成対象
interface HotelCommonApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

interface CheckInSession {
  id: string;
  sessionNumber: string;
  roomId: string;
  guestName: string;
  checkInAt: string;
  checkOutAt?: string;
  status: 'active' | 'completed' | 'cancelled';
}
```

---

## 🔄 **変換テンプレート**

### **Prisma → hotel-common API変換**

#### **Before（禁止パターン）**
```typescript
// ❌ 変換前（Prisma直接使用）
export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();
  const rooms = await prisma.room.findMany({
    where: { status: 'available' }
  });
  return { success: true, data: rooms };
});
```

#### **After（推奨パターン）**
```typescript
// ✅ 変換後（hotel-common API使用）
export default defineEventHandler(async (event) => {
  // 認証チェック
  const user = await verifyAuth(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${process.env.HOTEL_COMMON_API_URL}/api/v1/admin/rooms`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      },
      query: { status: 'available' }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ 客室データ取得エラー:', error);
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Failed to fetch rooms'
    });
  }
});
```

---

## 📝 **コード生成指針**

### **1. ファイル命名規則**
```bash
API: kebab-case (例: room-orders.get.ts)
コンポーネント: PascalCase (例: RoomList.vue)
Composables: camelCase (例: useRoomApi.ts)
```

### **2. コメント規則**
```typescript
// 日本語コメント必須
/**
 * 客室チェックイン処理
 * @param sessionData チェックインセッション情報
 * @returns チェックイン結果
 */
export async function processCheckin(sessionData: CheckInSessionRequest) {
  // hotel-common APIでチェックイン処理を実行
  const response = await apiClient.authenticatedFetch('/api/v1/admin/checkin-sessions', {
    method: 'POST',
    body: sessionData
  });

  return response.data;
}
```

### **3. エラーメッセージ統一**
```typescript
const ERROR_MESSAGES = {
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  NOT_FOUND: 'リソースが見つかりません',
  VALIDATION_ERROR: '入力データが正しくありません',
  SERVER_ERROR: 'サーバーエラーが発生しました'
};
```

---

## 🧪 **テストコード生成指針**

### **API統合テスト**
```typescript
// 自動生成テンプレート
describe('CheckIn API Integration', () => {
  test('正常なチェックイン処理', async () => {
    const sessionData = {
      roomNumber: '104',
      guestName: '田中太郎',
      checkInAt: new Date().toISOString()
    };

    const response = await $fetch('/api/v1/admin/front-desk/checkin', {
      method: 'POST',
      body: sessionData,
      headers: { Authorization: `Bearer ${testToken}` }
    });

    expect(response.success).toBe(true);
    expect(response.data.sessionNumber).toMatch(/^HOT-\d{8}-\d{3}$/);
  });
});
```

---

## 🎯 **成果物品質基準**

### **必須チェック項目**
- [ ] TypeScriptエラー: 0-2個以内
- [ ] ESLintエラー: 0件
- [ ] hotel-common API統合: 100%
- [ ] 認証チェック: 全APIで実装
- [ ] エラーハンドリング: 統一パターン
- [ ] 型安全性: any型使用禁止
- [ ] コメント: 日本語で詳細記述
- [ ] テストカバレッジ: 80%以上

### **パフォーマンス基準**
- API応答時間: 300ms以内
- メモリ使用量: 最適化済み
- バンドルサイズ: 最小化

---

## 🚀 **実行コマンド例**

### **開発環境確認**
```bash
# サーバー起動確認
npm run dev

# hotel-common接続確認
curl -H "Authorization: Bearer $TOKEN" http://localhost:3400/api/v1/health

# 型チェック
npm run type-check

# テスト実行
npm run test
```

---

## 📋 **Codex実行チェックリスト**

### **実装前確認**
- [ ] hotel-common API仕様確認済み
- [ ] 既存コードの依存関係分析済み
- [ ] 変換対象ファイル特定済み
- [ ] テスト戦略策定済み

### **実装中確認**
- [ ] 統合アーキテクチャ準拠
- [ ] 型安全性確保
- [ ] エラーハンドリング実装
- [ ] 認証チェック実装

### **実装後確認**
- [ ] 動作テスト完了
- [ ] 型チェック通過
- [ ] ESLint通過
- [ ] 統合テスト通過

---

**🎊 この指示書に従って、hotel-saasプロジェクトの効率的で高品質な開発を実現してください！**

最終更新: 2025年9月1日

