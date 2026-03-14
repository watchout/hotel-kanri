# 📐 SSOT作成ルール（完全版）

**作成日**: 2025年10月2日  
**バージョン**: 1.0.0  
**目的**: 高品質なSSOT（Single Source of Truth）を作成するための完全なガイドライン

---

## 🎯 SSOTとは何か

### 定義
**SSOT（Single Source of Truth）** = **唯一の真実の情報源**

これは単なる「API仕様書」ではない。

### SSOTに含むべき全要素
1. **バックエンド実装方法**（API、DB、サーバーミドルウェア）
2. **フロントエンド実装方法**（Composable、状態管理、クライアントミドルウェア）
3. **システム間連携**（hotel-saas ↔ hotel-common ↔ Redis ↔ PostgreSQL）
4. **処理フロー**（ログイン成功後、ページ遷移時、初回アクセス時）
5. **禁止事項**（やってはいけないこと）
6. **落とし穴**（SSOTに準拠しないと発生する問題）
7. **環境統一要件**（開発・本番で同じ実装）
8. **命名規則**（DB、API、Prisma、変数の統一）

### SSOTの目的
- ✅ 実装者が迷わない
- ✅ 誤実装が起きない
- ✅ 問題を未然に防ぐ
- ✅ システム間で整合性が取れる
- ✅ 開発・本番で同じ動作をする

---

## 📋 SSOT作成プロセス（7フェーズ）

### Phase 0: 既存SSOT読み込み + 本番同等チェック（最重要）
**目的**: SSOT間の整合性を保つ + 本番障害を防ぐ

**実行内容**:
```bash
# 1. 既存SSOT全てを読み込む
/Users/kaneko/hotel-kanri/docs/03_ssot/ 配下の全SSOTを読む

# 2. 本番同等ルールを読み込む（必須）
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md

# 3. 対象機能のハードコード検出
grep -rn "tenantId.*['\"]default['\"]" target-file.ts
grep -rn "tenant_id.*['\"]default['\"]" target-file.ts
grep -rn "||.*['\"]default['\"]" target-file.ts
```

**確認項目**:
- [ ] 既存SSOTで使用されている変数名・フィールド名を把握
- [ ] 命名規則を把握（DB: snake_case, API: camelCase）
- [ ] 同じ概念がどう命名されているか確認（例: `tenant_id`, `session_id`）
- [ ] データ型の使用パターンを把握
- [ ] 認証方式を確認（Session認証 vs JWT）
- [ ] **🔴 テナントIDハードコードの検出（新規追加）**
- [ ] **🔴 環境分岐実装の検出（新規追加）**
- [ ] **🔴 モックデータ常時使用の検出（新規追加）**

**禁止事項**:
- ❌ 既存SSOTを読まずに作成を開始すること
- ❌ 既存SSOTと異なる命名規則を使用すること
- ❌ **本番同等ルールを確認せずに作成すること（新規追加）**
- ❌ **ハードコード検出を実行せずに作成すること（新規追加）**

---

### Phase 1: 既存ドキュメント読み込み
**目的**: プロジェクトの決定事項を把握

**実行内容**:
```bash
# 関連ドキュメントを全て読み込む
/Users/kaneko/hotel-kanri/docs/01_systems/配下のドキュメント
/Users/kaneko/hotel-kanri/docs/architecture/配下のドキュメント
COMPLETE_API_ENDPOINT_LIST.md
AUTHENTICATION_MASTER_SPECIFICATION.md
```

**確認項目**:
- [ ] 技術スタック（認証方式、DB、ORM、状態管理）
- [ ] 既存の設計決定事項
- [ ] システム間連携の方針
- [ ] 既知の問題・課題

**禁止事項**:
- ❌ ドキュメントを読まずに「想像」で仕様を作成すること
- ❌ 過去の設計決定を無視すること

---

### Phase 2: 実装ファイル読み込み
**目的**: 実際の実装を正確に把握

