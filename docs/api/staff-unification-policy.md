# Staff統一方針 - User概念の廃止とStaff中心設計への移行

**作成日**: 2025年9月16日  
**対象システム**: hotel-common, hotel-saas, hotel-pms, hotel-member  
**優先度**: 高  
**実装期間**: 2-3週間（段階的実装）

## 📋 概要

ホテル統合システムにおいて、`User`概念を廃止し、`Staff`中心の設計に統一することを決定しました。この方針により、システム全体の一貫性と明確性を向上させます。

## 🎯 方針決定の背景

### 現在の問題点

1. **概念的混乱**
   - `User`（汎用ユーザー）と `Staff`（ホテル従業員）の区別が曖昧
   - hotel-memberの `Customer`（顧客）との混同
   - 実装と仕様の乖離

2. **技術的不整合**
   - `users`テーブルは定義されているが未使用
   - `staff`テーブルのみ実際に使用
   - JWT内で`user_id`が実際は`staff.id`を格納

3. **API設計の重複**
   - `/users` API（未実装）と `/admin/staff` API（新規）の重複
   - 既存ドキュメントでの用語の不統一

## 🏗️ 新しい設計方針

### データモデルの明確化

```
┌─────────────────┬─────────────────┬─────────────────┐
│   System        │   Entity        │   Purpose       │
├─────────────────┼─────────────────┼─────────────────┤
│ hotel-common    │ Staff           │ ホテル従業員管理    │
│ hotel-pms       │ Staff           │ 予約・フロント業務   │
│ hotel-saas      │ Staff           │ サービス管理       │
│ hotel-member    │ Customer        │ 宿泊客・会員管理    │
└─────────────────┴─────────────────┴─────────────────┘
```

### API設計の統一

```yaml
# ✅ 新しい統一API設計
Staff Management:
  - GET    /admin/staff           # スタッフ一覧（管理者用）
  - POST   /admin/staff           # スタッフ作成（管理者用）
  - GET    /admin/staff/:id       # スタッフ詳細（管理者用）
  - PATCH  /admin/staff/:id       # スタッフ更新（管理者用）
  - DELETE /admin/staff/:id       # スタッフ削除（管理者用）
  - GET    /staff/:id             # スタッフ情報（認証後）

# ❌ 廃止予定API
Deprecated:
  - GET    /users                 # → /admin/staff に統合
  - POST   /users                 # → /admin/staff に統合
  - GET    /users/:id             # → /admin/staff/:id に統合
  - PATCH  /users/:id             # → /admin/staff/:id に統合
```

## 📊 影響範囲分析

### hotel-common
- **データベース**: `users`テーブルの削除検討
- **API**: `/users` エンドポイントの削除
- **認証**: JWT内の用語統一（`user_id` → `staff_id`）

### hotel-saas
- **フロントエンド**: `user`オブジェクトの`staff`への変更（13箇所）
- **認証**: `useJwtAuth.ts`の`user`フィールド変更
- **API呼び出し**: hotel-commonの新APIへの対応

### hotel-pms
- **認証連携**: hotel-commonとの認証統合
- **スタッフ管理**: 既存のstaff管理機能との統合

### hotel-member
- **影響なし**: 顧客管理は独立して継続

## 🚀 段階的移行計画

### Phase 1: ドキュメント・API仕様統一（完了）
- [x] `common-api.md`の「ユーザー管理API」→「スタッフ管理API」統一
- [x] OpenAPI仕様書の更新
- [x] 方針共有ドキュメント作成

### Phase 2: hotel-common実装（1週間）
**担当**: hotel-common開発者

```typescript
// 実装すべきエンドポイント
GET    /admin/staff           // スタッフ一覧
POST   /admin/staff           // スタッフ作成
GET    /admin/staff/:id       // スタッフ詳細
PATCH  /admin/staff/:id       // スタッフ更新
DELETE /admin/staff/:id       // スタッフ削除
```

**技術要件**:
- `staff`テーブルを使用
- 権限管理（baseLevel）の実装
- ページネーション・検索・フィルタリング
- バリデーション・エラーハンドリング

### Phase 3: hotel-saas移行（1週間）
**担当**: hotel-saas開発者

