# 📋 ホテル会員システム - 更新版MVP仕様書

## 🎯 **MVP機能一覧（更新版）**

### ✅ **追加必須機能**
- **予約機能** - 宿泊予約システム（ポイント付与連動）
- **AR館内宝探し** - 館内AR特典発見ゲーム ⭐

### 📊 **機能一覧表**

| カテゴリ | 機能 | MVP対象 | 備考 |
|---------|------|---------|------|
| 認証 / 会員管理 | OTPログイン（メール / 電話） | ✅ | LINEログインは将来対応 |
| 認証 / 会員管理 | 会員登録・編集・退会 | ✅ | 初期は管理者画面から登録／編集想定 |
| **予約システム** | **宿泊予約・変更・キャンセル** | ✅ | **新規追加** |
| **予約システム** | **予約一覧・履歴確認** | ✅ | **新規追加** |
| ポイント / ランク | ポイント付与・消費 | ✅ | 宿泊・手動・特典交換時に使用 |
| ポイント / ランク | ポイント履歴確認 | ✅ | 会員画面・管理者画面両方から確認可能 |
| ポイント / ランク | ランク表示・条件定義 | ✅ | 還元率もランクで変動、昇格ロジックあり |
| 特典管理 | 特典一覧表示（会員画面） | ✅ | 在庫・必要ポイント表示あり |
| 特典管理 | 特典交換／利用履歴 | ✅ | ポイント減算と履歴記録を含む |
| **AR機能** | **AR館内宝探し** | ✅ | **新規追加・絶対実装** ⭐ |
| **AR機能** | **AR特典発見・収集** | ✅ | **新規追加** |
| 管理画面 | 会員管理（検索・閲覧） | ✅ | ID／名前／電話などで検索可能 |
| 管理画面 | ポイント手動付与 | ✅ | 管理画面から操作可能 |
| 管理画面 | 特典登録・編集・削除 | ✅ | ランク限定特典も定義可 |
| **管理画面** | **予約管理・室割り** | ✅ | **新規追加** |
| **管理画面** | **AR宝探し設定** | ✅ | **新規追加** |

## 🗄️ **データベース定義（更新版）**

### 📄 **新規テーブル**

#### **reservations（予約）**
```sql
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    
    -- 予約情報
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    room_type VARCHAR(100) NOT NULL,
    room_number VARCHAR(50),
    
    -- 料金情報
    total_amount INTEGER NOT NULL,        -- 総額（円）
    points_earned INTEGER DEFAULT 0,     -- 獲得ポイント
    points_used INTEGER DEFAULT 0,       -- 使用ポイント
    
    -- 状態管理
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, confirmed, checked_in, completed, cancelled
    
    -- 特別要望
    special_requests TEXT,
    
    -- システム管理
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_reservations (user_id),
    INDEX idx_group_reservations (group_id),
    INDEX idx_reservation_dates (checkin_date, checkout_date)
);
```

#### **rooms（客室）**
```sql
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    
    -- 客室情報
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(100) NOT NULL,      -- 'standard', 'deluxe', 'suite'
    capacity INTEGER NOT NULL DEFAULT 2,
    
    -- 料金設定
    base_price INTEGER NOT NULL,         -- 基本料金（円）
    
    -- 設備・特徴
    amenities JSON,                      -- 設備リスト
    description TEXT,
    
    -- 状態
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(group_id, room_number)
);
```

#### **ar_treasures（AR宝探し）**
```sql
CREATE TABLE ar_treasures (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    
    -- AR宝の情報
    name VARCHAR(200) NOT NULL,
    description TEXT,
    treasure_type VARCHAR(50) NOT NULL,   -- 'points', 'reward', 'badge'
    
    -- 場所情報
    location_name VARCHAR(200) NOT NULL,  -- 'フロント', '大浴場', 'レストラン'
    location_coords JSON,                 -- GPS座標・AR座標
    
    -- 報酬情報
    reward_points INTEGER DEFAULT 0,
    reward_id INTEGER REFERENCES rewards(id),
    
    -- 発見条件
    required_rank_id INTEGER REFERENCES ranks(id),
    discovery_limit INTEGER DEFAULT 1,    -- 一人当たりの発見回数制限
    
    -- 状態
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_group_treasures (group_id),
    INDEX idx_active_treasures (is_active, valid_from, valid_until)
);
```

