# メモシステム分離仕様書

## 🚨 緊急対応: 既存実装継続方針

### **システム分離概要**

**既存システム**: 客室特化メモ（継続運用）
- **API**: `/api/v1/admin/room-memos`
- **用途**: 客室清掃・メンテナンス・引継ぎ
- **状態**: **変更なし（現状維持）**
- **データ**: 客室番号必須、客室業務特化

**新システム**: 汎用メモ（追加実装）
- **API**: `/api/v1/memos`
- **用途**: saas・pms間の汎用情報共有
- **状態**: **hotel-common完了後に追加実装**
- **データ**: 客室番号任意、汎用情報共有

---

## 📋 **実装状況**

### ✅ **既存システム保護完了**

**既存API（変更なし）:**
- `GET /api/v1/admin/room-memos` - 客室メモ一覧取得
- `POST /api/v1/admin/room-memos` - 客室メモ作成
- `PUT /api/v1/admin/room-memos/{id}` - 客室メモ更新
- `DELETE /api/v1/admin/room-memos/{id}` - 客室メモ削除
- `GET /api/v1/admin/room-memos/{id}/comments` - コメント取得
- `POST /api/v1/admin/room-memos/{id}/comments` - コメント追加

**既存フロントエンド（変更なし）:**
- `pages/admin/front-desk/operation.vue` - 運用画面
- `pages/admin/front-desk/room-notes.vue` - 客室メモ管理
- `components/StickyNote.vue` - 付箋表示
- `components/StickyNotesBoard.vue` - 付箋ボード
- `components/MemoEditModal.vue` - メモ編集

### 🔄 **新システム準備完了**

**新API（hotel-common実装後）:**
- `GET /api/v1/memos` - 汎用メモ一覧取得
- `POST /api/v1/memos` - 汎用メモ作成
- `PUT /api/v1/memos/{id}` - 汎用メモ更新
- `DELETE /api/v1/memos/{id}` - 汎用メモ削除

**新Composable:**
- `useGenericMemoApi()` - 汎用メモAPI統合
- `useHotelCommonApi()` - Hotel Common API統合
- `useReadStatus()` - 既読未読機能
- `useNotifications()` - WebSocket通知

---

## 🎯 **並行運用設計**

### **用途別使い分け**

**客室メモ（既存システム）:**
- 客室清掃チェックリスト
- 設備メンテナンス記録
- 引継ぎ事項
- 客室特有の問題・要望

**汎用メモ（新システム）:**
- システム間連携情報
- 全体的な業務連絡
- 部門間情報共有
- 長期的な課題管理

### **データ構造の違い**

**客室メモ:**
```typescript
interface RoomMemo {
  id: string
  room_number: string  // 必須
  category: 'cleaning' | 'maintenance' | 'handover' | 'guest_request'
  content: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  created_by: Staff
  assigned_to?: Staff
}
```

**汎用メモ:**
```typescript
interface GenericMemo {
  id: string
  title: string
  content: string
  category: string  // 自由設定
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'active' | 'archived'
  tags: string[]
  room_number?: string  // 任意
  created_by: Staff
  assigned_to?: Staff[]  // 複数可
}
```

---

## 🔧 **実装チェックリスト**

### ✅ **Phase 1: 既存システム保護（完了）**
- [x] 既存API動作確認
- [x] フロントエンド修正（破壊的変更の回避）
- [x] データ整合性確認
- [x] 既存機能テスト

### 🔄 **Phase 2: 新システム準備（進行中）**
- [x] 新API設計
- [x] 新Composable実装
- [x] システム分離設計
- [ ] hotel-common新API実装待ち

### ⏳ **Phase 3: 新システム実装（hotel-common完了後）**
- [ ] 新APIエンドポイント実装
- [ ] 新UI実装
- [ ] 既存システムとの統合
- [ ] 並行運用開始

---

## 🚨 **重要な注意事項**

### **禁止事項（厳守）**
- ❌ 既存の客室メモ機能の破壊的変更
- ❌ フォールバック・モック・一時対応
- ❌ 問題の先送り
- ❌ 2つのシステムの混在

### **必須事項**
- ✅ 既存システムの完全保護
- ✅ 新システムの独立実装
- ✅ 用途別の明確な使い分け
- ✅ エラーは隠蔽せず適切に処理

---

## 📞 **サポート・連絡先**

**既存システム（客室メモ）:**
- API: `/api/v1/admin/room-memos`
- 担当: hotel-saas開発チーム
- 状態: 正常運用中

**新システム（汎用メモ）:**
- API: `/api/v1/memos`
- 担当: hotel-common開発チーム
- 状態: 実装準備中

---

## 📝 **更新履歴**

### 2025-09-16
- 緊急対応: 既存実装継続方針で対応
- システム分離仕様書作成
- 既存システム保護完了
- 新システム準備完了
