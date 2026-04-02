# 📋 開発ルール・プロセス定義書

**作成日**: 2025年9月17日  
**適用範囲**: 全システム (hotel-saas, hotel-pms, hotel-member, hotel-common)  
**目的**: 品質保証・設計原則遵守の徹底

---

## 🚨 **絶対遵守事項**

### **❌ 絶対禁止事項**

#### **1. 重複実装の禁止**
```typescript
// ❌ 禁止: 同じ機能の重複実装
// hotel-saas/server/utils/auth.ts
export function validateJWT(token: string) { /* 実装 */ }

// hotel-pms/server/utils/auth.ts  
export function validateJWT(token: string) { /* 同じ実装 */ } // ❌ 禁止

// ✅ 正しい: 共通実装の利用
// hotel-common/src/auth/JWTService.ts
export class JWTService {
  validateToken(token: string) { /* 統一実装 */ }
}

// 各システム
import { JWTService } from 'hotel-common/auth'
```

#### **2. モック・フォールバック実装の禁止**
```typescript
// ❌ 絶対禁止
export async function getUser(id: string) {
  try {
    return await api.getUser(id)
  } catch (error) {
    // ❌ フォールバック禁止
    return { id, name: 'Unknown' }
  }
}

// ❌ 絶対禁止
if (process.env.NODE_ENV === 'development') {
  return mockData // ❌ モック禁止
}

// ✅ 正しい実装
export async function getUser(id: string): Promise<User> {
  try {
    return await api.getUser(id)
  } catch (error) {
    logger.error('Failed to get user', { id, error })
    throw new ApiError('USER_NOT_FOUND', `User ${id} not found`)
  }
}
```

#### **3. TypeScriptエラー放置の禁止**
```bash
# ❌ 絶対禁止: エラーがある状態での実装継続
npm run type-check
# Found 5 errors. ← この状態で実装継続禁止

# ✅ 必須: エラー0件での実装
npm run type-check
# Found 0 errors. ← この状態でのみ実装可能
```

#### **4. 環境依存分岐の禁止**
```typescript
// ❌ 絶対禁止: 環境による動作変更
if (process.env.NODE_ENV === 'development') {
  // 開発環境での特別処理 ❌
}

// ✅ 正しい: 環境非依存の統一実装
export class AuthService {
  // 全環境で同じ動作
}
```

---

## ✅ **必須実装プロセス**

### **Phase 1: 実装前チェック**

#### **1.1 ドキュメント確認**
```bash
# 必須チェックリスト
□ 該当機能の設計書は存在するか？
□ 設計書は最新版か？
□ 実装方針は設計書と一致するか？
□ 依存関係は明確に定義されているか？
```

#### **1.2 重複実装チェック**
```bash
# 重複確認コマンド
grep -r "function functionName" . --include="*.ts"
grep -r "class ClassName" . --include="*.ts"
grep -r "interface InterfaceName" . --include="*.ts"

# 必須確認事項
□ 同じ機能が既に実装されていないか？
□ 既存の共通機能を利用できないか？
□ 新規実装が本当に必要か？
□ 共通化できる部分はないか？
```

#### **1.3 TypeScriptエラー確認**
```bash
# 各モジュールでエラー確認
cd hotel-common && npm run type-check
cd hotel-saas && npm run type-check
cd hotel-pms && npm run type-check
cd hotel-member && npm run type-check

# 全てFound 0 errors.でなければ実装開始禁止
```

### **Phase 2: 実装中チェック**

