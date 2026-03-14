# チェックイン処理のセッション対応移行分析

## 📋 **現在の実装分析**

### **現在のチェックインフロー**
```typescript
// pages/admin/front-desk/operation.vue (Line 3860-3867)
const response = await authenticatedFetch('/api/v1/admin/front-desk/checkin', {
  method: 'POST',
  body: {
    roomNumber: checkinRoom.value.number,
    checkinDate: checkinForm.value.checkinDate,
    guestCount: checkinForm.value.guestCount,
    guests: checkinForm.value.guests
  }
})
```

### **現在のフォーム構造**
```typescript
// Line 2162-2167
const checkinForm = ref<CheckinForm>({
  checkinDate: '',
  checkoutDate: '',  // 現在は使用されていない
  guestCount: 1,
  guests: []
})
```

## 🔄 **セッション対応への変更点**

### **1. APIリクエスト形式の変更**

#### **Before (現在)**
```typescript
{
  roomNumber: string,
  checkinDate: string,
  guestCount: number,
  guests: CheckinGuestInfo[]
}
```

#### **After (セッション対応)**
```typescript
{
  roomNumber: string,
  reservationId?: string,        // 新規追加
  checkinDate: string,
  expectedCheckout: string,      // checkoutDateから変更
  guestCount: number,
  primaryGuest: {               // 新規追加
    name: string,
    email?: string,
    phone?: string
  },
  guests: Array<{
    guestNumber: number,
    ageGroup: 'adult' | 'child' | 'infant',  // 型を厳密化
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say',
    name?: string,
    phone?: string,
    email?: string,
    notes?: string
  }>,
  notes?: string,               // 新規追加
  specialRequests?: string      // 新規追加
}
```

### **2. APIレスポンス形式の変更**

#### **Before (現在)**
```typescript
{
  success: boolean,
  roomId?: string,
  roomNumber?: string,
  checkinAt?: string
}
```

#### **After (セッション対応)**
```typescript
{
  success: true,
  data: {
    sessionId: string,          // 新規追加（重要）
    sessionNumber: string,      // 新規追加（表示用）
    roomId: string,
    checkedInAt: string,
    expectedCheckOut: string
  }
}
```

### **3. ローカル状態管理の変更**

#### **Before (現在)**
```typescript
// Line 3874-3877
const room = rooms.value.find(r => r.number === checkinRoom.value!.number)
if (room) {
  room.status = 'occupied'
}
```

#### **After (セッション対応)**
```typescript
const room = rooms.value.find(r => r.number === checkinRoom.value!.number)
if (room) {
  room.status = 'occupied'
  room.currentSession = {      // 新規追加
    id: response.data.sessionId,
    sessionNumber: response.data.sessionNumber,
    primaryGuestName: checkinForm.value.primaryGuest?.name || '宿泊者',
    checkedInAt: response.data.checkedInAt,
    guestCount: checkinForm.value.guestCount
  }
}
```

## 🔧 **必要な修正作業**

### **1. フォーム構造の拡張**
```typescript
// 既存のCheckinFormインターフェースを拡張
interface CheckinForm {
  checkinDate: string
  checkoutDate: string          // expectedCheckoutに名称変更
  guestCount: number
  guests: CheckinGuestInfo[]
  primaryGuest?: {              // 新規追加
    name: string
    email?: string
    phone?: string
  }
  notes?: string                // 新規追加
  specialRequests?: string      // 新規追加
}
```

### **2. UI要素の追加**
- **予約ID入力フィールド** (オプション)
- **チェックアウト予定日時** (必須)
- **主要ゲスト情報** (名前・連絡先)
- **特記事項・特別要望** (テキストエリア)

### **3. バリデーション強化**
```typescript
const isCheckinFormValid = computed(() => {
  return checkinForm.value.checkinDate &&
         checkinForm.value.checkoutDate &&          // 新規追加
         checkinForm.value.guestCount > 0 &&
         checkinForm.value.guests.length === checkinForm.value.guestCount &&
         checkinForm.value.primaryGuest?.name &&    // 新規追加
         checkinForm.value.guests.every(guest =>
           guest.ageGroup && guest.gender
         )
})
```

### **4. セッション情報の保存・活用**
```typescript
// セッション情報をローカルストレージに保存（必要に応じて）
const saveSessionInfo = (sessionData: any) => {
  const sessionInfo = {
    sessionId: sessionData.sessionId,
    sessionNumber: sessionData.sessionNumber,
    roomNumber: checkinRoom.value.number,
    checkedInAt: sessionData.checkedInAt
  }

  // 今後の注文処理で使用するため保存
  localStorage.setItem(`session_${checkinRoom.value.number}`, JSON.stringify(sessionInfo))
}
```

## 🎯 **実装優先度**

### **高優先度（Week 1）**
1. ✅ APIリクエスト形式の変更
2. ✅ レスポンス処理の変更
3. ✅ 基本的なフォーム拡張

### **中優先度（Week 2）**
1. ✅ UI要素の追加・改善
2. ✅ バリデーション強化
3. ✅ エラーハンドリング改善

### **低優先度（Week 3以降）**
1. ✅ セッション情報の高度活用
2. ✅ UI/UXの最適化
3. ✅ アクセシビリティ対応

## 🚨 **互換性維持戦略**

### **段階的移行アプローチ**
```typescript
const processCheckinSubmit = async () => {
  try {
    // 新しいセッションAPIを試行
    const { checkin } = useSessionApi()
    const response = await checkin({
      roomNumber: checkinRoom.value.number,
      checkinDate: checkinForm.value.checkinDate,
      expectedCheckout: checkinForm.value.checkoutDate,
      guestCount: checkinForm.value.guestCount,
      primaryGuest: checkinForm.value.primaryGuest || {
        name: checkinForm.value.guests[0]?.name || '宿泊者'
      },
      guests: checkinForm.value.guests,
      notes: checkinForm.value.notes,
      specialRequests: checkinForm.value.specialRequests
    })

    // セッション情報を保存
    saveSessionInfo(response.data)

  } catch (error) {
    console.warn('新しいセッションAPIが利用できません。既存APIを使用します。')

    // フォールバック: 既存APIを使用
    const { authenticatedFetch } = useApiClient()
    const response = await authenticatedFetch('/api/v1/admin/front-desk/checkin', {
      method: 'POST',
      body: {
        roomNumber: checkinRoom.value.number,
        checkinDate: checkinForm.value.checkinDate,
        guestCount: checkinForm.value.guestCount,
        guests: checkinForm.value.guests
      }
    })
  }
}
```

## 📝 **テストケース**

### **基本機能テスト**
1. ✅ 新しいフォーム項目の入力・バリデーション
2. ✅ セッション作成APIの呼び出し
3. ✅ レスポンス処理・状態更新
4. ✅ エラーハンドリング・フォールバック

### **互換性テスト**
1. ✅ 既存APIとの並行動作
2. ✅ データ形式の相互変換
3. ✅ エラー時のフォールバック動作

---

**この分析に基づいて、段階的で安全なチェックイン処理の移行を実現します。**