**実行内容**:
```bash
# 関連する実装ファイルを全て読み込む
# バックエンド
/Users/kaneko/hotel-saas/server/api/
/Users/kaneko/hotel-common/src/routes/
/Users/kaneko/hotel-common/src/middleware/
/Users/kaneko/hotel-common/src/auth/

# フロントエンド
/Users/kaneko/hotel-saas/pages/
/Users/kaneko/hotel-saas/composables/
/Users/kaneko/hotel-saas/middleware/
```

**確認項目**:
- [ ] 実際のAPIパス（想像ではなく実ファイルから）
- [ ] リクエスト・レスポンスの実データ構造
- [ ] 実装されている処理フロー
- [ ] 使用されているComposable・ミドルウェア
- [ ] 状態管理の実装方法
- [ ] エラーハンドリングの実装

**禁止事項**:
- ❌ 実装ファイルを読まずに「推測」で記載すること
- ❌ 存在しないAPIパスを記載すること
- ❌ 実装と異なるデータ構造を記載すること

---

### Phase 3: ドキュメント・実装の差異分析 + 本番同等性チェック
**目的**: 「あるべき姿」と「現状」を区別 + 本番障害を防ぐ

**実行内容**:
1. 既存ドキュメントの仕様
2. 実際の実装
3. 両者の差異を分析
4. **🔴 本番同等性の検証（新規追加）**

**確認項目**:
- [ ] ドキュメント通りに実装されているか
- [ ] 実装がドキュメントから逸脱している箇所
- [ ] 「あるべき仕様」は何か
- [ ] 「現在の実装」の問題点
- [ ] **🔴 テナントIDハードコードの有無（新規追加）**
- [ ] **🔴 環境分岐実装の有無（新規追加）**
- [ ] **🔴 本番環境で動作するか（新規追加）**

**記載方法**:
```markdown
## ❌ 現在の実装の問題点

### 🔴 Critical: テナントIDハードコード（本番同等違反）

**ファイル**: /path/to/file.ts (line 42)
**コード**: `const tenantId = user.tenant_id || 'default'`
**症状**: 開発環境では動作するが、本番環境で全機能停止
**原因**: 'default'テナントが本番に存在しない
**対応**: セッションから動的取得に変更（フォールバック禁止）
**修正必須箇所**: /path/to/file.ts (line 42)
**参照**: [SSOT_PRODUCTION_PARITY_RULES.md](./00_foundation/SSOT_PRODUCTION_PARITY_RULES.md)

### 🔴 問題2: Redis不一致

**症状**: ログイン後すぐに401エラー
**原因**: hotel-commonはSimpleRedis、hotel-saasは実Redis
**対応**: hotel-commonも実Redisを使用すべき
**修正必須箇所**: /path/to/file.ts (line 10-20)
```

**禁止事項**:
- ❌ 「ドキュメントが正しい」と決めつけること
- ❌ 「実装が正しい」と決めつけること
- ❌ 差異を無視して記載すること
- ❌ **本番同等性の検証を省略すること（新規追加）**
- ❌ **ハードコードを見逃すこと（新規追加）**

---

### Phase 3.5: 実行トレース（推奨）【革命的手法】
**目的**: 実際の動作を100%正確に記録

**詳細**: [EXECUTION_TRACE_DRIVEN_SSOT.md](/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md)

**実行内容**:
1. トレースログを追加（開発環境のみ）
2. 実際に機能を実行
3. 全ログを記録（ブラウザ、hotel-saas、hotel-common、Redis、PostgreSQL）
4. ログを時系列で統合

**記録する内容**:
```
[T+0ms] ブラウザ
  ↓ API呼び出し
  ↓ 変数の状態

[T+10ms] hotel-saas
  ↓ API中継
  ↓ 変数の変化

[T+20ms] hotel-common
  ↓ 認証処理
  ↓ DB問い合わせ

[T+50ms] PostgreSQL
  ↓ クエリ結果

[T+110ms] Redis
  ↓ セッション作成

[T+160ms] ブラウザ
  ↓ 状態更新
  ↓ Cookie設定
```

