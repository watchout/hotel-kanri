# 🚨 SSOT実装強制メカニズム（AI自動参照システム）

**作成日**: 2025年10月5日  
**バージョン**: 1.0.0  
**目的**: AIがエラー発生時に**自動的に**SSOTを参照する仕組みを構築

---

## 🎯 問題の本質

### 現状の課題

```
ドキュメント作成 ✅
       ↓
AIが参照しない ❌  ← ここが問題
       ↓
SSOT違反が発生 ❌
```

**ユーザーの指摘**:
> 「ドキュメントを作るのはいいが、結局agentが実装中に参照しなければ意味がなく、守られないことが多い」

---

## 🔧 3層強制参照メカニズム

### Layer 1: Cursor Rules 自動注入（最優先）

**仕組み**: `.cursorrules` ファイルによる自動読み込み

**実装場所**: `/Users/kaneko/hotel-kanri/.cursorrules`

```markdown
# 🚨 SSOT実装時の強制ルール

## エラー発生時の絶対プロトコル

あなたがSSO実装中にエラーに遭遇した場合、以下の手順を**必ず**実行してください：

### ステップ1: 実装を即座に停止
- ❌ エラーを修正しようとしない
- ❌ 推測で実装を続けない
- ✅ すぐに次のステップへ

### ステップ2: 該当SSOTを読み直す
実装中のSSOTファイルを**必ず再読み込み**してください。

**SSOT一覧**:
- テナント関連: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
- 認証関連: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
- DB関連: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_SCHEMA.md

### ステップ3: ガードレール確認
エラーパターン別の対応方法を確認：
📖 /Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md

### ステップ4: 判断
- SSOTに記載あり → SSOT通りに実装
- SSOTに記載なし → ユーザーに質問

### ステップ5: 実装再開
ユーザーの承認を得てから実装を再開

---

## ❌ 絶対禁止パターン（自動検知対象）

以下のパターンを検知した場合、**即座に実装を停止**してください：

### 1. hotel-saasでのPrisma直接使用
```typescript
// ❌ 検知対象：SSOT違反
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 停止理由：hotel-saasはプロキシ専用、hotel-common経由必須
// 参照SSOT：SSOT_SAAS_MULTITENANT.md
```

### 2. フォールバック実装
```typescript
// ❌ 検知対象：本番障害リスク
const tenantId = session.tenantId || 'default';
const tenantId = user?.tenantId ?? 'default';

// 停止理由：本番環境で'default'テナント不在
// 参照SSOT：SSOT_PRODUCTION_PARITY_RULES.md
```

### 3. 環境分岐実装
```typescript
// ❌ 検知対象：本番同等違反
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}

// 停止理由：開発・本番で実装を変えてはいけない
// 参照SSOT：SSOT_PRODUCTION_PARITY_RULES.md
```

---

## 🤖 AI自己診断チェックリスト

エラー発生時、以下を自問してください：

- [ ] このエラーの前にSSOTを読み直したか？
- [ ] 実装しようとしているシステムの役割を理解しているか？
  - hotel-saas: プロキシ専用
  - hotel-common: API基盤・DB層
- [ ] データベース直接アクセスしようとしていないか？
- [ ] フォールバック値（'default'等）を使おうとしていないか？
- [ ] 環境分岐を実装しようとしていないか？

**1つでも「いいえ」がある場合**: SSOT確認必須
```

---

### Layer 2: システムメモリ注入

**仕組み**: Cursor の Memory システムによる永続的なルール記憶

**実装方法**: 
```markdown
【重要な記憶として保存】
- SSOT実装中にエラーが出た場合、必ず該当SSOTを読み直す
- hotel-saasでPrismaを直接使用してはいけない（hotel-common経由必須）
- フォールバック実装（'default'等）は本番障害の原因となるため禁止
```

---

### Layer 3: 対話プロトコル強制

**仕組み**: エラー発生時の発言フォーマットの強制

**テンプレート**:
```markdown
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## Step 1: 実装停止
実装を停止しました。

## Step 2: SSOT再確認
該当SSOT: [SSOTファイル名]
確認中...

## Step 3: SSOT記載内容
[該当セクションの引用]

## Step 4: 判断
- [x] SSOTに記載あり
- [ ] SSOTに記載なし

## Step 5: 対応方針
[SSOT準拠の実装方針]

実装を再開してよろしいでしょうか？
```

---

## 📊 強制メカニズムの実装計画

### Phase 1: .cursorrules 更新（即座実施）

**ファイル**: `/Users/kaneko/hotel-kanri/.cursorrules`

**追加内容**:
```markdown
## 🚨 SSOT実装強制プロトコル

### エラー発生時の自動実行手順

1. **実装停止**: エラーが出たら即座に停止
2. **SSOT読み直し**: 該当SSOTを必ず再読み込み
3. **ガードレール確認**: ssot_implementation_guard.md を参照
4. **判断**: 記載あり→SSOT準拠 / 記載なし→ユーザー質問
5. **実装再開**: 承認後のみ

### 禁止パターン自動検知

以下を検知したら**即座に実装停止**:
- hotel-saasでのPrisma直接使用
- フォールバック実装（|| 'default'等）
- 環境分岐実装（NODE_ENV判定等）

### 参照SSOT一覧

- SSOT_SAAS_MULTITENANT.md
- SSOT_SAAS_ADMIN_AUTHENTICATION.md
- SSOT_DATABASE_SCHEMA.md
- ssot_implementation_guard.md
```

---