#### **2.1 設計原則遵守**
```typescript
// 実装時の必須チェック
interface ImplementationChecklist {
  single_responsibility: "一つのクラス・関数は一つの責任のみ";
  dry_principle: "重複コードを書いていないか";
  dependency_inversion: "抽象に依存しているか";
  testability: "テスト可能な設計か";
}

// 例: 正しい実装
export class OrderService {
  constructor(
    private readonly repository: OrderRepository, // 抽象に依存
    private readonly validator: OrderValidator,   // 抽象に依存
    private readonly logger: Logger              // 抽象に依存
  ) {}
  
  async create(data: CreateOrderRequest): Promise<Order> {
    // 単一責任: 注文作成のみ
    await this.validator.validate(data)
    const order = await this.repository.create(data)
    this.logger.info('Order created', { orderId: order.id })
    return order
  }
}
```

#### **2.2 エラーハンドリング**
```typescript
// 統一エラーハンドリングパターン
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 使用例
export async function getUser(id: string): Promise<User> {
  try {
    return await userRepository.findById(id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new ApiError('USER_NOT_FOUND', `User ${id} not found`, 404)
    }
    
    logger.error('Failed to get user', { id, error })
    throw new ApiError('INTERNAL_ERROR', 'Failed to get user', 500)
  }
}
```

### **Phase 3: 実装後チェック**

#### **3.1 品質チェック**
```bash
# TypeScriptエラーチェック
npm run type-check
# ✅ Found 0 errors. 必須

# リントチェック
npm run lint
# ✅ エラー0件必須

# テスト実行
npm run test
# ✅ 全テスト成功必須

# ビルドチェック
npm run build
# ✅ ビルド成功必須
```

#### **3.2 統合テスト**
```bash
# サーバー起動確認
cd hotel-common && npm run dev &
cd hotel-saas && npm run dev &

# API疎通確認
curl http://localhost:3400/health
curl http://localhost:3100/api/healthz

# 認証フロー確認
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hotel.com","password":"test123"}'
```

---

## 📚 **ドキュメント遵守開発**

### **1. 実装前ドキュメント確認**

#### **必須参照ドキュメント**
```typescript
interface RequiredDocuments {
  architecture: "/Users/kaneko/hotel-kanri/docs/architecture/IDEAL_SYSTEM_ARCHITECTURE_DESIGN.md";
  api_design: "/Users/kaneko/hotel-kanri/docs/api/unified-api-specification.md";
  database_design: "/Users/kaneko/hotel-kanri/docs/db/unified-database-schema.md";
  authentication: "/Users/kaneko/hotel-kanri/docs/01_systems/common/integration/specifications/jwt-token-specification.md";
}
```

#### **ドキュメント整合性チェック**
```bash
# 実装前必須確認
□ 実装する機能の設計書は存在するか？
□ 設計書の内容は理解できるか？
□ 設計書に不明点・矛盾点はないか？
□ 依存する他システムの仕様は明確か？

# 不明点がある場合の対応
1. 設計書の更新・明確化を要求
2. 不明点解決まで実装開始禁止
3. 仮定での実装は絶対禁止
```

### **2. 実装中ドキュメント更新**

#### **コードとドキュメントの同期**
```typescript
// コード実装時の必須事項
export class OrderService {
  /**
   * 注文を作成する
   * 
   * @param data 注文作成データ
   * @returns 作成された注文
   * @throws ApiError 検証エラー・作成失敗時
   * 
   * 設計書参照: /docs/api/order-api-specification.md#create-order
   */
  async create(data: CreateOrderRequest): Promise<Order> {
    // 実装
  }
}
```

### **3. 実装後ドキュメント検証**

#### **ドキュメント・実装整合性確認**
```bash
# 必須確認事項
□ 実装内容は設計書と一致するか？
□ APIレスポンス形式は仕様通りか？
□ エラーハンドリングは仕様通りか？
□ 新機能のドキュメントは更新されているか？
```

---

## 🏗️ **本番同等開発環境**

### **1. 環境構成統一**

