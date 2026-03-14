# 📐 SSOT作成指示書 - Phase 1（AI実行可能版）

**対象**: Phase 1の7件のSSOT作成  
**期間**: 2週間  
**担当**: Iza、Sun、Luna  
**作成日**: 2025年10月7日  
**最終更新**: 2025年10月7日（SSOT_SAAS_AI_PROMPT_MANAGEMENT.md追加）  
**バージョン**: 3.1.0（AI実行可能版）

---

## 📖 この指示書を受け取ったAIへ

### あなたがすべきこと

1. **この指示書を最初から最後まで読む**
   - 読み終わったら「指示書読了」と報告
   - 不明点があれば質問

2. **作成するSSOTを確認**
   - ユーザーから指定されたSSOT名を確認
   - 該当SSOTのセクションを読む

3. **7フェーズプロセスを実行**
   - Phase 0: 準備（必須ドキュメント読み込み）
   - Phase 1-3: 実装調査・差分分析
   - Phase 4-7: SSOT記述・レビュー

4. **各フェーズ完了後に報告**
   - 進捗報告ファイルに記録
   - ユーザーに報告

### 絶対に守ること

- ❌ 指示書を読まずに作業開始しない
- ❌ 実装コードを読まずにSSOTを書かない
- ❌ 既存SSOTを読まずにSSOTを書かない
- ❌ 推測や想像でSSOTを書かない
- ❌ 実装されていない機能を「実装済み」と書かない
- ✅ 必ず実装コードを確認してから記述
- ✅ 既存SSOTとの整合性を確認
- ✅ 不明点は質問する

### 報告先

**進捗報告**: `/Users/kaneko/hotel-kanri/docs/03_ssot/ssot_creation_progress_phase1.md`  
**質問・確認事項**: ユーザーとのチャット

---

## 🎯 Phase 1で作成するSSO

### 1. SSOT_SAAS_SUPER_ADMIN.md ✅ **完成**
- **担当**: Iza
- **工数**: 2日
- **優先度**: 🔴 最高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_SUPER_ADMIN.md`
- **ステータス**: ✅ 完成（v2.0.1）
- **完成日**: 2025年10月7日

### 2. SSOT_ADMIN_SYSTEM_LOGS.md
- **担当**: Iza
- **工数**: 2日
- **優先度**: 🔴 最高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_SYSTEM_LOGS.md`
- **ステータス**: ⏳ 未作成

### 3. SSOT_ADMIN_BILLING.md
- **担当**: Luna
- **工数**: 2日
- **優先度**: 🔴 最高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_BILLING.md`
- **ステータス**: ⏳ 未作成

### 4. SSOT_SAAS_PERMISSION_SYSTEM.md
- **担当**: Iza
- **工数**: 3日
- **優先度**: 🔴 最高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PERMISSION_SYSTEM.md`
- **ステータス**: ⏳ 未作成

### 5. SSOT_SAAS_MEDIA_MANAGEMENT.md
- **担当**: Sun
- **工数**: 2日
- **優先度**: 🟡 高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MEDIA_MANAGEMENT.md`
- **ステータス**: ⏳ 未作成

### 6. SSOT_SAAS_PAYMENT_INTEGRATION.md
- **担当**: Iza
- **工数**: 2日
- **優先度**: 🟡 高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PAYMENT_INTEGRATION.md`
- **ステータス**: ⏳ 未作成

