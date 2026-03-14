# Staff統一移行ガイド - hotel-saas & hotel-common

**対象**: hotel-saas開発者、hotel-common開発者  
**作成日**: 2025年9月16日  
**実装期間**: 2-3週間

## 🎯 移行の目的

`User`概念を廃止し、`Staff`中心の設計に統一することで：
- システム全体の一貫性向上
- 概念的混乱の解消
- 実装と仕様の整合性確保

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

**理由**:
- エラーの隠蔽により問題発見が困難
- 一時対応の恒久化による技術的負債
- システム整合性の破綻
- デバッグ困難化

### **✅ 必須事項**

**正面からの問題解決**
- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

## 📋 Phase別実装ガイド

---

## 🏗️ Phase 2: hotel-common実装（1週間）

### 担当者
**hotel-common開発者**

### 実装すべきエンドポイント

#### 1. スタッフ一覧取得（最優先）
```typescript
GET /admin/staff

// クエリパラメータ
interface StaffListQuery {
  page?: number;           // デフォルト: 1
  pageSize?: number;       // デフォルト: 20, 最大: 100
  search?: string;         // 名前、メール、スタッフコードで検索
  departmentCode?: string; // 部門フィルタ
  employmentStatus?: 'active' | 'inactive' | 'suspended' | 'terminated';
  baseLevel?: number;      // 1-5の権限レベル
  sortBy?: 'displayName' | 'staffCode' | 'departmentCode' | 'baseLevel' | 'lastLoginAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// レスポンス
interface StaffListResponse {
  data: StaffSummary[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  summary: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    departmentCounts: Record<string, number>;
  };
}
```

#### 2. スタッフ詳細取得（高優先）
```typescript
GET /admin/staff/:id

// レスポンス: 完全なStaffオブジェクト
interface StaffDetail {
  id: string;
  tenantId: string;
  staffCode: string;
  staffNumber: string;
  lastName: string;
  firstName: string;
  displayName: string;
  email: string;
  departmentCode: string;
  positionTitle: string;
  baseLevel: number;
  employmentType: string;
  employmentStatus: string;
  hireDate: string;
  lastLoginAt: string | null;
  // ... その他のフィールド
}
```

#### 3. スタッフ作成（中優先）
```typescript
POST /admin/staff

// リクエストボディ
interface StaffCreateRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  staffCode: string;
  staffNumber: string;
  departmentCode?: string;
  positionTitle?: string;
  baseLevel?: number;
  employmentType?: string;
  // ... その他のオプションフィールド
}
```

#### 4. スタッフ更新（中優先）
```typescript
PATCH /admin/staff/:id

// リクエストボディ（部分更新）
interface StaffUpdateRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  departmentCode?: string;
  positionTitle?: string;
  baseLevel?: number;
  employmentStatus?: string;
  // ... その他の更新可能フィールド
}
```

#### 5. スタッフ削除（低優先）
```typescript
DELETE /admin/staff/:id?soft=true

// レスポンス
interface StaffDeleteResponse {
  success: boolean;
  message: string;
  deletedAt: string | null;
}
```

### 実装の技術要件

#### データベース
```typescript
// staffテーブルを使用（usersテーブルは使用しない）
const staff = await prisma.staff.findMany({
  where: {
    tenantId: tenantId,
    isActive: true,
    deletedAt: null
  },
  orderBy: {
    displayName: 'asc'
  }
});
```

#### 権限チェック
```typescript
// baseLevel による権限管理
const requireAdminLevel = (requiredLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userLevel = req.user?.baseLevel || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `管理者権限（レベル${requiredLevel}以上）が必要です`
      });
    }
    next();
  };
};

// 使用例
app.get('/admin/staff', requireAdminLevel(3), getStaffList);
app.post('/admin/staff', requireAdminLevel(4), createStaff);
```

#### バリデーション
```typescript
// Joi または Zod を使用したバリデーション例
const staffCreateSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  displayName: Joi.string().required(),
  staffCode: Joi.string().pattern(/^S\d{3}$/).required(),
  staffNumber: Joi.string().required(),
  baseLevel: Joi.number().integer().min(1).max(5).default(1)
});
```

