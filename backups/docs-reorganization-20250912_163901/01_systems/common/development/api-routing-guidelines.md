# Hotel-Common APIルーティングガイドライン

## 📐 **エラーが発生しにくいAPIルーティングルール**

このガイドラインは、Nuxt/Nitroでも安定動作し、SaaS側での動的ルート処理でもエラーが起こりにくいAPIルーティング設計原則を定めています。

---

## 🎯 **基本原則**

### 1. **動的パラメータは浅くする**
- **原則**: 動的パラメータは1階層まで
- **理由**: ネストが深いと Nuxt/Nitro で認識エラーが発生しやすい

```typescript
// ✅ 推奨
router.get('/rooms/:roomId', ...)
router.get('/reservations/:reservationId', ...)

// ❌ 避ける
router.get('/rooms/:roomId/memos/:memoId/logs/:logId', ...)
```

**複雑な関連データが必要な場合はクエリパラメータを使用:**
```typescript
// ✅ 推奨
router.get('/memos', ...) // ?roomId=101&logType=maintenance
```

### 2. **index.* ファイルを避ける**
- **原則**: `index.*` ファイルは使用しない
- **理由**: Nuxt/Nitro の既知バグで動的ディレクトリ直下の index が認識されない

```typescript
// ❌ 避ける
server/api/rooms/[roomId]/memos/index.get.ts

// ✅ 推奨
server/api/rooms/[roomId]/memos.get.ts
```

### 3. **リソース名を静的に明示する**
- **原則**: 何をキーにしているかをパスに含める
- **理由**: 後から見てもわかりやすく、ルーティングエラーを防ぐ

```typescript
// ✅ 推奨
router.get('/rooms/by-number/:roomNumber', ...)
router.get('/rooms/by-id/:roomId', ...)
router.get('/reservations/by-guest/:guestId', ...)
```

### 4. **複雑な関連リソースは「親ID＋サブリソース」で統一**
- **原則**: 関連リソースは親リソースを明確にする

```typescript
// ✅ 推奨パターン
router.get('/rooms/:roomId/memos', ...)        // 部屋のメモ一覧
router.post('/rooms/:roomId/memos', ...)       // 部屋にメモ追加
router.get('/rooms/:roomId/memos/:memoId', ...)// 特定メモ詳細
router.delete('/rooms/:roomId/memos/:memoId', ...)
```

### 5. **REST原則にこだわりすぎない**
- **原則**: 複雑な処理はRPC的に割り切る
- **理由**: 無理にRESTfulにすると不安定になる

```typescript
// ✅ 推奨
router.get('/memos/search', ...) // ?roomId=101&type=latest&status=pending
router.post('/billing/calculate', ...) // 複雑な計算処理
```

---

## 🏗️ **Hotel-Common 固有のルール**

### 6. **パス指定の統一**
- **原則**: 相対パスで統一（フルパス指定は避ける）
- **理由**: ルーター統合時の柔軟性を保つ

```typescript
// ✅ 推奨
router.get('/:id', ...)
router.put('/:id', ...)
router.delete('/:id', ...)

// ❌ 避ける
router.get('/api/v1/room-grades/:id', ...)
```

### 7. **サブリソースの命名規則**
- **原則**: 複数形 + 動作を明示

```typescript
// ✅ 推奨
router.get('/:billingId/payments', ...)      // 支払い一覧
router.post('/:billingId/payments', ...)     // 支払い追加
router.get('/:sessionId/calculations', ...)  // 計算結果取得
```

### 8. **システム別ルーティング構造**
```
src/routes/systems/
├── common/          # 全システム共通API
│   ├── auth.routes.ts
│   ├── room-grades.routes.ts
│   └── room-memos.routes.ts
├── saas/           # SaaS専用API
│   ├── orders.routes.ts
│   └── device.routes.ts
├── pms/            # PMS専用API
│   ├── reservation.routes.ts
│   └── room.routes.ts
└── member/         # Member専用API
    └── response-tree.routes.ts
```

---

## ✅ **推奨ルーティングパターン**

### **基本CRUD操作**
```typescript
// リソース一覧・作成
router.get('/', ...)           // GET /api/v1/rooms
router.post('/', ...)          // POST /api/v1/rooms

// 個別リソース操作
router.get('/:id', ...)        // GET /api/v1/rooms/:id
router.put('/:id', ...)        // PUT /api/v1/rooms/:id
router.delete('/:id', ...)     // DELETE /api/v1/rooms/:id
```

### **関連リソース操作**
```typescript
// 親リソースの子リソース
router.get('/:parentId/children', ...)           // 一覧
router.post('/:parentId/children', ...)          // 作成
router.get('/:parentId/children/:childId', ...)  // 詳細
router.put('/:parentId/children/:childId', ...)  // 更新
router.delete('/:parentId/children/:childId', ...)// 削除
```

### **特殊操作**
```typescript
// 状態変更
router.put('/:id/status', ...)        // ステータス更新
router.post('/:id/activate', ...)     // アクティベート
router.post('/:id/deactivate', ...)   // 非アクティベート

// 計算・検索
router.get('/search', ...)            // 検索
router.post('/calculate', ...)        // 計算
router.get('/summary', ...)           // サマリー
```

---

## 🚨 **避けるべきパターン**

### **❌ 深いネスト**
```typescript
// 避ける
router.get('/hotels/:hotelId/floors/:floorId/rooms/:roomId/memos/:memoId', ...)
```

### **❌ index ファイル**
```typescript
// 避ける
src/routes/rooms/[roomId]/index.ts
```

### **❌ 曖昧なパラメータ名**
```typescript
// 避ける
router.get('/:id/items/:id', ...)  // パラメータ名重複

// 推奨
router.get('/:roomId/memos/:memoId', ...)
```

### **❌ 動詞の重複**
```typescript
// 避ける
router.post('/create-room', ...)
router.get('/get-rooms', ...)

// 推奨
router.post('/rooms', ...)
router.get('/rooms', ...)
```

---

## 📋 **チェックリスト**

新しいAPIルートを作成する際は、以下をチェックしてください：

- [ ] 動的パラメータは1階層以内か？
- [ ] `index.*` ファイルを使用していないか？
- [ ] リソース名が明確か？
- [ ] パラメータ名が重複していないか？
- [ ] 相対パスで記述されているか？
- [ ] 適切なHTTPメソッドを使用しているか？
- [ ] 認証ミドルウェアが適用されているか？
- [ ] エラーハンドリングが実装されているか？

---

## 🔄 **既存ルートの修正優先度**

### **高優先度（即座に修正）**
- フルパス指定の統一
- パラメータ名の重複解消

### **中優先度（次回リファクタリング時）**
- 深いネストの解消
- 命名規則の統一

### **低優先度（機能追加時）**
- より明確なリソース名への変更

---

*最終更新: 2025-01-12*
*作成者: hotel-common開発チーム*