**メリット**:
- ✅ 推測ではなく実測
- ✅ 変数変化の完全な可視化
- ✅ システム間連携の完全な理解
- ✅ 問題の早期発見
- ✅ パフォーマンス分析

**トレース結果をSSOTに記載**:
```markdown
## 🎯 [機能名]フロー（実行トレース結果）

**実行日時**: YYYY年MM月DD日 HH:MM:SS
**テストケース**: [具体的なテストケース]

[完全なトレース結果]

**重要な発見**:
- globalUser.value は T+165ms で設定される
- Cookie は T+160ms で設定される
- middleware実行は T+185ms

**落とし穴**:
- T+185ms時点でuser.valueは存在するため、initialize()は不要
- isAuthenticated.valueのみをチェックすると401エラーが発生
```

**禁止事項**:
- ❌ トレースなしで「たぶんこう動く」と推測すること
- ❌ トレース結果を無視すること

---

### Phase 4: SSOT記述（正しい仕様を定義）
**目的**: 「あるべき姿」を明確に定義

**実行内容**:
SSOTには「正しい仕様」を記載し、実装が違反している場合は明確に指摘する

**記載内容**:
1. ✅ **正しい仕様**（あるべき姿）
2. ❌ **現在の実装の問題点**（仕様違反）
3. 🔧 **修正必須箇所**（ファイルパス・行番号）

**禁止事項**:
- ❌ 「現在の実装」をそのままSSOTにすること
- ❌ 問題点を指摘せずに隠すこと
- ❌ 修正箇所を曖昧にすること

---

### Phase 5: 必須要件・問題予防を明記
**目的**: 誤実装を未然に防ぐ

**実行内容**:
以下のセクションを必ず追加

#### 1. 必須要件（CRITICAL）
```markdown
## ⚠️ 必須要件（CRITICAL）

### 1. Redis統一要件
**両システムは全環境（開発・本番）で必ず同じRedisインスタンスを使用すること。**

### 2. 環境統一要件
**開発環境と本番環境で実装を変えてはいけない**
```

#### 2. 禁止事項
```markdown
### 禁止事項
- ❌ ログイン直後に initialize() を呼び出すこと
- ❌ user.value が存在するのに initialize() を呼び出すこと
```

#### 3. 既知の問題（落とし穴）
```markdown
## ❌ SSOTに準拠しないと発生する問題

### 🔴 問題1: ログイン直後に401エラー

**症状**: ログイン成功後、すぐに401エラーでログアウト
**原因**: ミドルウェアで isAuthenticated のみをチェック
**対応策（SSOTに記載済み）**: user.value の存在チェックを優先
```

#### 4. 検証方法
```bash
# Redis接続確認
redis-cli ping

# セッション確認
redis-cli KEYS "hotel:session:*"
```

---

### Phase 6: 既存SSOTとの整合性確認
**目的**: SSOT間の不整合を防ぐ

**実行内容**:
```bash
# 既存SSOTで同じ概念の命名をチェック
grep -r "tenant_id\|tenantId" /Users/kaneko/hotel-kanri/docs/03_ssot/
grep -r "session_id\|sessionId" /Users/kaneko/hotel-kanri/docs/03_ssot/
```

**確認項目**:
- [ ] 同じ概念が同じ名称で記載されているか
- [ ] 命名規則が統一されているか（DB: snake_case, API: camelCase）
- [ ] データ型が統一されているか
- [ ] 認証方式が一致しているか
- [ ] システム間連携の記載が一致しているか

