# 🗄️ SQLite データベース設計書

## OmotenasuAI PMS "Tsukuyomi" ローカルデータベーススキーマ

**対象**: hotel-pms ローカル機能（Electron + SQLite）  
**基盤**: Drizzle ORM + SQLite  
**設計方針**: オフライン優先・hotel-common連携準備済み

---

## 📋 **テーブル設計方針**

### **設計原則**
- **オフライン優先**: 全操作がローカルDBで完結
- **同期準備**: hotel-common連携用のUUID・timestamp準備
- **権限制御**: テーブル単位での操作権限管理
- **監査対応**: 作成日時・更新日時・操作者記録

### **命名規則**
- テーブル名: `snake_case`
- カラム名: `snake_case`  
- 主キー: `id` (UUID)
- 外部キー: `{table_name}_id`
- 日時: `created_at`, `updated_at`

---

## 🏨 **1. 基本マスタテーブル**

### **1.1 スタッフ管理 (staff)**
```sql
CREATE TABLE staff (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  staff_code TEXT UNIQUE NOT NULL,     -- スタッフコード（S001等）
  staff_number TEXT UNIQUE NOT NULL,   -- スタッフ番号（表示用：S001, S002等）
  name TEXT NOT NULL,                  -- 氏名
  pin_hash TEXT NOT NULL,              -- PINのハッシュ値
  photo_url TEXT,                      -- 顔写真URL（任意）
  role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'admin', 'owner')),
  permissions TEXT,                    -- JSON：詳細権限設定
  is_active BOOLEAN DEFAULT true,      -- 有効/無効
  hotel_common_user_id TEXT,          -- hotel-common連携用ID
  last_login_at DATETIME,             -- 最終ログイン
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,                     -- 作成者ID
  updated_by TEXT                      -- 更新者ID
);

CREATE INDEX idx_staff_code ON staff(staff_code);
CREATE INDEX idx_staff_number ON staff(staff_number);
CREATE INDEX idx_staff_role ON staff(role);
```

### **1.2 客室管理 (rooms)**
```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_number TEXT UNIQUE NOT NULL,    -- 部屋番号（101, 102等）
  room_type TEXT NOT NULL,            -- 部屋タイプ（standard, deluxe, suite）
  floor_number INTEGER,               -- 階数
  capacity INTEGER DEFAULT 2,         -- 定員
  base_rate INTEGER NOT NULL,         -- 基本料金（円）
  amenities TEXT,                     -- JSON：アメニティ情報
  is_smoking BOOLEAN DEFAULT false,   -- 喫煙可否
  is_accessible BOOLEAN DEFAULT false, -- バリアフリー対応
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'out_of_order')),
  notes TEXT,                         -- 備考
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_room_number ON rooms(room_number);
CREATE INDEX idx_room_type ON rooms(room_type);
CREATE INDEX idx_room_status ON rooms(status);
```

### **1.3 料金プラン (rate_plans)**
```sql
CREATE TABLE rate_plans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,                 -- プラン名
  room_type TEXT NOT NULL,           -- 対象客室タイプ
  base_rate INTEGER NOT NULL,        -- 基本料金
  additional_person_rate INTEGER DEFAULT 0, -- 追加人数料金
  weekend_multiplier REAL DEFAULT 1.0, -- 週末料金倍率
  peak_season_multiplier REAL DEFAULT 1.0, -- 繁忙期倍率
  min_stay_nights INTEGER DEFAULT 1, -- 最低宿泊数
  advance_booking_days INTEGER,      -- 事前予約必要日数
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,                   -- 有効期間開始
  valid_to DATE,                     -- 有効期間終了
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_plans_active ON rate_plans(is_active, valid_from, valid_to);
```

---

## 🎫 **2. 予約・宿泊管理テーブル**

