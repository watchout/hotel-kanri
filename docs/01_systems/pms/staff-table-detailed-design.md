# 🌙 Luna主導：Staffテーブル詳細設計書

**設計者**: Luna（hotel-pms担当AI）  
**対象**: 統合データベース staff テーブル  
**用途**: hotel-pms主用途 + hotel-saas/hotel-member兼用  
**準拠**: JWT統合要件・統一データベース仕様

---

## 📋 **設計要件サマリー**

### **🏛️ hotel-pms（主要用途）**
- PIN/パスワード認証システム
- 詳細権限管理（5レベル×部門別×機能別）
- 全操作の操作ログ記録
- 包括的スタッフ管理（勤務・組織・資格）
- UI/機能アクセス制御

### **🌐 hotel-saas/hotel-member（兼用）**
- 管理者レベルの基本認証
- 簡素権限管理（admin/user程度）
- 最小限のユーザー情報管理

### **🤝 統合要件**
- JWT統合仕様準拠
- 既存User→Staff移行対応
- マルチテナント対応
- 統一データベーススキーマ準拠

---

## 🗄️ **Staffテーブル詳細設計**

### **PostgreSQL Schema（統合基盤）**

```sql
-- スタッフマスターテーブル（統合基盤）
CREATE TABLE staff (
  -- 基本ID情報
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  staff_code            TEXT NOT NULL, -- S001, S002 etc
  staff_number          TEXT NOT NULL, -- 表示用番号
  
  -- 個人基本情報
  last_name             TEXT NOT NULL,
  first_name            TEXT NOT NULL,
  last_name_kana        TEXT, -- 姓（カタカナ）
  first_name_kana       TEXT, -- 名（カタカナ）
  display_name          TEXT NOT NULL, -- 表示名
  employee_id           TEXT UNIQUE, -- 従業員番号
  
  -- 認証情報
  email                 TEXT UNIQUE,
  email_verified_at     TIMESTAMP,
  pin_hash              TEXT, -- PIN認証用ハッシュ
  password_hash         TEXT, -- パスワード認証用ハッシュ
  password_changed_at   TIMESTAMP,
  failed_login_count    INTEGER DEFAULT 0,
  locked_until          TIMESTAMP,
  last_login_at         TIMESTAMP,
  
  -- 2FA情報（将来拡張）
  totp_secret           TEXT, -- TOTP秘密鍵
  totp_enabled          BOOLEAN DEFAULT false,
  backup_codes          JSONB, -- バックアップコード配列
  
  -- 権限情報
  role                  TEXT NOT NULL DEFAULT 'staff', -- staff/supervisor/manager/admin/owner
  level                 INTEGER NOT NULL DEFAULT 1, -- 1-5の権限レベル
  permissions           JSONB DEFAULT '{}', -- 詳細権限設定
  department_code       TEXT, -- 部門コード
  position_title        TEXT, -- 役職名
  
  -- 雇用情報
  hire_date             DATE,
  employment_type       TEXT DEFAULT 'full_time', -- full_time/part_time/contract/temporary
  employment_status     TEXT DEFAULT 'active', -- active/inactive/suspended/terminated
  termination_date      DATE,
  termination_reason    TEXT,
  
  -- 連絡先情報
  phone_number          TEXT,
  emergency_contact     JSONB, -- 緊急連絡先情報
  address               JSONB, -- 住所情報
  
  -- プロフィール情報
  photo_url             TEXT, -- プロフィール画像URL
  bio                   TEXT, -- 自己紹介
  skills                JSONB, -- スキル・資格
  
  -- 勤務情報
  shift_pattern         TEXT, -- シフトパターン
  hourly_rate           DECIMAL(10,2), -- 時給
  salary                DECIMAL(10,2), -- 月給
  supervisor_id         UUID REFERENCES staff(id), -- 直属上司
  
  -- 設定・制限
  access_restrictions   JSONB DEFAULT '{}', -- アクセス制限設定
  notification_settings JSONB DEFAULT '{}', -- 通知設定
  ui_preferences        JSONB DEFAULT '{}', -- UI設定
  
  -- セキュリティ・監査
  security_clearance    TEXT, -- セキュリティクリアランス
  access_card_id        TEXT, -- アクセスカードID
  
  -- システム管理
  is_active             BOOLEAN DEFAULT true,
  is_system_user        BOOLEAN DEFAULT false, -- システムユーザーフラグ
  notes                 TEXT, -- 管理者メモ
  
  -- hotel-common統合用
  hotel_common_user_id  UUID, -- 既存User移行用
  legacy_user_data      JSONB, -- 移行時の互換性データ
  
  -- タイムスタンプ
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  created_by            UUID REFERENCES staff(id),
  updated_by            UUID REFERENCES staff(id),
  deleted_at            TIMESTAMP, -- ソフト削除
  
  -- インデックス制約
  CONSTRAINT unique_tenant_staff_code UNIQUE (tenant_id, staff_code),
  CONSTRAINT unique_tenant_staff_number UNIQUE (tenant_id, staff_number),
  CONSTRAINT unique_tenant_employee_id UNIQUE (tenant_id, employee_id)
);

-- インデックス
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_level ON staff(level);
CREATE INDEX idx_staff_department ON staff(department_code);
CREATE INDEX idx_staff_employment_status ON staff(employment_status);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_staff_supervisor ON staff(supervisor_id);
CREATE INDEX idx_staff_created_at ON staff(created_at);
```