**追加すべき内容**:
```markdown
### 命名規則統一
- **データベース**: snake_case (例: tenant_id, created_at)
- **API/JSON**: camelCase (例: tenantId, createdAt)
- **変数名**: camelCase (JavaScript/TypeScript標準)

**重要**: 同じ概念は必ず同じ名称を使用
- テナントID: DB=tenant_id, API/JSON=tenantId
- セッションID: DB=session_id, API/JSON=sessionId

**認証SSOT連携**:
- user.tenant_id: スタッフの所属テナントID（DB: staff.tenant_id）
- 詳細: [SSOT_SAAS_ADMIN_AUTHENTICATION.md]へのリンク
```

**禁止事項**:
- ❌ 既存SSOTと異なる命名を使用すること
- ❌ 既存SSOTへのクロスリファレンスを省略すること

---

### Phase 7: 最終チェック
**目的**: 完璧なSSOTを保証

**チェックリスト**:

#### バックエンド仕様
- [ ] API仕様（エンドポイント、リクエスト、レスポンス、エラー）
- [ ] 実装ファイルパス（絶対パス・行番号付き）
- [ ] 認証・認可の仕様
- [ ] データベーススキーマ（Prisma + PostgreSQL）
- [ ] サーバー側ミドルウェア
- [ ] システム間連携フロー

#### フロントエンド仕様
- [ ] Composableの詳細仕様
- [ ] グローバル状態の動作
- [ ] クライアント側ミドルウェア
- [ ] ページ遷移時の処理
- [ ] 状態管理の仕組み

#### 命名規則・整合性
- [ ] 命名規則統一セクション
- [ ] 既存SSOTとの整合性
- [ ] クロスリファレンス
- [ ] DB/API/Prismaのマッピング

#### 問題予防
- [ ] 必須要件（CRITICAL）
- [ ] 禁止事項
- [ ] 落とし穴（SSOTに準拠しないと発生する問題）
- [ ] 検証方法

#### 環境統一
- [ ] 開発・本番で同じ実装
- [ ] 環境変数で接続先を変更
- [ ] 環境別実装の禁止を明記

#### 品質
- [ ] 想像・推測で書いた箇所がないか
- [ ] 全てのファイルパスが正しいか
- [ ] 実装と一致しているか
- [ ] 実装者が迷わないレベルの詳細度か

#### 本番同等性（🔴 新規追加）
- [ ] **テナントIDハードコードが検出・記載されているか**
- [ ] **環境分岐実装が検出・記載されているか**
- [ ] **本番環境で動作することが保証されているか**
- [ ] **SSOT_PRODUCTION_PARITY_RULES.mdへの参照があるか**
- [ ] **禁止パターンの例が明記されているか**

---

## 📐 SSOTテンプレート構造

### 必須セクション

```markdown
# 📊 SSOT: [機能名]

**作成日**: YYYY年MM月DD日  
**バージョン**: 1.0.0  
**ステータス**: 実装済み/実装中/未実装  
**関連システム**: hotel-saas + hotel-common

---

## 📚 関連ドキュメント

- [他のSSO T]へのリンク（絶対パス）
- [実装ファイル]へのリンク（絶対パス）

---

## 📋 概要

### 目的
この機能の完全な仕様を定義する。

### 適用範囲
- 対象システム
- 対象機能

### 技術スタック
- フロントエンド: Nuxt 3 + Vue 3 + TypeScript
- バックエンド: hotel-common (Express + TypeScript)
- 認証方式: Session認証（Redis + HttpOnly Cookie）
  - 詳細: [SSOT_SAAS_ADMIN_AUTHENTICATION.md]へのリンク
- データベース: PostgreSQL（Prisma経由）
- 状態管理: Composables

### 命名規則統一
- **データベース**: snake_case (例: tenant_id, created_at)
- **API/JSON**: camelCase (例: tenantId, createdAt)
- **変数名**: camelCase (JavaScript/TypeScript標準)

**重要**: 同じ概念は必ず同じ名称を使用
- テナントID: DB=tenant_id, API/JSON=tenantId
- セッションID: DB=session_id, API/JSON=sessionId

---

## ⚠️ 必須要件（CRITICAL）

### 1. [要件名]
**[システム/機能]は必ず[条件]を満たすこと。**

この要件を満たさない場合、[問題]が発生します。

#### 正しい設定
```bash
# 環境変数例
REDIS_URL=redis://localhost:6379
```

#### 実装要件
1. [要件1]
2. [要件2]

#### 検証方法
```bash
# 検証コマンド
redis-cli ping
```

### 2. 環境統一要件
**開発環境と本番環境で実装を変えてはいけない**

---

## ❌ SSOTに準拠しないと発生する問題

### 🔴 問題1: [問題名]

**症状**: [具体的な症状]

**原因**: 
```typescript
// ❌ 間違った実装
```

**なぜ発生するか**:
1. [ステップ1]
2. [ステップ2]
3. [ステップ3] → エラー

**対応策（SSOTに記載済み）**:
```typescript
// ✅ 正しい実装
```

**SSOTセクション**: [該当セクション]へのリンク

---

## 🎯 [処理フロー名]

### 全体フロー

```
[システムA]
  ↓