#### **ar_discoveries（AR発見履歴）**
```sql
CREATE TABLE ar_discoveries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    treasure_id INTEGER NOT NULL REFERENCES ar_treasures(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    
    -- 発見情報
    discovered_at TIMESTAMP DEFAULT NOW(),
    discovery_location JSON,              -- 発見時の座標
    
    -- 報酬受取状況
    reward_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    
    UNIQUE(user_id, treasure_id),
    INDEX idx_user_discoveries (user_id),
    INDEX idx_treasure_discoveries (treasure_id)
);
```

## 🌐 **API仕様（更新版）**

### 📅 **予約系API**

#### **POST /api/reservations**
```json
{
  "checkin_date": "2024-03-01",
  "checkout_date": "2024-03-03", 
  "guest_count": 2,
  "room_type": "deluxe",
  "special_requests": "禁煙室希望",
  "use_points": 1000
}
```

#### **GET /api/reservations**
```json
{
  "reservations": [
    {
      "id": 1,
      "checkin_date": "2024-03-01",
      "checkout_date": "2024-03-03",
      "room_number": "101",
      "status": "confirmed",
      "total_amount": 25000,
      "points_earned": 500
    }
  ]
}
```

#### **PUT /api/reservations/:id**
```json
{
  "checkin_date": "2024-03-02",
  "special_requests": "朝食付きプランに変更希望"
}
```

#### **DELETE /api/reservations/:id**
```json
{
  "message": "予約をキャンセルしました",
  "refund_points": 500
}
```

### 🗺️ **AR宝探しAPI**

#### **GET /api/ar/treasures**
```json
{
  "treasures": [
    {
      "id": 1,
      "name": "温泉の秘宝",
      "location_name": "大浴場前",
      "reward_points": 100,
      "is_discovered": false,
      "description": "大浴場付近に隠された宝物を探してください"
    }
  ]
}
```

#### **POST /api/ar/discover/:treasure_id**
```json
{
  "discovery_location": {
    "lat": 35.6812,
    "lng": 139.7671,
    "ar_position": "front_desk_area"
  }
}
```

#### **GET /api/ar/discoveries**
```json
{
  "discoveries": [
    {
      "treasure_name": "温泉の秘宝",
      "discovered_at": "2024-02-15T10:30:00Z",
      "reward_points": 100,
      "reward_claimed": true
    }
  ]
}
```

### 🏨 **管理者予約管理API**

#### **GET /api/admin/reservations?date=2024-03-01**
```json
{
  "reservations": [
    {
      "id": 1,
      "user_name": "田中太郎",
      "room_number": "101",
      "checkin_date": "2024-03-01",
      "checkout_date": "2024-03-03",
      "status": "confirmed",
      "guest_count": 2
    }
  ]
}
```

#### **POST /api/admin/ar/treasures**
```json
{
  "name": "新しい宝物",
  "location_name": "ロビー",
  "reward_points": 50,
  "description": "ロビーの隠れた場所に配置"
}
```

## 🖥️ **画面構成（更新版）**

### 👤 **顧客側（スマホWeb）**
- `/login` - OTP認証
- `/mypage` - ポイント・ランク・予約状況
- `/reservations` - 予約一覧・新規予約
- `/reservations/new` - 宿泊予約フォーム
- `/rewards` - 特典カタログ
- `/points` - ポイント履歴
- **`/ar-treasure` - AR宝探しメイン画面** ⭐
- **`/ar-camera` - ARカメラビュー** ⭐

### 🏨 **管理者側（PC）**
- `/admin/login` - 管理者ログイン
- `/admin/dashboard` - ダッシュボード
- `/admin/users` - 会員管理
- `/admin/rewards` - 特典管理
- **`/admin/reservations` - 予約管理・室割り**
- **`/admin/rooms` - 客室管理**
- **`/admin/ar-treasures` - AR宝探し設定**

