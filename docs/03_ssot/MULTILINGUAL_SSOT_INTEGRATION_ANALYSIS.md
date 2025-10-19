# 多言語化SSOT統合分析レポート

**作成日**: 2025-10-10  
**バージョン**: 1.0.0  
**担当**: Luna  
**目的**: 既存SSOTへの多言語化統合の完全分析

---

## 📋 目次

1. [分析の前提](#分析の前提)
2. [SSOT_MULTILINGUAL_SYSTEMの核心理解](#ssot_multilingual_systemの核心理解)
3. [既存SSOT分析](#既存ssot分析)
4. [統合方針](#統合方針)
5. [具体的な変更内容](#具体的な変更内容)

---

## 🎯 分析の前提

### 絶対に守るべきこと

1. ✅ **既存SSO仕様を完全に尊重**
2. ✅ **多言語化SSOTの設計原則を完全に遵守**
3. ✅ **2つのSSOTを矛盾なく完全にマージ**
4. ✅ **実装者が混乱しない1つの完全なSSO**を作る

---

## 🌐 SSOT_MULTILINGUAL_SYSTEMの核心理解

### 設計原則（line 53-60）

```
1. **DRY原則**: 共通機能は1箇所のみ実装（hotel-common）
2. **既存実装の尊重**: 既存の menu_items, menu_categories 等のテーブル構造を維持
3. **拡張性**: 15言語以上への拡張が容易
4. **パフォーマンス**: キャッシュ戦略による高速応答
5. **品質保証**: 翻訳品質スコアリング、レビュー機能
6. **運用性**: 翻訳進捗監視、コスト追跡
```

### 既存実装との共存（line 233-243）

```
✅ 既存の多言語カラム

| テーブル | 英語カラム | 実装状況 |
|---------|-----------|---------|
| **menu_items** | `name_ja`, `name_en`, `description_ja`, `description_en` | ✅ 実装済み |
| **menu_categories** | `name_ja`, `name_en`, `description_ja`, `description_en` | ✅ 実装済み |
| **room_grades** | `grade_name_en` | ✅ 実装済み |
```

### 段階的移行計画（line 282-306）

```
Phase 1: 翻訳テーブル作成（1週間）
  ├─ translationsテーブル作成
  ├─ translation_jobsテーブル作成
  └─ 翻訳エンジン実装

Phase 2: 既存データ移行（1週間）
  ├─ menu_items の name_ja/en → translations
  ├─ menu_categories の name_ja/en → translations
  └─ room_grades の grade_name_en → translations

Phase 3: 既存カラム非推奨化（2-3週間）
  ├─ 既存カラムにDEPRECATEDコメント追加
  ├─ 新規開発では翻訳テーブルのみ使用
  └─ 既存データは維持（削除しない）

Phase 4: 15言語拡張（2-3週間）
  ├─ 残り13言語の自動翻訳実行
  ├─ 全言語での表示確認
  └─ パフォーマンス最適化

Phase 5: 既存カラム削除（3-6ヶ月後）
  └─ 十分な移行期間後に既存カラムを削除
```

**🔑 核心**: 既存カラム（`name_ja`, `name_en`等）は**当面維持**、`translations`テーブルと**並行運用**

---

## 📊 既存SSOT分析

### 1. SSOT_SAAS_MENU_MANAGEMENT.md

#### 既存のデータベース設計（line 132-190）

```sql
CREATE TABLE menu_items (
  -- 基本情報（多言語）
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- ... 他のフィールド
);
```

#### 既存のAPI仕様（line 398-469）

```typescript
// GET /api/v1/admin/menu/items
{
  menuItems: [
    {
      nameJa: "ハンバーグステーキ",
      nameEn: "Hamburger Steak",
      descriptionJa: "自家製ソースで...",
      descriptionEn: "With homemade sauce...",
      // ...
    }
  ]
}
```

#### 既存のPrismaモデル（line 194-252）

```prisma
model MenuItem {
  nameJa          String    @map("name_ja")
  nameEn          String?   @map("name_en")
  descriptionJa   String?   @map("description_ja")
  descriptionEn   String?   @map("description_en")
  
  @@map("menu_items")
}
```

**結論**: 既存の`name_ja`, `name_en`カラムは**実装済み**、稼働中

---

### 2. SSOT_SAAS_ROOM_MANAGEMENT.md

#### 既存のデータベース設計（line 239-287）

```sql
CREATE TABLE room_grades (
  -- 表示名
  name                 TEXT NOT NULL,
  grade_name_en        TEXT,
  
  -- ... 他のフィールド
);
```

#### 既存のPrismaモデル（line 289-342）

```prisma
model room_grades {
  name                 String
  grade_name_en        String?
  
  @@map("room_grades")
}
```

**結論**: 既存の`name`, `grade_name_en`カラムは**実装済み**、稼働中

---

### 3. SSOT_ADMIN_AI_KNOWLEDGE_BASE.md

#### 既存のデータベース設計（line 134-166）

```prisma
model AiKnowledgeBase {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  
  // 基本情報
  title           String   @map("title")
  description     String?  @map("description")
  category        String?  @map("category")
  
  // ... 他のフィールド
  
  @@map("ai_knowledge_bases")
}
```

**質問・回答データのテーブル定義が見当たらない**

**推測**: 将来的に多言語化が必要になる可能性があるが、現時点では**日本語のみ**の可能性が高い

---

## 🔀 統合方針

### 核心原則

**多言語化は「追加機能」であり、既存仕様を「置き換える」ものではない**

```
既存SSOT + 多言語化SSOT = 統合SSOT
```

### 統合方法

#### 1. データベース設計セクション

**追加内容**:
- `translations`テーブルとの関連を明記
- 既存カラムの**保持期間**を明記
- マイグレーション計画を明記

**変更しないこと**:
- 既存テーブル構造
- 既存Prismaモデル
- 既存カラム名

#### 2. API仕様セクション

**追加内容**:
- `?lang=en`クエリパラメータのサポート
- レスポンスに多言語フィールドを**オプション**として追加
- 既存APIとの互換性を保証

**変更しないこと**:
- 既存のエンドポイント
- 既存のレスポンス形式（多言語は追加のみ）

#### 3. フロントエンド実装セクション

**追加内容**:
- 言語切り替えUI
- `translations`テーブルからの取得ロジック
- フォールバック戦略（`translations`→既存カラム→デフォルト）

**変更しないこと**:
- 既存のフォーム
- 既存の表示ロジック（多言語対応は段階的追加）

---

## 📝 具体的な変更内容

### SSOT_SAAS_MENU_MANAGEMENT.md への追加

#### セクション追加位置: line 103（未実装機能の後）

```markdown
---

## 🌐 多言語対応

### 概要

メニュー管理システムは、日本語・英語を含む**15言語対応**をサポートします。

### 対象フィールド

| フィールド | 翻訳対象 | 既存カラム | 新規システム |
|-----------|---------|----------|------------|
| メニュー名 | ✅ | `name_ja`, `name_en` | `translations` |
| 説明文 | ✅ | `description_ja`, `description_en` | `translations` |
| アレルギー情報 | ✅ | （未実装） | `translations` |
| カテゴリ名 | ✅ | `name_ja`, `name_en` | `translations` |

### 実装方式

#### 統一翻訳テーブル方式

**参照SSOT**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

**アーキテクチャ**:
```
hotel-saas (管理画面)
  ↓ メニュー作成・更新
hotel-common (API)
  ↓ 自動翻訳ジョブ作成
translations テーブル (PostgreSQL)
  ↓ ベクトル化・保存
```

### データベース設計の拡張

#### 既存テーブル構造（維持）

```sql
-- menu_items（既存構造は変更なし）
CREATE TABLE menu_items (
  -- 基本情報（多言語）- 既存カラムは Phase 5まで維持
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
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
entity_type = 'menu_item'       -- メニュー項目
entity_type = 'menu_category'   -- メニューカテゴリ

-- フィールド名
field_name = 'name'             -- メニュー名
field_name = 'description'      -- 説明文
field_name = 'allergen_info'    -- アレルギー情報
```

### API仕様の拡張

#### 既存API（変更なし）

```typescript
// GET /api/v1/admin/menu/items
// 既存のレスポンス形式は維持
{
  menuItems: [
    {
      nameJa: "ハンバーグステーキ",
      nameEn: "Hamburger Steak",
      // ...
    }
  ]
}
```

#### 多言語対応API（新規追加）

```typescript
// GET /api/v1/admin/menu/items?lang=ko
// 多言語対応レスポンス（オプション）
{
  menuItems: [
    {
      id: 1,
      
      // 既存カラム（Phase 3まで）
      nameJa: "ハンバーグステーキ",
      nameEn: "Hamburger Steak",
      descriptionJa: "自家製ソースで...",
      descriptionEn: "With homemade sauce...",
      
      // 新規: translations テーブルから取得（Phase 2以降）
      translations: {
        name: {
          ja: "ハンバーグステーキ",
          en: "Hamburger Steak",
          ko: "특제 함박 스테이크",
          'zh-CN': "特制汉堡牛排"
        },
        description: {
          ja: "自家製ソースで...",
          en: "With homemade sauce...",
          ko: "국산 소고기 100% 사용의 특제 함박...",
          'zh-CN': "使用国产牛肉100%的特制汉堡..."
        }
      }
    }
  ]
}
```

### 新規登録時の動作

#### 管理画面でのメニュー作成フロー

```
1. スタッフが日本語でメニューを登録
   ↓
2. hotel-common がメニューを作成
   - menu_items テーブルに保存（name_ja, name_en）
   - translations テーブルに日本語を保存（entity_type='menu_item', language_code='ja'）
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

**所要時間**: 14言語 × 3フィールド = 42タスク → 1-2分

### フロントエンド実装

#### 言語切り替えUI

**実装箇所**: `/pages/admin/menu/index.vue`（既存ページへの追加）

```vue
<template>
  <div>
    <!-- 既存のメニュー一覧UI -->
    
    <!-- 新規: 言語切り替え -->
    <select v-model="selectedLang">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <!-- ... 15言語 -->
    </select>
    
    <!-- メニュー表示（翻訳対応） -->
    <div v-for="item in menuItems" :key="item.id">
      <h3>{{ getTranslatedName(item) }}</h3>
      <p>{{ getTranslatedDescription(item) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLang = ref('ja')

const getTranslatedName = (item: MenuItem) => {
  // フォールバック戦略
  return item.translations?.name?.[selectedLang.value]  // 1. translations テーブル
    || (selectedLang.value === 'ja' ? item.nameJa : item.nameEn)  // 2. 既存カラム
    || item.nameJa  // 3. デフォルト（日本語）
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
-- menu_items の name_ja, name_en を translations へ移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'ja',
  'name',
  name_ja,
  'manual'
FROM menu_items
WHERE name_ja IS NOT NULL;

-- 同様に name_en, description_ja, description_en を移行
```

#### Phase 3: 既存カラム非推奨化（Week 2-4）

**担当**: hotel-common (Iza AI)

```sql
COMMENT ON COLUMN menu_items.name_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=name, language_code=ja）';
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
ALTER TABLE menu_items 
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;
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
```

---

### SSOT_SAAS_ROOM_MANAGEMENT.md への追加

#### セクション追加位置: line 97（未実装機能の後）

```markdown
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

### データベース設計の拡張

#### 既存テーブル構造（維持）

```sql
CREATE TABLE room_grades (
  -- 表示名（既存カラムは Phase 5まで維持）
  name                 TEXT NOT NULL,
  grade_name_en        TEXT,
  
  -- ⚠️ 注: Phase 5（3-6ヶ月後）で削除予定
  
  -- ... 他のフィールド（変更なし）
);
```

#### translationsテーブル連携

```sql
-- エンティティタイプ
entity_type = 'room_grade'

-- フィールド名
field_name = 'grade_name'   -- グレード名
field_name = 'description'  -- 説明
```

### API仕様の拡張

```typescript
// GET /api/v1/admin/room-grades?lang=ko
{
  grades: [
    {
      id: "grade-uuid-001",
      code: "STANDARD",
      name: "スタンダード",       // 既存カラム（Phase 3まで）
      gradeNameEn: "Standard",  // 既存カラム（Phase 3まで）
      
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

### マイグレーション計画

**Phase 1-5**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) に準拠

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

---
```

---

### SSOT_ADMIN_AI_KNOWLEDGE_BASE.md への追加

#### セクション追加位置: line 39（ベクトル化処理の前）

```markdown
---

## 🌐 多言語対応

### 概要

AI知識ベースは、質問・回答コンテンツを**15言語対応**します。

### 対象フィールド

| フィールド | 翻訳対象 | 既存実装 | 新規システム |
|-----------|---------|---------|------------|
| タイトル | ✅ | 日本語のみ | `translations` |
| 説明 | ✅ | 日本語のみ | `translations` |
| カテゴリ | ✅ | 日本語のみ | `translations` |

### 実装方式

#### UIテキスト多言語化

**方式**: `@nuxtjs/i18n` でフロントエンド実装

```vue
<template>
  <div>
    <h1>{{ $t('knowledge.title') }}</h1>
    <button>{{ $t('knowledge.upload') }}</button>
  </div>
</template>
```

#### データベースコンテンツの多言語化（将来実装）

**Phase 3以降**: 質問・回答の多言語対応を実装

```sql
-- 将来的に追加予定
entity_type = 'ai_knowledge_base'

field_name = 'title'        -- タイトル
field_name = 'description'  -- 説明
field_name = 'content'      -- コンテンツ本文
```

### 実装Phase

- **Phase 2**: UIテキストの日英対応（`@nuxtjs/i18n`）
- **Phase 3**: データベースコンテンツの15言語対応（`translations`テーブル）
- **Phase 4**: RAGベクトル検索の多言語対応

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

---
```

---

## ✅ 統合作業のチェックリスト

### ステップ1: SSOT更新（3件）

- [ ] `SSOT_SAAS_MENU_MANAGEMENT.md` - 多言語化セクション追加（詳細版）
- [ ] `SSOT_SAAS_ROOM_MANAGEMENT.md` - 多言語化セクション追加（詳細版）
- [ ] `SSOT_ADMIN_AI_KNOWLEDGE_BASE.md` - 多言語化セクション追加（軽量版）

### ステップ2: 変更内容の確認

- [ ] 既存のデータベース設計に**変更がない**ことを確認
- [ ] 既存のAPI仕様に**変更がない**ことを確認（多言語は追加のみ）
- [ ] マイグレーション計画が明記されている

### ステップ3: 開発者への通知

- [ ] 既存カラムは**Phase 5まで維持**することを明記
- [ ] 新規開発では`translations`テーブルを使用することを明記
- [ ] フォールバック戦略を明記

---

## 📊 影響度評価（最終版）

### 高影響（詳細追加必須）

| SSOT | 理由 | 追加内容の規模 |
|------|------|--------------|
| SSOT_SAAS_MENU_MANAGEMENT.md | データフィールドあり（name, description） | 🔴 大（約200行） |
| SSOT_SAAS_ROOM_MANAGEMENT.md | データフィールドあり（grade_name） | 🔴 大（約150行） |

### 中影響（軽量追加）

| SSOT | 理由 | 追加内容の規模 |
|------|------|--------------|
| SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | UIテキストのみ、将来的にデータ多言語化 | 🟡 中（約80行） |

---

## 🚀 次のステップ

1. ✅ **このレポートを確認・承認いただく**
2. ✅ **承認後、3つのSSOTを更新**
3. ✅ **write_new_ssot.md にテンプレート追加**

よろしいでしょうか？

---

**作成者**: Luna  
**最終更新**: 2025-10-10

