# 📚 ドキュメント再構築計画書

**作成日**: 2025年9月17日  
**目的**: 理想的アーキテクチャに基づくドキュメント統一・再構築  
**対象**: 全システムドキュメント  
**原則**: 単一情報源 (Single Source of Truth)

---

## 🎯 **再構築の目的**

### **現在の問題**
- **307ファイル**にJWT関連記述が分散
- 同じ機能が複数ファイルで異なる仕様
- ドキュメントと実装の不整合
- 重複・矛盾する情報の氾濫

### **目標**
- **単一情報源**: 一つの機能は一つのドキュメント
- **実装連動**: ドキュメントと実装の完全同期
- **階層構造**: 明確な参照関係
- **保守性**: 変更時の影響範囲最小化

---

## 🏗️ **新ドキュメント構造**

### **階層設計**

```
docs/
├── 00_MASTER/                    # マスター仕様書（単一情報源）
│   ├── SYSTEM_ARCHITECTURE.md   # システム全体アーキテクチャ
│   ├── AUTHENTICATION.md        # 認証・認可統一仕様
│   ├── API_SPECIFICATION.md     # API統一仕様
│   ├── DATABASE_SCHEMA.md       # データベース統一スキーマ
│   └── ERROR_HANDLING.md        # エラーハンドリング統一仕様
│
├── 01_IMPLEMENTATION/            # 実装ガイド（マスター参照）
│   ├── hotel-common/
│   │   ├── SETUP_GUIDE.md       # セットアップ手順
│   │   ├── AUTH_IMPLEMENTATION.md # 認証実装ガイド
│   │   └── API_IMPLEMENTATION.md  # API実装ガイド
│   ├── hotel-saas/
│   │   ├── SETUP_GUIDE.md
│   │   ├── INTEGRATION_GUIDE.md  # hotel-common統合ガイド
│   │   └── FEATURE_IMPLEMENTATION.md
│   ├── hotel-pms/
│   │   └── (同様の構造)
│   └── hotel-member/
│       └── (同様の構造)
│
├── 02_OPERATIONS/               # 運用ドキュメント
│   ├── DEPLOYMENT.md           # デプロイメント手順
│   ├── MONITORING.md           # 監視・ログ
│   └── TROUBLESHOOTING.md      # トラブルシューティング
│
└── 03_DEVELOPMENT/             # 開発プロセス
    ├── RULES_AND_PROCESSES.md  # 開発ルール
    ├── QUALITY_ASSURANCE.md    # 品質保証
    └── TESTING_GUIDE.md        # テストガイド
```

---

## 📋 **マスター仕様書設計**

### **1. システムアーキテクチャ (MASTER)**

#### **`docs/00_MASTER/SYSTEM_ARCHITECTURE.md`**
```markdown
# システムアーキテクチャ統一仕様書

## 責任分離
- hotel-common: 共通基盤・認証・ビジネスロジック
- hotel-saas: AIコンシェルジュ・UI
- hotel-pms: フロント業務・オフライン対応
- hotel-member: 会員管理・プライバシー

## 通信方式
- 認証: JWT Bearer Token (統一)
- API: RESTful (統一レスポンス形式)
- データベース: PostgreSQL (統一スキーマ)

## 依存関係
hotel-saas  ──┐
hotel-pms   ──┼──→ hotel-common ──→ PostgreSQL
hotel-member──┘

参照実装:
- hotel-common: /01_IMPLEMENTATION/hotel-common/
- 各システム統合: /01_IMPLEMENTATION/{system}/INTEGRATION_GUIDE.md
```

### **2. 認証統一仕様 (MASTER)**

