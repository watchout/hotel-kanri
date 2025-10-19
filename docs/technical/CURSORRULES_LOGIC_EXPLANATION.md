# 🔍 .cursorrules による逸脱防止ロジックの詳細解説

**作成日**: 2025年10月5日  
**対象**: 技術的な動作原理を理解したい方向け  
**目的**: .cursorrules がどのように「AIの逸脱」を防ぐのか、具体的なロジックを解説

---

## 🎯 結論から（TL;DR）

### .cursorrules は「Linter」ではなく「AIの判断基準」

```
❌ 誤解：コードを自動チェックして警告を出す（Linterのような動作）
✅ 正解：AIの思考プロセスに組み込まれ、判断基準として機能
```

### 動作原理
```
1. Cursor起動時に .cursorrules を読み込む
2. AIのシステムプロンプト（最優先ルール）に注入
3. AIがコード生成・提案する際、常にこのルールを参照
4. ルールに反する行動を「自発的に避ける」
```

---

## 📊 技術的な動作フロー

### Phase 1: 初期化（Cursor起動時）

```typescript
// 疑似コード：Cursorの内部動作

class CursorAI {
  private systemPrompt: string = "";
  
  async initializeProject(projectPath: string) {
    // 1. .cursorrules の自動検索
    const cursorrulesPath = `${projectPath}/.cursorrules`;
    
    // 2. ファイル存在チェック
    if (fileExists(cursorrulesPath)) {
      // 3. ファイル読み込み
      const rulesContent = readFile(cursorrulesPath);
      
      // 4. システムプロンプトの最優先部分に注入
      this.systemPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最優先ルール - .cursorrules】
優先度: CRITICAL
適用: 全ての応答に適用
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${rulesContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【標準AIルール】
${this.defaultAIRules}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
      
      console.log('[Cursor] .cursorrules loaded and injected');
    }
  }
}
```

**重要なポイント**:
- ✅ ユーザーが何もしなくても自動実行
- ✅ プロジェクトを開くたびに毎回実行
- ✅ 最優先ルールとして注入

---

### Phase 2: コード生成時の判断プロセス

```typescript
// AIがコードを生成する際の内部思考プロセス

async function generateCode(userRequest: string, context: Context) {
  // ステップ1: ユーザーの要求を理解
  const intent = parseUserIntent(userRequest);
  // 例: "hotel-saasでテナント一覧取得"
  
  // ステップ2: 実装方法の候補を生成
  const candidates = [
    { method: 'Prisma直接使用', complexity: 'low', speed: 'fast' },
    { method: 'API経由', complexity: 'medium', speed: 'medium' }
  ];
  
  // ステップ3: システムプロンプト（.cursorrules）を参照
  const rules = this.systemPrompt; // ← .cursorrules の内容が含まれる
  
  // ステップ4: ルールとの照合
  for (const candidate of candidates) {
    if (violatesRules(candidate, rules)) {
      // .cursorrules に違反する候補を除外
      candidates.remove(candidate);
      
      // AIの内部思考:
      // 「Prisma直接使用はルール違反だ。
      //  .cursorrules に明記されている：
      //  ❌ hotel-saasでのPrisma直接使用（CRITICAL）
      //  この候補は除外しよう」
    }
  }
  
  // ステップ5: ルールに準拠した候補のみで実装
  const bestCandidate = selectBest(candidates);
  return generateCodeFromCandidate(bestCandidate);
}

function violatesRules(candidate: Candidate, rules: string): boolean {
  // .cursorrules の内容をパターンマッチング
  
  if (candidate.method === 'Prisma直接使用') {
    // rules に含まれる文字列:
    // "❌ hotel-saasでのPrisma直接使用（CRITICAL）"
    if (rules.includes('hotel-saasでのPrisma直接使用') && 
        rules.includes('CRITICAL')) {
      return true; // ← ルール違反を検知
    }
  }
  
  return false;
}
```

---

### Phase 3: エラー発生時の動作

```typescript
// エラーが発生した際のAIの動作

async function handleError(error: Error, context: Context) {
  // ステップ1: エラーの発生を認識
  console.log('[AI] エラーを検知:', error.message);
  
  // ステップ2: システムプロンプト（.cursorrules）を再確認
  const rules = this.systemPrompt;
  
  // ステップ3: .cursorrules の「エラー発生時の手順」を参照
  const errorProtocol = extractErrorProtocol(rules);
  // 抽出される内容:
  // """
  // ステップ1: 実装を即座に停止
  // ステップ2: 該当SSOTを読み直す
  // ステップ3: ガードレール確認
  // ...
  // """
  
  // ステップ4: プロトコルに従った行動
  await this.stopImplementation();
  
  // ステップ5: ユーザーに報告
  return this.generateResponse({
    template: errorProtocol,
    error: error,
    suggestedSSOT: findRelevantSSOT(context)
  });
  
  // 出力例:
  // """
  // 🚨 エラーが発生しました。SSOT確認プロトコルを実行します。
  // 
  // ## Step 1: 実装停止
  // 実装を停止しました。
  // 
  // ## Step 2: SSOT再確認
  // 該当SSOT: SSOT_SAAS_MULTITENANT.md
  // 確認中...
  // """
}
```