### 7. SSOT_SAAS_AI_PROMPT_MANAGEMENT.md ⭐ **新規追加**
- **担当**: Iza
- **工数**: 2日
- **優先度**: 🔴 最高
- **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_AI_PROMPT_MANAGEMENT.md`
- **ステータス**: ⏳ 未作成
- **追加理由**: 
  - スーパーアドミンで設定したAIプロンプトをテナント管理者がカスタマイズする機能
  - 複雑な階層構造（システム→業態→言語→機能→テナント）
  - バージョン管理、プレビュー、ロールバック機能
  - AIコンシェルジュの品質に直結する重要機能
  - `SSOT_SAAS_SUPER_ADMIN.md`で基本仕様を定義済み
- **含むべき内容**:
  - テナント管理者向けプロンプトカスタマイズUI
  - プロンプト継承の仕組み（スーパーアドミン設定→テナント設定）
  - プロンプトプレビュー・テスト機能
  - プロンプトバージョン管理
  - プロンプト変数の定義と使用方法
  - AIコンシェルジュとの連携

---

## 📋 SSOT作成の7フェーズプロセス

### Phase 0: 準備（必須）

**所要時間**: 30分

---

#### Task 0-1: 進捗報告ファイルの作成（5分）

**実行するコマンド**:
```
write /Users/kaneko/hotel-kanri/docs/03_ssot/ssot_creation_progress_phase1.md
```

**内容**:
```markdown
# SSOT作成進捗報告 - Phase 1

**担当AI**: [あなたの名前]  
**作成中のSSO**: [SSOT名]  
**開始日**: 2025年10月7日

## 進捗サマリー
- Phase 0: 準備 - 未実施
- Phase 1-3: 実装調査 - 未実施
- Phase 4-7: SSOT記述 - 未実施

## Phase 0: 準備
（作業開始後に記入）
```

---

#### Task 0-2: 必須ドキュメントの読み込み（15分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md
read_file /Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md
```

**確認すること**:
- [ ] SSOT作成の7フェーズプロセスを理解
- [ ] 必須要件を理解
- [ ] 禁止事項を理解

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 0-2: 必須ドキュメント読み込み完了
- write_new_ssot.md: ✅ 読了
- retest_new_ssot.md: ✅ 読了
- SSOT_CREATION_RULES.md: ✅ 読了
- 7フェーズプロセス: ✅ 理解
```

---

#### Task 0-3: 既存SSOTの読み込み（10分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md
```

**確認すること**:
- [ ] 認証システムの仕様を理解
- [ ] マルチテナントの仕様を理解
- [ ] データベーススキーマを理解
- [ ] 本番同等ルールを理解

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 0-3: 既存SSOT読み込み完了
- SSOT_SAAS_AUTHENTICATION.md: ✅ 読了
- SSOT_SAAS_ADMIN_AUTHENTICATION.md: ✅ 読了
- SSOT_SAAS_MULTITENANT.md: ✅ 読了
- SSOT_SAAS_DATABASE_SCHEMA.md: ✅ 読了
- SSOT_PRODUCTION_PARITY_RULES.md: ✅ 読了

---