---

## 🎭 **権限管理システム設計（修正版）**

### **🔄 既存Luna権限システムとの統合**

**重要**: Lunaには既に柔軟な権限管理システムが実装済みです。Staffテーブル設計はこれらと統合する必要があります。

#### **既存の柔軟権限システム**
```sql
-- 1. 動的権限マスター（UI・機能別）
CREATE TABLE permissions (
  code TEXT UNIQUE,                    -- 'management.dashboard', 'front_desk.checkin'
  name TEXT,                          -- '管理画面ダッシュボード', 'チェックイン機能'
  ui_type TEXT,                       -- 'management', 'front_desk', 'housekeeping', 'cast'
  category TEXT,                      -- 'CORE', 'REPORTS', 'ADMIN'
  is_core BOOLEAN                     -- 必須権限フラグ
);

-- 2. カスタム役割（ホテル独自作成可能）
CREATE TABLE roles (
  tenant_id TEXT,
  name TEXT,                          -- ホテルが自由に命名（'夜勤リーダー', 'VIP担当'等）
  description TEXT,                   -- 役割の説明
  allowed_ui_types TEXT,              -- JSON: アクセス可能UI ["management","front_desk"]
  permissions TEXT,                   -- JSON: 詳細権限 ["management.dashboard", "front_desk.checkin"]
  level INTEGER                       -- 表示順序・階層レベル
);

-- 3. 動的役割割り当て（期限付き・複数役割可能）
CREATE TABLE staff_role_assignments (
  staff_id TEXT,
  role_id TEXT,
  valid_from TEXT,                    -- 有効期間開始
  valid_until TEXT,                   -- 有効期間終了（期限付き権限）
  is_active BOOLEAN
);
```

### **🏗️ 統合基盤でのStaffテーブル設計（修正版）**