[システムB]
  ↓
[システムC]
```

### 詳細フロー

1. **[ステップ1]**
   - 実装: /absolute/path/to/file.ts (line 10-20)
   - 処理内容: [詳細]

2. **[ステップ2]**
   - 実装: /absolute/path/to/file.ts (line 30-40)
   - 処理内容: [詳細]

---

## 🔒 フロントエンド[機能名]

### [Composable名] Composable

**実装ファイル**: /absolute/path/to/composable.ts

#### グローバル状態
```typescript
const globalState = ref<Type | null>(null);
```

**重要**: [状態の特徴]

#### 主要メソッド

##### 1. [メソッド名]
**実行タイミング**: [タイミング]

**処理フロー**:
```typescript
1. [ステップ1]
2. [ステップ2]
```

**重要**: [注意点]

**禁止**: [やってはいけないこと]

---

## 🚦 クライアント側ミドルウェア仕様

**実装ファイル**: /absolute/path/to/middleware.ts

### 必須要件

#### 1. [特殊処理名]
```typescript
// ❌ 間違い
if (!condition) {
  await dangerousAction();
}

// ✅ 正しい
if (safeCondition) {
  // 安全な処理
} else if (!condition) {
  await safeAction();
}
```

#### 2. 実行順序
```
[イベント1]
  ↓
[処理1]
  ↓
[条件分岐]
  ├─ [ケース1] → [処理A]
  └─ [ケース2] → [処理B]
```

#### 3. 禁止事項
- ❌ [禁止事項1]
- ❌ [禁止事項2]

---

## 🔌 API仕様

### 1. [API名]

#### エンドポイント
```
[METHOD] /api/v1/path
```

#### 実装ファイル
- **hotel-saas (中継)**: /path/to/saas-api.ts (line 1-50)
- **hotel-common (実処理)**: /path/to/common-api.ts (line 100-150)
- **Composable**: /path/to/composable.ts (line 10-20)

#### システム間連携フロー
```
ブラウザ
  ↓ authenticatedFetch('/api/v1/path')
hotel-saas (Nuxt3 API)
  ↓ $fetch('http://localhost:3400/api/v1/path')
  ↓ Cookie: hotel_session={sessionId}
hotel-common (Express API)
  ↓ Middleware.authenticate()
  ↓ SessionService.validate()
Redis
  ← session data
hotel-common
  ↓ db.query()
PostgreSQL
  ← data
```

#### 認証
- **必須**: Session認証 + 管理者権限
- **hotel-saas側**: ミドルウェア名
- **hotel-common側**: ミドルウェア名

#### リクエスト

**フロントエンド → hotel-saas**:
```typescript
authenticatedFetch('/api/v1/path', {
  query: { param: 'value' }
});
```

**hotel-saas → hotel-common**:
```http
GET http://localhost:3400/api/v1/path?param=value
Cookie: hotel_session={sessionId}
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `param` | string | No | - | 説明 |