#### **`docs/00_MASTER/AUTHENTICATION.md`**
```markdown
# 認証・認可統一仕様書

## JWT仕様
- Algorithm: HS256
- Access Token TTL: 8時間
- Refresh Token TTL: 30日
- 統一クレーム構造: HotelJWTPayload

## 実装場所
- 統一実装: hotel-common/src/auth/UnifiedAuthService.ts
- 各システム利用: ミドルウェアで自動認証

## エラーコード
- 401: UNAUTHORIZED (未認証)
- 403: INSUFFICIENT_PERMISSIONS (権限不足)
- 419: TOKEN_EXPIRED (期限切れ)

参照実装:
- hotel-common: /01_IMPLEMENTATION/hotel-common/AUTH_IMPLEMENTATION.md
- 統合方法: /01_IMPLEMENTATION/{system}/INTEGRATION_GUIDE.md#authentication
```

### **3. API統一仕様 (MASTER)**

#### **`docs/00_MASTER/API_SPECIFICATION.md`**
```markdown
# API統一仕様書

## 統一レスポンス形式
```typescript
interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ResponseMeta;
}
```

## 認証方式
- Bearer Token: Authorization: Bearer {jwt_token}
- 自動認証: ミドルウェアで処理済み

## エンドポイント設計
- 共通API: hotel-common/api/v1/*
- システム固有: 各システム内で実装

参照実装:
- hotel-common API: /01_IMPLEMENTATION/hotel-common/API_IMPLEMENTATION.md
- 各システム統合: /01_IMPLEMENTATION/{system}/INTEGRATION_GUIDE.md#api
```

---

## 🔄 **実装ガイド設計**

### **実装ガイドの原則**
1. **マスター参照**: 仕様はマスターを参照
2. **実装特化**: 具体的な実装手順のみ記載
3. **コード連動**: 実際のコードと完全同期
4. **段階的**: Phase別の明確な手順

### **例: hotel-common認証実装ガイド**

#### **`docs/01_IMPLEMENTATION/hotel-common/AUTH_IMPLEMENTATION.md`**
```markdown
# hotel-common 認証実装ガイド

## 前提条件
- マスター仕様: /00_MASTER/AUTHENTICATION.md を熟読
- TypeScriptエラー: 0件必須
- 開発環境: Docker統一環境

## Phase 1: 基盤実装

### 1.1 UnifiedAuthService実装
```typescript
// src/auth/UnifiedAuthService.ts
export class UnifiedAuthService {
  // マスター仕様に従った実装
}
```

### 1.2 実装後チェック
```bash
npm run type-check # ✅ Found 0 errors.
npm run test       # ✅ All tests pass
```

## Phase 2: ミドルウェア実装
(具体的な実装手順...)

## 検証方法
```bash
curl -X POST http://localhost:3400/api/v1/auth/login
# 期待レスポンス: マスター仕様準拠
```
```

### **例: hotel-saas統合ガイド**

#### **`docs/01_IMPLEMENTATION/hotel-saas/INTEGRATION_GUIDE.md`**
```markdown
# hotel-saas hotel-common統合ガイド

## 前提条件
- マスター仕様: /00_MASTER/ 全ファイル熟読
- hotel-common: 実装完了・動作確認済み
- TypeScriptエラー: 0件必須

## 認証統合

### 既存認証の削除
```bash
# 重複実装の完全削除
rm server/utils/auth.ts
rm server/middleware/auth.ts
```

### hotel-common認証の利用
```typescript
// server/middleware/00.unified-auth.ts
import { AuthMiddleware } from 'hotel-common/middleware'

export default defineEventHandler(async (event) => {
  const authMiddleware = new AuthMiddleware()
  event.context.auth = await authMiddleware.authenticate(event)
})
```

### API実装パターン
```typescript
// server/api/orders/create.post.ts
export default defineEventHandler(async (event) => {
  // 認証は自動完了済み（重複実装禁止）
  const { user, permissions } = event.context.auth
  
  // ビジネスロジックのみ
  return OrderService.create(body, user.tenantId)
})
```

## 検証方法
- マスター仕様準拠の動作確認
- 重複実装の完全除去確認
```

---

## 🗂️ **既存ドキュメント移行計画**

### **Phase 1: 重複・矛盾の特定**