```sql
-- スタッフマスターテーブル（統合基盤対応・既存権限システム統合）
CREATE TABLE staff (
  -- 基本ID情報
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  staff_code            TEXT NOT NULL, -- S001, S002 etc
  staff_number          TEXT NOT NULL, -- 表示用番号
  
  -- 個人基本情報
  last_name             TEXT NOT NULL,
  first_name            TEXT NOT NULL,
  last_name_kana        TEXT,
  first_name_kana       TEXT,
  display_name          TEXT NOT NULL,
  employee_id           TEXT UNIQUE,
  
  -- 認証情報
  email                 TEXT UNIQUE,
  email_verified_at     TIMESTAMP,
  pin_hash              TEXT,
  password_hash         TEXT,
  password_changed_at   TIMESTAMP,
  failed_login_count    INTEGER DEFAULT 0,
  locked_until          TIMESTAMP,
  last_login_at         TIMESTAMP,
  
  -- 2FA情報（将来拡張）
  totp_secret           TEXT,
  totp_enabled          BOOLEAN DEFAULT false,
  backup_codes          JSONB,
  
  -- 基本権限情報（既存システム統合）
  default_role_id       UUID REFERENCES roles(id), -- デフォルト役割（既存rolesテーブル参照）
  base_level            INTEGER DEFAULT 1,         -- 基本レベル（表示順序・給与等用）
  department_code       TEXT,                      -- 所属部門
  position_title        TEXT,                      -- 役職名
  
  -- ※ 詳細権限は既存の staff_role_assignments + roles + permissions で管理
  -- ※ permissions フィールドは削除（既存システムと重複）
  
  -- 雇用情報
  hire_date             DATE,
  employment_type       TEXT DEFAULT 'full_time',
  employment_status     TEXT DEFAULT 'active',
  termination_date      DATE,
  termination_reason    TEXT,
  
  -- 連絡先情報
  phone_number          TEXT,
  emergency_contact     JSONB,
  address               JSONB,
  
  -- プロフィール情報
  photo_url             TEXT,
  bio                   TEXT,
  skills                JSONB,
  
  -- 勤務情報
  shift_pattern         TEXT,
  hourly_rate           DECIMAL(10,2),
  salary                DECIMAL(10,2),
  supervisor_id         UUID REFERENCES staff(id),
  
  -- 設定・制限
  access_restrictions   JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  ui_preferences        JSONB DEFAULT '{}',
  
  -- セキュリティ・監査
  security_clearance    TEXT,
  access_card_id        TEXT,
  
  -- システム管理
  is_active             BOOLEAN DEFAULT true,
  is_system_user        BOOLEAN DEFAULT false,
  notes                 TEXT,
  
  -- hotel-common統合用
  hotel_common_user_id  UUID,
  legacy_user_data      JSONB,
  
  -- タイムスタンプ
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  created_by            UUID REFERENCES staff(id),
  updated_by            UUID REFERENCES staff(id),
  deleted_at            TIMESTAMP,
  
  -- インデックス制約
  CONSTRAINT unique_tenant_staff_code UNIQUE (tenant_id, staff_code),
  CONSTRAINT unique_tenant_staff_number UNIQUE (tenant_id, staff_number),
  CONSTRAINT unique_tenant_employee_id UNIQUE (tenant_id, employee_id)
);

-- 統合基盤へ追加が必要な関連テーブル

-- 1. 勤怠管理テーブル
CREATE TABLE attendance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  staff_id              UUID NOT NULL REFERENCES staff(id),
  staff_number          TEXT NOT NULL,
  
  -- 勤怠時刻
  work_date             DATE NOT NULL,
  clock_in_time         TIMESTAMP NOT NULL,
  clock_out_time        TIMESTAMP,
  break_start_time      TIMESTAMP,
  break_end_time        TIMESTAMP,
  
  -- 勤務時間計算
  work_duration_minutes INTEGER,
  overtime_minutes      INTEGER DEFAULT 0,
  break_duration_minutes INTEGER DEFAULT 0,
  
  -- ステータス
  attendance_status     TEXT DEFAULT 'present' 
    CHECK (attendance_status IN ('present', 'absent', 'late', 'early_leave', 'half_day')),
  
  -- 備考・承認
  notes                 TEXT,
  approved_by_staff_id  UUID REFERENCES staff(id),
  approved_at           TIMESTAMP,
  
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  
  CONSTRAINT unique_staff_work_date UNIQUE (staff_id, work_date)
);

-- 2. 勤務スケジュールテーブル
CREATE TABLE work_schedules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  staff_id              UUID NOT NULL REFERENCES staff(id),
  staff_number          TEXT NOT NULL,
  
  -- スケジュール情報
  schedule_date         DATE NOT NULL,
  scheduled_start_time  TIMESTAMP NOT NULL,
  scheduled_end_time    TIMESTAMP NOT NULL,
  
  -- シフト種別
  shift_type            TEXT DEFAULT 'full_day'
    CHECK (shift_type IN ('morning', 'afternoon', 'night', 'full_day', 'split')),
  
  -- フラグ
  is_working_day        BOOLEAN DEFAULT true,
  is_holiday            BOOLEAN DEFAULT false,
  is_paid_leave         BOOLEAN DEFAULT false,
  
  -- 管理情報
  notes                 TEXT,
  created_by            UUID REFERENCES staff(id),
  updated_by            UUID REFERENCES staff(id),
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  
  CONSTRAINT unique_staff_schedule_date UNIQUE (staff_id, schedule_date)
);

-- 3. 申し送り・引継ぎテーブル
CREATE TABLE handover_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  
  -- 申し送り基本情報
  from_staff_id         UUID NOT NULL REFERENCES staff(id),
  to_staff_id           UUID REFERENCES staff(id), -- NULL = 全スタッフ
  to_department         TEXT, -- 'FRONT', 'HOUSEKEEPING', 'MAINTENANCE'
  shift_handover_id     UUID, -- シフト引き継ぎID
  
  -- 内容
  title                 TEXT NOT NULL,
  content               TEXT NOT NULL,
  priority              TEXT DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  category              TEXT NOT NULL
    CHECK (category IN ('MAINTENANCE', 'CLEANING', 'GUEST_REQUEST', 'ISSUE_REPORT', 
                        'SPECIAL_INSTRUCTION', 'SECURITY', 'GENERAL')),
  
  -- 関連エンティティ
  related_reservation_id UUID, -- 予約ID（統合基盤から参照）
  related_room_id       UUID,  -- 客室ID（統合基盤から参照）
  related_customer_id   UUID,  -- 顧客ID（統合基盤から参照）
  
  -- メディア管理
  photo_urls            JSONB DEFAULT '[]',
  video_urls            JSONB DEFAULT '[]',
  document_urls         JSONB DEFAULT '[]',
  media_metadata        JSONB DEFAULT '{}',
  
  -- ステータス管理
  status                TEXT DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED')),
  acknowledged_at       TIMESTAMP,
  acknowledged_by_staff_id UUID REFERENCES staff(id),
  resolved_at           TIMESTAMP,
  resolution_notes      TEXT,
  
  -- 緊急度・フォローアップ
  requires_immediate_action BOOLEAN DEFAULT false,
  follow_up_required    BOOLEAN DEFAULT false,
  follow_up_deadline    TIMESTAMP,
  
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  deleted_at            TIMESTAMP
);

-- 4. 通知管理テーブル（現在はメモリ内だが統合基盤用）
CREATE TABLE staff_notifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  
  -- 通知対象
  staff_id              UUID NOT NULL REFERENCES staff(id),
  from_staff_id         UUID REFERENCES staff(id), -- 送信者（システム通知の場合はNULL）
  
  -- 通知内容
  type                  TEXT NOT NULL
    CHECK (type IN ('handover_created', 'handover_updated', 'handover_acknowledged', 
                    'schedule_changed', 'shift_reminder', 'system_announcement', 'overdue_task')),
  title                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  priority              TEXT DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  
  -- 関連エンティティ
  related_handover_id   UUID REFERENCES handover_notes(id),
  related_attendance_id UUID REFERENCES attendance(id),
  related_schedule_id   UUID REFERENCES work_schedules(id),
  
  -- ステータス
  is_read               BOOLEAN DEFAULT false,
  read_at               TIMESTAMP,
  is_delivered          BOOLEAN DEFAULT false,
  delivered_at          TIMESTAMP,
  
  -- 配信設定
  delivery_methods      JSONB DEFAULT '["in_app"]', -- in_app, email, sms, push
  scheduled_for         TIMESTAMP, -- 遅延配信用
  
  created_at            TIMESTAMP DEFAULT now(),
  expires_at            TIMESTAMP -- 通知の有効期限
);

-- 5. 監査ログテーブル（スタッフ操作追跡用）
CREATE TABLE audit_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  
  -- 操作情報
  staff_id              UUID REFERENCES staff(id),
  staff_number          TEXT,
  staff_name            TEXT,
  
  -- 対象情報
  table_name            TEXT NOT NULL,
  record_id             TEXT NOT NULL,
  operation             TEXT NOT NULL
    CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  
  -- 変更内容
  old_values            JSONB,
  new_values            JSONB,
  changed_fields        JSONB, -- 変更されたフィールド配列
  
  -- セッション情報
  session_id            TEXT,
  ip_address            INET,
  user_agent            TEXT,
  request_id            TEXT,
  
  -- 時刻情報
  created_at            TIMESTAMP DEFAULT now(),
  
  -- 分析用インデックス
  INDEX idx_audit_staff_id (staff_id),
  INDEX idx_audit_table_operation (table_name, operation),
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_record_id (record_id)
);

-- インデックス設定
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, work_date);
CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_work_schedules_staff_date ON work_schedules(staff_id, schedule_date);
CREATE INDEX idx_work_schedules_date ON work_schedules(schedule_date);
CREATE INDEX idx_handover_notes_status ON handover_notes(status);
CREATE INDEX idx_handover_notes_priority ON handover_notes(priority);
CREATE INDEX idx_handover_notes_to_staff ON handover_notes(to_staff_id);
CREATE INDEX idx_handover_notes_department ON handover_notes(to_department);
CREATE INDEX idx_staff_notifications_staff_unread ON staff_notifications(staff_id, is_read);
CREATE INDEX idx_staff_notifications_type ON staff_notifications(type);
```

