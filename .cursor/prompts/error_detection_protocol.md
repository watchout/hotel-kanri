# 🚨 エラー検知時の自動停止プロトコル

**作成日**: 2025年10月10日  
**バージョン**: 1.0.0  
**目的**: エラー発生時にAIが「問題解決モード」に入るのを防ぎ、SSOT確認を強制する

---

## 📋 このドキュメントの目的

### 問題の本質

SSOT実装中にエラーが発生すると、AIは以下の思考パターンに陥ります：

```
通常モード:
  ユーザー指示 → SSOT確認 → 正しい実装

❌ 問題解決モード（エラー発生時）:
  エラー発生 → "修正しなきゃ！" → SSOT確認スキップ → 間違った実装
```

**具体例**（実際に発生したケース）:

```
PostgreSQLに接続できない
  ↓
❌ AI: "開発環境ではSQLiteを使用すべきです"
  ↓
SSOT違反（本番同等性原則違反）
```

### 解決策

このドキュメントは、AIが**エラーを検知した瞬間に自動停止**し、**SSOT確認を強制**するプロトコルです。

---

## 🔍 エラー検知トリガー

### レベル1: 緊急停止（CRITICAL）

以下のキーワードを含むエラーは**即座に実装停止**：

```markdown
システム境界違反:
- "Prisma"（hotel-saas実装中のみ）
- "PrismaClient"
- "import { PrismaClient }"
- "直接データベース"

本番同等性違反:
- "SQLite"
- "開発環境では"
- "本番環境では"
- "NODE_ENV"
- "development"
- "production"

フォールバック実装:
- "|| 'default'"
- "?? 'default'"
- "|| null"
- "フォールバック"
- "デフォルト値"

環境分岐:
- "if (process.env.NODE_ENV"
- "環境分岐"
- "環境ごとに"
```

### レベル2: 警告停止（WARNING）

以下のキーワードは**SSOT確認推奨**：

```markdown
接続エラー:
- "Connection refused"
- "接続できない"
- "Cannot connect"
- "ECONNREFUSED"

認証エラー:
- "Authentication failed"
- "認証失敗"
- "Unauthorized"
- "401"

データ取得エラー:
- "undefined"
- "null"
- "is not defined"
- "Cannot read property"

テナント関連:
- "tenant_id"
- "tenantId"
- "テナントID"
- "session.tenantId"
```

---

## 🛑 自動停止プロトコル

### フローチャート

```
エラー検知
  ↓
【Step 1】実装即座停止 🛑
  ↓
【Step 2】エラーパターン分類
  ↓
【Step 3】該当SSOT特定
  ↓
【Step 4】SSOT再読み込み 📖
  ↓
【Step 5】SSOT記載確認
  ↓
【Step 6】ユーザー報告 📢
  ↓
【Step 7】承認待ち ⏸️
  ↓
【Step 8】承認後実装再開 ✅
```

---

## 📖 エラーパターン別SSOT参照表

| エラーパターン | 該当SSOT | 参照セクション |
|-------------|---------|-------------|
| **Prisma接続エラー**（hotel-saas） | SSOT_SAAS_MULTITENANT.md | システム間連携フロー |
| **PostgreSQL接続エラー** | SSOT_DATABASE_SCHEMA.md | データベース設定 |
| **認証・セッションエラー** | SSOT_SAAS_ADMIN_AUTHENTICATION.md | セッション管理 |
| **tenant_id取得失敗** | SSOT_SAAS_MULTITENANT.md | テナント識別方法 |
| **API接続エラー** | SSOT_SYSTEM_INTEGRATION.md | API仕様 |
| **環境変数エラー** | SSOT_PRODUCTION_PARITY_RULES.md | 本番同等性 |
| **型エラー** | SSOT_DATABASE_SCHEMA.md | データ型定義 |
| **ミドルウェアエラー** | SSOT_SAAS_ADMIN_AUTHENTICATION.md | ミドルウェア仕様 |

---

## 🚨 具体的なエラーケースと対応

### ケース1: "Prismaが使えない"（hotel-saas実装中）

#### ❌ 間違った対応（SSOT違反）

```typescript
// AI: "Prismaをインストールします"
// ❌ システム境界違反

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tenants = await prisma.tenant.findMany();
```

#### ✅ 正しい対応（SSOT準拠）

```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## エラー内容
hotel-saas実装中に「Prismaが使えない」というエラーが発生しました。

## 該当SSOT
📖 SSOT_SAAS_MULTITENANT.md

## SSOT記載内容（再確認）
> hotel-saasは**プロキシ専用システム**です。
> データベース直接アクセスは**hotel-common経由**で行います。
> 
> **禁止事項**:
> - ❌ hotel-saasでPrismaを直接使用
> - ❌ PostgreSQLに直接接続
> 
> **正しい実装**:
> - ✅ hotel-commonのAPI経由でデータ取得

## 判断
- [x] SSOTに記載あり

## 提案する対応方針
hotel-commonのAPIエンドポイントを使用してテナント一覧を取得します：

```typescript
// hotel-saas/server/api/admin/tenants/index.get.ts
const tenants = await $fetch('http://localhost:3400/api/v1/admin/tenants');
```

実装を再開してよろしいでしょうか？
```

