# TaskCard 利用ガイド

**最終更新**: 2025-10-21  
**対象**: 全開発者・AI  
**参照方法**: `ripgrep MCP` または `/read-quote`

---

## 📋 TaskCard一覧（5パターン）

| Alias | ID | タイプ | 優先度 | 用途 |
|-------|-----|--------|--------|------|
| **r1** | PMS-12 | feature | P1 | 新機能実装 |
| **b1** | BUG-45 | bug | P0 | バグ修正 |
| **f1** | REFACTOR-8 | refactoring | P2 | リファクタリング |
| **s1** | DOC-23 | documentation | P1 | SSOT作成 |
| **i1** | INVEST-5 | investigation | P2 | 調査タスク |

---

## 🎯 シーン別：どのカードを使う？

### 🚨 緊急バグが発生した（P0/Critical）
**→ b1（バグ修正）を使う**

```yaml
利用開始: Task: b1 — /rfv
重視事項: 
  - root cause分析（Evidence必須）
  - 再現手順の明確化
  - 同様バグの横展開チェック
  - 他20箇所のAPI確認必須
出力形式: Diff only
```

**具体例：**
- 他テナントのデータが見えてしまう
- 権限チェックが機能していない
- セキュリティ脆弱性が発覚
- 本番で決済が失敗する

**Evidence例：**
```markdown
1. SSOT #tenant-isolation ルール引用
   docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md#L45-L52
2. バグコード引用
   apps/hotel-saas/server/api/orders/index.get.ts#L28-L35
   → WHERE句にtenantIdフィルタが欠落
3. セッション取得の正しい実装例
   apps/hotel-saas/server/api/rooms/index.get.ts#L15-L18
```

---

### 🔧 コードが重複しすぎて保守が辛い
**→ f1（リファクタリング）を使う**

```yaml
利用開始: Task: f1 — /rfv
重視事項:
  - 破壊的変更絶対禁止
  - 振る舞い不変の証明（テスト結果比較）
  - Before/After比較必須
出力形式: Diff only
```

**具体例：**
- エラー処理が20箇所で重複（100行削減可能）
- 同じバリデーションロジックがコピペされている
- 型定義が散在して保守コスト高

**Evidence例：**
```markdown
1. 重複コードパターン引用（3箇所）
   apps/hotel-saas/server/api/orders/index.get.ts#L45-L60
   apps/hotel-pms/server/api/reservations/index.get.ts#L38-L52
   packages/common/src/utils/errors.ts#L20-L35
2. 既存テスト成功結果
   npm run test > test-before.log
   ✅ 250 tests passed
3. 共通化後の差分（Diff）
```

**完了条件：**
```bash
# Before/After比較
npm run test > test-before.log
# リファクタ実施
npm run test > test-after.log
diff test-before.log test-after.log
# → 差分ゼロ（振る舞い不変）
```

---

### 📘 新機能の仕様を固めたい
**→ s1（SSOT作成）を使う**

```yaml
利用開始: Task: s1 — /rfv
重視事項:
  - 既存実装15分調査（必須）
  - 要件ID完全付与（PERM-001〜）
  - Accept（合格条件）明確化
  - 品質スコア90点以上
出力形式: 全文出力（full_content: true）
```

**具体例：**
- 権限管理システムの仕様書を作る
- 予約フローの正式仕様を文書化
- 既存の暗黙知を明文化

**Evidence例：**
```markdown
1. アーカイブ調査（3要点）
   - 旧仕様: Role/Permissionの2層構造
   - 変更点: Resource単位の細粒度制御追加
   - 削除機能: グローバルロールは廃止
2. 既存実装調査（DB/API/UI）
   prisma/schema.prisma#Permission → 5カラム確認
   apps/hotel-saas/server/api/permissions/ → 8エンドポイント
   composables/usePermissions.ts → UI側の権限チェック
3. 他SSOT参照（命名規則・構成）
   docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
```

**完了条件：**
```bash
# 品質チェック実行
node scripts/quality/check-ssot-consistency.cjs \
  docs/03_ssot/01_systems/saas/SSOT_PERMISSION_SYSTEM.md
# → スコア90点以上
```

---

### 🔍 パフォーマンス問題の原因が分からない
**→ i1（調査タスク）を使う**