### **🎯 権限管理の柔軟性確保**

#### **1. ホテル独自役割作成**
```typescript
// ホテルが自由に役割を作成可能
interface CustomRole {
  name: string;                    // '夜勤マネージャー', 'VIP専任', '清掃チーフ'等
  description: string;
  allowed_ui_types: string[];      // ['management', 'front_desk']
  permissions: string[];           // ['management.dashboard', 'front_desk.vip_checkin']
  tenant_id: string;               // ホテル別の役割
}

// 使用例
const hotelCustomRoles = [
  {
    name: '夜勤リーダー',
    allowed_ui_types: ['front_desk', 'housekeeping'],
    permissions: [
      'front_desk.checkin', 'front_desk.checkout', 
      'front_desk.emergency_override', 'housekeeping.night_audit'
    ]
  },
  {
    name: 'VIP専任スタッフ',
    allowed_ui_types: ['front_desk', 'management'],
    permissions: [
      'front_desk.vip_checkin', 'front_desk.upgrade_rooms',
      'management.vip_guest_history', 'management.special_requests'
    ]
  }
]
```

#### **2. UI・ページアクセス制御の柔軟性**
```typescript
// 権限チェック関数（既存実装の拡張）
const canAccessPage = (pageCode: string): boolean => {
  const staffPermissions = getCurrentStaffPermissions(); // 複数役割の統合権限
  return staffPermissions.includes(pageCode) || staffPermissions.includes('*');
}

const canAccessUISection = (uiType: string): boolean => {
  const staffUITypes = getCurrentStaffUITypes(); // 複数役割の統合UI権限
  return staffUITypes.includes(uiType);
}

// 動的メニュー生成
const generateAccessibleMenu = (staffId: string) => {
  const permissions = getStaffEffectivePermissions(staffId);
  const menu = [];
  
  if (permissions.includes('management.dashboard')) {
    menu.push({ name: 'ダッシュボード', path: '/dashboard' });
  }
  if (permissions.includes('front_desk.checkin')) {
    menu.push({ name: 'チェックイン', path: '/checkin' });
  }
  // ... 権限に応じて動的にメニュー構築
  
  return menu;
}
```