#### レスポンス（成功）
```json
{
  "success": true,
  "data": {
    "field": "value"
  }
}
```

**データ構造**:
```typescript
interface ApiResponse {
  success: boolean;
  data: {
    field: string;
  };
}
```

**命名規則**:
- API/JSONは`camelCase`
- 認証SSOTの`tenant_id`と同じ概念は同じ変換規則を適用
  - DB: `tenant_id` → API/JSON: `tenantId`

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

**エラーコード**:
| コード | ステータス | 説明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 認証されていない |
| `FORBIDDEN` | 403 | 権限がない |

#### 実装詳細（hotel-common）
```typescript
// 並列処理でパフォーマンス向上
const [data1, data2] = await Promise.all([
  db.query1(),
  db.query2()
]);
```

---

## 🗄️ データベーススキーマ

### 命名規則（Prisma）
- **フィールド名**: `camelCase` (Prismaのデフォルト)
- **実際のカラム名（PostgreSQL）**: `snake_case` (@@map で変換)
- **重要**: 認証SSOTと同じ概念は同じ命名
  - DB: `tenant_id` (PostgreSQL) ↔ Prisma: `tenantId`

### 使用テーブル

#### 1. [テーブル名]
```prisma
model TableName {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")    // ← 認証SSOTと統一
  field       String
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@map("TableName")  // PostgreSQLテーブル名
  @@index([tenantId])
}
```

**マッピング**:
- Prisma: `tenantId` (camelCase)
- PostgreSQL: `tenant_id` (snake_case)
- API/JSON: `tenantId` (camelCase)
- 認証SSOT: `staff.tenant_id` と同じ概念

#### 2. [他システムのテーブル] - 認証SSOTから参照
[他のテーブル]の詳細は以下を参照:
- [SSOT_XXX.md - テーブル名]へのリンク

**主要フィールド**:
- `tenant_id`: テナントID（全テーブルで統一）
- `field`: 説明

---

## 🔧 環境変数

### hotel-saas
```bash
# 接続先
HOTEL_COMMON_API_URL=http://localhost:3400

# Redis接続（セッション認証用）
REDIS_URL=redis://localhost:6379
```

### hotel-common
```bash
# データベース接続
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_db

# Redis接続（セッション認証用）
REDIS_URL=redis://localhost:6379

# サーバーポート
PORT=3400
```

---

## 📊 パフォーマンス最適化

### 並列API呼び出し
```typescript
// ❌ 逐次実行（遅い）
const a = await fetch1();
const b = await fetch2();

// ✅ 並列実行（速い）
const [a, b] = await Promise.all([
  fetch1(),
  fetch2()
]);
```

### データベースクエリ最適化
```typescript
// 並列クエリ実行
const [data1, data2] = await Promise.all([
  db.query1(),
  db.query2()
]);
```

### インデックス活用
```sql
CREATE INDEX idx_table_tenant_field ON "Table"(tenant_id, field);
```

---

## 🧪 テスト要件

### 単体テスト
```typescript
describe('[機能名] API', () => {
  it('[テストケース1]', async () => {
    // テスト内容
  });
});
```

### E2Eテスト
```typescript
describe('[画面名]', () => {
  it('[テストケース1]', async () => {
    // テスト内容
  });
});
```

---

## 📝 実装チェックリスト

### フロントエンド（hotel-saas）
- [ ] ページ作成
- [ ] Composable実装
- [ ] ミドルウェア実装
- [ ] API呼び出し実装
- [ ] エラーハンドリング

### バックエンド（hotel-common）
- [ ] API実装
- [ ] ミドルウェア実装
- [ ] 認証・認可チェック
- [ ] マルチテナント対応
- [ ] エラーハンドリング

### データベース
- [ ] テーブル作成
- [ ] インデックス作成
- [ ] マイグレーション

---

## 🚀 今後の拡張予定

### フェーズ2
- [拡張内容1]
- [拡張内容2]

---

