# 🚀 フェーズ1: 認証・テナント統合実装

## **📋 実装概要**

hotel-saasアプリケーションとhotel-common APIの統合第一フェーズとして、認証・テナント関連の統合を実装しました。これにより、hotel-saasはhotel-commonが提供する認証APIを使用して、ユーザー認証とテナント情報の取得を行うことができます。

## **✅ 実装済み機能**

### **1. APIクライアント層**

`server/utils/api-client.ts`にhotel-common APIクライアント層を実装しました。このクライアントは以下の機能を提供します：

- エラーハンドリング機能付きの安全なAPI呼び出し
- タイムアウト設定とリトライ機能
- 認証、テナント、統合ヘルスチェック、システム関連APIのメソッド

```typescript
// 使用例
import { authApi, tenantApi } from './api-client';

// トークン検証
const result = await authApi.validateToken(token);

// テナント一覧取得
const tenants = await tenantApi.getAllTenants();
```

### **2. 認証サービスの更新**

`server/utils/authService.v2.ts`に、hotel-common APIを使用した認証サービスを実装しました：

- APIクライアントを使用したトークン検証
- APIエラー時のローカル検証へのフォールバック
- 開発環境用のモック認証

```typescript
// 主な変更点
async validateToken(token: string): Promise<HotelAuthToken | null> {
  try {
    // 統合モードでの認証処理
    if (integrationMode === 'FULL') {
      console.log('🔑 完全統合モード: hotel-common API認証を使用')

      try {
        // hotel-common APIを使用したトークン検証
        const result = await authApi.validateToken(token)

        if (result && result.valid && result.user) {
          console.log(`✅ API経由トークン検証成功: ${result.user.id}`)

          // APIレスポンスからHotelAuthToken形式に変換
          return {
            userId: result.user.id,
            tenantId: result.user.tenant_id || 'default',
            role: result.user.role || 'user',
            systemSource: 'saas',
            permissions: [],
            expiresAt: Date.now() + 86400000
          }
        }
      } catch (apiError) {
        // APIエラー時はローカル検証にフォールバック
      }

      // 以下、ローカル検証コード...
    }
  }
}
```

### **3. 認証ミドルウェアの更新**

`server/middleware/00.unified-auth.v2.ts`に、テナント情報取得機能を追加した認証ミドルウェアを実装しました：

- 認証成功時にテナント情報を取得
- テナント情報をイベントコンテキストに設定

```typescript
// テナント情報取得関数
async function fetchTenantInfo(tenantId: string): Promise<any> {
  try {
    // テナント一覧を取得
    const tenants = await tenantApi.getAllTenants();

    // 指定されたIDのテナントを検索
    const tenant = tenants.find((t: any) => t.id === tenantId);

    if (tenant) {
      console.log(`✅ テナント情報取得成功: ${tenantId}`);
      return tenant;
    } else {
      console.log(`❌ テナント情報取得失敗: テナントID ${tenantId} が見つかりません`);
      return null;
    }
  } catch (error) {
    console.error('テナント情報取得エラー:', error);
    return null;
  }
}

// 認証ミドルウェア内での使用
// 8. テナント情報の取得（スタッフ認証の場合）
if (authResult.user && authResult.user.tenantId) {
  try {
    const tenantInfo = await fetchTenantInfo(authResult.user.tenantId);
    if (tenantInfo) {
      event.context.tenant = tenantInfo;
    }
  } catch (tenantError) {
    console.warn('テナント情報取得エラー:', tenantError);
    // テナント情報取得エラーは認証失敗にはしない
  }
}
```

## **📊 統合状況**

| API | 統合状況 | 備考 |
|-----|---------|------|
| `POST /api/auth/validate` | ✅ 完全統合 | hotel-common APIを使用 |
| `GET /api/tenants` | ✅ 完全統合 | hotel-common APIを使用 |
| `GET /api/hotel-member/integration/health` | ✅ 完全統合 | hotel-common APIを使用 |

## **🔄 移行方法**

現在の実装はv2ファイルとして並行配置されています。本番環境に適用するには以下の手順を実施してください：

1. **ファイルの置き換え**:
   ```bash
   mv server/utils/authService.v2.ts server/utils/authService.ts
   mv server/middleware/00.unified-auth.v2.ts server/middleware/00.unified-auth.ts
   ```

2. **環境変数の設定**:
   ```
   INTEGRATION_MODE=FULL
   HOTEL_COMMON_API_URL=http://localhost:3400
   ```

3. **動作確認**:
   - ログイン機能のテスト
   - 認証が必要なAPIのテスト
   - テナント情報表示のテスト

## **⚠️ 注意点**

1. **フォールバック機構**:
   - API接続エラー時は自動的にローカル検証にフォールバックします
   - 開発環境では常にモック認証を使用可能です

2. **パフォーマンス**:
   - APIリクエストによる認証はローカル検証より若干遅くなる可能性があります
   - 必要に応じてキャッシュ機構を検討してください

3. **エラーハンドリング**:
   - API接続エラーはログに記録されますが、認証失敗にはなりません
   - テナント情報取得エラーも認証失敗にはなりません

## **🔜 次のステップ**

1. **オーダー関連API統合**:
   - オーダー一覧・詳細APIの統合
   - 注文作成・更新APIの統合

2. **db-serviceの段階的置き換え**:
   - テナント関連メソッドの置き換え
   - 認証関連メソッドの置き換え

3. **統合テスト**:
   - エンドツーエンドテストの実施
   - エラーケースのテスト

---
**作成日時**: 2025-08-22
**更新履歴**: 初回作成