#### **3. 期限付き・複数役割の管理**
```typescript
// 複数役割の同時割り当て対応
interface StaffRoleAssignment {
  staff_id: string;
  role_id: string;
  valid_from: Date;
  valid_until?: Date;              // 期限付き権限（研修期間、代理権限等）
  is_active: boolean;
}

// 有効権限の統合計算
const getEffectivePermissions = (staffId: string): string[] => {
  const activeAssignments = getActiveRoleAssignments(staffId);
  const allPermissions = new Set<string>();
  
  activeAssignments.forEach(assignment => {
    const role = getRoleById(assignment.role_id);
    role.permissions.forEach(permission => {
      allPermissions.add(permission);
    });
  });
  
  return Array.from(allPermissions);
}
```

### **🔄 JWT統合での権限情報**

```typescript
interface HotelStaffJWTPayload {
  // 標準Claims
  sub: string;                     // staff.id
  tenant_id: string;               // staff.tenant_id
  
  // 基本情報
  email: string;                   // staff.email
  name: string;                    // staff.display_name
  department: string;              // staff.department_code
  
  // 権限情報（既存システム由来）
  roles: Array<{                   // 複数役割対応
    id: string;
    name: string;
    level: number;
  }>;
  permissions: string[];           // 統合された有効権限
  ui_types: string[];              // アクセス可能UI
  
  // システム情報
  base_level: number;              // staff.base_level
  is_admin: boolean;               // 管理者権限有無
  session_id: string;
  last_login: number;
}
```

### **📋 実装での柔軟性確保ポイント**

#### **1. 権限マスターの拡張性**
- ホテルが独自の権限コードを追加可能
- UI画面・機能ごとの細かい権限制御
- カテゴリ別の権限管理

#### **2. 役割管理の自由度**
- ホテルごとに独自の役割名・階層
- 複数役割の同時割り当て
- 期限付き権限（研修、代理等）

#### **3. UI制御の動的性**
- 権限に応じたメニューの動的生成
- ページレベルでのアクセス制御
- 機能レベルでの表示/非表示制御

---

**🔧 修正サマリー**

❌ **削除した固定設計**:
- enum StaffLevel / StaffRole（固定階層）
- 固定permissions JSONB（既存システムと重複）

✅ **追加した柔軟設計**:
- 既存roles/permissions/staff_role_assignments連携
- ホテル独自役割作成対応
- 複数役割・期限付き権限対応
- 動的UI/ページアクセス制御