#### エラーハンドリング
```typescript
// 統一されたエラーレスポンス
interface ApiError {
  error: string;
  message: string;
  details?: any;
}

// 例
const handleStaffNotFound = (id: string) => ({
  error: 'STAFF_NOT_FOUND',
  message: `スタッフ（ID: ${id}）が見つかりません`,
  details: { staffId: id }
});
```

---

## 💻 Phase 3: hotel-saas移行（1週間）

### 担当者
**hotel-saas開発者**

### 移行対象ファイル

#### 1. 認証システムの中核（最重要）
```typescript
// composables/useJwtAuth.ts
// 変更前
interface AuthState {
  user: any | null;
  token: string | null;
}

// 変更後（互換性維持）
interface AuthState {
  staff: any | null;  // 新しいフィールド
  token: string | null;
}

const useJwtAuth = () => {
  return {
    staff: computed(() => authState.value.staff),
    // 互換性維持（警告付き）
    user: computed(() => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ user is deprecated, use staff instead');
      }
      return authState.value.staff;
    }),
    // ... その他のメソッド
  };
};
```

#### 2. フロントエンドコンポーネント（4箇所）

**A. components/MemoEditModal.vue**
```vue
<script setup>
// 変更前
const { user: currentUser } = useJwtAuth()

// 変更後
const { staff: currentStaff } = useJwtAuth()

// 使用箇所も更新
// currentUser.name → currentStaff.displayName
</script>
```

**B. pages/admin/front-desk/operation.vue**
```vue
<script setup>
// 変更前
const { user, initialize } = useJwtAuth()
const userName = user.value?.name || user.value?.userId

// 変更後
const { staff, initialize } = useJwtAuth()
const staffName = staff.value?.displayName || staff.value?.id
</script>
```

**C. layouts/admin.vue**
```vue
<script setup>
// 変更前
const userId = jwtAuth.user.value?.userId

// 変更後
const staffId = jwtAuth.staff.value?.id
</script>
```

**D. middleware/admin-auth.ts**
```typescript
// 変更前
if (!user.value?.role) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized'
  })
}

// 変更後
if (!staff.value?.baseLevel || staff.value.baseLevel < 3) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Insufficient permissions'
  })
}
```

#### 3. API・サーバーサイド（2箇所）

**A. server/api/v1/auth/login.post.ts**
```typescript
// 変更前
return {
  success: true,
  data: {
    accessToken: token,
    user: res.data.user
  }
}

// 変更後
return {
  success: true,
  data: {
    accessToken: token,
    staff: res.data.staff,  // 新しいフィールド
    user: res.data.staff    // 互換性維持
  }
}
```

**B. server/utils/auth-helpers.ts**
```typescript
// 型定義の更新
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  baseLevel: number;
  departmentCode?: string;
  positionTitle?: string;
}

// AuthUser → AuthStaff にリネーム検討
type AuthStaff = AuthUser;
```

### 段階的移行戦略

#### Week 1: 依存関係の確認と準備
```typescript
// ❌ 禁止: 互換性フィールドでの一時対応
// return {
//   staff: computed(() => authState.value.staff),
//   user: computed(() => authState.value.staff), // これは禁止
// }

// ✅ 正しい方法: hotel-common側の実装完了を待つ
// 1. hotel-common の /admin/staff API実装確認
// 2. 認証レスポンス形式の確認
// 3. 依存関係の解決後に実装開始
```

#### Week 2: 正式な実装（依存関係解決後）
```typescript
// ✅ 正しい実装: 問題を隠蔽しない
const useJwtAuth = () => {
  // hotel-common側の実装が完了していることを前提
  const authState = useState<AuthState>('auth', () => ({
    staff: null,  // 正式なstaffフィールド
    token: null
  }));

  return {
    staff: computed(() => authState.value.staff),
    // user フィールドは完全削除（互換性維持なし）
  };
};
```

#### Week 3: 動作確認と最終調整
```typescript
// ✅ 適切なエラーハンドリング（隠蔽ではない）
if (!staff.value) {
  throw new Error('Staff authentication required');
}
```

### API呼び出しの更新

```typescript
// hotel-commonの新APIを使用
const useStaffApi = () => {
  const fetchStaffList = async (params: StaffListQuery) => {
    return await $fetch('/admin/staff', {
      baseURL: 'http://localhost:3400/api/v1',
      query: params
    });
  };

  const fetchStaffDetail = async (id: string) => {
    return await $fetch(`/admin/staff/${id}`, {
      baseURL: 'http://localhost:3400/api/v1'
    });
  };

  return {
    fetchStaffList,
    fetchStaffDetail
  };
};
```

