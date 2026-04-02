# PMS UI実装指示書 - Runa実装担当者向け

## 📋 概要

hotel-marketingチームからのUI仕様書を基に、Iza統合管理者による技術チェック完了。
実装可能性・統合整合性を確認済みのため、実装開始を指示いたします。

---

## ✅ Iza技術チェック結果

### **実装判定: 🟢 実装可能・統合促進効果あり**

#### **技術スタック適合性**
- ✅ Vue 3 + TypeScript + Pinia対応
- ✅ レスポンシブデザイン実装可能
- ✅ タッチパネル最適化対応

#### **3システム統合への影響**
- 🟢 **低影響（統合促進）**: 管理画面AIコンシェルジュ連携、勤怠管理一元化
- 🟡 **調整必要**: Walk-in客のhotel-member連携、団体予約統合
- 🟢 **影響なし**: リネン画面独立機能

#### **既存統合仕様との整合性**
- ✅ JWT+PIN認証完全適合
- ✅ RESTful API標準準拠
- ✅ Event-driven連携要件適合

---

## 🎯 実装指示詳細

### **1. フロント画面 (最高優先度)**

#### **基本仕様**
```vue
<template>
  <div class="front-desk-layout">
    <!-- 左側: チェックイン/アウト操作 -->
    <section class="checkin-section">
      <h2>チェックイン/アウト</h2>
      <!-- 44px以上のタッチボタン -->
      <TouchButton size="large" @click="handleCheckin">
        チェックイン
      </TouchButton>
    </section>
    
    <!-- 中央: 予約一覧 -->
    <section class="reservation-list">
      <!-- リアルタイム更新対応 -->
    </section>
    
    <!-- 右側: 顧客情報 -->
    <section class="customer-info">
      <!-- hotel-member連携表示 -->
    </section>
  </div>
</template>
```

#### **技術要件**
- **認証**: JWT+PIN認証統合
- **API**: hotel-common RESTful API使用
- **リアルタイム**: Event-driven更新
- **🟡調整要件**: Walk-in客 → hotel-member連携調整

### **2. 管理画面 (高優先度)**

#### **AIコンシェルジュ統合**
```typescript
// hotel-saas連携コンポーネント
import { useHotelSaasIntegration } from '@/composables/hotel-saas'

const { getAIRecommendations, getOrderHistory } = useHotelSaasIntegration()

// リアルタイムAI提案表示
const aiSuggestions = await getAIRecommendations(customerId)
```

#### **技術要件**
- **統合**: hotel-saas API連携
- **表示**: リアルタイムAI提案
- **権限**: 管理者レベル認証

### **3. キャスト画面 (中優先度)**

#### **勤怠管理統合**
```vue
<template>
  <div class="cast-dashboard">
    <section class="attendance">
      <!-- 一元化された勤怠管理 -->
      <AttendanceWidget :cast-id="castId" />
    </section>
    <section class="notifications">
      <!-- システム間通知統合 -->
      <NotificationPanel :real-time="true" />
    </section>
  </div>
</template>
```

### **4. チェックイン端末 (中優先度)**

#### **団体予約対応**
```typescript
// 🟡調整要件: hotel-member統合
interface GroupReservation {
  groupId: string
  memberIds: string[] // hotel-member連携
  rooms: RoomAssignment[]
}

const handleGroupCheckin = async (groupData: GroupReservation) => {
  // hotel-member API連携処理
  await syncWithMemberSystem(groupData.memberIds)
}
```

### **5. リネン画面 (低優先度)**

#### **独立機能実装**
```vue
<template>
  <div class="linen-management">
    <!-- 統合への影響なし：独立実装可能 -->
    <LinenStatus />
    <CleaningSchedule />
  </div>
</template>
```

---

## 🔧 技術実装ガイドライン

### **必須技術スタック**
- **フレームワーク**: Vue 3 + TypeScript
- **状態管理**: Pinia
- **認証**: hotel-common JWT + PIN
- **API**: hotel-common RESTful標準
- **スタイル**: 44px以上タッチボタン、立ち仕事配慮

### **統合連携要件**
1. **hotel-saas連携**: AIコンシェルジュ、注文履歴
2. **hotel-member連携**: 顧客情報、会員データ
3. **Event-driven**: リアルタイム同期対応

### **開発順序**
1. フロント画面（最高優先度）
2. 管理画面（高優先度）
3. キャスト画面（中優先度）
4. チェックイン端末（中優先度）
5. リネン画面（低優先度）

---

## 📝 注意事項

### **🟡 統合調整が必要な項目**
1. **Walk-in客対応**: hotel-member予約システム連携調整
2. **団体予約**: hotel-member会員システム統合調整

### **✅ 統合完了済み前提**
- JWT認証基盤
- hotel-common API標準
- Event-driven連携

---

## 🎯 実装開始指示

**Runa担当者へ:**

上記仕様に従って、**フロント画面から実装開始**してください。

技術的な統合整合性はIzaが確認済みです。実装中に統合関連の技術的質問があれば、いつでもIzaにエスカレーションしてください。

**実装開始日**: 即座
**完了目標**: フロント画面 → 管理画面 → その他の順序で段階実装

---

*作成者: Iza (統合管理者)*  
*技術チェック完了日: 2025-01-18*  
*基盤仕様: hotel-marketing UI仕様書* 