---

## 🔐 **認証システム設計**

### **PIN認証システム**
```typescript
interface PinAuthConfig {
  pin_length: {
    min: 4;
    max: 8;
  };
  complexity: {
    require_non_sequential: boolean;
    disallow_repeated_digits: boolean;
    disallow_birth_dates: boolean;
  };
  security: {
    hash_algorithm: 'argon2' | 'bcrypt';
    max_failed_attempts: 5;
    lockout_duration_minutes: 30;
    force_change_days: 90;
  };
}
```

### **パスワード認証システム**
```typescript
interface PasswordAuthConfig {
  requirements: {
    min_length: 8;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
  };
  security: {
    hash_algorithm: 'argon2';
    max_failed_attempts: 3;
    lockout_duration_minutes: 60;
    force_change_days: 180;
    password_history_count: 12;
  };
}
```

---

## 📊 **操作ログ連携設計**

### **Staffテーブル連携フィールド**
```typescript
interface OperationLogContext {
  operator_id: string;           // staff.id
  operator_name: string;         // staff.display_name
  operator_code: string;         // staff.staff_code
  department_code: string;       // staff.department_code
  role: string;                  // staff.role
  level: number;                 // staff.level
  session_id: string;            // セッション識別子
  terminal_info: {
    ip_address: string;
    user_agent: string;
    device_id?: string;
  };
}
```

---

## 🔄 **JWT統合仕様対応**

### **JWT Payload構造**
```typescript
interface HotelStaffJWTPayload {
  // 標準JWT Claims
  sub: string;                   // staff.id (UUID)
  iss: string;                   // 発行者
  aud: string;                   // 対象システム
  exp: number;                   // 有効期限
  iat: number;                   // 発行時刻
  
  // カスタム Claims
  tenant_id: string;             // staff.tenant_id
  email: string;                 // staff.email
  name: string;                  // staff.display_name
  role: string;                  // staff.role
  level: number;                 // staff.level (1-5)
  department: string;            // staff.department_code
  permissions: string[];         // 展開された権限配列
  
  // セッション情報
  session_id: string;
  last_login: number;            // Unix timestamp
  
  // セキュリティ
  is_admin: boolean;             // level >= 4
  is_owner: boolean;             // level === 5
  security_clearance?: string;   // staff.security_clearance
}
```

---

## 🌐 **SaaS/Member兼用設計**

### **簡素権限マッピング**
```typescript
// hotel-saas / hotel-member での簡単利用
interface SimplifiedStaffAccess {
  // 基本認証情報のみ使用
  id: string;                    // staff.id
  email: string;                 // staff.email
  name: string;                  // staff.display_name
  role: 'admin' | 'user';        // staff.level >= 4 ? 'admin' : 'user'
  tenant_id: string;             // staff.tenant_id
  
  // 詳細権限は無視・簡素な権限チェック
  is_admin: boolean;             // staff.level >= 4
}
```

---

## 📈 **実装優先度**

### **Phase 1: 基本認証・権限（即時）**
- 基本テーブル作成
- PIN/パスワード認証
- 基本権限管理（level 1-5）
- JWT発行・検証

### **Phase 2: 詳細権限・管理機能（2週間）**
- 詳細権限システム（JSONB permissions）
- 部門管理・組織階層
- UI/機能アクセス制御
- 操作ログ連携

### **Phase 3: 高度機能（1ヶ月）**
- 2FA認証システム
- 勤務管理連携
- レポート・分析機能
- セキュリティ強化

### **Phase 4: 統合完成（継続）**
- SaaS/Member完全統合
- 既存User移行完了
- パフォーマンス最適化
- セキュリティ監査

---

## 🎯 **統合管理者への確認事項**

### **JWT統合要件確認**
1. JWT payload構造は既存仕様と整合しているか？
2. セッション管理テーブルとの連携仕様は？
3. 権限チェック方式の統一ルールは？

### **SaaS/Member兼用確認**
1. 簡素権限での利用範囲は適切か？
2. 既存User移行戦略は？
3. テーブル分離 vs 統合の最終判断は？

### **実装調整確認**
1. 各システムでの実装分担は？
2. マイグレーション実行タイミングは？
3. テスト・検証方法は？

---

**🌙 Luna設計完了 - 統合調整をお願いします**

*詳細なPMS要件を基に包括的な設計を行いました。JWT統合要件やSaaS/Member兼用を考慮した設計になっています。Iza（統合管理者）による最終調整をお待ちしています。* 