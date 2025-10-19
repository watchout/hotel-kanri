# SSOT多言語化統合ワークフロー

**作成日**: 2025-10-10  
**バージョン**: 1.0.0  
**目的**: 既存SSOTに多言語化を統合する際の標準思考フロー  
**重要度**: 🔴 CRITICAL

---

## 📋 目次

1. [このドキュメントの目的](#このドキュメントの目的)
2. [絶対に守るべき原則](#絶対に守るべき原則)
3. [統合前の必須理解](#統合前の必須理解)
4. [統合判断フロー](#統合判断フロー)
5. [統合実施フロー](#統合実施フロー)
6. [品質チェックリスト](#品質チェックリスト)
7. [テンプレート](#テンプレート)

---

## 🎯 このドキュメントの目的

### 背景

既存SSOTに多言語化を統合する際、**表面的な理解**では以下の問題が発生します：

❌ **誤った統合例**:
- 既存のデータベース構造を変更してしまう
- 既存のAPI仕様を破壊してしまう
- 稼働中のシステムに影響を与える
- 開発者が混乱する不完全なドキュメント

✅ **正しい統合**:
- 既存仕様を完全に尊重
- 多言語化を「追加機能」として統合
- 段階的移行計画を明記
- 開発者が迷わない1つの完全なSSO

### 目的

このワークフローに従うことで、**100%完全な理解**に基づいた統合を実現します。

---

## 🚨 絶対に守るべき原則

### 原則1: 既存仕様の完全尊重

```
❌ 既存カラムを削除する
❌ 既存APIを変更する
❌ 既存テーブル構造を変える

✅ 既存カラムは維持（Phase 5まで）
✅ 既存APIは互換性保持
✅ 新機能は追加のみ
```

### 原則2: 段階的移行の明記

```
Phase 1: 翻訳テーブル作成
Phase 2: 既存データ移行
Phase 3: 既存カラム非推奨化（削除しない）
Phase 4: 15言語拡張
Phase 5: 既存カラム削除（3-6ヶ月後）
```

### 原則3: 完全なマージ

```
既存SSOT（現在稼働中）
  +
多言語化SSOT（新規追加）
  =
統合SSOT（完全版、矛盾なし）
```

### 原則4: 開発者への配慮

```
✅ 既存実装への影響を明記
✅ マイグレーション計画を明記
✅ フォールバック戦略を明記
✅ 実装チェックリストを提供
```

---

## 📖 統合前の必須理解

### ステップ1: SSOT_MULTILINGUAL_SYSTEMを100%理解する

**必読箇所**:

#### 1. 設計原則（line 53-60）

```markdown
1. **DRY原則**: 共通機能は1箇所のみ実装（hotel-common）
2. **既存実装の尊重**: 既存のテーブル構造を維持
3. **拡張性**: 15言語以上への拡張が容易
4. **パフォーマンス**: キャッシュ戦略による高速応答
5. **品質保証**: 翻訳品質スコアリング、レビュー機能
6. **運用性**: 翻訳進捗監視、コスト追跡
```

**核心**: 「既存実装の尊重」= 既存カラムは削除しない

#### 2. 既存実装との共存（line 233-243）

```markdown
✅ 既存の多言語カラム

| テーブル | 英語カラム | 実装状況 |
|---------|-----------|---------|
| **menu_items** | `name_ja`, `name_en`, ... | ✅ 実装済み |
| **menu_categories** | `name_ja`, `name_en`, ... | ✅ 実装済み |
| **room_grades** | `grade_name_en` | ✅ 実装済み |
```

**核心**: 既存カラムは**実装済み・稼働中**

#### 3. 段階的移行計画（line 282-306）

```markdown
Phase 1: 翻訳テーブル作成（1週間）
Phase 2: 既存データ移行（1週間）
Phase 3: 既存カラム非推奨化（2-3週間）
  ├─ 既存カラムにDEPRECATEDコメント追加
  ├─ 新規開発では翻訳テーブルのみ使用
  └─ 既存データは維持（削除しない）  ← ★重要

Phase 4: 15言語拡張（2-3週間）
Phase 5: 既存カラム削除（3-6ヶ月後）  ← ★重要
```

**核心**: 既存カラムは「Phase 5まで維持」、削除は「3-6ヶ月後」

#### 4. translationsテーブル設計（line 310-359）

```sql
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,     -- 'menu_item', 'menu_category', 'room_grade'
  entity_id TEXT NOT NULL,        -- 対象レコードのID
  language_code TEXT NOT NULL,    -- 'ja', 'en', 'ko', ...
  field_name TEXT NOT NULL,       -- 'name', 'description', ...
  translated_text TEXT NOT NULL,
  
  -- メタデータ
  translation_method TEXT DEFAULT 'auto',
  quality_score REAL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, language_code, field_name)
);
```

**核心**: 統一翻訳テーブルで全エンティティを管理

---

### ステップ2: 対象SSOTを100%理解する

#### 必読箇所チェックリスト

- [ ] **概要**: 目的・基本方針・アーキテクチャ
- [ ] **データモデル**: 既存のテーブル構造・Prismaモデル
- [ ] **API仕様**: 既存のエンドポイント・リクエスト・レスポンス形式
- [ ] **既存実装状況**: 何が実装済みで、何が未実装か
- [ ] **フロントエンド実装**: 既存のUI・フォーム

#### 理解確認クエスチョン

1. ✅ **既存のデータベースカラム名を全て列挙できるか？**
2. ✅ **既存のAPIレスポンス形式を正確に説明できるか？**
3. ✅ **現在稼働中の機能と未実装の機能を区別できるか？**
4. ✅ **既存のPrismaモデルを正確に記述できるか？**

**重要**: 「たぶん〜だろう」という推測は禁止。100%理解するまで読み込む。

---

## 🔍 統合判断フロー

### ステップ1: 多言語化の必要性を判断

#### 判断基準

| 条件 | 多言語化必要 | 理由 |
|------|------------|------|
| **データフィールドあり**（name, description等） | ✅ 必要 | ユーザーが見るテキスト |
| **UIテキストのみ**（ボタン、ラベル） | 🟡 軽量対応 | `@nuxtjs/i18n`で対応 |
| **システム内部データ**（ID, status等） | ❌ 不要 | 翻訳対象外 |

#### 判断フローチャート

```
┌─────────────────────────────────┐
│ ユーザーが見るテキストがあるか？ │
└────────┬────────────────────────┘
         │
    Yes  │  No
         ↓   ↓
    ┌─────┐ └→ 多言語化不要
    │     │
    │ データベースに保存されるか？
    │     │
    └──┬──┘
       │
  Yes  │  No
       ↓   ↓
  ┌─────┐ └→ UIテキストのみ（i18n対応）
  │     │
  │ 詳細対応必要
  │ translations テーブル使用
  └─────┘
```

---

### ステップ2: 影響度を判断

#### 高影響（詳細対応必須）

**条件**:
- データベースに翻訳対象フィールドがある
- 既存の`_ja`, `_en`カラムがある
- API経由でデータを取得・更新する

**例**:
- メニュー管理（`menu_items.name_ja`, `menu_items.description_ja`）
- 客室管理（`room_grades.grade_name_en`）
- AI知識ベース（`ai_knowledge_bases.title`）

**統合内容**:
- データベース設計の拡張（約50行）
- API仕様の拡張（約50行）
- フロントエンド実装（約50行）
- マイグレーション計画（約50行）

**合計**: 約200行

#### 中影響（軽量対応）

**条件**:
- UIテキストのみ
- データベースに翻訳対象フィールドがない

**例**:
- ダッシュボード（グラフタイトル、ボタン）
- フロント業務（操作画面のラベル）

**統合内容**:
- UIテキスト多言語化セクション（約30行）
- `@nuxtjs/i18n`の使用方法（約20行）

**合計**: 約50行

#### 低影響（対応不要）

**条件**:
- システム内部データのみ
- 認証・ログ・セキュリティ関連

**例**:
- 認証システム
- データベースマイグレーション
- ログ管理

**統合内容**: なし

---

## 🔧 統合実施フロー

### Phase 1: 分析レポート作成

#### テンプレート

`MULTILINGUAL_SSOT_INTEGRATION_ANALYSIS_{SSOT名}.md`

**内容**:
1. 対象SSOTの完全理解の証明
2. 多言語化SSOTの核心理解の証明
3. 影響度判断
4. 統合方針
5. 具体的な変更内容（マークダウン形式）

**目的**: ユーザー承認を得る

---

### Phase 2: SSOT更新（詳細対応）

#### セクション1: 多言語対応概要

**挿入位置**: 「未実装機能」セクションの後

```markdown
---

## 🌐 多言語対応

### 概要

{機能名}は、{対象フィールド}を**15言語対応**します。

### 対象フィールド

| フィールド | 翻訳対象 | 既存カラム | 新規システム |
|-----------|---------|----------|------------|
| {field1} | ✅ | `{existing_column}` | `translations` |
| {field2} | ✅ | `{existing_column}` | `translations` |

### 実装方式

#### 統一翻訳テーブル方式

**参照SSOT**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

**アーキテクチャ**:
```
hotel-saas (管理画面)
  ↓ {操作}
hotel-common (API)
  ↓ 自動翻訳ジョブ作成
translations テーブル (PostgreSQL)
  ↓ ベクトル化・保存
```
```

---

#### セクション2: データベース設計の拡張

```markdown
### データベース設計の拡張

#### 既存テーブル構造（維持）

```sql
-- {table_name}（既存構造は変更なし）
CREATE TABLE {table_name} (
  -- {説明}（既存カラムは Phase 5まで維持）
  {existing_column_ja}  VARCHAR(255) NOT NULL,
  {existing_column_en}  VARCHAR(255),
  
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
entity_type = '{entity_type}'

-- フィールド名
field_name = '{field1}'  -- {説明}
field_name = '{field2}'  -- {説明}
```
```

---

#### セクション3: API仕様の拡張

```markdown
### API仕様の拡張

#### 既存API（変更なし）

```typescript
// {METHOD} {endpoint}
// 既存のレスポンス形式は維持
{
  // 既存フィールド
}
```

#### 多言語対応API（新規追加）

```typescript
// {METHOD} {endpoint}?lang=ko
// 多言語対応レスポンス（オプション）
{
  // 既存カラム（Phase 3まで）
  {existingField}: "...",
  
  // 新規: translations テーブルから取得（Phase 2以降）
  translations: {
    {field}: {
      ja: "...",
      en: "...",
      ko: "...",
      'zh-CN': "..."
    }
  }
}
```
```

---

#### セクション4: フロントエンド実装

```markdown
### フロントエンド実装

#### 言語切り替えUI

**実装箇所**: `/pages/{path}.vue`（既存ページへの追加）

```vue
<template>
  <div>
    <!-- 既存のUI -->
    
    <!-- 新規: 言語切り替え -->
    <select v-model="selectedLang">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <!-- ... 15言語 -->
    </select>
    
    <!-- 表示（翻訳対応） -->
    <div>
      <h3>{{ getTranslated{Field}(item) }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLang = ref('ja')

const getTranslated{Field} = (item: {Type}) => {
  // フォールバック戦略
  return item.translations?.{field}?.[selectedLang.value]  // 1. translations テーブル
    || (selectedLang.value === 'ja' ? item.{fieldJa} : item.{fieldEn})  // 2. 既存カラム
    || item.{fieldJa}  // 3. デフォルト（日本語）
}
</script>
```
```

---

#### セクション5: 新規登録時の動作

```markdown
### 新規登録時の動作

#### 管理画面での{操作}フロー

```
1. スタッフが日本語で{操作}
   ↓
2. hotel-common が{エンティティ}を作成
   - {table_name} テーブルに保存（{existing_fields}）
   - translations テーブルに日本語を保存（entity_type='{entity_type}', language_code='ja'）
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

**所要時間**: 14言語 × {フィールド数}フィールド = {タスク数}タスク → 1-2分
```

---

#### セクション6: マイグレーション計画

```markdown
### マイグレーション計画

#### Phase 1: 翻訳テーブル作成（Week 1）

**担当**: hotel-common (Iza AI)

- [ ] `translations` テーブル作成
- [ ] `translation_jobs` テーブル作成
- [ ] 翻訳エンジン実装

#### Phase 2: 既存データ移行（Week 1-2）

**担当**: hotel-common (Iza AI)

```sql
-- {table_name} の {field_ja}, {field_en} を translations へ移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  '{entity_type}',
  id::TEXT,
  'ja',
  '{field}',
  {field_ja},
  'manual'
FROM {table_name}
WHERE {field_ja} IS NOT NULL;

-- 同様に {field_en} を移行
```

#### Phase 3: 既存カラム非推奨化（Week 2-4）

**担当**: hotel-common (Iza AI)

```sql
COMMENT ON COLUMN {table_name}.{field_ja} IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type={entity_type}, field_name={field}, language_code=ja）';
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
ALTER TABLE {table_name} 
  DROP COLUMN {field_ja},
  DROP COLUMN {field_en};
```
```

---

#### セクション7: 実装チェックリスト

```markdown
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
```

---

#### セクション8: 詳細仕様への参照

```markdown
### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

---
```

---

### Phase 2: SSOT更新（軽量対応）

#### UIテキストのみの場合

```markdown
---

## 🌐 多言語対応

### 概要

{機能名}は、UIテキストを**15言語対応**します。

### 対応範囲

UIテキスト（ボタン、ラベル、メッセージ）のみ

### 実装方式

#### @nuxtjs/i18n による静的テキスト多言語化

```vue
<template>
  <div>
    <h1>{{ $t('{key}.title') }}</h1>
    <button>{{ $t('{key}.button') }}</button>
  </div>
</template>
```

#### 翻訳ファイル

**ファイル**: `locales/ja/{module}.json`

```json
{
  "{key}": {
    "title": "タイトル",
    "button": "ボタン"
  }
}
```

### 実装Phase

- **Phase 2**: UIテキストの日英対応
- **Phase 3**: 残り13言語対応

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

---
```

---

## ✅ 品質チェックリスト

### 統合前チェック

- [ ] **SSOT_MULTILINGUAL_SYSTEM.md を100%理解したか？**
  - [ ] 設計原則を説明できる
  - [ ] 段階的移行計画を説明できる
  - [ ] translationsテーブル設計を説明できる

- [ ] **対象SSOTを100%理解したか？**
  - [ ] 既存のデータベースカラムを列挙できる
  - [ ] 既存のAPIレスポンス形式を説明できる
  - [ ] 既存の実装状況を把握している

- [ ] **影響度を正しく判断したか？**
  - [ ] データフィールドの有無を確認した
  - [ ] 既存カラムの有無を確認した
  - [ ] 詳細対応 or 軽量対応を判断した

---

### 統合後チェック

- [ ] **既存仕様を変更していないか？**
  - [ ] 既存カラムの削除を提案していない
  - [ ] 既存APIの変更を提案していない
  - [ ] 既存テーブル構造の変更を提案していない

- [ ] **段階的移行を明記したか？**
  - [ ] Phase 1-5 を明記した
  - [ ] 既存カラムは Phase 5まで維持することを明記した
  - [ ] 削除は3-6ヶ月後と明記した

- [ ] **開発者への配慮があるか？**
  - [ ] マイグレーションSQLを提供した
  - [ ] フォールバック戦略を明記した
  - [ ] 実装チェックリストを提供した

- [ ] **完全なマージになっているか？**
  - [ ] 既存SSOTと多言語化SSOTに矛盾がない
  - [ ] 開発者が迷わない1つの完全なSSO
  - [ ] 「たぶん」「推測」という言葉がない

---

## 📚 テンプレート

### 分析レポートテンプレート

```markdown
# 多言語化SSOT統合分析レポート: {SSOT名}

**作成日**: {日付}
**対象SSOT**: {SSOT名}
**影響度**: {高/中/低}

---

## 1. 対象SSOTの完全理解

### 既存のデータベース設計

```sql
-- 既存テーブル構造
```

### 既存のAPI仕様

```typescript
// 既存APIエンドポイント
```

### 既存の実装状況

- ✅ 実装済み: {リスト}
- 🚧 部分実装: {リスト}
- ❌ 未実装: {リスト}

---

## 2. 多言語化SSOTの核心理解

### 設計原則の確認

- ✅ 既存実装の尊重
- ✅ 段階的移行
- ✅ translationsテーブル方式

---

## 3. 影響度判断

### 判断結果

{高影響 / 中影響 / 低影響}

### 理由

{具体的な理由}

---

## 4. 統合方針

### 追加セクション

1. {セクション1}
2. {セクション2}

### 追加内容の規模

約 {行数} 行

---

## 5. 具体的な変更内容

{マークダウン形式で記載}

---

## 承認依頼

この統合内容で問題ないか、承認をお願いします。
```

---

## 🎯 成功基準

このワークフローを完璧に実行できれば、以下が保証されます：

1. ✅ **既存仕様を破壊しない**
2. ✅ **多言語化を完全に統合**
3. ✅ **開発者が迷わない**
4. ✅ **実装時の手戻りゼロ**

---

**作成者**: Luna  
**最終更新**: 2025-10-10  
**バージョン**: 1.0.0