#### **Docker環境統一**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  hotel-common:
    build: ../hotel-common
    environment:
      - NODE_ENV=development
      - JWT_SECRET=${JWT_SECRET} # 本番同等
      - DATABASE_URL=postgresql://postgres:password@postgresql:5432/hotel_dev
      - REDIS_URL=redis://redis:6379
    ports:
      - "3400:3400"
    depends_on:
      - postgresql
      - redis

  hotel-saas:
    build: ../hotel-saas
    environment:
      - NODE_ENV=development
      - COMMON_API_URL=http://hotel-common:3400
      - JWT_SECRET=${JWT_SECRET} # 本番同等
    ports:
      - "3100:3000"
    depends_on:
      - hotel-common

  postgresql:
    image: postgres:15 # 本番同等バージョン
    environment:
      - POSTGRES_DB=hotel_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7 # 本番同等バージョン
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### **環境変数統一**
```bash
# .env.development (本番同等設定)
NODE_ENV=development
JWT_SECRET=your-production-equivalent-secret
JWT_REFRESH_SECRET=your-production-equivalent-refresh-secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/hotel_dev
REDIS_URL=redis://localhost:6379

# 本番環境との差異
# - データベース名のみ異なる (hotel_dev vs hotel_prod)
# - その他の設定は完全に同一
```

### **2. 認証・セキュリティ統一**

#### **JWT設定統一**
```typescript
// 開発・本番で同一設定
export const jwtConfig = {
  algorithm: 'HS256' as const,
  accessTokenTTL: '8h',
  refreshTokenTTL: '30d',
  issuer: 'hotel-common-auth',
  audience: ['hotel-saas', 'hotel-pms', 'hotel-member']
}

// 環境による分岐は絶対禁止
// 全環境で同じ認証フロー
```

### **3. データベース統一**

#### **マイグレーション統一**
```bash
# 開発・本番で同一マイグレーション
cd hotel-common
npm run db:migrate # 本番同等のマイグレーション実行

# 開発データのシード
npm run db:seed # 本番同等のデータ構造でテストデータ投入
```

---

## 🔍 **品質保証プロセス**

### **1. 自動品質チェック**

#### **pre-commit フック**
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 Pre-commit quality checks..."

# TypeScriptエラーチェック
echo "Checking TypeScript errors..."
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Commit rejected."
  exit 1
fi

# リントチェック
echo "Running linter..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found. Commit rejected."
  exit 1
fi

# テスト実行
echo "Running tests..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit rejected."
  exit 1
fi

echo "✅ All quality checks passed."
```

### **2. 継続的品質監視**

#### **品質メトリクス**
```typescript
interface QualityMetrics {
  typescript_errors: 0; // 必須: 0件
  lint_errors: 0;       // 必須: 0件
  test_coverage: number; // 目標: 80%以上
  code_duplication: number; // 目標: 5%以下
  cyclomatic_complexity: number; // 目標: 10以下
}
```

### **3. 定期レビュー**

#### **週次品質レビュー**
```bash
# 毎週実行する品質チェック
□ 全モジュールのTypeScriptエラー: 0件
□ 新規重複実装の有無確認
□ 設計原則違反の有無確認
□ ドキュメント整合性確認
□ パフォーマンス劣化の有無確認
```

---

## 🎯 **実装開始チェックリスト**

### **実装開始前必須確認**
```bash
# Phase 1: 環境確認
□ Docker環境が正常に起動するか
□ 全サービス間の疎通が確認できるか
□ データベースマイグレーションが成功するか

# Phase 2: コード品質確認  
□ 全モジュールでTypeScriptエラー0件
□ 全モジュールでリントエラー0件
□ 全テストが成功するか

# Phase 3: ドキュメント確認
□ 実装対象機能の設計書が存在するか
□ 設計書の内容に不明点はないか
□ 依存関係は明確に定義されているか

# Phase 4: 重複確認
□ 同じ機能が既に実装されていないか
□ 既存の共通機能を利用できないか
□ 新規実装が本当に必要か

# 全てクリアした場合のみ実装開始可能
```

**この開発ルール・プロセスにより、品質の高い保守可能なシステムを構築します。**