### Phase 2: 各システムの.cursorrules 更新

#### hotel-saas/.cursorrules
```markdown
## hotel-saas システム固有ルール

### 絶対禁止（自動検知）
- ❌ Prisma直接使用
- ❌ hotel-commonのDB直接アクセス
- ❌ 他システムDBへの直接書き込み

### 必須パターン
- ✅ 全API呼び出しはhotel-common経由
- ✅ 認証はセッションから取得
- ✅ テナントIDは動的取得（ハードコード禁止）

### エラー時の参照SSOT
1. SSOT_SAAS_MULTITENANT.md
2. SSOT_SAAS_ADMIN_AUTHENTICATION.md
3. ssot_implementation_guard.md
```

#### hotel-common/.cursorrules
```markdown
## hotel-common システム固有ルール

### 役割
- API基盤・データベースアクセス層

### 許可
- ✅ Prisma使用
- ✅ PostgreSQL直接アクセス
- ✅ Redis直接アクセス

### 必須パターン
- ✅ マルチテナント対応（全クエリにtenant_id）
- ✅ 認証ミドルウェア適用
- ✅ エラーハンドリング統一
```

---

### Phase 3: プロンプトチェーン強化

**仕組み**: エラー発生時に自動的にSSOTを読み込むプロンプトチェーン

**実装例**:
```typescript
// Cursor AI の内部動作（イメージ）
async function onErrorDetected(error: Error, context: Context) {
  // 1. 実装停止
  await stopImplementation();
  
  // 2. 該当SSOT自動読み込み
  const relevantSSOT = await findRelevantSSOT(context);
  await readFile(relevantSSOT);
  
  // 3. ガードレール読み込み
  await readFile('ssot_implementation_guard.md');
  
  // 4. ユーザーに報告
  await reportToUser({
    error,
    ssotContent: relevantSSOT,
    proposedSolution: await generateSolution(relevantSSOT)
  });
  
  // 5. 承認待ち
  await waitForApproval();
}
```

---

## 🧪 検証方法

### テストシナリオ1: Prisma直接使用の検知

**状況**: hotel-saasでテナント一覧取得実装中

**期待動作**:
```
1. AIがPrisma使用を試みる
2. .cursorrulesの禁止パターン検知
3. 実装を自動停止
4. SSOT_SAAS_MULTITENANT.mdを自動読み込み
5. ユーザーに報告：
   「hotel-saasではPrisma直接使用は禁止されています。
    SSOT_SAAS_MULTITENANT.mdに従い、hotel-commonのAPI経由で実装します。」
```

---

### テストシナリオ2: フォールバック実装の検知

**状況**: セッションからテナントID取得失敗

**期待動作**:
```
1. AIがフォールバック実装を試みる
2. .cursorrulesの禁止パターン検知
3. 実装を自動停止
4. SSOT_PRODUCTION_PARITY_RULES.mdを自動読み込み
5. ユーザーに報告：
   「フォールバック実装は本番障害の原因となります。
    SSOTに従い、エラーを明示的にスローする実装に変更します。」
```

---

## 📈 効果測定

### 定量指標

| 指標 | Before | After（目標） |
|------|--------|-------------|
| エラー時のSSO参照率 | 10% | **95%以上** |
| 禁止パターン検知率 | 0% | **100%** |
| SSOT違反率 | 50% | **5%以下** |
| ユーザー介入必要率 | 30% | **10%以下** |

### 定性指標

- ✅ AIが自動的にSSOTを参照するようになる
- ✅ 禁止パターンが実装前に検知される
- ✅ ユーザーの信頼が回復する

---

## ✅ 実装チェックリスト

### Phase 1: .cursorrules更新（最優先）
- [ ] /Users/kaneko/hotel-kanri/.cursorrules に強制プロトコル追加
- [ ] 禁止パターンの明記
- [ ] SSOT一覧の明記
- [ ] エラー時の手順明記

### Phase 2: システム別.cursorrules
- [ ] hotel-saas/.cursorrules 更新
- [ ] hotel-common/.cursorrules 更新
- [ ] hotel-pms/.cursorrules 更新
- [ ] hotel-member/.cursorrules 更新

### Phase 3: メモリ注入
- [ ] Cursorメモリシステムに永続ルール登録

### Phase 4: 検証
- [ ] テストシナリオ1実行
- [ ] テストシナリオ2実行
- [ ] 実環境での効果測定

---

## 🚀 即座実施項目

### 今すぐやるべきこと

1. **メインプロジェクトの.cursorrules更新**
   ```bash
   vi /Users/kaneko/hotel-kanri/.cursorrules
   ```
   
2. **各システムの.cursorrules作成/更新**
   ```bash
   # hotel-saasの場合
   vi /Users/kaneko/hotel-saas/.cursorrules
   ```

3. **検証実行**
   - わざとPrisma直接使用を試みる
   - .cursorrulesが機能するか確認

---

## 📚 関連ドキュメント

- [ssot_implementation_guard.md](./ssot_implementation_guard.md) - ガードレール本体
- [ai-agent-compliance-strategy.md](/Users/kaneko/hotel-kanri/docs/01_systems/common/ai-agent-compliance-strategy.md) - AI遵守戦略
- [.cursor/rules/hotel-kanri-master-rules.md](../.cursor/rules/hotel-kanri-master-rules.md) - マスタールール

---

**最終更新**: 2025年10月5日  
**作成者**: AI Assistant (Luna)  
**ステータス**: 実装待ち・承認待ち