---

## 🧪 テスト戦略

### hotel-common
```typescript
// APIエンドポイントのテスト
describe('Staff Management API', () => {
  test('GET /admin/staff - should return staff list', async () => {
    const response = await request(app)
      .get('/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });

  test('POST /admin/staff - should create new staff', async () => {
    const newStaff = {
      email: 'test@hotel.com',
      password: 'password123',
      firstName: '太郎',
      lastName: 'テスト',
      displayName: 'テスト 太郎',
      staffCode: 'S999'
    };

    const response = await request(app)
      .post('/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStaff)
      .expect(201);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.email).toBe(newStaff.email);
  });
});
```

### hotel-saas
```typescript
// 認証システムのテスト
describe('useJwtAuth', () => {
  test('should provide staff object', () => {
    const { staff } = useJwtAuth();
    expect(staff.value).toBeDefined();
  });

  test('should maintain user compatibility', () => {
    const { user, staff } = useJwtAuth();
    expect(user.value).toBe(staff.value);
  });
});
```

---

## 📊 進捗管理

### チェックリスト

#### hotel-common開発者
- [ ] **Week 1**
  - [ ] GET /admin/staff 実装
  - [ ] GET /admin/staff/:id 実装
  - [ ] 権限チェック実装
  - [ ] バリデーション実装
  - [ ] 基本テスト実装

- [ ] **Week 2**
  - [ ] POST /admin/staff 実装
  - [ ] PATCH /admin/staff/:id 実装
  - [ ] DELETE /admin/staff/:id 実装
  - [ ] エラーハンドリング強化
  - [ ] 統合テスト実装

#### hotel-saas開発者
- [ ] **Week 1**
  - [ ] useJwtAuth.ts の staff フィールド追加
  - [ ] 互換性維持の実装
  - [ ] 基本動作確認

- [ ] **Week 2**
  - [ ] MemoEditModal.vue 更新
  - [ ] operation.vue 更新
  - [ ] admin.vue 更新
  - [ ] admin-auth.ts 更新

- [ ] **Week 3**
  - [ ] login.post.ts 更新
  - [ ] auth-helpers.ts 更新
  - [ ] 互換性フィールド削除検討
  - [ ] 最終動作確認

---

## 🚨 注意事項・トラブルシューティング

### よくある問題

#### 1. 認証エラー
```typescript
// 問題: JWT内のuser_idがstaffテーブルのIDと一致しない
// 解決: JWTペイロードの確認
const payload = jwt.verify(token, secret);
console.log('JWT payload:', payload);
```

#### 2. 権限エラー
```typescript
// 問題: baseLevelの権限チェックが機能しない
// 解決: staffテーブルのbaseLevelフィールド確認
const staff = await prisma.staff.findUnique({
  where: { id: staffId },
  select: { baseLevel: true }
});
```

#### 3. フロントエンドでのundefinedエラー
```typescript
// 問題: staff.value が undefined
// 解決: 認証状態の確認
const { staff, isAuthenticated } = useJwtAuth();
if (!isAuthenticated.value) {
  // 認証が必要
}
```

### ロールバック計画

#### hotel-common
```typescript
// 新APIを無効化
app.use('/admin/staff', (req, res) => {
  res.status(503).json({
    error: 'TEMPORARILY_UNAVAILABLE',
    message: 'This endpoint is temporarily unavailable'
  });
});
```

#### hotel-saas
```typescript
// userフィールドに戻す
const useJwtAuth = () => {
  return {
    user: computed(() => authState.value.user), // 元に戻す
    // staff: computed(() => authState.value.user), // コメントアウト
  };
};
```

---

## 📞 サポート・連絡先

### 技術的な質問
- **hotel-common実装**: hotel-common開発者
- **hotel-saas移行**: hotel-saas開発者
- **統合・調整**: kanri（統合管理）

### 緊急時の連絡
- 本番環境での問題発生時は即座に報告
- ロールバックが必要な場合は迅速に対応

### 定期報告
- 毎週金曜日に進捗報告
- 問題発生時は随時共有

---

**この移行により、システム全体の一貫性が大幅に向上します。段階的かつ慎重に実装を進めましょう。**