---

### ケース2: "PostgreSQL接続エラー → SQLite提案"

#### ❌ 間違った対応（SSOT違反）

```
AI: "PostgreSQLに接続できません。
     開発環境ではSQLiteを使用すべきです。
     DATABASE_URLを変更します。"

❌ 本番同等性原則違反
❌ 環境分岐実装
```

#### ✅ 正しい対応（SSOT準拠）

```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## エラー内容
PostgreSQLへの接続に失敗しました。

## 該当SSOT
📖 SSOT_PRODUCTION_PARITY_RULES.md

## SSOT記載内容（再確認）
> **本番同等性原則**:
> - 開発環境と本番環境は**同じデータベース（PostgreSQL）**を使用
> - 環境変数で**接続先のみ変更**、DBMSは統一
> 
> **禁止事項**:
> - ❌ 開発環境でSQLite、本番でPostgreSQL
> - ❌ 環境分岐実装
> 
> **正しい対応**:
> - ✅ PostgreSQLの起動確認
> - ✅ 環境変数の確認
> - ✅ マイグレーション実行

## 判断
- [x] SSOTに記載あり

## 提案する対応方針
PostgreSQLの状態を確認し、必要であればマイグレーションを実行します。

1. PostgreSQL起動確認
2. 環境変数確認（DATABASE_URL）
3. Prisma migrate実行（hotel-common）

実装を再開してよろしいでしょうか？
```

---

### ケース3: "session.tenantIdがundefined"

#### ❌ 間違った対応（SSOT違反）

```typescript
// AI: "undefinedなのでフォールバック値を設定します"
// ❌ フォールバック実装（本番障害リスク）

const tenantId = session.tenantId || 'default';
```

#### ✅ 正しい対応（SSOT準拠）

```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## エラー内容
session.tenantIdがundefinedです。

## 該当SSOT
📖 SSOT_SAAS_MULTITENANT.md

## SSOT記載内容（再確認）
> **テナントID取得方法**:
> - セッションから動的取得
> - **フォールバック値は絶対禁止**
> 
> **禁止事項**:
> - ❌ 'default'等のフォールバック値
> - ❌ null許容
> 
> **理由**:
> 本番環境で'default'テナントが存在しない場合、
> 全機能が停止します。

## 判断
- [x] SSOTに記載あり

## 提案する対応方針
セッション取得方法を確認し、正しく実装します：

```typescript
const session = await getSession(sessionId);
if (!session || !session.tenantId) {
  throw createError({
    statusCode: 401,
    message: 'セッションが無効です'
  });
}

const tenantId = session.tenantId; // フォールバックなし
```

実装を再開してよろしいでしょうか？
```

---

## 📢 ユーザー報告テンプレート

### 標準テンプレート

```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## エラー内容
[エラーメッセージまたは状況]

## 該当SSOT
📖 [SSOTファイル名]

## SSOT記載内容（再確認）
> [該当セクションの引用]

## 判断
- [ ] SSOTに記載あり → SSOT通りに実装
- [ ] SSOTに記載なし → ユーザーに質問

## 提案する対応方針
[具体的な実装方針]

実装を再開してよろしいでしょうか？
```

### SSOTに記載がない場合のテンプレート

```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行しましたが、記載が見つかりません。

## エラー内容
[エラーメッセージまたは状況]

## 確認したSSO
📖 [確認したSSOTファイル名]

## SSOTでの関連記載
[関連しそうな記載内容]

## 疑問点
[具体的な疑問]

## 推測される対応方針
[推測される対応方針（実装はしない）]

どのように対応すればよいでしょうか？
```

---

## 🎯 AI自己診断チェックリスト

エラー発生時、以下を**必ず**自問してください：

### チェックリスト1: システム理解

- [ ] このエラーが発生したシステムは？
  - [ ] hotel-saas（プロキシ専用）
  - [ ] hotel-common（API基盤・DB層）
  - [ ] hotel-pms/member（独立システム）

- [ ] このシステムでデータベース直接アクセスは許可されているか？
  - [ ] hotel-saas: ❌ 禁止
  - [ ] hotel-common: ✅ 許可
  - [ ] hotel-pms/member: ✅ 許可（各システム専用DB）

### チェックリスト2: SSOT確認

- [ ] エラー発生前にSSOTを読んだか？
- [ ] エラー発生後にSSOTを**再読み込み**したか？
- [ ] SSOT記載内容を理解したか？