#### **重複ドキュメント一覧**
```bash
# JWT関連重複ファイル (307個)
docs/01_systems/saas/auth/JWT_AUTH_IMPLEMENTATION.md
docs/01_systems/saas/JWT_AUTH_IMPLEMENTATION.md
docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md
docs/01_systems/common/integration/specifications/jwt-token-specification.md
# ... (他303個)

# 対応方針
1. マスター仕様書に統合
2. 実装ガイドは各システム別に整理
3. 重複ファイルは削除
```

#### **矛盾仕様の統一**
```typescript
// 現在の矛盾例
// ファイルA: POST /api/v1/auth/validate
// ファイルB: GET /api/v1/auth/validate-token

// 統一後: マスター仕様で一意に定義
// POST /api/v1/auth/validate-token
```

### **Phase 2: マスター仕様書作成**

#### **作成順序**
1. **SYSTEM_ARCHITECTURE.md** (最優先)
2. **AUTHENTICATION.md** (高優先)
3. **API_SPECIFICATION.md** (高優先)
4. **DATABASE_SCHEMA.md** (中優先)
5. **ERROR_HANDLING.md** (中優先)

#### **作成プロセス**
```bash
# 各マスター仕様書作成手順
1. 既存ドキュメントから情報収集
2. 矛盾・重複の解消
3. 統一仕様の策定
4. レビュー・承認
5. 実装ガイド作成
```

### **Phase 3: 実装ガイド作成**

#### **システム別実装ガイド**
```bash
# hotel-common (最優先)
docs/01_IMPLEMENTATION/hotel-common/
├── SETUP_GUIDE.md
├── AUTH_IMPLEMENTATION.md
├── API_IMPLEMENTATION.md
└── DATABASE_IMPLEMENTATION.md

# hotel-saas (次優先)
docs/01_IMPLEMENTATION/hotel-saas/
├── SETUP_GUIDE.md
├── INTEGRATION_GUIDE.md
└── FEATURE_IMPLEMENTATION.md

# 他システムも同様
```

### **Phase 4: 既存ドキュメント削除**

#### **削除対象**
```bash
# 重複・矛盾ドキュメントの削除
rm docs/01_systems/saas/JWT_AUTH_IMPLEMENTATION.md
rm docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md
# ... (重複ファイル全て)

# 統合済みドキュメントのみ残存
docs/00_MASTER/AUTHENTICATION.md # ← 統一仕様
docs/01_IMPLEMENTATION/*/AUTH_IMPLEMENTATION.md # ← 実装ガイド
```

---

## 📋 **実装スケジュール**

### **Week 1: マスター仕様書作成**
- **Day 1-2**: SYSTEM_ARCHITECTURE.md
- **Day 3-4**: AUTHENTICATION.md  
- **Day 5**: API_SPECIFICATION.md

### **Week 2: 実装ガイド作成**
- **Day 1-2**: hotel-common実装ガイド
- **Day 3**: hotel-saas統合ガイド
- **Day 4**: hotel-pms統合ガイド
- **Day 5**: hotel-member統合ガイド

### **Week 3: 移行・検証**
- **Day 1-2**: 既存ドキュメント移行
- **Day 3-4**: 重複ファイル削除
- **Day 5**: 整合性検証・承認

---

## ✅ **品質保証**

### **ドキュメント品質基準**
```typescript
interface DocumentQuality {
  single_source_of_truth: "一つの機能は一つのドキュメント";
  implementation_sync: "ドキュメントと実装の完全同期";
  clear_hierarchy: "明確な参照関係";
  maintainability: "変更時の影響範囲最小化";
}
```

### **検証プロセス**
```bash
# 品質チェック
□ 重複情報の完全除去
□ 矛盾仕様の統一
□ 実装との整合性確認
□ 参照関係の明確化
□ 保守性の確保
```

**この再構築により、保守可能で一貫性のあるドキュメント体系を構築します。**