---

## 🧪 実例：段階的な思考プロセスの可視化

### 例1: hotel-saasでのテナント一覧取得

#### 🤖 AIの内部思考（.cursorrules なしの場合）

```
[思考開始]

ユーザー指示: 「hotel-saasでテナント一覧を取得して」

[判断プロセス]
1. テナント一覧を取得する必要がある
2. テナントデータはデータベースに保存されている
3. Prismaを使えば簡単に取得できる
4. 実装開始...

[生成されるコード]
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tenants = await prisma.tenant.findMany();
```

[結果]
❌ SSOT違反（hotel-saasはプロキシ専用）
```

---

#### ✅ AIの内部思考（.cursorrules ありの場合）

```
[思考開始]

ユーザー指示: 「hotel-saasでテナント一覧を取得して」

[判断プロセス]
1. テナント一覧を取得する必要がある
2. テナントデータはデータベースに保存されている
3. Prismaを使えば簡単に取得できる
4. 【待って、システムプロンプトを確認】

[システムプロンプト参照]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最優先ルール - .cursorrules】

## ❌ 絶対禁止パターン

### 1. hotel-saasでのPrisma直接使用（CRITICAL）
❌ 検知対象：SSOT違反
import { PrismaClient } from '@prisma/client';

🚨 停止理由：hotel-saasはプロキシ専用、hotel-common経由必須
✅ 正しい実装：
const data = await $fetch('http://localhost:3400/api/v1/admin/tenants');
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[判断の修正]
5. あ、Prisma直接使用は禁止されている！
6. .cursorrules に明記されている
7. hotel-saasはプロキシ専用システム
8. hotel-commonのAPI経由で実装すべき
9. 実装方法を変更...

[生成されるコード]
```typescript
const tenants = await $fetch('http://localhost:3400/api/v1/admin/tenants', {
  headers: {
    Cookie: `hotel_session=${sessionId}`
  }
});
```

[結果]
✅ SSOT準拠（hotel-common経由）
```

---

### 例2: セッションからテナントID取得失敗時

#### 🤖 AIの内部思考（.cursorrules なしの場合）

```
[エラー発生]
Error: session.tenantId is undefined

[判断プロセス]
1. tenantIdがundefinedだ
2. フォールバックを追加すれば動く
3. 開発環境では'default'テナントがある
4. 実装修正...

[生成されるコード]
```typescript
const tenantId = session.tenantId || 'default';
```

[結果]
❌ 本番障害リスク（'default'テナントが本番に存在しない）
```

---

#### ✅ AIの内部思考（.cursorrules ありの場合）

```
[エラー発生]
Error: session.tenantId is undefined

[判断プロセス]
1. tenantIdがundefinedだ
2. フォールバックを追加すれば動く
3. 【待って、システムプロンプトを確認】

[システムプロンプト参照]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最優先ルール - .cursorrules】

## ❌ 絶対禁止パターン

### 2. フォールバック実装（CRITICAL）
❌ 検知対象：本番障害リスク
const tenantId = session.tenantId || 'default';