### チェックリスト3: 禁止パターン回避

- [ ] フォールバック値（'default'、null等）を使おうとしていないか？
- [ ] 環境分岐（NODE_ENV判定等）を実装しようとしていないか？
- [ ] システムの境界を越えた実装をしようとしていないか？

### チェックリスト4: 対応方針

- [ ] SSOTに記載があるか確認したか？
- [ ] 記載がある場合、SSOT通りの実装方針を立てたか？
- [ ] 記載がない場合、ユーザーに質問する準備をしたか？

**1つでも「いいえ」がある場合**: Step 1（実装停止）から再実行

---

## 🔄 プロトコル実行フロー（詳細版）

### Step 1: エラー検知 🔍

```
エラーメッセージを分析
  ↓
エラー検知トリガー確認
  ↓
レベル1（CRITICAL）またはレベル2（WARNING）判定
  ↓
次のステップへ
```

### Step 2: 実装即座停止 🛑

```
現在の実装作業を停止
  ↓
「実装を停止しました」と明示
  ↓
次のステップへ
```

### Step 3: エラーパターン分類 📊

```
エラーパターン別SSOT参照表を確認
  ↓
該当するエラーパターンを特定
  ↓
対応するSSOTファイルを特定
  ↓
次のステップへ
```

### Step 4: SSOT再読み込み 📖

```
該当SSOTファイルを読み込み
  ↓
関連セクションを確認
  ↓
禁止事項セクションを確認
  ↓
正しい実装方法を確認
  ↓
次のステップへ
```

### Step 5: SSOT記載確認 ✅

```
エラーの対応方法がSSOTに記載されているか？
  ↓
【YES】→ SSOT通りの実装方針を立てる → Step 6へ
【NO】 → ユーザーへの質問を準備 → Step 6へ
```

### Step 6: ユーザー報告 📢

```
報告テンプレートを使用
  ↓
エラー内容を記載
  ↓
SSOT記載内容を引用
  ↓
提案する対応方針を記載
  ↓
承認を求める
  ↓
次のステップへ
```

### Step 7: 承認待ち ⏸️

```
ユーザーの応答を待つ
  ↓
【承認】→ Step 8へ
【却下】→ Step 4へ戻る（SSOT再確認）
【修正指示】→ 指示に従う
```

### Step 8: 実装再開 ✅

```
承認された方針で実装
  ↓
SSOT準拠を確認しながら実装
  ↓
実装完了後、動作確認
  ↓
【成功】→ 実装完了
【失敗】→ Step 1へ戻る（新しいエラー）
```

---

## 📚 関連ドキュメント

| ドキュメント | 目的 | 参照タイミング |
|-----------|------|-------------|
| **ssot_implementation_guard.md** | SSOT実装時のガードレール | SSOT実装開始時 |
| **error_detection_protocol.md**（本書） | エラー検知時の自動停止 | エラー発生時 |
| **system_boundary_violations.md** | システム境界違反パターン集 | 実装方針検討時 |
| **progress_management_guardrails.md** | 進捗管理ルール | 進捗更新時 |
| **implementation_status_guardrails.md** | 実装状況管理ルール | 実装完了判定時 |

---

## 🎓 学習ポイント

### AIが覚えておくべきこと

1. **エラー = SSOT確認のトリガー**
   - エラーは「修正するもの」ではなく「SSOT確認のきっかけ」

2. **システムの役割を常に意識**
   - hotel-saas: プロキシ専用（DB直接アクセス禁止）
   - hotel-common: API基盤・DB層
   - hotel-pms/member: 独立システム

3. **本番同等性原則の厳守**
   - 開発・本番で実装を変えてはいけない
   - フォールバック値は本番障害の原因

4. **「動けばいい」は間違い**
   - 開発環境で動いても、本番で動かなければ意味がない
   - SSOT準拠が最優先

5. **ユーザーに質問することは恥ではない**
   - 不明な点をユーザーに質問することは正しい対応
   - 推測で実装することの方が問題

---

## ✅ まとめ

### エラー発生時の絶対ルール

```
1. 実装即座停止 🛑
2. SSOT再読み込み 📖
3. ガードレール確認 🛡️
4. ユーザー報告 📢
5. 承認後実装再開 ✅
```

### 絶対にやってはいけないこと

```
1. ❌ エラーを見てすぐ修正しようとする
2. ❌ 「たぶんこうだろう」で実装を続ける
3. ❌ SSOTを読まずに推測で実装する
4. ❌ システムの境界を越えた実装をする
5. ❌ フォールバック値で「動けばいい」とする
```

### 最重要ポイント

**「慌てて修正」ではなく「SSOT確認」**

---

**最終更新**: 2025年10月10日  
**作成者**: AI Assistant (Luna)  
**バージョン**: 1.0.0

