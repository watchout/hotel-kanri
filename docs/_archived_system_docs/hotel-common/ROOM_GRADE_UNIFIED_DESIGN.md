# 部屋グレード統一設計書

**作成日**: 2025-10-03  
**バージョン**: 1.0.0  
**ステータス**: ✅ 設計確定  
**関連SSOT**: SSOT_SAAS_DATABASE_SCHEMA.md

---

## 📋 目次

1. [背景・課題](#背景課題)
2. [統一方針](#統一方針)
3. [設計仕様](#設計仕様)
4. [実装方法](#実装方法)
5. [マイグレーション計画](#マイグレーション計画)
6. [使用例](#使用例)

---

## 🔍 背景・課題

### 現状の問題

**2つの似た概念が混在**している状態：

```
❌ 現状（混乱の元）

rooms.roomType (文字列)
  - "standard", "deluxe", "suite"
  - システム固定値
  - 詳細情報なし

room_grades (テーブル)
  - テナントごとに定義
  - 詳細な設備・料金情報あり
  - 紐付けがない
```

**問題点**：
1. ❌ どちらを使えば良いか開発者が迷う
2. ❌ データ不整合のリスク（roomType="suite"なのにroom_grade="standard"等）
3. ❌ 保守コストが2倍
4. ❌ システム間で共通認識できない

---

## 🎯 統一方針

### 基本原則

**room_gradeに統一し、システム間で共通認識できる設計にする**

```
✅ 統一後（シンプル＆強力）

room_grades (唯一の真実の情報源)
  ├─ code: システム間共通コード
  ├─ name: 表示名
  ├─ grade_level: ランクレベル
  └─ その他詳細情報

rooms
  └─ roomGradeId: room_gradesへの外部キー
```

**メリット**:
- ✅ 単一の真実の情報源（SSOT）
- ✅ システム間で共通認識
- ✅ テナントごとの柔軟性を確保
- ✅ 管理がシンプル

---

## 🏗️ 設計仕様

### 1. room_gradesテーブル（既存）

```sql
CREATE TABLE room_grades (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL,
  
  -- システム間共通認識用コード
  code                 TEXT NOT NULL,          -- ← これを活用
  
  -- 表示名
  name                 TEXT NOT NULL,
  name_en              TEXT,                   -- grade_name_en → name_en
  
  -- グレード情報
  grade_level          INTEGER,                -- 1-10のランク
  description          TEXT,
  
  -- 詳細仕様
  default_capacity     INTEGER,
  max_capacity         INTEGER,
  room_size_sqm        DECIMAL,
  standard_amenities   JSONB,
  premium_amenities    JSONB,
  included_services    JSONB,
  
  -- 制御
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
```

---

### 2. codeフィールドの運用ルール

**システム共通の標準コード**を使用：

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

**サブ分類が必要な場合**（ハイフンで接続）:

```
STANDARD-SINGLE      → 標準シングル
STANDARD-TWIN        → 標準ツイン
DELUXE-OCEANVIEW     → デラックスオーシャンビュー
SUITE-VIP            → VIPスイート
```

---

### 3. roomsテーブル（修正後）

```sql
CREATE TABLE rooms (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL,
  room_number    TEXT NOT NULL,
  
  -- ✅ room_gradeへの紐付け（必須）
  room_grade_id  TEXT NOT NULL,
  
  -- ❌ roomTypeを削除
  -- room_type   TEXT,  ← 削除
  
  floor          INTEGER,
  status         TEXT DEFAULT 'AVAILABLE',
  capacity       INTEGER DEFAULT 2,
  amenities      JSONB,
  notes          TEXT,
  last_cleaned   TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  is_deleted     BOOLEAN DEFAULT false,
  deleted_at     TIMESTAMP,
  deleted_by     TEXT,
  
  CONSTRAINT fk_rooms_room_grade 
    FOREIGN KEY (room_grade_id) REFERENCES room_grades(id),
  
  CONSTRAINT rooms_tenant_room_unique 
    UNIQUE (tenant_id, room_number)
);

CREATE INDEX idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX idx_rooms_room_grade_id ON rooms(room_grade_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_is_deleted ON rooms(is_deleted);
```

---

### 4. Prismaスキーマ

```prisma
model room_grades {
  id                   String    @id
  tenant_id            String    @map("tenant_id")
  
  // システム間共通コード
  code                 String
  
  // 表示名
  name                 String
  name_en              String?   @map("grade_name_en")
  
  // グレード情報
  grade_level          Int?      @map("grade_level")
  description          String?
  
  // 詳細仕様
  default_capacity     Int?      @map("default_capacity")
  max_capacity         Int?      @map("max_capacity")
  room_size_sqm        Decimal?  @map("room_size_sqm")
  standard_amenities   Json?     @map("standard_amenities")
  premium_amenities    Json?     @map("premium_amenities")
  included_services    Json?     @map("included_services")
  
  // 制御
  member_only          Boolean   @default(false) @map("member_only")
  min_stay_nights      Int?      @map("min_stay_nights")
  advance_booking_days Int?      @map("advance_booking_days")
  
  // 表示・公開
  display_order        Int?      @map("display_order")
  is_active            Boolean   @default(true) @map("is_active")
  is_public            Boolean   @default(true) @map("is_public")
  pricing_category     String?   @map("pricing_category")
  
  // タイムスタンプ
  created_at           DateTime  @default(now()) @map("created_at")
  updated_at           DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  rooms                rooms[]
  
  @@unique([tenant_id, code])
  @@index([tenant_id])
  @@index([is_active])
  @@index([grade_level])
  @@map("room_grades")
}

model rooms {
  id            String       @id
  tenantId      String       @map("tenant_id")
  roomNumber    String       @map("room_number")
  roomGradeId   String       @map("room_grade_id")
  floor         Int?
  status        String       @default("AVAILABLE")
  capacity      Int          @default(2)
  amenities     Json?
  notes         String?
  lastCleaned   DateTime?    @map("last_cleaned")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  isDeleted     Boolean      @default(false) @map("is_deleted")
  deletedAt     DateTime?    @map("deleted_at")
  deletedBy     String?      @map("deleted_by")
  
  // リレーション
  roomGrade     room_grades  @relation(fields: [roomGradeId], references: [id])
  
  @@unique([tenantId, roomNumber])
  @@index([tenantId])
  @@index([roomGradeId])
  @@index([status])
  @@index([isDeleted])
  @@map("rooms")
}
```

---

## 🔧 実装方法

### ヘルパー関数

```typescript
// src/utils/room-grade-helper.ts

/**
 * 部屋グレードユーティリティ
 */
export class RoomGradeHelper {
  
  /**
   * 標準コード定義
   */
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
   * 
   * @example
   * getStandardCode('DELUXE-TWIN') // → 'DELUXE'
   * getStandardCode('STANDARD') // → 'STANDARD'
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

## 🔄 マイグレーション計画

### Phase 1: スキーマ変更

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

### Phase 2: Prismaスキーマ更新

```bash
# 1. schema.prismaを更新（上記のPrismaスキーマに変更）

# 2. マイグレーション生成
npm run migrate:dev remove_room_type_add_room_grade_id

# 3. Prismaクライアント再生成
npm run prisma:generate
```

### Phase 3: アプリケーションコード修正

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
    roomGrade: true
  }
})
```

---

## 💡 使用例

### 例1: システム間共通認識

```typescript
// hotel-pmsでの予約処理
async function checkRoomAvailability(gradeCode: string) {
  const standardCode = RoomGradeHelper.getStandardCode(gradeCode)
  
  // 'DELUXE-TWIN' でも 'DELUXE-OCEANVIEW' でも
  // 標準コード 'DELUXE' で統一的に扱える
  
  return await prisma.rooms.findMany({
    where: {
      roomGrade: {
        code: { startsWith: standardCode }
      },
      status: 'AVAILABLE'
    },
    include: { roomGrade: true }
  })
}
```

### 例2: hotel-memberでの会員特典制御

```typescript
// 会員ランクに応じたアクセス可能グレード
function getAllowedGrades(memberRank: string): string[] {
  const gradeMap = {
    BRONZE: ['ECONOMY', 'STANDARD'],
    SILVER: ['ECONOMY', 'STANDARD', 'SUPERIOR'],
    GOLD: ['ECONOMY', 'STANDARD', 'SUPERIOR', 'DELUXE'],
    PLATINUM: ['ECONOMY', 'STANDARD', 'SUPERIOR', 'DELUXE', 'SUITE']
  }
  
  return gradeMap[memberRank] || ['STANDARD']
}

// 予約可能な部屋を取得
async function getAvailableRoomsForMember(
  tenantId: string, 
  memberRank: string
) {
  const allowedCodes = getAllowedGrades(memberRank)
  
  return await prisma.rooms.findMany({
    where: {
      tenantId,
      status: 'AVAILABLE',
      roomGrade: {
        code: { in: allowedCodes }
      }
    },
    include: { roomGrade: true }
  })
}
```

### 例3: hotel-saasでのメニュー表示制御

```typescript
// 部屋グレードに応じたサービスメニュー
function getMenuByRoomGrade(gradeCode: string) {
  const standardCode = RoomGradeHelper.getStandardCode(gradeCode)
  const gradeLevel = getGradeLevelByCode(standardCode)
  
  // グレードレベルに応じてメニューを変える
  if (gradeLevel >= 8) {
    return 'premium-menu'  // スイート以上はプレミアムメニュー
  } else if (gradeLevel >= 5) {
    return 'deluxe-menu'   // デラックス以上
  } else {
    return 'standard-menu' // スタンダード
  }
}
```

### 例4: テナントごとの詳細分類

```typescript
// テナントA: ビジネスホテル
const gradeConfigA = [
  { code: 'STANDARD-SINGLE', name: 'シングル', grade_level: 3 },
  { code: 'STANDARD-TWIN', name: 'ツイン', grade_level: 3 },
  { code: 'DELUXE-DOUBLE', name: 'ダブル', grade_level: 6 },
  { code: 'SUITE', name: 'スイート', grade_level: 9 }
]

// テナントB: レジャーホテル
const gradeConfigB = [
  { code: 'STANDARD', name: 'スタンダード', grade_level: 3 },
  { code: 'DELUXE-JACUZZI', name: 'ジャグジー付き', grade_level: 7 },
  { code: 'SUITE-VIP', name: 'VIPスイート', grade_level: 9 },
  { code: 'PENTHOUSE', name: 'ペントハウス', grade_level: 10 }
]

// どちらも標準コード部分で共通認識可能
RoomGradeHelper.getStandardCode('STANDARD-SINGLE') // → 'STANDARD'
RoomGradeHelper.getStandardCode('STANDARD') // → 'STANDARD'
```

---

## ✅ まとめ

### 統一後の利点

| 項目 | 統一前 | 統一後 |
|-----|-------|-------|
| **情報源** | roomType + room_grade（2つ） | room_grade（1つ） |
| **システム間認識** | ❌ 不可 | ✅ 標準コードで統一 |
| **テナント柔軟性** | ❌ roomTypeは固定 | ✅ codeで自由に定義 |
| **詳細管理** | ❌ 不可 | ✅ 設備・料金・条件すべて管理 |
| **保守性** | ❌ 2つの概念を管理 | ✅ 1つだけ |
| **データ整合性** | ❌ 不整合リスクあり | ✅ 外部キーで保証 |

### 実装チェックリスト

- [ ] マイグレーションSQL作成
- [ ] Prismaスキーマ更新
- [ ] RoomGradeHelperクラス実装
- [ ] 既存コードの修正（roomType → roomGrade）
- [ ] テストデータ作成
- [ ] 動作確認
- [ ] ドキュメント更新

---

**作成者**: Iza（統合管理者）  
**最終更新**: 2025-10-03