```yaml
利用開始: Task: i1 — /rfv
重視事項:
  - メトリクス・実行計画の引用
  - 改善案3つ提示（工数・リスク・効果）
  - 推奨案の明確化
  - 次アクション提示
出力形式: レポート形式
```

**具体例：**
- 予約一覧APIが3秒もかかる（目標300ms）
- メモリ使用量が異常に多い
- N+1クエリが疑われる

**Evidence例：**
```markdown
1. 現状メトリクス
   - 平均応答時間: 3.2秒
   - データ量: 予約10万件、顧客5万件
   - メモリ: 2GB（通常500MB）
2. クエリ実行計画
   EXPLAIN ANALYZE結果:
   Seq Scan on reservations (cost=0.00..15234.00 rows=100000)
   → インデックス未使用
3. コードの問題箇所
   apps/hotel-pms/server/api/reservations/index.get.ts#L45-L60
   → 顧客情報をループ内でN回取得（N+1問題）
```

**改善案テンプレート：**
```markdown
## 改善案A: インデックス追加
- 概要: tenant_id + created_at の複合インデックス
- 工数: 1時間
- リスク: 低（既存クエリに影響なし）
- 効果予測: 80%改善（3.2秒→640ms）

## 改善案B: キャッシュ導入
- 概要: Redis + 5分TTL
- 工数: 8時間
- リスク: 中（キャッシュ整合性管理）
- 効果予測: 95%改善（3.2秒→160ms）

## 改善案C: アーキテクチャ変更
- 概要: GraphQL + DataLoader
- 工数: 40時間
- リスク: 高（全体設計変更）
- 効果予測: 99%改善（3.2秒→32ms）

## 推奨案: A（即効性・低リスク）
理由: 工数1h、効果80%改善、本番即適用可能
次アクション: 実装タスク BUG-46 を作成
```

---

## 🚀 基本フロー（全カード共通）

```
Step 1: タスク選択
  → Task: <alias> — /rfv
  
Step 2: Evidence提示
  - 要点3つ（引用：パス#L行番号）
  - SSOT/既存実装/スキーマ
  
Step 3: Plan提示
  - ≤5ステップ
  - 工数見積もり
  
Step 4: 承認待ち
  - ユーザー: 「OK。Diff only」
  
Step 5: 実装
  - Diff出力（説明なし）
  - テスト追加/更新
  
Step 6: PR作成
  - PRテンプレにEvidence記入
  - CI成功確認
```

---

## 📊 優先度の判断基準

| 優先度 | 対象 | 例 |
|--------|------|-----|
| **P0** | 本番障害・セキュリティ | b1（テナント分離バグ） |
| **P1** | 重要機能・SSOT | r1（新機能）, s1（SSOT作成） |
| **P2** | 改善・調査 | f1（リファクタ）, i1（調査） |
| **P3** | Nice to have | - |

---

## ⚠️ よくある間違い

### ❌ 間違い1: Evidenceを省略
```
Task: r1
Plan: APIを実装します
```
**→ NG**: Evidenceなしで実装開始は禁止

### ❌ 間違い2: カード全文を貼る
```
Task: r1
（88行のYAML全文コピペ）
```
**→ NG**: aliasだけで指定、全文は /show-task のみ

### ❌ 間違い3: 振る舞いを変えるリファクタ
```
Task: f1
Plan: エラーメッセージを改善します
```
**→ NG**: リファクタは振る舞い不変必須

### ✅ 正しい例
```
Task: r1 — /rfv

Evidence:
1. SSOT #roles-create 要約3点
   docs/SSOT_SAAS_PERMISSION_SYSTEM.md#L45-L52
2. 既存routes構造
   apps/server/src/routes/roles.ts#L10-L25
3. schema.prisma Role定義
   prisma/schema.prisma#L120-L125

Plan:
1. 既存ルート/バリデータ把握
2. 201/400/409分岐実装
3. テスト追加
4. APIドキュ更新
5. CI

承認お願いします。
```

---

## 🔗 関連ドキュメント

- **EPA運用ガード**: `.cursor/rules/00-guardrails.md`
- **コマンドリファレンス**: `.cursor/reference/commands-reference.md`
- **EPAワークフロー**: `.cursor/reference/epa-workflow.md`
- **PRテンプレート**: `.github/pull_request_template.md`