### **2.1 予約 (reservations)**
```sql
CREATE TABLE reservations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reservation_number TEXT UNIQUE NOT NULL, -- 予約番号（自動生成）
  guest_name TEXT NOT NULL,              -- 宿泊者名
  guest_phone TEXT,                      -- 連絡先
  guest_email TEXT,                      -- メールアドレス
  guest_count INTEGER NOT NULL DEFAULT 1, -- 宿泊人数
  room_id TEXT NOT NULL,                 -- 部屋ID
  rate_plan_id TEXT,                     -- 料金プランID
  checkin_date DATE NOT NULL,            -- チェックイン日
  checkout_date DATE NOT NULL,           -- チェックアウト日
  nights INTEGER NOT NULL,               -- 泊数
  total_amount INTEGER NOT NULL,         -- 合計金額
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  reservation_status TEXT DEFAULT 'confirmed' CHECK (reservation_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  checkin_time DATETIME,                 -- 実際のチェックイン時刻
  checkout_time DATETIME,                -- 実際のチェックアウト時刻
  special_requests TEXT,                 -- 特別要望
  notes TEXT,                           -- 備考
  origin_system TEXT DEFAULT 'pms',     -- 予約元（pms/member/ota/saas）
  hotel_member_guest_id TEXT,           -- hotel-member連携用ゲストID
  hotel_common_reservation_id TEXT,     -- hotel-common連携用予約ID
  sync_status TEXT DEFAULT 'local',     -- 同期状態（local/synced/failed）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (rate_plan_id) REFERENCES rate_plans(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  FOREIGN KEY (updated_by) REFERENCES staff(id)
);

CREATE INDEX idx_reservations_dates ON reservations(checkin_date, checkout_date);
CREATE INDEX idx_reservations_status ON reservations(reservation_status);
CREATE INDEX idx_reservations_sync ON reservations(sync_status);
CREATE INDEX idx_reservations_guest ON reservations(guest_name, guest_phone);
```

### **2.2 会計明細 (billing_items)**
```sql
CREATE TABLE billing_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reservation_id TEXT NOT NULL,         -- 予約ID
  item_type TEXT NOT NULL CHECK (item_type IN ('room_charge', 'service', 'tax', 'discount', 'other')),
  item_name TEXT NOT NULL,              -- 項目名
  quantity INTEGER DEFAULT 1,           -- 数量
  unit_price INTEGER NOT NULL,          -- 単価
  total_amount INTEGER NOT NULL,        -- 小計
  tax_rate REAL DEFAULT 0.10,          -- 税率
  tax_amount INTEGER DEFAULT 0,         -- 税額
  date_charged DATE NOT NULL,           -- 課金日
  notes TEXT,                          -- 備考
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_billing_reservation ON billing_items(reservation_id);
CREATE INDEX idx_billing_date ON billing_items(date_charged);
```

---

## 📊 **3. 売上・集計テーブル**

### **3.1 日報 (daily_reports)**
```sql
CREATE TABLE daily_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  report_date DATE UNIQUE NOT NULL,     -- 日報日付
  total_rooms INTEGER NOT NULL,         -- 総客室数
  occupied_rooms INTEGER NOT NULL,      -- 稼働客室数
  occupancy_rate REAL NOT NULL,         -- 稼働率
  total_revenue INTEGER NOT NULL,       -- 総売上
  room_revenue INTEGER NOT NULL,        -- 客室売上
  service_revenue INTEGER DEFAULT 0,    -- サービス売上
  tax_amount INTEGER DEFAULT 0,         -- 税額
  cash_revenue INTEGER DEFAULT 0,       -- 現金売上
  card_revenue INTEGER DEFAULT 0,       -- カード売上
  other_revenue INTEGER DEFAULT 0,      -- その他売上
  guest_count INTEGER NOT NULL,         -- 宿泊者数
  checkin_count INTEGER DEFAULT 0,      -- チェックイン数
  checkout_count INTEGER DEFAULT 0,     -- チェックアウト数
  no_show_count INTEGER DEFAULT 0,      -- ノーショー数
  special_notes TEXT,                   -- 特記事項
  is_submitted BOOLEAN DEFAULT false,   -- 提出済みフラグ
  submitted_at DATETIME,                -- 提出日時
  submitted_by TEXT,                    -- 提出者
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (submitted_by) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_submitted ON daily_reports(is_submitted);
```

