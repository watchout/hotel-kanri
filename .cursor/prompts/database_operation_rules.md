# データベース操作指示の必須ルール

**作成日**: 2025年10月13日  
**バージョン**: 1.0.0  
**適用対象**: 全AI（Iza/Sun/Luna/Suno）  
**優先度**: 🔴 最優先

---

## 📋 概要

このドキュメントは、AIがデータベース操作を含む指示を作成する際の**絶対的なルール**を定義します。

**重要**: データベース操作を含む指示を作成する場合、必ずこのルールに従ってください。

---

## 🚨 絶対ルール

### ルール1: データベース操作SSOTの必須参照

データベース操作（マイグレーション、テーブル作成、データ投入等）を含む指示を作成する場合、**必ず以下のSSOTを参照し、指示に含める**こと。

**必須参照SSOT**:
```
📖 SSOT_DATABASE_MIGRATION_OPERATION.md（★★★必須）
パス: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md
目的: データベース操作の絶対的なガイドライン
```

**指示への記載方法**:
```markdown
## 📖 必読ドキュメント（★★★必須）

1. [該当機能のSSO T]

2. **SSOT_DATABASE_MIGRATION_OPERATION.md**（★★★データベース操作の絶対ルール）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
   - **データベース操作時の絶対的なガイドライン**

3. **DATABASE_NAMING_STANDARD.md**（命名規則）
   - パス: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`
```

---

### ルール2: 禁止事項の明記必須

指示に必ず以下のセクションを含めること。

**必須セクション**:
```markdown
## 🚨 データベース操作の絶対ルール（SSOT準拠）

### ❌ 絶対禁止

1. **直接SQL実行は原則禁止**
   - `psql`で直接テーブル作成
   - `.sql`ファイルの直接実行
   - マイグレーションディレクトリへの`.sql`ファイル配置

2. **権限不足時の対応**
   - アプリケーション用DBユーザーでマイグレーション実行
   - `sudo`でのデータベース操作

3. **スキーマドリフトの発生**
   - マイグレーション失敗後の手動修正
   - Prismaスキーマとデータベースの不一致

### ✅ 正しい手順（必ず遵守）

[具体的な手順を記載]
```

---

### ルール3: 環境変数確認の必須化

データベース操作指示には、必ず環境変数確認ステップを含めること。

**必須ステップ**:
```markdown
#### Step 1: 環境変数確認

```bash
cd /Users/kaneko/[システム名]

# マイグレーション用DATABASE_URL確認（admin権限必須）
cat .env | grep DATABASE_URL
```

**期待値**:
```bash
# マイグレーション用（admin権限）
DATABASE_URL="postgresql://hotel_admin:password@localhost:5432/hotel_db"

# アプリケーション用（実行時、admin権限不要）
DATABASE_URL_APP="postgresql://hotel_app:password@localhost:5432/hotel_db"
```

**重要**: マイグレーション実行時は`DATABASE_URL`（admin権限）を使用
```

---

### ルール4: Prisma操作の標準手順必須化

Prismaを使用する場合、必ず以下の標準手順を含めること。

**必須手順**:
```markdown
#### Prismaスキーマ更新

[スキーマ定義]

**チェックポイント**:
- [ ] snake_case命名（テーブル名・カラム名）
- [ ] @mapディレクティブ使用（camelCase → snake_case）
- [ ] @@mapディレクティブ使用（モデル名 → テーブル名）
- [ ] INDEX適切に設定
- [ ] UNIQUE制約適切に設定
- [ ] ON DELETE CASCADE設定（必要に応じて）

#### マイグレーション作成・実行

```bash
cd /Users/kaneko/[システム名]

# ドライラン（変更内容確認）
npx prisma migrate dev --create-only --name [migration_name]

# 生成されたSQLファイルを確認
cat prisma/migrations/YYYYMMDDHHMMSS_[migration_name]/migration.sql

# マイグレーション実行
npx prisma migrate dev
```

#### 検証（必須）

```bash
# Prisma Studioで確認
npx prisma studio

# スキーマ整合性確認
npx prisma migrate status
```

**期待される出力**:
```
Database schema is up to date!
```
```

---

### ルール5: トラブルシューティングの必須記載

データベース操作指示には、必ずトラブルシューティングセクションを含めること。

**必須セクション**:
```markdown
#### トラブルシューティング（SSOT準拠）

### エラー1: 権限エラー