🚨 停止理由：本番環境で'default'テナント不在→全機能停止
✅ 正しい実装：
const tenantId = session.tenantId;
if (!tenantId) {
  throw new Error('テナントIDが取得できません');
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[判断の修正]
4. あ、フォールバック実装は禁止されている！
5. 本番環境で全機能停止のリスクがある
6. エラーを明示的にスローすべき
7. まず、SSOTを確認すべき
8. 実装を停止して報告...

[AIの応答]
🚨 エラーが発生しました。SSOT確認プロトコルを実行します。

## Step 1: 実装停止
フォールバック実装は .cursorrules で禁止されているため、
実装を停止しました。

## Step 2: SSOT再確認
該当SSOT: SSOT_PRODUCTION_PARITY_RULES.md
確認中...

【SSOTの記載内容】
> フォールバック実装は本番環境で全機能停止の原因となる。
> 'default'テナントは開発環境にのみ存在。

## Step 3: 正しい実装方針
エラーを明示的にスローする実装に変更します：
```typescript
const tenantId = session.tenantId;
if (!tenantId) {
  throw new Error('テナントIDが取得できません。セッションを確認してください。');
}
```

実装を再開してよろしいでしょうか？

[結果]
✅ SSOT準拠（明示的エラーハンドリング）
```

---

## 🔍 .cursorrules の限界と対策

### ⚠️ 限界1: 完全な自動防止ではない

**.cursorrules は「Linter」ではありません**

```typescript
// これは自動的にエラーを出すわけではない
const tenantId = session.tenantId || 'default';
// ↑ コンパイルもLintも通る
```

**しかし**:
- ✅ AIが「このコードを生成する前」に判断を変える
- ✅ AIが「これは禁止されている」と認識して避ける
- ✅ エラー後に「SSOTを確認すべき」と思い出す

---

### ⚠️ 限界2: AIの「忘却」リスク

**問題**: 長い会話の中で、AIがルールを忘れる可能性

```
会話開始: .cursorrules を読み込み済み ✅
  ↓
100ターン後: コンテキストが長くなりすぎる
  ↓
AIの短期記憶が圧迫される
  ↓
.cursorrules の内容を「忘れる」可能性 ⚠️
```

**対策**:
1. `.cursorrules` に**エラー時の明示的な手順**を記載
   ```markdown
   ## エラー発生時の絶対ルール
   1. 実装停止
   2. SSOT読み直し ← この指示により「思い出す」
   ```

2. **定期的な確認プロンプト**
   ```markdown
   【重要】実装開始前に以下を確認：
   - このシステムの役割は？
   - データベース直接アクセスは許可されているか？
   ```

---

### ⚠️ 限界3: 微妙なパターンの見逃し

**問題**: 明示的でない違反パターン

```typescript
// .cursorrules に明記されたパターン
const tenantId = session.tenantId || 'default'; // ← AIは検知できる

// 微妙なパターン
const tenantId = session.tenantId ? session.tenantId : 'default'; // ← 見逃す可能性
```

**対策**:
1. **.cursorrules に複数のパターンを明記**
   ```markdown
   ❌ 禁止パターン（全て）:
   - session.tenantId || 'default'
   - session.tenantId ?? 'default'
   - session.tenantId ? session.tenantId : 'default'
   - session.tenantId || getDefaultTenantId()
   ```

2. **概念レベルでの禁止を明記**
   ```markdown
   ❌ 概念的禁止:
   「テナントIDのフォールバック」という概念自体が禁止
   ```

---

## 💡 .cursorrules の効果を最大化する方法

### 1. **明示的で具体的な記述**

❌ 曖昧な記述:
```markdown
hotel-saasではデータベースに直接アクセスしないこと
```

✅ 具体的な記述:
```markdown
❌ hotel-saasでのPrisma直接使用（CRITICAL）
```typescript
// ❌ 検知対象：SSOT違反
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 🚨 停止理由：hotel-saasはプロキシ専用、hotel-common経由必須
// 📖 参照SSOT：SSOT_SAAS_MULTITENANT.md
// ✅ 正しい実装：
const data = await $fetch('http://localhost:3400/api/...');
```
```

**効果**:
- ✅ AIが「何が禁止か」を明確に理解
- ✅ AIが「なぜ禁止か」を理解
- ✅ AIが「正しい実装」を知っている

---

### 2. **エラー発生時の手順を明記**

```markdown
## エラー発生時の自動実行手順

ステップ1: 実装を即座に停止
ステップ2: 該当SSOTを読み直す
ステップ3: ガードレール確認
ステップ4: 判断
ステップ5: 実装再開
```

**効果**:
- ✅ AIが「エラー時に何をすべきか」を知っている
- ✅ 「慌てて修正」パターンを防止

---

### 3. **参照SSOTのパス明記**

```markdown
**SSOT一覧**（エラー内容に応じて参照）:
- テナント関連: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
- 認証関連: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
```

**効果**:
- ✅ AIが「どのSSOTを読むべきか」を即座に判断
- ✅ 自動的にSSOTを読み込む

---

## 📊 効果の比較

### シナリオ：hotel-saasでのPrisma直接使用

| 条件 | AIの行動 | 結果 |
|------|---------|------|
| **.cursorrules なし** | 「Prismaを使おう」→ 即実装 | ❌ SSOT違反 |
| **.cursorrules あり（曖昧）** | 「Prismaは...たぶんダメ？」→ 迷う | △ 不確実 |
| **.cursorrules あり（具体的）** | 「Prismaは禁止。hotel-common経由で実装」 | ✅ SSOT準拠 |

---

## 🎯 まとめ

### .cursorrules の動作原理

1. **自動読み込み**: Cursor起動時に自動的に読み込まれる
2. **システムプロンプト注入**: AIの「判断基準」として組み込まれる
3. **思考プロセスへの影響**: AIがコード生成時に自動的に参照
4. **エラー時の想起**: エラー発生時に「SSOTを確認すべき」と思い出す

### 効果を最大化する3原則

1. ✅ **明示的で具体的な記述**（コード例付き）
2. ✅ **エラー時の手順を明記**（ステップバイステップ）
3. ✅ **参照先を明記**（絶対パス）

### 限界と対策

| 限界 | 対策 |
|------|------|
| 完全自動ではない | 具体的なパターン例示 |
| 長い会話で忘れる | エラー時の確認手順明記 |
| 微妙なパターンの見逃し | 概念レベルでの禁止明記 |

---

**これにより、AIの「短絡的な判断」を防ぎ、SSOT準拠の実装を促進します。**

---

**最終更新**: 2025年10月5日  
**作成者**: AI Assistant (Luna)  
**対象読者**: 技術的な動作原理を理解したい方