## 🚀 **AR館内宝探し - 技術仕様**

### 📱 **AR技術スタック**
```javascript
// AR.js + A-Frame による軽量実装
const arTechStack = {
  "ar_engine": "AR.js",          // 軽量、ブラウザベース
  "3d_engine": "A-Frame",        // WebXR対応
  "positioning": "GPS + Marker", // 位置ベース + マーカーベース
  "fallback": "Image Recognition" // GPS未対応時
};
```

### 🗺️ **AR宝探しゲーム設計**
```javascript
// 宝探しゲームロジック
const gameLogic = {
  "discovery_methods": [
    "GPS位置ベース",      // 特定エリアに近づくと発見
    "QRコードスキャン",    // 隠されたQRコードを発見
    "ARマーカー認識",      // 特定のマーカーを認識
    "画像認識",           // 特定の場所の写真を撮影
  ],
  
  "treasure_types": {
    "daily": "毎日発見可能な宝物",
    "limited": "期間限定の特別な宝物", 
    "rare": "低確率で出現するレア宝物",
    "event": "イベント連動の宝物"
  },
  
  "rewards": {
    "points": "ポイント獲得",
    "badges": "称号・バッジ獲得",
    "coupons": "割引クーポン",
    "secrets": "隠れた特典情報"
  }
};
```

### 🎮 **AR UI/UX設計**
```
ARカメラ画面
├── 上部: 発見済み宝物数 / 全体数
├── 中央: ARカメラビュー
│   ├── 宝物の3Dアイコン表示
│   ├── 距離・方向インジケータ
│   └── 発見エフェクト
├── 下部: 宝物リスト・ヒント表示
└── 設定: GPS精度・AR調整
```

## 💻 **技術実装方針**

### 📅 **予約システム**
```python
# FastAPI + SQLAlchemy実装
@router.post("/reservations")
async def create_reservation(
    reservation: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 空室確認
    # 料金計算
    # ポイント計算
    # 予約作成
    # 確認メール送信
    pass
```

### 📱 **AR実装**
```javascript
// AR.js + A-Frame実装
// HTML
<a-scene arjs>
  <a-entity
    gps-entity-place="latitude: 35.681; longitude: 139.767"
    gltf-model="#treasure-model"
    scale="1 1 1"
    look-at="[gps-camera]"
  ></a-entity>
  <a-camera gps-camera rotation-reader></a-camera>
</a-scene>

// JavaScript
navigator.geolocation.getCurrentPosition((position) => {
  checkNearbyTreasures(position.coords);
});
```

## 🔄 **開発優先順位**

### 🥇 **Phase 1: 基本機能（2-3週間）**
1. ✅ 予約システム基本機能
2. ✅ 客室管理機能
3. ✅ 予約管理画面

### 🥈 **Phase 2: AR機能（2-3週間）**
1. ✅ AR宝探し基本機能
2. ✅ GPS位置ベース発見
3. ✅ 宝物設定管理画面

### 🥉 **Phase 3: 統合・最適化（1-2週間）**
1. ✅ 予約→ポイント付与連動
2. ✅ AR→特典連動
3. ✅ 全体のUI/UX調整

## 🎯 **MVP完成の定義**

### ✅ **完成条件**
- [x] 会員登録・OTP認証
- [x] 宿泊予約・変更・キャンセル
- [x] ポイント付与・履歴確認
- [x] 特典交換システム
- [x] AR館内宝探し（GPS位置ベース）
- [x] 管理画面（会員・予約・AR設定）
- [x] スマホ対応レスポンシブUI

### 🚀 **リリース準備**
- [x] 本番環境構築
- [x] セキュリティ対策
- [x] パフォーマンス最適化
- [x] 運用マニュアル作成

この更新版MVP仕様で開発を進めますか？予約機能とAR機能の詳細な技術仕様も作成しましょうか？🎯 