**症状**:
```
ERROR: permission denied for schema public
```

**原因**: アプリケーション用DBユーザーでマイグレーション実行

**解決策**:
```bash
# .envファイル確認
cat .env | grep DATABASE_URL

# admin権限ユーザーに切り替え
# DATABASE_URL="postgresql://hotel_admin:password@localhost:5432/hotel_db"

# マイグレーション再実行
npx prisma migrate dev
```

### エラー2: スキーマドリフト

**症状**:
```
Schema drift detected
```

**解決策（SSOT準拠）**:

```bash
# 現状確認
npx prisma migrate status

# データベースをリセット（開発環境のみ）
npx prisma migrate reset

# マイグレーション再実行
npx prisma migrate dev

# Seed再実行（必要に応じて）
npx prisma db seed
```

**⚠️ 警告**: `prisma migrate reset`はデータベースを完全リセットします。本番環境では絶対に実行しないでください。
```

---

### ルール6: 完了条件の明確化

データベース操作指示には、必ず完了条件を明記すること。

**必須セクション**:
```markdown
## ✅ 完了条件

### 必須確認項目

- [ ] Prismaスキーマ更新完了
- [ ] マイグレーション成功（エラー0件）
- [ ] Seed実行成功（データ投入が必要な場合）
- [ ] Prisma Studioでデータ確認完了
- [ ] `npx prisma migrate status`で整合性確認
- [ ] テーブル名・カラム名がsnake_case
- [ ] @map/@@mapディレクティブ設定完了
- [ ] INDEX設定完了
- [ ] FOREIGN KEY制約設定完了（必要に応じて）

### 報告フォーマット

```markdown
## [システム名]: [機能名] DB実装 完了報告

### マイグレーション実行結果
- ✅ マイグレーション成功
- マイグレーション名: YYYYMMDDHHMMSS_[migration_name]
- 作成テーブル: X件

### Seed実行結果（必要な場合）
- ✅ Seed成功
- データ投入: X件

### 検証結果
- ✅ Prisma Studio確認完了
- ✅ スキーマ整合性確認完了（migrate status: up to date）
- ✅ 命名規則準拠確認完了

データベース実装完了しました。次は[次のステップ]に進みます。
```
```

---

## 📝 指示作成テンプレート

データベース操作を含む指示を作成する際は、以下のテンプレートを使用すること。

```markdown
# 🔴 【重要】[システム名] [機能名]DB実装指示（データベース操作SSOT準拠版）

## 📖 必読ドキュメント（★★★必須）

1. **[機能SSOT名]**（本実装の仕様）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/[カテゴリ]/[SSOT名].md`

2. **SSOT_DATABASE_MIGRATION_OPERATION.md**（★★★データベース操作の絶対ルール）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
   - **データベース操作時の絶対的なガイドライン**

3. **DATABASE_NAMING_STANDARD.md**（命名規則）
   - パス: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`

---

## 🚨 データベース操作の絶対ルール（SSOT準拠）

### ❌ 絶対禁止

[禁止事項を列挙]

### ✅ 正しい手順（必ず遵守）

#### Step 1: 環境変数確認

[環境変数確認手順]

#### Step 2: Prismaスキーマ更新

[スキーマ定義]

**チェックポイント**:
- [ ] snake_case命名
- [ ] @map/@@ mapディレクティブ
- [ ] INDEX設定
- [ ] 制約設定

#### Step 3: マイグレーション作成・実行

[マイグレーション手順]

#### Step 4: Seed（データ投入、必要な場合）

[Seed手順]

#### Step 5: 検証（★★★必須）

[検証手順]

#### Step 6: トラブルシューティング（SSOT準拠）

[トラブルシューティング手順]

---

## ✅ 完了条件

### 必須確認項目

[完了条件チェックリスト]

### 報告フォーマット

[報告フォーマット]

---

## 🔗 参考ドキュメント

- **SSOT_DATABASE_MIGRATION_OPERATION.md**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
- **DATABASE_NAMING_STANDARD.md**: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`
- **[機能SSOT名]**: `/Users/kaneko/hotel-kanri/docs/03_ssot/[パス]`

---

**データベース操作SSOT準拠の[システム名]実装指示書**  
**作成日**: YYYY年MM月DD日  
**作成者**: 統合管理（Iza）  
**バージョン**: 1.0.0（SSOT準拠版）
```

---

## 🎯 適用対象操作