## 📚 参考資料

- [Nuxt 3 ドキュメント](https://nuxt.com/docs)
- [Prisma ドキュメント](https://www.prisma.io/docs)

---

**最終更新**: YYYY年MM月DD日  
**作成者**: AI Assistant ([担当名])  
**レビュー**: 未実施/完了
```

---

## 🚫 禁止事項（絶対に守る）

### Phase 0-3を飛ばすこと
- ❌ 既存SSOTを読まずに作成
- ❌ ドキュメントを読まずに作成
- ❌ 実装ファイルを読まずに作成

### 想像・推測で記載すること
- ❌ 存在しないAPIパスを記載
- ❌ 実装と異なるデータ構造を記載
- ❌ 「〜だと思われる」という表現

### 既存SSOTとの不整合
- ❌ 異なる命名規則を使用
- ❌ 同じ概念を異なる名称で記載
- ❌ クロスリファレンスを省略

### 環境別実装を許容すること
- ❌ 「開発環境だけ〜」という記載
- ❌ 「本番環境だけ〜」という記載
- ❌ 環境変数以外での環境分岐

### フロントエンド仕様の省略
- ❌ Composableの仕様を省略
- ❌ クライアント側ミドルウェアを省略
- ❌ 状態管理の仕組みを省略

### 問題予防セクションの省略
- ❌ 必須要件を省略
- ❌ 禁止事項を省略
- ❌ 落とし穴を省略

### 🚨 SSOT実装中の逸脱（新規追加）
- ❌ エラーが出た時にSSOTを読み直さない
- ❌ システムの境界を越えた実装（hotel-saasでPrisma直接使用等）
- ❌ 開発環境専用のフォールバック実装
- ❌ SSOTを読まずに実装を続ける

**参照**: [ssot_implementation_guard.md](/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md)

---

## ✅ 品質保証チェックリスト

### 完璧なSSOTの条件

#### Phase 0-6 完了
- [ ] 既存SSOT全て読み込み完了
- [ ] 既存ドキュメント読み込み完了
- [ ] 実装ファイル読み込み完了
- [ ] 差異分析完了
- [ ] 正しい仕様定義完了
- [ ] 必須要件・問題予防明記完了
- [ ] 既存SSOTとの整合性確認完了

#### 想像・推測ゼロ
- [ ] 全てのAPIパスが実ファイルから取得
- [ ] 全てのデータ構造が実実装から取得
- [ ] 全ての処理フローが実実装から取得
- [ ] 「〜だと思われる」という表現がない

#### 命名規則統一
- [ ] 命名規則統一セクション追加
- [ ] 既存SSOTと同じ概念は同じ名称
- [ ] DB/API/Prismaのマッピング明記
- [ ] クロスリファレンス追加

#### システム間連携完全
- [ ] フロー図作成
- [ ] 全システムのファイルパス明記（絶対パス・行番号）
- [ ] Composableの詳細仕様
- [ ] クライアント側ミドルウェア仕様

#### 問題予防完全
- [ ] 必須要件（CRITICAL）セクション
- [ ] 禁止事項明記
- [ ] 落とし穴（SSOTに準拠しないと発生する問題）明記
- [ ] 検証方法明記

#### 環境統一完全
- [ ] 開発・本番で同じ実装明記
- [ ] 環境変数のみで差異吸収明記
- [ ] 環境別実装の禁止明記

#### 実装者が迷わない
- [ ] フロントエンド実装方法明確
- [ ] バックエンド実装方法明確
- [ ] 処理フロー明確
- [ ] 禁止事項明確
- [ ] サンプルコード充実

---

## 📖 関連ドキュメント

- [SSOT_DEPTH_ANALYSIS.md](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_DEPTH_ANALYSIS.md) - SSOTの深度分析
- [cursor-rules.json](/Users/kaneko/hotel-kanri/cursor-rules.json) - プロジェクト全体ルール

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Luna)  
**バージョン**: 1.0.0

