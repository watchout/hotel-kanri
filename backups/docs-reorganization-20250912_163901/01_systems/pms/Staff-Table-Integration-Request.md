# 📋 統合基盤Staffテーブル群作成申請書

**申請者**: 🌙 Luna（hotel-pms担当AI）  
**申請日**: 2025年1月25日  
**対象**: 統合データベース（hotel_common_dev）  
**申請種別**: 新規テーブル群作成・既存システム統合

---

## 🎯 **申請概要**

### **申請内容**
hotel-pms（Luna）で実装済みのスタッフ関連機能を統合データベースに移行するため、以下のテーブル群の作成を申請いたします。

### **対象テーブル**
1. **staff** - スタッフマスターテーブル（統合基盤メイン）
2. **attendance** - 勤怠管理テーブル
3. **work_schedules** - 勤務スケジュールテーブル  
4. **handover_notes** - 申し送り・引継ぎテーブル
5. **staff_notifications** - 通知管理テーブル
6. **audit_logs** - 監査ログテーブル

### **統合要件準拠**
- ✅ JWT統合仕様準拠
- ✅ 既存roles/permissions/staff_role_assignments連携
- ✅ SaaS/Member兼用設計
- ✅ マルチテナント対応
- ✅ 統一データベース管理ルール準拠

---

## 📊 **現状分析**

### **既存実装状況**
```yaml
SQLite実装状況:
  staff: ✅ 完全実装済み（認証・権限・個人情報）
  attendance: ✅ 完全実装済み（出退勤・休憩・残業）
  work_schedules: ✅ 完全実装済み（シフト管理・休日設定）
  handover_notes: ✅ 完全実装済み（申し送り・メディア添付）
  roles/permissions/staff_role_assignments: ✅ 柔軟権限システム実装済み
  audit_logs: ✅ 完全実装済み（操作記録・監査追跡）
  通知システム: ✅ stores実装済み（DB永続化準備中）

動作確認:
  認証システム: ✅ PIN/パスワード認証・JWT発行
  権限管理: ✅ 動的役割・UI制御・複数役割割り当て
  勤怠管理: ✅ 出退勤記録・時間計算・承認フロー
  申し送り: ✅ 写真添付・部門別配信・ステータス管理
```

### **統合の必要性**
1. **データ一元化**: 3システム間でのスタッフ情報統合
2. **認証統一**: JWT統合仕様への完全準拠
3. **権限管理統合**: SaaS/Member側での簡素利用対応
4. **監査要件**: 統合基盤での包括的操作記録
5. **スケーラビリティ**: マルチテナント・多店舗対応

---

## 🏗️ **テーブル設計詳細**

### **1. staffテーブル（メインテーブル）**

```sql
CREATE TABLE staff (
  -- 基本ID情報
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  staff_code            TEXT NOT NULL,
  staff_number          TEXT NOT NULL,
  
  -- 個人基本情報
  last_name             TEXT NOT NULL,
  first_name            TEXT NOT NULL,
  last_name_kana        TEXT,
  first_name_kana       TEXT,
  display_name          TEXT NOT NULL,
  employee_id           TEXT UNIQUE,
  
  -- 認証情報（JWT統合仕様準拠）
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
  
  -- 権限情報（既存システム統合）
  default_role_id       UUID REFERENCES roles(id),
  base_level            INTEGER DEFAULT 1,
  department_code       TEXT,
  position_title        TEXT,
  
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
  
  -- 制約
  CONSTRAINT unique_tenant_staff_code UNIQUE (tenant_id, staff_code),
  CONSTRAINT unique_tenant_staff_number UNIQUE (tenant_id, staff_number),
  CONSTRAINT unique_tenant_employee_id UNIQUE (tenant_id, employee_id)
);
```

**主要インデックス:**
```sql
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_department ON staff(department_code);
CREATE INDEX idx_staff_employment_status ON staff(employment_status);
CREATE INDEX idx_staff_active ON staff(is_active);
```

### **2. attendanceテーブル（勤怠管理）**

```sql
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
```

### **3. work_schedulesテーブル（勤務スケジュール）**

```sql
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
```

### **4. handover_notesテーブル（申し送り・引継ぎ）**

```sql
CREATE TABLE handover_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  
  -- 申し送り基本情報
  from_staff_id         UUID NOT NULL REFERENCES staff(id),
  to_staff_id           UUID REFERENCES staff(id),
  to_department         TEXT,
  shift_handover_id     UUID,
  
  -- 内容
  title                 TEXT NOT NULL,
  content               TEXT NOT NULL,
  priority              TEXT DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  category              TEXT NOT NULL
    CHECK (category IN ('MAINTENANCE', 'CLEANING', 'GUEST_REQUEST', 'ISSUE_REPORT', 
                        'SPECIAL_INSTRUCTION', 'SECURITY', 'GENERAL')),
  
  -- 関連エンティティ
  related_reservation_id UUID,
  related_room_id       UUID,
  related_customer_id   UUID,
  
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
```

### **5. staff_notificationsテーブル（通知管理）**

```sql
CREATE TABLE staff_notifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'default',
  
  -- 通知対象
  staff_id              UUID NOT NULL REFERENCES staff(id),
  from_staff_id         UUID REFERENCES staff(id),
  
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
  delivery_methods      JSONB DEFAULT '["in_app"]',
  scheduled_for         TIMESTAMP,
  
  created_at            TIMESTAMP DEFAULT now(),
  expires_at            TIMESTAMP
);
```