以下の操作を含む指示を作成する場合、このルールを適用すること。

### 必須適用

- ✅ Prismaスキーマ変更
- ✅ マイグレーション実行
- ✅ テーブル作成・変更・削除
- ✅ カラム追加・変更・削除
- ✅ INDEX作成・削除
- ✅ FOREIGN KEY設定
- ✅ Seed（初期データ投入）
- ✅ データベーススキーマに影響する全ての操作

### 適用不要

- ❌ データの読み取りのみ（SELECT）
- ❌ アプリケーションコードのみの変更
- ❌ フロントエンド実装のみ

---

## 🔄 既存指示の更新

既にデータベース操作を含む指示が存在する場合：

1. **このルールに準拠しているか確認**
2. **準拠していない場合は更新**
3. **「データベース操作SSOT準拠版」と明記**

---

## 📊 チェックリスト（指示作成時）

指示を作成したら、以下をチェックすること。

- [ ] SSOT_DATABASE_MIGRATION_OPERATION.mdを参照した
- [ ] DATABASE_NAMING_STANDARD.mdを参照した
- [ ] 「必読ドキュメント」セクションに上記2つを含めた
- [ ] 「絶対禁止」セクションを含めた
- [ ] 環境変数確認ステップを含めた
- [ ] Prisma標準手順を含めた
- [ ] トラブルシューティングセクションを含めた
- [ ] 完了条件を明記した
- [ ] 報告フォーマットを含めた
- [ ] 「データベース操作SSOT準拠版」と明記した

---

## ❓ FAQ

### Q1: なぜこのルールが必要なのか？

**A**: 過去に以下の問題が頻発しました：
- 直接SQL実行によるスキーマドリフト
- 権限エラーによるマイグレーション失敗
- Prismaスキーマとデータベースの不一致
- マイグレーション履歴の混乱

これらを防ぐため、データベース操作SSOTを必ず参照するルールを策定しました。

### Q2: すべてのデータベース操作で必須か？

**A**: はい。テーブル作成、カラム追加、INDEX作成など、データベーススキーマに影響する**全ての操作**で必須です。

### Q3: 指示が長くなるのでは？

**A**: 確かに指示は長くなりますが、これにより：
- エラーの発生率が大幅に減少
- トラブルシューティング時間の短縮
- スキーマドリフトの防止
- 全体的な開発効率の向上

が実現できます。

### Q4: 既存の指示はどうすべきか？

**A**: 以下の対応を推奨します：
1. 新規指示: このルールに完全準拠
2. 既存指示: 次回更新時にこのルールに準拠するよう更新
3. 緊急時: 最低限「SSOT_DATABASE_MIGRATION_OPERATION.md」を参照

---

## 🚀 実装例

### 良い例

```markdown
# 🔴 【重要】hotel-common PERMISSION_SYSTEM DB実装指示（データベース操作SSOT準拠版）

## 📖 必読ドキュメント（★★★必須）

1. **SSOT_PERMISSION_SYSTEM.md**（本実装の仕様）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md`

2. **SSOT_DATABASE_MIGRATION_OPERATION.md**（★★★データベース操作の絶対ルール）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
   - **データベース操作時の絶対的なガイドライン**

3. **DATABASE_NAMING_STANDARD.md**（命名規則）
   - パス: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`

## 🚨 データベース操作の絶対ルール（SSOT準拠）

### ❌ 絶対禁止
[詳細記載]

### ✅ 正しい手順
[詳細記載]
```

### 悪い例（❌ 修正必要）

```markdown
# hotel-common: permissionsテーブル作成

以下のSQLを実行してください：

```sql
CREATE TABLE permissions (...);
```
```

**問題点**:
- ❌ 直接SQL実行を指示（禁止）
- ❌ SSOT参照なし
- ❌ 環境変数確認なし
- ❌ トラブルシューティングなし
- ❌ 完了条件なし

---

## 📚 関連ドキュメント

- **SSOT_DATABASE_MIGRATION_OPERATION.md**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`
- **DATABASE_NAMING_STANDARD.md**: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`
- **write_new_ssot.md**: `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`

---

**データベース操作指示の必須ルール**  
**作成日**: 2025年10月13日  
**作成者**: 統合管理（Iza）  
**バージョン**: 1.0.0  
**適用開始**: 即日

このルールは**全てのAI（Iza/Sun/Luna/Suno）が必ず遵守**してください。