```typescript
// 変更箇所
1. composables/useJwtAuth.ts
   - user: any | null → staff: any | null
   
2. フロントエンドコンポーネント（4箇所）
   - const { user } = useJwtAuth() → const { staff } = useJwtAuth()
   
3. API呼び出し
   - hotel-commonの新APIエンドポイント使用
```

**互換性維持**:
```typescript
// 移行期間中の互換性維持
return {
  staff: computed(() => authState.value.staff),
  user: computed(() => authState.value.staff), // 互換性維持（警告付き）
}
```

### Phase 4: JWT・データベース統一（1週間）
**担当**: hotel-common開発者

```typescript
// JWT用語統一
interface HierarchicalJWTPayload {
  staff_id: string;     // user_id → staff_id
  email: string;
  role: string;
  level: number;
}
```

**データベース整理**:
```sql
-- users テーブルの削除検討
DROP TABLE IF EXISTS users;

-- staff テーブルの最適化
-- （必要に応じてインデックス追加等）
```

## 🔧 技術実装ガイド

### hotel-common開発者向け

#### 1. API実装の優先順位
```yaml
High Priority:
  - GET /admin/staff        # 一覧取得（検索・フィルタ付き）
  - GET /admin/staff/:id    # 詳細取得
  
Medium Priority:
  - POST /admin/staff       # 作成
  - PATCH /admin/staff/:id  # 更新
  
Low Priority:
  - DELETE /admin/staff/:id # 削除（ソフト削除）
```

#### 2. 権限管理の実装
```typescript
// baseLevel による権限チェック
const checkAdminPermission = (userLevel: number, requiredLevel: number) => {
  return userLevel >= requiredLevel;
};

// 管理者権限チェック
middleware: [
  requireAuth,
  requireAdminLevel(3) // baseLevel 3以上
]
```

#### 3. レスポンス形式の統一
```typescript
// 一覧取得レスポンス
interface StaffListResponse {
  data: StaffSummary[];
  pagination: PaginationInfo;
  summary: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    departmentCounts: Record<string, number>;
  };
}
```

### hotel-saas開発者向け

#### 1. 段階的移行アプローチ
```typescript
// Step 1: 互換性維持しながら staff 追加
const useJwtAuth = () => {
  return {
    staff: computed(() => authState.value.staff),
    user: computed(() => {
      console.warn('user is deprecated, use staff instead');
      return authState.value.staff;
    }),
  };
};

// Step 2: 各コンポーネントで staff 使用に切り替え
// Step 3: user 完全削除
```

#### 2. API呼び出しの更新
```typescript
// 旧: 未実装のため影響なし
// 新: hotel-commonの新APIを使用
const fetchStaffList = async () => {
  const response = await $fetch('/api/admin/staff', {
    baseURL: 'http://localhost:3400'
  });
  return response;
};
```

## 📝 チェックリスト

### hotel-common開発者
- [ ] `/admin/staff` エンドポイント実装
- [ ] 権限管理システムの統合
- [ ] バリデーション・エラーハンドリング
- [ ] テスト実装
- [ ] JWT用語統一の検討

### hotel-saas開発者
- [ ] `useJwtAuth.ts` の更新
- [ ] フロントエンドコンポーネントの更新（13箇所）
- [ ] API呼び出しの更新
- [ ] 互換性維持期間の設定
- [ ] テスト・動作確認

### 共通
- [ ] ドキュメント更新の確認
- [ ] 各システム間の連携テスト
- [ ] 本番環境への段階的デプロイ

## 🚨 重要な実装方針

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

### 破壊的変更の回避
- 既存のJWTトークンとの互換性維持
- 段階的移行による影響最小化
- 十分なテスト期間の確保

### データ整合性の確保
- `staff`テーブルのデータ検証
- 既存認証フローの動作確認
- ロールバック計画の準備

### システム間連携
- hotel-pmsとの認証統合確認
- hotel-memberとの境界明確化
- 各システムでの影響範囲確認

## 📞 連絡・相談

### 技術的な質問
- **hotel-common関連**: hotel-common開発者
- **hotel-saas関連**: hotel-saas開発者
- **統合・調整**: kanri（統合管理）

### 進捗報告
- 各Phase完了時に進捗報告
- 問題発生時は即座に共有
- 週次での進捗確認ミーティング

---

**この方針により、システム全体の一貫性と保守性が大幅に向上します。段階的な移行により、安全かつ確実に実装を進めましょう。**
