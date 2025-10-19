# 🏨 hotel-common RoomGrade API フィールド追加依頼

**依頼日**: 2025年9月12日
**依頼者**: hotel-saasチーム
**優先度**: 高

## 📋 **概要**

hotel-commonの`GET /api/v1/room-grades`エンドポイントが、データベースに存在するフィールドの一部しか返していません。hotel-saasの客室ランク管理機能で必要なフィールドが不足しているため、APIレスポンスの拡張を依頼します。

## 🔍 **現在の状況**

### **現在のAPIレスポンス**
```json
{
  "grades": [
    {
      "id": "40f18db9-70f7-450d-beb3-3a9eb7168ee0",
      "tenant_id": "default",
      "code": "standard",
      "name": "スタンダード",
      "description": "基本的な設備を備えた客室",
      "created_at": "2025-09-12T04:24:00.000Z",
      "updated_at": "2025-09-12T04:24:14.000Z"
    }
  ]
}
```

### **データベースに存在するが返されていないフィールド**
```sql
-- RoomGradeテーブルの実際のスキーマより
grade_name_en        String?             -- 英語ランク名
grade_level          Int                 -- グレードレベル
default_capacity     Int                 -- 標準収容人数
max_capacity         Int                 -- 最大収容人数
room_size_sqm        Decimal?            -- 客室面積（㎡）
standard_amenities   Json                -- 標準設備
premium_amenities    Json                -- プレミアム設備
included_services    Json                -- 含まれるサービス
member_only          Boolean             -- 会員限定
min_stay_nights      Int                 -- 最小宿泊日数
advance_booking_days Int                 -- 事前予約日数
display_order        Int                 -- 表示順
is_active            Boolean             -- アクティブ状態
is_public            Boolean             -- 公開状態
pricing_category     String?             -- 価格カテゴリ
```

## 🎯 **修正依頼内容**

### **対象エンドポイント**
- `GET /api/v1/room-grades`
- `GET /api/v1/room-grades/:id`

### **必要な修正**
APIレスポンスに以下のフィールドを追加してください：

```json
{
  "grades": [
    {
      "id": "40f18db9-70f7-450d-beb3-3a9eb7168ee0",
      "tenant_id": "default",
      "code": "standard",
      "name": "スタンダード",
      "grade_name_en": "Standard",           // ← 追加
      "description": "基本的な設備を備えた客室",
      "grade_level": 1,                      // ← 追加
      "default_capacity": 2,                 // ← 追加
      "max_capacity": 4,                     // ← 追加
      "room_size_sqm": 25.5,                 // ← 追加
      "standard_amenities": ["Wi-Fi", "エアコン"], // ← 追加
      "premium_amenities": ["ジャグジー"],    // ← 追加
      "included_services": [],               // ← 追加
      "member_only": false,                  // ← 追加
      "min_stay_nights": 1,                  // ← 追加
      "advance_booking_days": 0,             // ← 追加
      "display_order": 1,                    // ← 追加
      "is_active": true,                     // ← 追加
      "is_public": true,                     // ← 追加
      "pricing_category": null,              // ← 追加
      "created_at": "2025-09-12T04:24:00.000Z",
      "updated_at": "2025-09-12T04:24:14.000Z"
    }
  ]
}
```

## 🔧 **技術的詳細**

### **フィールドマッピング**
```javascript
// データベースフィールド → APIレスポンスフィールド
grade_code           → code
grade_name           → name
grade_name_en        → grade_name_en
room_size_sqm        → room_size_sqm
// その他は同名
```

### **互換性の考慮**
- 既存のフィールド（`id`, `tenant_id`, `code`, `name`, `description`, `created_at`, `updated_at`）は変更しない
- 新しいフィールドを追加するのみ
- 既存のhotel-saasコードとの互換性を保つ

## 📊 **影響範囲**

### **hotel-saas側の対応**
- フロントエンドの客室ランク管理画面で全フィールドが正常に表示される
- 英語ランク名、客室面積などの編集・保存が正常に動作する
- バリデーション処理が適切に機能する

### **他システムへの影響**
- 既存のAPIクライアントには影響なし（フィールド追加のみ）
- hotel-pms、hotel-memberでも同様のフィールドが利用可能になる

## ⏰ **希望対応時期**

**緊急度**: 高
**希望完了日**: 2025年9月15日まで

## 🧪 **テスト方法**

修正後、以下で動作確認をお願いします：

```bash
# APIレスポンス確認
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-ID: default" \
     http://localhost:3400/api/v1/room-grades

# 特定のランク取得
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-ID: default" \
     http://localhost:3400/api/v1/room-grades/40f18db9-70f7-450d-beb3-3a9eb7168ee0
```

## 📞 **連絡先**

**担当者**: hotel-saasチーム
**質問・確認事項**: このドキュメントのコメントまたはSlackでご連絡ください

---

**備考**: この修正により、hotel-saasの客室ランク管理機能が完全に動作するようになり、ユーザーは英語ランク名、客室面積、設備情報などを正常に編集・保存できるようになります。