### **6. audit_logsテーブル（監査ログ）**

```sql
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
  changed_fields        JSONB,
  
  -- セッション情報
  session_id            TEXT,
  ip_address            INET,
  user_agent            TEXT,
  request_id            TEXT,
  
  created_at            TIMESTAMP DEFAULT now()
);
```

---

## 🔄 **JWT統合仕様対応**

### **JWT Payload構造**
```typescript
interface HotelStaffJWTPayload {
  // 標準Claims
  sub: string;                     // staff.id (UUID)
  tenant_id: string;               // staff.tenant_id
  
  // 基本情報
  email: string;                   // staff.email
  name: string;                    // staff.display_name
  department: string;              // staff.department_code
  
  // 権限情報（既存システム統合）
  roles: Array<{
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

### **認証フロー統合**
```yaml
1. 認証処理:
   staff.pin_hash / staff.password_hash による認証
   ↓
2. 権限取得:
   staff_role_assignments → roles → permissions
   ↓
3. JWT発行:
   統合Payload構造でJWT生成
   ↓
4. セッション管理:
   統合基盤セッション管理テーブル連携
```

---

## 🌐 **SaaS/Member兼用設計**

### **簡素利用マッピング**
```typescript
// hotel-saas / hotel-member での簡素利用
interface SimplifiedStaffAccess {
  id: string;                    // staff.id
  email: string;                 // staff.email
  name: string;                  // staff.display_name
  role: 'admin' | 'user';        // staff.base_level >= 4 ? 'admin' : 'user'
  tenant_id: string;             // staff.tenant_id
  is_admin: boolean;             // staff.base_level >= 4
}
```

### **利用範囲制限**
```yaml
hotel-saas用途:
  利用テーブル: staff（基本情報のみ）
  利用機能: 認証・基本権限管理
  制限: 詳細権限・勤怠・申し送り機能は利用しない

hotel-member用途:
  利用テーブル: staff（基本情報のみ）
  利用機能: 管理者認証
  制限: フロント業務機能は利用しない
```

---

## 📈 **実装計画**

### **Phase 1: 基盤テーブル作成（即時実行希望）**
```sql
-- 優先度1: 認証・権限関連
CREATE TABLE staff;
-- 既存roles/permissions/staff_role_assignmentsとの統合確認

-- 優先度2: 監査・セキュリティ
CREATE TABLE audit_logs;
```

### **Phase 2: 業務機能テーブル（1週間以内）**
```sql
-- 勤怠・スケジュール管理
CREATE TABLE attendance;
CREATE TABLE work_schedules;

-- 申し送り・通知管理
CREATE TABLE handover_notes;
CREATE TABLE staff_notifications;
```

### **Phase 3: データ移行・統合（2週間以内）**
```yaml
データ移行計画:
  1. SQLite既存データのバックアップ
  2. PostgreSQL統合基盤への移行スクリプト実行
  3. データ整合性確認・テスト
  4. 本番切り替え・モニタリング
```

---

## 🎯 **統合管理者への確認依頼**

### **🔍 最終確認事項**

#### **1. JWT統合仕様確認**
- [ ] JWT Payload構造は既存仕様と整合するか？
- [ ] セッション管理テーブルとの連携仕様は？
- [ ] 権限チェック統一ルールは？

#### **2. 既存システム統合確認**
- [ ] roles/permissions/staff_role_assignmentsテーブルとの統合方針は？
- [ ] 既存Userテーブルとの移行戦略は？
- [ ] SaaS/Member側での利用制限設定は？

#### **3. 技術仕様確認**
- [ ] PostgreSQL統合基盤での制約・インデックス設定は適切か？
- [ ] JSONB型の利用範囲・パフォーマンス考慮は十分か？
- [ ] マルチテナント設計での分離レベルは適切か？

#### **4. 運用・セキュリティ確認**
- [ ] 監査ログの保存期間・アーカイブ方針は？
- [ ] 個人情報保護・GDPR対応要件は？
- [ ] バックアップ・災害復旧計画への影響は？

#### **5. 実装スケジュール調整**
- [ ] テーブル作成の実行タイミングは？
- [ ] データ移行の実施スケジュールは？
- [ ] 他システムへの影響・調整事項は？

---

## 📋 **申請承認後の実行計画**

### **即座実行項目**
1. **テーブル作成SQL実行**
2. **初期インデックス設定**
3. **基本制約・リレーション設定**
4. **権限設定・アクセス制御**

### **段階実行項目**
1. **既存データ移行スクリプト作成**
2. **統合テスト実行**
3. **JWT統合機能テスト**
4. **パフォーマンス検証**

### **継続実行項目**
1. **監視・運用体制構築**
2. **ドキュメント更新**
3. **チーム教育・研修**
4. **継続的改善・最適化**

---

**🌙 Luna申請者署名**

**申請日**: 2025年1月25日  
**申請者**: Luna（hotel-pms担当AI）  
**連絡先**: hotel-pms開発チーム  
**緊急度**: 高（Place→Room統合対応と連動）

**申請根拠**: 統一データベース管理ルール準拠・JWT統合要件対応・実装済み機能の統合基盤移行

---

**📨 統合管理者（Iza）様**

上記申請について、ご確認・ご承認のほどよろしくお願いいたします。
技術的な詳細や実装方法について、追加の協議が必要でしたらお申し付けください。

**Luna（月読）** 🌙 