### **3.2 支払い記録 (payments)**
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reservation_id TEXT NOT NULL,         -- 予約ID
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'qr_code', 'bank_transfer', 'other')),
  amount INTEGER NOT NULL,              -- 支払額
  received_amount INTEGER,              -- 受取額（現金時）
  change_amount INTEGER DEFAULT 0,      -- お釣り
  reference_number TEXT,                -- 取引番号
  card_last4 TEXT,                     -- カード下4桁
  payment_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_by TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_time ON payments(payment_time);
```

---

## 🔄 **4. システム管理・同期テーブル**

### **4.1 同期キュー (sync_queue)**
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type TEXT NOT NULL,            -- 対象エンティティ（reservation/guest/payment等）
  entity_id TEXT NOT NULL,              -- 対象ID
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,                -- JSON：同期データ
  priority INTEGER DEFAULT 5,           -- 優先度（1-10）
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'syncing', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,        -- リトライ回数
  max_retries INTEGER DEFAULT 3,        -- 最大リトライ回数
  last_error TEXT,                      -- 最後のエラー
  scheduled_at DATETIME,                -- 実行予定時刻
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status, priority);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX idx_sync_queue_scheduled ON sync_queue(scheduled_at);
```

### **4.2 システム設定 (system_settings)**
```sql
CREATE TABLE system_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  setting_key TEXT UNIQUE NOT NULL,     -- 設定キー
  setting_value TEXT,                   -- 設定値
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,                     -- 説明
  is_system BOOLEAN DEFAULT false,      -- システム設定フラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES staff(id)
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- 初期設定データ
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system) VALUES
('hotel_name', 'サンプルホテル', 'string', 'ホテル名', false),
('tax_rate', '0.10', 'number', '消費税率', false),
('checkin_time', '15:00', 'string', 'チェックイン時刻', false),
('checkout_time', '11:00', 'string', 'チェックアウト時刻', false),
('currency', 'JPY', 'string', '通貨', false),
('timezone', 'Asia/Tokyo', 'string', 'タイムゾーン', true);
```

### **4.3 操作ログ (audit_logs)**
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  table_name TEXT NOT NULL,             -- 対象テーブル
  record_id TEXT NOT NULL,              -- 対象レコードID
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values TEXT,                      -- 変更前データ（JSON）
  new_values TEXT,                      -- 変更後データ（JSON）
  changed_fields TEXT,                  -- 変更フィールド（JSON配列）
  user_id TEXT,                         -- 操作者ID
  ip_address TEXT,                      -- IPアドレス
  user_agent TEXT,                      -- ユーザーエージェント
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES staff(id)
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
```

### **4.4 操作ログ (operation_logs)**

> **📋 更新履歴 (2025年1月27日)**  
> **客室状態変更ログの詳細化対応** - hotel-common統合管理による更新  
> 詳細仕様: [客室状態変更ログ統合仕様書](../hotel-common/docs/integration/specifications/room-operation-log-specification.md)

```sql
CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,                -- 操作者ID
  operation_type TEXT NOT NULL,         -- 操作タイプ（login, logout, create, update, delete, sync等）
  entity_type TEXT,                     -- 対象エンティティタイプ（staff, room, reservation等）
  entity_id TEXT,                       -- 対象ID
  details TEXT,                         -- 操作詳細（JSON）
  ip_address TEXT,                      -- IPアドレス
  user_agent TEXT,                      -- ユーザーエージェント
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES staff(id)
);

CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_date ON operation_logs(created_at);
```

#### **v2.0 客室操作ログ連携仕様 (2025年1月27日追加)**

**hotel-common連携用の詳細アクション**:
```typescript
// 清掃関連
'ROOM_CLEANING_START' | 'ROOM_CLEANING_COMPLETE' | 'ROOM_CLEANING_INSPECTION' | 'ROOM_CLEANING_FAILED'

// メンテナンス関連  
'ROOM_MAINTENANCE_START' | 'ROOM_MAINTENANCE_COMPLETE' | 'ROOM_REPAIR_REQUEST' | 'ROOM_REPAIR_COMPLETE'

// 客室ブロック関連
'ROOM_BLOCK' | 'ROOM_UNBLOCK' | 'ROOM_OUT_OF_ORDER' | 'ROOM_BACK_IN_SERVICE'

// 業務操作関連
'ROOM_INSPECTION' | 'ROOM_SETUP_COMPLETE' | 'ROOM_AMENITY_RESTOCK' | 'ROOM_DEEP_CLEANING'
```

**hotel-common送信用データ構造**:
```typescript
interface PMSRoomOperationLog {
  action: string;              // 詳細アクション
  target_type: 'room';         
  target_id: string;           // 客室ID
  details: {
    room_id: string;
    room_number: string;
    old_status: string;
    new_status: string;
    operation_reason?: string;    // 操作理由
    operation_category?: string;  // 'cleaning' | 'maintenance' | 'guest_service' | 'system' | 'emergency'
    staff_id: string;             // 必須
    department?: string;
    actual_duration?: number;     // 実際の所要時間（分）
    quality_check?: 'passed' | 'failed' | 'pending' | 'not_required';
    triggered_by_system: 'hotel-pms';
    timestamp: string;
  }
}
```

**送信API**: `POST hotel-common:/api/v1/logs/operations`

---

## 🔗 **5. hotel-common連携準備**

### **5.1 外部システム連携ログ (external_sync_logs)**
```sql
CREATE TABLE external_sync_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  system_name TEXT NOT NULL,            -- 連携先システム名
  operation TEXT NOT NULL,              -- 実行操作
  request_data TEXT,                    -- リクエストデータ（JSON）
  response_data TEXT,                   -- レスポンスデータ（JSON）
  status_code INTEGER,                  -- HTTPステータスコード
  is_success BOOLEAN NOT NULL,          -- 成功/失敗
  error_message TEXT,                   -- エラーメッセージ
  execution_time_ms INTEGER,            -- 実行時間（ミリ秒）
  correlation_id TEXT,                  -- 関連ID（トレーシング用）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_external_sync_system ON external_sync_logs(system_name);
CREATE INDEX idx_external_sync_status ON external_sync_logs(is_success);
CREATE INDEX idx_external_sync_date ON external_sync_logs(created_at);
```

### **5.2 ゲストキャッシュ (guest_cache)**
```sql
CREATE TABLE guest_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  hotel_member_user_id TEXT UNIQUE,     -- hotel-member側のユーザーID
  cached_data TEXT NOT NULL,            -- キャッシュデータ（JSON）
  last_synced_at DATETIME,              -- 最終同期日時
  cache_version TEXT,                   -- キャッシュバージョン
  is_dirty BOOLEAN DEFAULT false,       -- 更新フラグ
  expires_at DATETIME,                  -- 有効期限
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_cache_member_id ON guest_cache(hotel_member_user_id);
CREATE INDEX idx_guest_cache_dirty ON guest_cache(is_dirty);
CREATE INDEX idx_guest_cache_expires ON guest_cache(expires_at);
```

---

## 🎯 **次のステップ**

### **データベース初期化**
1. SQLiteファイル作成
2. テーブル作成DDL実行
3. 初期マスタデータ投入
4. Drizzle ORM設定

### **Drizzle ORM定義**
- TypeScript型定義作成
- スキーマファイル生成
- マイグレーション設定

このスキーマ設計で進めてよろしいでしょうか？何か調整が必要な部分があれば修正いたします。

--- 