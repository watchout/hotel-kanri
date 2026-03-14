# ⚡ Codex クイックスタートガイド

## 🚀 **即座実行可能なタスク**

### **1. 最優先: 無効化API復旧（248個 → 10個ずつ段階実行）**

#### **Step 1: 認証系API復旧（4個）**
```bash
# 対象ファイル
server/api/v1/auth/login.post.ts.disabled
server/api/v1/auth/logout.post.ts.disabled
server/api/v1/integration/validate-token.get.ts.disabled
server/api/v1/integration/validate-token.post.ts.disabled
```

**Codex指示:**
```
以下の4つの認証APIファイルを復旧してください：

1. `.disabled`拡張子を削除
2. Prisma直接呼び出しをhotel-common API呼び出しに変換
3. 認証チェック（verifyAuth）を追加
4. エラーハンドリングを統一パターンに変更
5. TypeScript型安全性を確保

変換パターン:
- prisma.staff.findUnique → $fetch(`${HOTEL_COMMON_API_URL}/api/v1/staff`)
- 認証ヘッダー: Authorization: Bearer ${token}
- エラー: createError({ statusCode, statusMessage })

参考: docs/development/CODEX_INSTRUCTIONS.md の変換テンプレート
```

#### **Step 2: ダッシュボード系API復旧（3個）**
```bash
# 対象ファイル
server/api/v1/admin/summary.get.ts.disabled
server/api/v1/admin/devices/count.get.ts.disabled
server/api/v1/admin/orders/monthly-count.get.ts.disabled
```

**Codex指示:**
```
ダッシュボード統計APIを復旧し、hotel-common統合してください：

対象: 3つの統計APIファイル
要件:
1. `.disabled`拡張子削除
2. Prisma集計クエリ → hotel-common統計API
3. 認証必須（管理者権限チェック）
4. キャッシュ対応（5分間）
5. エラー時は500エラーを適切に返す

hotel-common エンドポイント:
- GET /api/v1/admin/dashboard/summary
- GET /api/v1/admin/devices/count
- GET /api/v1/admin/orders/statistics

必須: フォールバック処理は一切実装しない
```

#### **Step 3: フロントデスク系API復旧（3個）**
```bash
# 対象ファイル
server/api/v1/admin/front-desk/checkin.post.ts.disabled
server/api/v1/admin/front-desk/room-orders.get.ts.disabled
server/api/v1/admin/front-desk/billing.post.ts.disabled
```

**Codex指示:**
```
フロントデスク業務APIをCheckInSession対応で復旧してください：

新仕様:
1. チェックイン → CheckInSessionベース
2. 注文取得 → セッション別注文管理
3. 会計処理 → セッション単位決済

hotel-common連携:
- POST /api/v1/admin/checkin-sessions (チェックイン)
- GET /api/v1/admin/checkin-sessions/{id}/orders (注文)
- POST /api/v1/admin/checkin-sessions/{id}/checkout (会計)

重要: 部屋番号直接管理からセッション管理への完全移行
```

---

## 🔧 **型定義自動生成タスク**

### **hotel-common APIレスポンス型生成**

**Codex指示:**
```
types/hotel-common-api.ts ファイルを作成し、以下の型定義を生成してください：

必要な型:
1. 基本レスポンス型（HotelCommonApiResponse<T>）
2. CheckInSession関連型（CheckInSession, CheckInGuest）
3. 認証関連型（Staff, AuthResponse）
4. 統計関連型（DashboardSummary, DeviceCount）
5. 注文関連型（Order, OrderItem, OrderStatus）

要件:
- 全てexportする
- JSDocコメント必須（日本語）
- オプショナル/必須プロパティを正確に
- 日時はISO 8601文字列型
- IDは全てstring型

参考: 既存のtypes/配下のファイル構造
```

---

## 🧪 **テストコード自動生成**

### **API統合テスト生成**

**Codex指示:**
```
tests/integration/api/ ディレクトリに以下のテストファイルを生成してください：

1. auth.test.ts - 認証API統合テスト
2. dashboard.test.ts - ダッシュボードAPI統合テスト
3. front-desk.test.ts - フロントデスクAPI統合テスト

各テストの要件:
- describe/test構造
- 正常系・異常系テスト
- 認証トークン使用
- hotel-common API実際呼び出し
- レスポンス検証（型・データ）
- エラーハンドリング検証

テストデータ:
- 有効なJWTトークン使用
- 実在する客室番号（104, 105, 201）
- 実際のメニューID使用
```

---

## 📝 **Composables自動生成**

### **API呼び出し用Composables**

**Codex指示:**
```
composables/api/ ディレクトリに以下のファイルを生成してください：

1. useAuthApi.ts - 認証API呼び出し
2. useDashboardApi.ts - ダッシュボードAPI呼び出し
3. useFrontDeskApi.ts - フロントデスクAPI呼び出し
4. useCheckInSessionApi.ts - CheckInSession専用API

各Composableの要件:
- useApiClient()使用
- authenticatedFetch()パターン
- 型安全性（TypeScript）
- エラーハンドリング統一
- ローディング状態管理
- リアクティブデータ返却

例:
export const useAuthApi = () => {
  const login = async (credentials) => { ... }
  const logout = async () => { ... }
  return { login, logout }
}
```

---

## 🎯 **実行順序（推奨）**

### **Phase 1: 基盤復旧（1-2時間）**
1. 認証系API復旧（4個）
2. 型定義生成
3. 基本テスト作成

### **Phase 2: 機能復旧（2-3時間）**
1. ダッシュボード系API復旧（3個）
2. フロントデスク系API復旧（3個）
3. Composables生成

### **Phase 3: 検証・最適化（1時間）**
1. 統合テスト実行
2. 型チェック
3. ESLint修正

---

## ✅ **実行確認コマンド**

### **各フェーズ後の確認**
```bash
# 型チェック
npm run type-check

# ESLint
npm run lint

# テスト実行
npm run test

# 開発サーバー起動確認
npm run dev

# hotel-common接続確認
curl -H "Authorization: Bearer $TOKEN" http://localhost:3400/api/v1/health
```

---

## 🚨 **注意事項**

### **絶対に避けること**
- Prismaクライアント直接使用
- モックデータ・フォールバック実装
- any型の多用
- 暫定実装・一時対応

### **必ず実装すること**
- 認証チェック（全API）
- エラーハンドリング統一
- 型安全性確保
- hotel-common API統合

---

**🎊 このガイドに従って、段階的にCodexを活用した効率的な開発を進めてください！**

各ステップ完了後は必ず動作確認を行い、問題があれば即座に修正してから次のステップに進んでください。

