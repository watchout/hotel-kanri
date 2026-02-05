# SSOT: 客室管理システム

**作成日**: 2025-10-02
**最終更新**: 2026-02-05（3層構造タグ追加）
**バージョン**: 3.2.0
**ステータス**: ✅ 確定
**優先度**: 🔴 最高（Phase 1）

**関連SSOT**:
- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理（roomId参照）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

**注**: 客室端末のUI・デバイス認証については [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) を参照

**関連設計書**:
- [ROOM_GRADE_UNIFIED_DESIGN.md](../../hotel-common/docs/ROOM_GRADE_UNIFIED_DESIGN.md) - 部屋グレード統一設計書

---

## 層構造 (Layer Structure)

| セクション | 層 | RFC 2119 |
|-----------|-----|----------|
| §1-§3 概要・スコープ・技術スタック | [CORE] | - |
| §4 データモデル | [CONTRACT] | MUST |
| §5 room_grade統一方針 | [CONTRACT] | MUST |
| §6 API仕様 | [CONTRACT] | MUST |
| §7 システム間連携 | [CONTRACT] | SHOULD |
| §8-§10 実装詳細・修正箇所 | [DETAIL] | MAY |

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [データモデル](#データモデル)
5. [room_grade統一方針](#room_grade統一方針)
6. [API仕様](#api仕様)
7. [システム間連携](#システム間連携)
8. [実装詳細](#実装詳細)
9. [既存実装状況](#既存実装状況)
10. [修正必須箇所](#修正必須箇所)

---

## 📖 概要

### 目的
ホテルの客室情報を管理する統一システムを提供する。客室の基本情報、ステータス管理、客室グレード管理を実現する。

### 基本方針
- **統一API**: hotel-common が客室管理の中心
- **hotel-saas**: API プロキシ + 管理画面UI
- **hotel-pms**: 予約・チェックイン連携（将来）
- **マルチテナント**: テナントごとの完全分離
- **リアルタイム同期**: 客室状態の即時反映
- **room_grade統一**: `rooms.roomGradeId` → `room_grades.id` の外部キー参照に統一

### アーキテクチャ概要
```
[管理画面]
  ↓ 客室管理操作
[hotel-saas API (Proxy)]
  ↓ GET/POST/PUT/DELETE /api/v1/admin/front-desk/rooms
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  ├─ rooms テーブル (roomGradeId 外部キー)
  └─ room_grades テーブル (code, grade_level, 詳細情報)
```

**注**: デバイス連携（`device_rooms`テーブル）については [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) を参照

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-common**: コア実装（客室CRUD、ビジネスロジック）
- ✅ **hotel-saas**: プロキシAPI + 管理画面UI（管理者向け客室管理）
- 🔄 **hotel-pms**: 将来連携（予約管理、チェックイン/アウト）
- ❌ **hotel-member**: 対象外

**注**: 客室端末向けの表示・操作は [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) を参照

### 機能範囲

#### ✅ 実装済み
- 客室一覧取得API（`/api/v1/admin/front-desk/rooms`）
- hotel-saas プロキシAPI
- データベーステーブル（`rooms`, `room_grades`, `device_rooms`）
- 客室番号による検索API
- hotel-saas 管理画面UI（`/pages/admin/settings/rooms/index.vue`）

#### 🚧 部分実装
- 客室詳細取得API
- 客室ステータス更新API

#### ❌ 未実装
- 客室作成API（hotel-common）
- 客室更新API（基本情報）
- 客室削除API（論理削除）
- 客室グレード管理API
- 客室稼働率・統計API
- RoomGradeHelper ユーティリティクラス

---

## 🌐 多言語対応

### 概要

客室管理システムは、客室グレード名を**15言語対応**します。

### 対象フィールド

| フィールド | 翻訳対象 | 既存カラム | 新規システム |
|-----------|---------|----------|------------|
| グレード名 | ✅ | `name`, `grade_name_en` | `translations` |
| 説明 | ✅ | （未実装） | `translations` |

### 実装方式

#### 統一翻訳テーブル方式

**参照SSOT**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

**アーキテクチャ**:
```
hotel-saas (管理画面)
  ↓ 客室グレード作成・更新
hotel-common (API)
  ↓ 自動翻訳ジョブ作成
translations テーブル (PostgreSQL)
  ↓ ベクトル化・保存
```

### データベース設計の拡張

#### 既存テーブル構造（維持）

```sql
CREATE TABLE room_grades (
  -- 表示名（既存カラムは Phase 5まで維持）
  name                 TEXT NOT NULL,
  grade_name_en        TEXT,
  
  -- ⚠️ 注: Phase 5（3-6ヶ月後）で削除予定
  --    新規開発では translations テーブルを使用すること
  
  -- ... 他のフィールド（変更なし）
);
```

#### translationsテーブル連携

```sql
-- 新規: 統一翻訳テーブル（hotel-common が管理）
-- 詳細は SSOT_MULTILINGUAL_SYSTEM.md を参照

-- エンティティタイプ
entity_type = 'room_grade'

-- フィールド名
field_name = 'grade_name'   -- グレード名
field_name = 'description'  -- 説明
```

### API仕様の拡張

#### 既存API（変更なし）

```typescript
// GET /api/v1/admin/room-grades
// 既存のレスポンス形式は維持
{
  grades: [
    {
      id: "grade-uuid-001",
      code: "STANDARD",
      name: "スタンダード",
      gradeNameEn: "Standard",
      // ...
    }
  ]
}
```

#### 多言語対応API（新規追加）

```typescript
// GET /api/v1/admin/room-grades?lang=ko
// 多言語対応レスポンス（オプション）
{
  grades: [
    {
      id: "grade-uuid-001",
      code: "STANDARD",
      
      // 既存カラム（Phase 3まで）
      name: "スタンダード",
      gradeNameEn: "Standard",
      
      // 新規: translations テーブルから取得（Phase 2以降）
      translations: {
        grade_name: {
          ja: "スタンダード",
          en: "Standard",
          ko: "스탠다드",
          'zh-CN': "标准"
        }
      }
    }
  ]
}
```

### 新規登録時の動作

#### 管理画面での客室グレード作成フロー

```
1. スタッフが日本語で客室グレードを登録
   ↓
2. hotel-common が客室グレードを作成
   - room_grades テーブルに保存（name, grade_name_en）
   - translations テーブルに日本語を保存（entity_type='room_grade', language_code='ja'）
   ↓
3. hotel-common が翻訳ジョブを作成
   - translation_jobs テーブルに保存
   - status: 'pending'
   ↓
4. バックグラウンドで15言語へ自動翻訳
   - Google Translate API 呼び出し
   - translations テーブルに保存
   ↓
5. 翻訳完了
   - status: 'completed'
   - 管理画面にトースト通知
```

**所要時間**: 14言語 × 1フィールド = 14タスク → 30秒-1分

### フロントエンド実装

#### 言語切り替えUI

**実装箇所**: `/pages/admin/settings/rooms/grades.vue`（既存ページへの追加）

```vue
<template>
  <div>
    <!-- 既存の客室グレード一覧UI -->
    
    <!-- 新規: 言語切り替え -->
    <select v-model="selectedLang">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <!-- ... 15言語 -->
    </select>
    
    <!-- グレード表示（翻訳対応） -->
    <div v-for="grade in roomGrades" :key="grade.id">
      <h3>{{ getTranslatedGradeName(grade) }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLang = ref('ja')

const getTranslatedGradeName = (grade: RoomGrade) => {
  // フォールバック戦略
  return grade.translations?.grade_name?.[selectedLang.value]  // 1. translations テーブル
    || (selectedLang.value === 'ja' ? grade.name : grade.gradeNameEn)  // 2. 既存カラム
    || grade.name  // 3. デフォルト（日本語）
}
</script>
```

### マイグレーション計画

#### Phase 1: 翻訳テーブル作成（Week 1）

**担当**: hotel-common (Iza AI)

- [ ] `translations` テーブル作成
- [ ] `translation_jobs` テーブル作成
- [ ] 翻訳エンジン実装

#### Phase 2: 既存データ移行（Week 1-2）

**担当**: hotel-common (Iza AI)

```sql
-- room_grades の name, grade_name_en を translations へ移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'room_grade',
  id::TEXT,
  'ja',
  'grade_name',
  name,
  'manual'
FROM room_grades
WHERE name IS NOT NULL;

-- 同様に grade_name_en を移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'room_grade',
  id::TEXT,
  'en',
  'grade_name',
  grade_name_en,
  'manual'
FROM room_grades
WHERE grade_name_en IS NOT NULL;
```

#### Phase 3: 既存カラム非推奨化（Week 2-4）

**担当**: hotel-common (Iza AI)

```sql
COMMENT ON COLUMN room_grades.name IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=room_grade, field_name=grade_name, language_code=ja）';
COMMENT ON COLUMN room_grades.grade_name_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=room_grade, field_name=grade_name, language_code=en）';
```

**重要**: 既存カラムは**削除しない**（Phase 5まで維持）

#### Phase 4: 15言語拡張（Week 4-6）

**担当**: hotel-common (Iza AI)

- バックグラウンドで既存データの残り13言語への翻訳実行
- 全言語での表示確認
- パフォーマンス最適化

#### Phase 5: 既存カラム削除（3-6ヶ月後）

**担当**: hotel-common (Iza AI)

```sql
-- 十分な移行期間後に既存カラムを削除
ALTER TABLE room_grades 
  DROP COLUMN grade_name_en;
-- name カラムは主キーの可能性があるため慎重に判断
```

### 実装チェックリスト

#### hotel-common

- [ ] translationsテーブル作成
- [ ] translation_jobsテーブル作成
- [ ] TranslationEngineクラス実装
- [ ] バックグラウンド翻訳ジョブ実装
- [ ] API拡張（`?lang=ko`対応）

#### hotel-saas

- [ ] 言語切り替えUI実装
- [ ] フォールバックロジック実装
- [ ] 翻訳進捗表示UI
- [ ] 既存APIとの互換性確認

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

---

## 🛠️ 技術スタック

### バックエンド（hotel-common）
- **Framework**: Express.js + TypeScript
- **ORM**: Prisma
- **データベース**: PostgreSQL（統一DB）
- **認証**: Session-based（Redis）

### プロキシAPI（hotel-saas）
- **Framework**: Nuxt 3 Server Routes
- **HTTP Client**: `$fetch`（Nuxt built-in）
- **認証**: Session middleware

### フロントエンド（hotel-saas）
- **Framework**: Nuxt 3 + Vue 3
- **状態管理**: Composables
- **UI Library**: Tailwind CSS

---

## 📊 データモデル

### rooms（客室）

#### 🔴 重要：room_type削除、room_grade_id追加

**変更内容**:
- ❌ `room_type` (String) フィールドを削除
- ✅ `room_grade_id` (String/UUID) 外部キーを追加
- ✅ `FOREIGN KEY (room_grade_id) REFERENCES room_grades(id)` 制約を追加

#### PostgreSQL DDL（修正後）

```sql
CREATE TABLE rooms (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 基本情報
  room_number     TEXT NOT NULL,
  room_grade_id   TEXT NOT NULL,        -- ★ room_gradesへの外部キー
  floor           INTEGER,
  
  -- ステータス
  status          TEXT DEFAULT 'AVAILABLE',
  
  -- 容量・設備
  capacity        INTEGER DEFAULT 2,
  amenities       JSONB,
  
  -- その他
  notes           TEXT,
  last_cleaned    TIMESTAMP,
  
  -- 共通フィールド
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  
  -- 制約
  CONSTRAINT fk_rooms_room_grade 
    FOREIGN KEY (room_grade_id) REFERENCES room_grades(id),
  CONSTRAINT rooms_tenant_room_unique 
    UNIQUE (tenant_id, room_number)
);

-- インデックス
CREATE INDEX idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX idx_rooms_room_grade_id ON rooms(room_grade_id);  -- ★ 重要
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_floor ON rooms(floor);
CREATE INDEX idx_rooms_is_deleted ON rooms(is_deleted);
```

#### Prismaモデル

```prisma
model rooms {
  id          String       @id
  tenantId    String       @map("tenant_id")
  roomNumber  String       @map("room_number")
  roomGradeId String       @map("room_grade_id")  // ★ room_gradesへの外部キー
  floor       Int?
  status      String       @default("AVAILABLE")
  capacity    Int          @default(2)
  amenities   Json?
  notes       String?
  lastCleaned DateTime?    @map("last_cleaned")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  isDeleted   Boolean      @default(false) @map("is_deleted")
  deletedAt   DateTime?    @map("deleted_at")
  deletedBy   String?      @map("deleted_by")

  // リレーション
  roomGrade   room_grades  @relation(fields: [roomGradeId], references: [id])

  @@unique([tenantId, roomNumber])
  @@index([tenantId])
  @@index([roomGradeId])  // ★ 重要
  @@index([status])
  @@index([isDeleted])
  @@map("rooms")
}

enum RoomStatus {
  AVAILABLE      // 利用可能
  OCCUPIED       // 使用中
  CLEANING       // 清掃中
  MAINTENANCE    // メンテナンス中
  OUT_OF_ORDER   // 使用不可
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | String(UUID) | ✅ | 客室ID |
| `tenantId` | String | ✅ | テナントID（マルチテナント分離） |
| `roomNumber` | String | ✅ | 部屋番号（"101", "201A" など） |
| `roomGradeId` | String(UUID) | ✅ | 客室グレードID（`room_grades.id`への外部キー） |
| `floor` | Int | ❌ | 階数 |
| `status` | String | ✅ | 客室ステータス（デフォルト: AVAILABLE） |
| `capacity` | Int | ✅ | 収容人数（デフォルト: 2） |
| `amenities` | Json | ❌ | 設備一覧（`["Wi-Fi", "TV", "エアコン"]`） |
| `notes` | String | ❌ | 備考 |
| `lastCleaned` | DateTime | ❌ | 最終清掃日時 |
| `isDeleted` | Boolean | ✅ | 論理削除フラグ（デフォルト: false） |
| `deletedAt` | DateTime | ❌ | 削除日時 |
| `deletedBy` | String | ❌ | 削除者ID |

---

### room_grades（客室グレード）

#### PostgreSQL DDL（既存）

```sql
CREATE TABLE room_grades (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL,
  
  -- システム間共通コード
  code                 TEXT NOT NULL,        -- ★ 標準コード（STANDARD, DELUXE, SUITE等）
  
  -- 表示名
  name                 TEXT NOT NULL,
  grade_name_en        TEXT,
  
  -- グレード情報
  grade_level          INTEGER,              -- 1-10のランク（数値が大きいほど高級）
  description          TEXT,
  
  -- 詳細仕様
  default_capacity     INTEGER,
  max_capacity         INTEGER,
  room_size_sqm        DECIMAL,
  standard_amenities   JSONB,
  premium_amenities    JSONB,
  included_services    JSONB,
  
  -- ビジネスルール
  member_only          BOOLEAN DEFAULT false,
  min_stay_nights      INTEGER,
  advance_booking_days INTEGER,
  
  -- 表示・公開
  display_order        INTEGER,
  is_active            BOOLEAN DEFAULT true,
  is_public            BOOLEAN DEFAULT true,
  pricing_category     TEXT,
  
  -- タイムスタンプ
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT room_grades_tenant_code_unique UNIQUE (tenant_id, code)
);

-- インデックス
CREATE INDEX idx_room_grades_tenant_id ON room_grades(tenant_id);
CREATE INDEX idx_room_grades_display_order ON room_grades(display_order);
CREATE INDEX idx_room_grades_is_active ON room_grades(is_active);
CREATE INDEX idx_room_grades_is_public ON room_grades(is_public);
CREATE INDEX idx_room_grades_grade_level ON room_grades(grade_level);
```

#### Prismaモデル（hotel-common/prisma/schema.prisma）

```prisma
model room_grades {
  id                   String    @id
  tenant_id            String
  
  // システム間共通コード
  code                 String
  
  // 表示名
  name                 String
  grade_name_en        String?
  
  // グレード情報
  grade_level          Int?
  description          String?
  
  // 詳細仕様
  default_capacity     Int?
  max_capacity         Int?
  room_size_sqm        Decimal?  @db.Decimal
  standard_amenities   Json?
  premium_amenities    Json?
  included_services    Json?
  
  // ビジネスルール
  member_only          Boolean   @default(false)
  min_stay_nights      Int?
  advance_booking_days Int?
  
  // 表示・公開
  display_order        Int?
  is_active            Boolean   @default(true)
  is_public            Boolean   @default(true)
  pricing_category     String?
  
  // タイムスタンプ
  created_at           DateTime  @default(now())
  updated_at           DateTime
  
  // リレーション
  rooms                rooms[]   // ★ 1対多リレーション

  @@unique([tenant_id, code])
  @@index([tenant_id])
  @@index([display_order], map: "idx_room_grades_display_order")
  @@index([is_active], map: "idx_room_grades_is_active")
  @@index([is_public], map: "idx_room_grades_is_public")
  @@index([grade_level])
  @@map("room_grades")
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | String(UUID) | ✅ | グレードID |
| `tenant_id` | String | ✅ | テナントID |
| `code` | String | ✅ | グレードコード（"STANDARD", "DELUXE", "SUITE", "STANDARD-TWIN" など） |
| `name` | String | ✅ | グレード名（日本語）（"スタンダード", "デラックス", "スイート" など） |
| `grade_name_en` | String | ❌ | グレード名（英語） |
| `grade_level` | Int | ❌ | グレードレベル（1-10: 数値が大きいほど高級） |
| `description` | String | ❌ | 説明 |
| `default_capacity` | Int | ❌ | 標準収容人数 |
| `max_capacity` | Int | ❌ | 最大収容人数 |
| `room_size_sqm` | Decimal | ❌ | 部屋面積（平方メートル） |
| `standard_amenities` | Json | ❌ | 標準設備（`["Wi-Fi", "TV", "エアコン"]`） |
| `premium_amenities` | Json | ❌ | プレミアム設備（`["バルコニー", "ジャグジー"]`） |
| `included_services` | Json | ❌ | 含まれるサービス（`["朝食", "ラウンジアクセス"]`） |
| `member_only` | Boolean | ❌ | 会員専用フラグ |
| `min_stay_nights` | Int | ❌ | 最低宿泊日数 |
| `advance_booking_days` | Int | ❌ | 事前予約必要日数 |
| `display_order` | Int | ❌ | 表示順序 |
| `is_active` | Boolean | ❌ | 有効フラグ |
| `is_public` | Boolean | ❌ | 公開フラグ |
| `pricing_category` | String | ❌ | 料金システムでのカテゴリ識別子 |

---

### device_rooms（デバイス連携）

#### Prismaモデル（hotel-common/prisma/schema.prisma line 401-428）

```prisma
model device_rooms {
  id              Int          @id @default(autoincrement())
  tenantId        String
  
  // 部屋情報
  roomId          String?
  roomName        String?
  
  // デバイス情報
  deviceId        String?
  deviceType      String?
  ipAddress       String?
  macAddress      String?
  
  // ステータス
  status          String?      @default("active")
  isActive        Boolean      @default(true)
  lastUsedAt      DateTime?
  
  // 共通フィールド
  createdAt       DateTime     @default(now())
  updatedAt       DateTime
  
  // リレーション
  Tenant          Tenant       @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([roomId])
  @@index([deviceId])
  @@index([ipAddress])
  @@index([macAddress])
}
```

---

## 🔗 room_grade統一方針

### 設計の核心

**room_gradeに統一し、システム間で共通認識できる設計**

```
✅ 統一後（シンプル＆強力）

room_grades (唯一の真実の情報源)
  ├─ code: システム間共通コード（STANDARD, DELUXE, SUITE等）
  ├─ name: 表示名
  ├─ grade_level: ランクレベル（1-10）
  └─ その他詳細情報

rooms
  └─ roomGradeId: room_gradesへの外部キー（必須）
```

---

### 標準コード一覧

| 標準コード | 日本語名 | grade_level目安 | 説明 |
|-----------|---------|----------------|------|
| `ECONOMY` | エコノミー | 1-2 | 最もベーシック |
| `STANDARD` | スタンダード | 3-4 | 標準的な部屋 |
| `SUPERIOR` | スーペリア | 5-6 | スタンダード以上 |
| `DELUXE` | デラックス | 7-8 | 上質な部屋 |
| `EXECUTIVE` | エグゼクティブ | 8-9 | ビジネス向け高級 |
| `SUITE` | スイート | 9 | スイートルーム |
| `JUNIOR-SUITE` | ジュニアスイート | 8 | 小型スイート |
| `PRESIDENTIAL` | プレジデンシャル | 10 | 最高級 |
| `PENTHOUSE` | ペントハウス | 10 | 最上階特別室 |

---

### サブ分類ルール

**標準コード + ハイフン + 詳細分類**で柔軟に対応

```
STANDARD-SINGLE      → 標準シングル
STANDARD-TWIN        → 標準ツイン
DELUXE-OCEANVIEW     → デラックスオーシャンビュー
SUITE-VIP            → VIPスイート
```

---

### RoomGradeHelper クラス

**実装箇所**: `/Users/kaneko/hotel-common/src/utils/room-grade-helper.ts`（未実装）

```typescript
export class RoomGradeHelper {
  
  static readonly STANDARD_CODES = {
    ECONOMY: 'ECONOMY',
    STANDARD: 'STANDARD',
    SUPERIOR: 'SUPERIOR',
    DELUXE: 'DELUXE',
    EXECUTIVE: 'EXECUTIVE',
    SUITE: 'SUITE',
    JUNIOR_SUITE: 'JUNIOR-SUITE',
    PRESIDENTIAL: 'PRESIDENTIAL',
    PENTHOUSE: 'PENTHOUSE'
  } as const
  
  /**
   * codeから標準コード部分を抽出
   * 例: getStandardCode('DELUXE-TWIN') → 'DELUXE'
   */
  static getStandardCode(code: string): string {
    return code.split('-')[0].toUpperCase()
  }
  
  /**
   * 標準コードかどうかを判定
   */
  static isStandardCode(code: string): boolean {
    const standardCode = this.getStandardCode(code)
    return Object.values(this.STANDARD_CODES).includes(standardCode as any)
  }
  
  /**
   * grade_levelから標準コードを推測（フォールバック用）
   */
  static estimateStandardCode(gradeLevel: number | null): string {
    if (!gradeLevel) return this.STANDARD_CODES.STANDARD
    if (gradeLevel <= 2) return this.STANDARD_CODES.ECONOMY
    if (gradeLevel <= 4) return this.STANDARD_CODES.STANDARD
    if (gradeLevel <= 6) return this.STANDARD_CODES.SUPERIOR
    if (gradeLevel <= 8) return this.STANDARD_CODES.DELUXE
    if (gradeLevel <= 9) return this.STANDARD_CODES.SUITE
    return this.STANDARD_CODES.PRESIDENTIAL
  }
  
  /**
   * 日本語名を取得（デフォルト）
   */
  static getJapaneseName(code: string): string {
    const standardCode = this.getStandardCode(code)
    const nameMap: Record<string, string> = {
      ECONOMY: 'エコノミー',
      STANDARD: 'スタンダード',
      SUPERIOR: 'スーペリア',
      DELUXE: 'デラックス',
      EXECUTIVE: 'エグゼクティブ',
      SUITE: 'スイート',
      'JUNIOR-SUITE': 'ジュニアスイート',
      PRESIDENTIAL: 'プレジデンシャル',
      PENTHOUSE: 'ペントハウス'
    }
    return nameMap[standardCode] || code
  }
}
```

---

## 🔌 API仕様

### 1. 客室一覧取得

**エンドポイント**: `GET /api/v1/admin/front-desk/rooms`

**実装箇所**:
- hotel-common: `/api/v1/admin/front-desk/rooms`（実装済み）
- hotel-saas: `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts`（プロキシ実装済み）

**リクエスト**:
```typescript
// Query Parameters
{
  page?: number            // ページ番号（デフォルト: 1）
  limit?: number           // 取得件数（デフォルト: 20、最大: 1000）
  status?: string          // ステータスフィルタ（AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE, OUT_OF_ORDER）
  room_grade_id?: string   // 客室グレードIDフィルタ（UUID）
  floor?: number           // 階数フィルタ
}

// Headers
{
  'Authorization': 'Bearer {sessionId}',
  'X-Tenant-ID': '{tenantId}',
  'Content-Type': 'application/json'
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    rooms: [
      {
        id: "room-uuid-001",
        tenantId: "tenant-xxx",
        roomNumber: "101",
        roomGradeId: "grade-uuid-001",  // ★ room_grades.id
        floor: 1,
        status: "AVAILABLE",
        capacity: 2,
        amenities: ["Wi-Fi", "TV", "エアコン"],
        notes: null,
        lastCleaned: "2025-10-02T08:00:00Z",
        createdAt: "2025-10-01T10:00:00Z",
        updatedAt: "2025-10-02T12:00:00Z",
        isDeleted: false,
        roomGrade: {                    // ★ Prismaリレーションで自動付与
          id: "grade-uuid-001",
          code: "STANDARD",
          name: "スタンダード",
          gradeLevel: 3
        }
      },
      // ...
    ],
    total: 150,
    page: 1,
    limit: 20,
    totalPages: 8
  }
}
```

**実装状況**: ✅ 実装済み（hotel-common + hotel-saas プロキシ）

---

### 2. 客室作成

**エンドポイント**: `POST /api/v1/admin/front-desk/rooms`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
{
  roomNumber: "301",          // 必須
  roomGradeId: "grade-uuid",  // 必須（room_grades.idのUUID）
  floor: 3,                   // 任意
  capacity: 2,                // デフォルト: 2
  amenities: ["Wi-Fi", "TV"], // 任意
  notes: ""                   // 任意
}

// Headers（同上）
```

**バリデーション**:
- `roomNumber` は必須（1-50文字）
- `roomNumber` は同一テナント内で重複不可
- `roomGradeId` は `room_grades` に存在する値のみ許可（外部キー制約）

**実装状況**: ❌ 未実装

---

### 3. 客室更新（基本情報）

**エンドポイント**: `PATCH /api/v1/admin/front-desk/rooms/:id`

**リクエスト**:
```typescript
// Body（更新したいフィールドのみ）
{
  roomNumber?: string,
  roomGradeId?: string,      // room_grades.idのUUID
  floor?: number,
  capacity?: number,
  amenities?: string[],
  notes?: string
}
```

**実装状況**: ❌ 未実装

---

### 4. 客室グレード一覧取得

**エンドポイント**: `GET /api/v1/admin/room-grades`

**実装箇所**: 未実装（要作成）

**レスポンス**:
```typescript
{
  success: true,
  data: {
    grades: [
      {
        id: "grade-uuid-001",
        tenantId: "tenant-xxx",
        code: "STANDARD",
        name: "スタンダード",
        gradeNameEn: "Standard",
        gradeLevel: 3,
        defaultCapacity: 2,
        maxCapacity: 4,
        standardAmenities: ["Wi-Fi", "TV", "エアコン"],
        isActive: true,
        isPublic: true
      },
      // ...
    ],
    total: 10
  }
}
```

**実装状況**: ❌ 未実装

---

## 🔗 システム間連携

### hotel-saas → hotel-common

#### 認証ヘッダー

**すべてのAPIリクエストに付与**:
```typescript
headers: {
  'Authorization': `Bearer ${user.sessionId}`,
  'X-Tenant-ID': tenantId,
  'Content-Type': 'application/json'
}
```

**実装例**（hotel-saas）:
```typescript
// hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts
export default defineEventHandler(async (event) => {
  const authUser = event.context.user
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }
  
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) 
    || (event.context.tenant?.id as string) 
    || authUser.tenantId
  
  const response = await $fetch(`${process.env.HOTEL_COMMON_API_URL}/api/v1/admin/front-desk/rooms`, {
    headers: {
      'Authorization': `Bearer ${authUser.token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    },
    query: getQuery(event)
  })
  
  return response
})
```

---

## 💻 実装詳細

### hotel-saas（プロキシAPI + UI）

#### ディレクトリ構成

```
/Users/kaneko/hotel-saas/
└── server/
    └── api/
        └── v1/
            └── admin/
                ├── front-desk/
                │   └── rooms.get.ts              ✅ 実装済み（一覧取得）
                ├── rooms/
                │   └── by-number/
                │       └── [roomNumber].get.ts   ✅ 実装済み（番号検索）
                ├── rooms.get.ts                  ✅ 実装済み（管理画面用一覧）
                └── room-grades/
                    └── index.get.ts              ❌ 未実装（要作成）
```

---

### hotel-common（コアAPI）

#### ディレクトリ構成

```
/Users/kaneko/hotel-common/
└── src/
    ├── routes/
    │   └── api/
    │       └── v1/
    │           └── admin/
    │               ├── front-desk/
    │               │   └── rooms.ts              🚧 部分実装（GET実装済み）
    │               ├── rooms/
    │               │   ├── index.ts              ❌ 未実装（POST要作成）
    │               │   └── [id].ts               ❌ 未実装（GET/PATCH/DELETE要作成）
    │               └── room-grades/
    │                   └── index.ts              ❌ 未実装（要作成）
    └── utils/
        └── room-grade-helper.ts                  ❌ 未実装（RoomGradeHelper要作成）
```

---

## 📋 既存実装状況

### ✅ 完全実装済み

| 項目 | ファイル | システム |
|------|---------|---------|
| 客室一覧取得API（プロキシ） | `hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts` | hotel-saas |
| 客室番号検索API | `hotel-saas/server/api/v1/admin/rooms/by-number/[roomNumber].get.ts` | hotel-saas |
| 管理画面UI | `hotel-saas/pages/admin/settings/rooms/index.vue` | hotel-saas |
| データベーステーブル | `hotel-common/prisma/schema.prisma` | hotel-common |
| device_rooms テーブル | `hotel-common/prisma/schema.prisma` | hotel-common |

### 🚧 部分実装

| 項目 | ファイル | 状態 |
|------|---------|------|
| 客室一覧取得API（hotel-common） | `hotel-common/src/routes/api/v1/admin/front-desk/rooms.ts` | 実装済みと推定（要確認） |
| 客室ステータス更新API | 未確認 | 実装未確認 |

### ❌ 未実装

| 項目 | 優先度 | 実装必要ファイル |
|------|--------|----------------|
| RoomGradeHelper | 🔴 最高 | hotel-common/src/utils/room-grade-helper.ts |
| 客室詳細取得API | 🔴 最高 | hotel-common + hotel-saas |
| 客室作成API | 🔴 最高 | hotel-common + hotel-saas |
| 客室更新API（基本情報） | 🔴 最高 | hotel-common + hotel-saas |
| 客室削除API | 🟡 高 | hotel-common + hotel-saas |
| 客室グレードCRUD API | 🟡 高 | hotel-common + hotel-saas |
| 客室稼働率・統計API | 🟢 中 | hotel-common |
| useRoom composable | 🔴 最高 | hotel-saas |

---

## 🔴 修正必須箇所

### Phase 1: データベースマイグレーション（最優先）

**実行箇所**: hotel-common

**参照**: `/Users/kaneko/hotel-common/docs/ROOM_GRADE_UNIFIED_DESIGN.md` - マイグレーション計画

```sql
-- 1. roomsテーブルにroom_grade_idカラム追加
ALTER TABLE rooms 
  ADD COLUMN room_grade_id TEXT;

-- 2. 既存データの移行（roomTypeからroom_gradeを紐付け）
UPDATE rooms r
SET room_grade_id = (
  SELECT rg.id 
  FROM room_grades rg 
  WHERE rg.tenant_id = r.tenant_id 
    AND UPPER(rg.code) = UPPER(r.room_type)
  LIMIT 1
);

-- 3. room_grade_idをNOT NULLに変更
ALTER TABLE rooms 
  ALTER COLUMN room_grade_id SET NOT NULL;

-- 4. 外部キー制約追加
ALTER TABLE rooms 
  ADD CONSTRAINT fk_rooms_room_grade 
  FOREIGN KEY (room_grade_id) 
  REFERENCES room_grades(id);

-- 5. インデックス追加
CREATE INDEX idx_rooms_room_grade_id ON rooms(room_grade_id);

-- 6. roomTypeカラム削除
ALTER TABLE rooms 
  DROP COLUMN room_type;

-- 7. roomTypeインデックス削除
DROP INDEX IF EXISTS rooms_roomType_idx;
```

---

### Phase 2: hotel-common Prismaスキーマ更新

**ファイル**: `/Users/kaneko/hotel-common/prisma/schema.prisma`

**修正内容**:
```prisma
model rooms {
  // ❌ 削除
  // roomType    String

  // ✅ 追加
  roomGradeId   String       @map("room_grade_id")
  roomGrade     room_grades  @relation(fields: [roomGradeId], references: [id])
  
  // インデックス追加
  @@index([roomGradeId])
}

model room_grades {
  // ✅ リレーション追加
  rooms         rooms[]
}
```

**実行コマンド**:
```bash
cd /Users/kaneko/hotel-common
npm run prisma:generate
```

---

### Phase 3: hotel-common 実装修正

#### 3-1. RoomGradeHelper実装

**ファイル**: `/Users/kaneko/hotel-common/src/utils/room-grade-helper.ts`（新規作成）

**内容**: 上記「room_grade統一方針」セクションのRoomGradeHelperクラスを実装

---

#### 3-2. API実装修正

**ファイル**: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/front-desk/rooms.ts`

**修正内容**:
```typescript
// 修正前
const rooms = await prisma.rooms.findMany({
  where: {
    roomType: 'DELUXE'
  }
})

// 修正後
const rooms = await prisma.rooms.findMany({
  where: {
    roomGrade: {
      code: { startsWith: 'DELUXE' }
    }
  },
  include: {
    roomGrade: true  // ★ リレーション自動付与
  }
})
```

---

### Phase 4: hotel-saas フロントエンド修正

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/settings/rooms/index.vue`

**修正内容**:
```typescript
// 修正箇所1: フィルタリング（line 348）
// 修正前
const matchesGrade = !selectedGrade.value || room.roomGradeId === selectedGrade.value

// 修正後（既に正しい実装）
const matchesGrade = !selectedGrade.value || room.roomGradeId === selectedGrade.value

// 修正箇所2: フォーム（line 226-232）
// 既に roomGradeId を使用しているため修正不要
<select v-model="roomForm.roomGradeId">
  <option value="">ランクを選択</option>
  <option v-for="grade in roomGrades" :key="grade.id" :value="grade.id">
    {{ grade.gradeName }}
  </option>
</select>
```

**結論**: hotel-saasの実装は既に`roomGradeId`を使用しているため、**フロントエンドの修正は不要**。

---

### Phase 5: hotel-common API応答修正

**ファイル**: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/front-desk/rooms.ts`（推定）

**修正内容**:
- `roomType` フィールドをレスポンスから削除
- `roomGradeId` フィールドを追加
- `roomGrade` オブジェクトを `include` で自動付与

**修正前**:
```typescript
{
  id: "room-001",
  roomType: "DELUXE"  // ❌ 削除
}
```

**修正後**:
```typescript
{
  id: "room-001",
  roomGradeId: "grade-uuid-001",  // ✅ 追加
  roomGrade: {                    // ✅ Prismaリレーション
    id: "grade-uuid-001",
    code: "DELUXE",
    name: "デラックス",
    gradeLevel: 7
  }
}
```

---

## 🧪 hotel-saas実装検証結果

### 現状確認（2025-10-03）

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/settings/rooms/index.vue`

**検証結果**:

| 行 | コード | 状態 | 備考 |
|----|--------|------|------|
| 226-232 | `v-model="roomForm.roomGradeId"` | ✅ 正しい | 客室作成/編集フォーム |
| 230 | `:value="grade.id"` | ✅ 正しい | room_grades.idを使用 |
| 348 | `room.roomGradeId === selectedGrade.value` | ✅ 正しい | フィルタリングロジック |
| 377 | `roomGradeId: room.roomGradeId` | ✅ 正しい | 編集時のデータ設定 |
| 361-366 | `authenticatedFetch('/api/v1/admin/room-grades/list')` | ✅ 正しい | グレード一覧取得 |

**コード抜粋**:
```vue
<!-- Line 224-233: 客室グレード選択（既に正しい実装） -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">客室ランク</label>
  <select
    v-model="roomForm.roomGradeId"
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  >
    <option value="">ランクを選択</option>
    <option v-for="grade in roomGrades" :key="grade.id" :value="grade.id">
      {{ grade.gradeName }}
    </option>
  </select>
</div>
```

```typescript
// Line 348: フィルタリングロジック（既に正しい実装）
const matchesGrade = !selectedGrade.value || room.roomGradeId === selectedGrade.value

// Line 373-383: 編集時のデータ設定（既に正しい実装）
const editRoom = (room) => {
  editingRoom.value = room
  roomForm.value = {
    roomNumber: room.roomNumber,
    roomGradeId: room.roomGradeId || '',  // ✅ 正しい
    floor: room.floor,
    capacity: room.capacity || 2,
    basePrice: room.basePrice ? Number(room.basePrice) : null,
    status: room.status
  }
  showCreateModal.value = true
}
```

### 結論

**hotel-saasは既に正しい実装になっており、フロントエンド修正は不要**

- ✅ `roomGradeId` (UUID) を使用
- ✅ `room_grades.id` との外部キー参照に準拠
- ✅ API呼び出しも `/api/v1/admin/room-grades/list` で正しい

**唯一の懸念事項**:
- hotel-commonのAPIレスポンスが `roomGradeId` を返しているか要確認
- 現在の `rooms` テーブルに `room_type` しかない場合、マイグレーション完了まで動作しない

---

## 🚨 マイグレーション失敗時の対処

### エラーケース1: 既存データに該当するroom_gradeがない

**原因**: `room_type`の値に対応する`room_grades.code`が存在しない

**診断SQL**:
```sql
-- 該当データを確認
SELECT 
  r.tenant_id,
  r.room_type,
  COUNT(*) as room_count
FROM rooms r 
WHERE NOT EXISTS (
  SELECT 1 FROM room_grades rg 
  WHERE rg.tenant_id = r.tenant_id 
    AND UPPER(rg.code) = UPPER(r.room_type)
)
GROUP BY r.tenant_id, r.room_type
ORDER BY r.tenant_id, room_count DESC;
```

**対処方法**:
```sql
-- 1. 各テナントにデフォルトSTANDARDグレードを作成
INSERT INTO room_grades (
  id, 
  tenant_id, 
  code, 
  name, 
  grade_level, 
  is_active, 
  created_at, 
  updated_at
)
SELECT 
  gen_random_uuid(), 
  t.id, 
  'STANDARD', 
  'スタンダード', 
  3, 
  true, 
  NOW(), 
  NOW()
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM room_grades rg 
  WHERE rg.tenant_id = t.id AND rg.code = 'STANDARD'
);

-- 2. room_typeに対応するroom_gradeを自動作成
INSERT INTO room_grades (
  id, 
  tenant_id, 
  code, 
  name, 
  grade_level, 
  is_active, 
  created_at, 
  updated_at
)
SELECT DISTINCT
  gen_random_uuid(),
  r.tenant_id,
  UPPER(r.room_type),
  INITCAP(r.room_type),
  CASE 
    WHEN UPPER(r.room_type) = 'ECONOMY' THEN 2
    WHEN UPPER(r.room_type) = 'STANDARD' THEN 3
    WHEN UPPER(r.room_type) = 'SUPERIOR' THEN 5
    WHEN UPPER(r.room_type) = 'DELUXE' THEN 7
    WHEN UPPER(r.room_type) = 'SUITE' THEN 9
    ELSE 3
  END,
  true,
  NOW(),
  NOW()
FROM rooms r
WHERE NOT EXISTS (
  SELECT 1 FROM room_grades rg 
  WHERE rg.tenant_id = r.tenant_id 
    AND UPPER(rg.code) = UPPER(r.room_type)
);
```

---

### エラーケース2: room_grade_id更新後にNULL値が残る

**原因**: マイグレーションSQL（Step 2）で紐付けできなかったデータ

**診断SQL**:
```sql
-- NULL値のroom_grade_idを確認
SELECT 
  tenant_id,
  room_number,
  room_type,
  id
FROM rooms 
WHERE room_grade_id IS NULL;
```

**対処方法**:
```sql
-- 1. デフォルトSTANDARDグレードに紐付け
UPDATE rooms 
SET room_grade_id = (
  SELECT id 
  FROM room_grades 
  WHERE tenant_id = rooms.tenant_id 
    AND code = 'STANDARD' 
  LIMIT 1
)
WHERE room_grade_id IS NULL;

-- 2. それでもNULLが残る場合（テナントにSTANDARDがない場合）
-- 該当テナントの最初のグレードに紐付け
UPDATE rooms r
SET room_grade_id = (
  SELECT id 
  FROM room_grades rg
  WHERE rg.tenant_id = r.tenant_id
  ORDER BY grade_level ASC
  LIMIT 1
)
WHERE r.room_grade_id IS NULL;
```

---

### エラーケース3: 外部キー制約追加時にエラー

**エラーメッセージ例**:
```
ERROR: insert or update on table "rooms" violates foreign key constraint "fk_rooms_room_grade"
```

**原因**: `room_grade_id`に存在しない`room_grades.id`が設定されている

**診断SQL**:
```sql
-- 存在しないroom_gradeを参照しているroomsを確認
SELECT 
  r.id,
  r.tenant_id,
  r.room_number,
  r.room_grade_id
FROM rooms r
WHERE NOT EXISTS (
  SELECT 1 FROM room_grades rg 
  WHERE rg.id = r.room_grade_id
);
```

**対処方法**:
```sql
-- デフォルトSTANDARDグレードに修正
UPDATE rooms r
SET room_grade_id = (
  SELECT id 
  FROM room_grades rg
  WHERE rg.tenant_id = r.tenant_id 
    AND rg.code = 'STANDARD'
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 FROM room_grades rg 
  WHERE rg.id = r.room_grade_id
);
```

---

### ロールバック手順（全手順）

**重要**: マイグレーション実行前に必ずバックアップ取得

```sql
-- バックアップ取得
pg_dump -U postgres -d hotel_db -t rooms > rooms_backup_$(date +%Y%m%d_%H%M%S).sql
pg_dump -U postgres -d hotel_db -t room_grades > room_grades_backup_$(date +%Y%m%d_%H%M%S).sql
```

**ロールバックSQL**:
```sql
-- Step 1: トランザクション開始
BEGIN;

-- Step 2: 外部キー制約削除
ALTER TABLE rooms 
  DROP CONSTRAINT IF EXISTS fk_rooms_room_grade;

-- Step 3: インデックス削除
DROP INDEX IF EXISTS idx_rooms_room_grade_id;

-- Step 4: room_type復元（バックアップから）
ALTER TABLE rooms 
  ADD COLUMN room_type TEXT;

-- Step 5: room_grade_idからroom_typeにデータをコピー
UPDATE rooms r
SET room_type = (
  SELECT code 
  FROM room_grades rg 
  WHERE rg.id = r.room_grade_id
);

-- Step 6: room_grade_idカラム削除
ALTER TABLE rooms 
  DROP COLUMN room_grade_id;

-- Step 7: 元のインデックス復元
CREATE INDEX IF NOT EXISTS rooms_roomType_idx ON rooms(room_type);

-- Step 8: データ整合性確認
SELECT 
  COUNT(*) as total_rooms,
  COUNT(room_type) as rooms_with_type,
  COUNT(*) - COUNT(room_type) as null_room_types
FROM rooms;

-- 問題なければコミット
COMMIT;

-- 問題があればロールバック
-- ROLLBACK;
```

---

### マイグレーション実行チェックリスト

**事前準備**:
- [ ] 本番環境のバックアップ取得
- [ ] ステージング環境でマイグレーション検証
- [ ] room_gradesテーブルの標準データ確認
- [ ] 既存データの`room_type`値の種類を確認

**実行時**:
- [ ] トランザクション内で実行
- [ ] 各ステップ後にデータ確認
- [ ] エラー発生時は即座にロールバック
- [ ] メンテナンスモード有効化（ユーザーアクセス制限）

**事後確認**:
- [ ] NULL値のroom_grade_idがないこと
- [ ] 外部キー制約が正常に動作すること
- [ ] hotel-saas管理画面で客室一覧表示確認
- [ ] 客室作成・編集動作確認
- [ ] グレードフィルタリング動作確認

---

## 📋 実装チェックリスト

### Phase 1: データベースマイグレーション（Week 1 - Day 1）

- [ ] マイグレーションSQL作成
- [ ] バックアップ取得
- [ ] ステージング環境で検証
- [ ] エラーケース対処SQL準備
- [ ] ロールバック手順確認
- [ ] マイグレーション実行
- [ ] データ整合性確認

---

### Phase 2: hotel-common 基盤実装（Week 1 - Day 2-3）

- [ ] Prismaスキーマ更新
- [ ] Prismaクライアント再生成
- [ ] RoomGradeHelper実装
- [ ] 単体テスト作成

---

### Phase 3: hotel-common API修正（Week 1 - Day 4-5）

- [ ] 客室一覧取得API修正（roomGradeリレーション追加）
- [ ] 客室詳細取得API実装
- [ ] 客室作成API実装（roomGradeIdバリデーション）
- [ ] 客室更新API実装
- [ ] 客室削除API実装

---

### Phase 4: hotel-saas 修正確認（Week 2 - Day 1）

- [ ] フロントエンド動作確認（既存実装が正しいため修正不要の可能性）
- [ ] API呼び出しテスト
- [ ] エラーハンドリング確認

---

### Phase 5: 統合テスト（Week 2 - Day 2-3）

- [ ] 客室作成フロー
- [ ] 客室更新フロー
- [ ] 客室グレード変更
- [ ] フィルタリング動作確認
- [ ] 統計・ダッシュボード連携

---

## 🔗 関連SSOT

- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理（roomId参照）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-02 | 1.0.0 | 初版作成 | AI |
| 2025-10-03 | 2.0.0 | **誤った実装方針**（roomType String使用） | AI |
| 2025-10-03 | 3.0.0 | **正しい実装方針に全面修正**<br>- `rooms.roomType`削除 → `rooms.roomGradeId`外部キー追加<br>- `room_grades`テーブルとの1対多リレーション確立<br>- RoomGradeHelper実装仕様追加<br>- マイグレーション計画追加<br>- 修正必須箇所を明確化<br>- ROOM_GRADE_UNIFIED_DESIGN.mdに完全準拠 | AI |
| 2025-10-04 | 3.1.0 | **管理画面専用に特化**<br>- 客室端末関連の記述を削除<br>- デバイス認証への参照を削除<br>- ゲスト機能は`02_guest_features/`へ分離 | AI |

---

**以上、SSOT: 客室管理システム（v3.1.0）**