## Phase 0完了報告
- 所要時間: [実際の時間]
- 次のフェーズ: Phase 1（実装調査）
```

---

### Phase 1-3: 実装調査・差分分析

**所要時間**: 4-6時間（SSOTの複雑さによる）

**重要**: このフェーズでは**実装コードを必ず読む**こと

---

#### Task 1-1: 既存ドキュメントの調査（1時間）

**実行内容**:

1. **関連ドキュメントの検索**
```
glob_file_search **/*[SSOT名のキーワード]*.md
```

2. **見つかったドキュメントを読み込み**
```
read_file [見つかったファイルパス]
```

3. **ドキュメントの内容を分析**
   - 既に仕様が記載されているか
   - 実装状況が記載されているか
   - 矛盾する記載がないか

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
## Phase 1: 既存ドキュメント調査

### Task 1-1: 既存ドキュメント調査完了
- 検索キーワード: [キーワード]
- 見つかったドキュメント数: [X]件
- 主要ドキュメント:
  - [ファイルパス1]
  - [ファイルパス2]
- 既存仕様の有無: [あり/なし]
- 矛盾の有無: [あり/なし]
```

---

#### Task 1-2: 実装ファイルの調査（2-3時間）

**重要**: **必ず実装コードを読むこと**

**実行内容**:

1. **hotel-saas実装ファイルの検索**
```
glob_file_search **/pages/admin/[機能名]/**/*.vue /Users/kaneko/hotel-saas
glob_file_search **/server/api/v1/admin/[機能名]/**/*.ts /Users/kaneko/hotel-saas
glob_file_search **/composables/*[機能名]*.ts /Users/kaneko/hotel-saas
```

2. **hotel-common実装ファイルの検索**
```
glob_file_search **/src/services/*[機能名]*.ts /Users/kaneko/hotel-common
glob_file_search **/src/routes/*[機能名]*.ts /Users/kaneko/hotel-common
```

3. **見つかったファイルを読み込み**
```
read_file [ファイルパス]
```

4. **実装内容を分析**
   - どの機能が実装されているか
   - どの機能が未実装か
   - データベーススキーマは何を使っているか
   - APIエンドポイントは何があるか

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 1-2: 実装ファイル調査完了

#### hotel-saas実装
- ページファイル: [X]件
  - [ファイルパス1]
  - [ファイルパス2]
- APIファイル: [X]件
  - [ファイルパス1]
  - [ファイルパス2]
- Composable: [X]件
  - [ファイルパス1]

#### hotel-common実装
- Serviceファイル: [X]件
  - [ファイルパス1]
- Routeファイル: [X]件
  - [ファイルパス1]

#### 実装状況サマリー
- 実装済み機能:
  - [機能1]
  - [機能2]
- 未実装機能:
  - [機能1]
  - [機能2]
```

---

#### Task 1-3: データベーススキーマの確認（30分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-common/prisma/schema.prisma
```

**確認すること**:
- [ ] 関連テーブルが存在するか
- [ ] テーブル名が`snake_case`か
- [ ] カラム名が`snake_case`か
- [ ] `@map`ディレクティブが使われているか
- [ ] `tenant_id`カラムがあるか（マルチテナント対応）

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 1-3: データベーススキーマ確認完了

#### 関連テーブル
- [テーブル名1]: ✅ 存在
- [テーブル名2]: ❌ 未作成

#### スキーマ確認
- テーブル名命名規則: [✅ 正しい/❌ 要修正]
- カラム名命名規則: [✅ 正しい/❌ 要修正]
- @mapディレクティブ: [✅ 使用/❌ 未使用]
- tenant_id: [✅ あり/❌ なし]
```

---

#### Task 1-4: 差分分析（1時間）

**実行内容**:

1. **「あるべき姿」と「現状」の比較**
   - ドキュメントに記載されている仕様
   - 実際に実装されている機能
   - 未実装の機能

2. **本番同等性チェック**
   - 環境分岐コードがないか
   - フォールバック実装がないか
   - ハードコード値がないか

3. **既存SSOTとの整合性チェック**
   - 認証システムと整合性があるか
   - マルチテナントと整合性があるか
   - データベーススキーマと整合性があるか

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 1-4: 差分分析完了

#### 「あるべき姿」と「現状」の差分
| 機能 | ドキュメント | 実装状況 | 差分 |
|------|------------|---------|------|
| [機能1] | 記載あり | 実装済み | なし |
| [機能2] | 記載あり | 未実装 | 実装必要 |
| [機能3] | 記載なし | 実装済み | ドキュメント化必要 |

#### 本番同等性チェック
- 環境分岐コード: [✅ なし/❌ あり（X件）]
- フォールバック実装: [✅ なし/❌ あり（X件）]
- ハードコード値: [✅ なし/❌ あり（X件）]

#### 既存SSOTとの整合性
- 認証システム: [✅ 整合/❌ 不整合]
- マルチテナント: [✅ 整合/❌ 不整合]
- データベーススキーマ: [✅ 整合/❌ 不整合]

---

## Phase 1-3完了報告
- 所要時間: [実際の時間]
- 次のフェーズ: Phase 4（SSOT記述）
```

---

### Phase 4-7: SSOT記述・レビュー

**所要時間**: 4-6時間（SSOTの複雑さによる）

---

#### Task 4-1: SSOTの記述（3-4時間）

**実行内容**:

1. **SSOTテンプレートの作成**

以下の構造でSSOTを記述：

```markdown
# 🔐 SSOT: [機能名]

**Doc-ID**: SSOT-[カテゴリ]-[機能名]-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月7日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: [担当AI名]

**関連SSOT**:
- [関連SSOT1]
- [関連SSOT2]

---

## 📋 目次

1. [概要](#概要)
2. [必須要件（CRITICAL）](#必須要件critical)
3. [SSOTに準拠しないと発生する問題](#ssoに準拠しないと発生する問題)
4. [データベース設計](#データベース設計)
5. [API仕様](#api仕様)
6. [フロントエンド実装](#フロントエンド実装)
7. [システム間連携](#システム間連携)
8. [既存実装状況](#既存実装状況)
9. [実装チェックリスト](#実装チェックリスト)

---

## 📋 概要

### 目的
[この機能の目的を記述]

### 適用範囲
- [適用範囲1]
- [適用範囲2]

### 技術スタック
- **フロントエンド**: Vue 3 + Nuxt 3
- **バックエンド**: Express + TypeScript
- **データベース**: PostgreSQL + Prisma
- **認証**: Session認証（Redis + HttpOnly Cookie）

---

## ⚠️ 必須要件（CRITICAL）

### 1. [必須要件1]
[詳細説明]

### 2. [必須要件2]
[詳細説明]

---

## 🚨 SSOTに準拠しないと発生する問題

### 問題1: [問題名]
**発生条件**: [条件]  
**影響**: [影響]  
**対策**: [対策]

---

## 🗄️ データベース設計

### テーブル: [テーブル名]

**Prismaスキーマ**:
```prisma
model [ModelName] {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  // ... その他のフィールド
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([tenantId])
  @@map("[table_name]")
}
```

---

## 🌐 API仕様

### hotel-common API

#### POST /api/v1/[エンドポイント]

**リクエスト**:
```typescript
{
  // リクエストボディ
}
```

**レスポンス**:
```typescript
{
  // レスポンスボディ
}
```

### hotel-saas API（プロキシ）

#### POST /api/v1/admin/[エンドポイント]

**実装**:
```typescript
// hotel-commonへのプロキシ実装
```

---

## 🎨 フロントエンド実装

### Composable: use[機能名]

**ファイルパス**: `/Users/kaneko/hotel-saas/composables/use[機能名].ts`

**実装**:
```typescript
// Composable実装
```

### ページ: /admin/[機能名]

**ファイルパス**: `/Users/kaneko/hotel-saas/pages/admin/[機能名]/index.vue`

**実装**:
```vue
<!-- ページ実装 -->
```

---

## 🔗 システム間連携

### hotel-saas → hotel-common

[連携フロー図]

---

## 📊 既存実装状況

### 実装済み機能
- ✅ [機能1]
- ✅ [機能2]

### 未実装機能
- ❌ [機能1]
- ❌ [機能2]

---

## ✅ 実装チェックリスト

### データベース
- [ ] テーブル作成
- [ ] マイグレーション実行

### hotel-common
- [ ] Service実装
- [ ] Route実装
- [ ] API実装

### hotel-saas
- [ ] Composable実装
- [ ] ページ実装
- [ ] API プロキシ実装

---

**作成日**: 2025年10月7日  
**担当AI**: [あなたの名前]  
**承認者**: Iza（統合管理者）
```

2. **SSOTファイルの作成**
```
write [保存先パス] [上記の内容]
```

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
## Phase 4: SSOT記述

### Task 4-1: SSOT記述完了
- ファイルパス: [保存先パス]
- 行数: [X]行
- セクション数: [X]個
- 含まれる内容:
  - ✅ 概要
  - ✅ 必須要件
  - ✅ データベース設計
  - ✅ API仕様
  - ✅ フロントエンド実装
  - ✅ システム間連携
  - ✅ 既存実装状況
  - ✅ 実装チェックリスト
```

---

#### Task 4-2: 既存SSOTとの整合性確認（30分）

**実行内容**:

1. **認証システムとの整合性確認**
   - Session認証を使用しているか
   - JWT認証を使用していないか
   - Cookie名は`hotel-session-id`か

2. **マルチテナントとの整合性確認**
   - 全テーブルに`tenant_id`があるか
   - 全クエリに`tenant_id`フィルタがあるか

3. **データベーススキーマとの整合性確認**
   - テーブル名が`snake_case`か
   - カラム名が`snake_case`か
   - `@map`ディレクティブが使われているか

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 4-2: 既存SSOTとの整合性確認完了
- 認証システム: [✅ 整合/❌ 不整合]
- マルチテナント: [✅ 整合/❌ 不整合]
- データベーススキーマ: [✅ 整合/❌ 不整合]
- 本番同等ルール: [✅ 遵守/❌ 違反]
```

---

#### Task 4-3: 最終チェック（30分）

**実行するコマンド**:
```
read_file [作成したSSOTのパス]
```

**確認すること**:
- [ ] 全セクションが記載されているか
- [ ] 実装コードを確認した内容が記載されているか
- [ ] 推測や想像で書いた部分がないか
- [ ] 既存SSOTと矛盾がないか
- [ ] 本番同等ルールを遵守しているか

**報告すること**（ssot_creation_progress_phase1.mdに追記）:
```markdown
### Task 4-3: 最終チェック完了
- 全セクション記載: [✅ 完了/❌ 不足]
- 実装コード確認: [✅ 完了/❌ 未確認]
- 推測・想像: [✅ なし/❌ あり]
- 既存SSOT整合性: [✅ 整合/❌ 不整合]
- 本番同等ルール: [✅ 遵守/❌ 違反]

---

## Phase 4-7完了報告
- 所要時間: [実際の時間]
- 次のステップ: ユーザーレビュー待ち
```

---

## 🎉 SSOT作成完了報告

**最終報告**（ssot_creation_progress_phase1.mdに追記）:
```markdown
---

## 🎉 SSOT作成完了報告

### 作成したSSO
- SSOT名: [SSOT名]
- ファイルパス: [保存先パス]
- 行数: [X]行
- セクション数: [X]個

### 所要時間
- Phase 0: 準備 - [X]時間
- Phase 1-3: 実装調査 - [X]時間
- Phase 4-7: SSOT記述 - [X]時間
- 合計: [X]時間

### 実装状況サマリー
- 実装済み機能: [X]個
- 未実装機能: [X]個
- 要修正箇所: [X]個

### 次のステップ
ユーザーレビュー待ち
```

---

## 🚨 エラー・不明点発生時の対処

### エラーが発生した場合

1. **即座に作業を停止**
2. **エラー内容を記録**
3. **ユーザーに報告**
4. **指示を待つ**

### 不明点がある場合

1. **作業を停止**
2. **不明点を明確化**
3. **ユーザーに質問**
4. **回答を待つ**

### 報告フォーマット

ssot_creation_progress_phase1.mdに以下を追記：

```markdown
---

## 🚨 エラー・不明点報告

### 発生日時
[日時]

### 内容
[エラー内容または不明点]

### 発生箇所
- Phase: [Phase番号]
- Task: [Task番号]
- ファイル: [ファイルパス]

### 質問
[質問内容]
```

---

## 📋 各SSOT作成の詳細

### 1. SSOT_SAAS_SUPER_ADMIN.md

**担当**: Iza  
**工数**: 2日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/super-admin/
/Users/kaneko/hotel-saas/server/api/v1/admin/super-admin/
/Users/kaneko/hotel-saas/composables/useSuperAdmin.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/SuperAdminService.ts
/Users/kaneko/hotel-common/src/routes/super-admin.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ staff（role: 'super_admin'）
  ├─ tenants
  └─ staff_tenant_memberships
```

#### SSOT記載内容

1. **スーパー管理者の定義**
   - 全テナントへのアクセス権限
   - システム全体の設定権限

2. **テナント管理**
   - テナント作成・編集・削除
   - テナント設定管理

3. **スタッフ管理**
   - 全テナントのスタッフ管理
   - 権限設定

4. **システム設定**
   - グローバル設定
   - システムメンテナンス

---

### 2. SSOT_ADMIN_SYSTEM_LOGS.md

**担当**: Iza  
**工数**: 2日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/logs/
/Users/kaneko/hotel-saas/server/api/v1/admin/logs/
/Users/kaneko/hotel-saas/composables/useSystemLogs.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/LogService.ts
/Users/kaneko/hotel-common/src/routes/logs.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ system_logs
  ├─ audit_logs
  └─ operation_logs
```

#### SSOT記載内容

1. **ログの種類**
   - システムログ
   - 監査ログ
   - 操作ログ

2. **ログ記録**
   - 自動記録
   - 手動記録

3. **ログ閲覧**
   - フィルタリング
   - 検索
   - エクスポート

4. **ログ保持期間**
   - 保持ポリシー
   - アーカイブ

---

### 3. SSOT_ADMIN_BILLING.md

**担当**: Luna  
**工数**: 2日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/billing/
/Users/kaneko/hotel-saas/server/api/v1/admin/billing/
/Users/kaneko/hotel-saas/composables/useBilling.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/BillingService.ts
/Users/kaneko/hotel-common/src/routes/billing.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ billings
  ├─ billing_items
  └─ payments
```

#### SSOT記載内容

1. **請求管理**
   - 請求書作成
   - 請求書発行
   - 請求書管理

2. **支払い管理**
   - 支払い記録
   - 支払い確認
   - 支払い履歴

3. **料金計算**
   - 自動計算
   - 手動調整
   - 割引・クーポン

4. **レポート**
   - 売上レポート
   - 支払いレポート

---

### 4. SSOT_SAAS_PERMISSION_SYSTEM.md

**担当**: Iza  
**工数**: 3日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/server/middleware/permission.ts
/Users/kaneko/hotel-saas/composables/usePermission.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/PermissionService.ts
/Users/kaneko/hotel-common/src/middleware/permission.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ staff（permissions: Json）
  ├─ staff_tenant_memberships（permissions: Json）
  └─ roles
```

#### SSOT記載内容

1. **権限システムの設計**
   - ロールベース権限
   - レベルベース権限
   - 個別権限

2. **権限チェック**
   - フロントエンド権限チェック
   - バックエンド権限チェック

3. **権限管理**
   - 権限設定
   - 権限変更
   - 権限履歴

---

### 5. SSOT_SAAS_MEDIA_MANAGEMENT.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/media/
/Users/kaneko/hotel-saas/server/api/v1/admin/media/
/Users/kaneko/hotel-saas/composables/useMedia.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/MediaService.ts
/Users/kaneko/hotel-common/src/routes/media.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ media
  └─ media_folders
```

#### SSOT記載内容

1. **メディアアップロード**
   - 画像アップロード
   - 動画アップロード
   - ファイルサイズ制限

2. **メディア管理**
   - フォルダ管理
   - タグ管理
   - 検索

3. **メディア配信**
   - CDN連携
   - キャッシュ戦略

---

### 6. SSOT_SAAS_PAYMENT_INTEGRATION.md

**担当**: Iza  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/payment/
/Users/kaneko/hotel-saas/composables/usePayment.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/PaymentService.ts
/Users/kaneko/hotel-common/src/routes/payment.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ payments
  ├─ payment_methods
  └─ payment_logs
```

#### SSOT記載内容

1. **決済連携**
   - Stripe連携
   - その他決済サービス

2. **決済処理**
   - 決済実行
   - 決済確認
   - 決済キャンセル

3. **決済履歴**
   - 決済ログ
   - 決済レポート

---

## 🎯 重要な注意事項

### 必ず守ること

1. **実装コードを必ず読む**
   - 推測や想像でSSOTを書かない
   - 実際のコードを確認してから記述

2. **既存SSOTとの整合性を確認**
   - 認証システム
   - マルチテナント
   - データベーススキーマ

3. **本番同等ルールを遵守**
   - 環境分岐コード禁止
   - フォールバック実装禁止
   - ハードコード値禁止

4. **不明点は質問する**
   - 推測で書かない
   - 必ずユーザーに確認

5. **各フェーズ完了後に報告**
   - 進捗報告ファイルに記録
   - ユーザーに報告

---

**作成日**: 2025年10月7日  
**管理者**: Iza（統合管理者）  
**バージョン**: 3.0.0（AI実行可能版）
