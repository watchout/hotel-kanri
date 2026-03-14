# Branch Protection 設定ガイド

## 🎯 目的

段階的品質管理アーキテクチャに基づき、製品化の絶対条件（Critical Gates）のみをPRブロック要件とする。

## 設計方針

```
Critical（必須）    → PRをブロック
Non-Critical（任意） → 警告のみ（PRはブロックしない）
```

---

## 🔧 設定手順

### 1. GitHubリポジトリ設定へアクセス

1. `https://github.com/watchout/hotel-kanri` にアクセス
2. **Settings** タブをクリック
3. 左サイドバーから **Branches** を選択

### 2. `main` ブランチの保護ルールを設定

#### Step 1: Branch name pattern

```
Branch name pattern: main
```

#### Step 2: Protect matching branches

以下の項目を **チェック**：

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  
- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**

#### Step 3: Required status checks（重要）

**以下のステータスチェックのみを必須にする**：

```
✅ Critical Quality Gates
   ├─ SSOT準拠（必須）
   ├─ セキュリティスキャン（必須）
   ├─ DB整合性（必須）
   └─ Critical Gates Summary
```

**以下のステータスチェックは追加しない**（警告のみ）：

```
❌ TypeScript型チェック（警告）   ← 追加しない
❌ ESLint（警告）                ← 追加しない
❌ テストカバレッジ（警告）        ← 追加しない
❌ OpenAPI Lint（警告）          ← 追加しない
```

---

## 📋 設定確認チェックリスト

- [ ] `main` ブランチの保護ルールが有効
- [ ] PR承認が必須（1人以上）
- [ ] 必須ステータスチェック：Critical Gatesのみ
- [ ] Non-Criticalチェックは非必須
- [ ] 会話解決が必須
- [ ] バイパス不可

---

## 🎯 各ワークフローの役割

### Critical Quality Gates（必須・ブロッキング）

**ファイル**: `.github/workflows/critical-gates.yml`

**目的**: 製品化の絶対条件を保証

**チェック内容**:
- ✅ SSOT準拠（要件ID、SSOT参照、整合性）
- ✅ セキュリティ（npm audit、センシティブデータ漏洩）
- ✅ DB整合性（命名規則、Prismaバリデーション）

**失敗時の動作**:
- ❌ **PRマージをブロック**
- 🔒 `main` ブランチへのプッシュ不可

---

### Quality Improvement（警告のみ・非ブロッキング）

**ファイル**: `.github/workflows/quality-improvement.yml`

**目的**: 技術的負債の可視化と段階的改善

**チェック内容**:
- ⚠️ TypeScript型チェック
- ⚠️ ESLint
- ⚠️ テストカバレッジ
- ⚠️ OpenAPI Lint

**失敗時の動作**:
- ✅ **PRマージは可能**（警告として表示）
- 📊 技術的負債レジストリに記録
- 💡 段階的な改善を推奨

---

## 🚨 トラブルシューティング

### Q: Critical Gatesが失敗してPRをマージできない

**A: 正常な動作です**

Critical Gatesは製品化の絶対条件です。以下を確認してください：

1. **SSOT準拠エラー**
   - PR本文に読了したSSOTを記載
   - 要件ID（XXX-nnn形式）を記載
   - SSOT間の矛盾を解消

2. **セキュリティエラー**
   - `npm audit fix --production` を実行
   - 脆弱性を修正
   - APIキーやシークレットを削除

3. **DB整合性エラー**
   - データベース命名規則を確認
   - snake_caseを使用
   - Prismaスキーマのバリデーション

---

### Q: Quality Improvementが失敗しているが、PRはマージできる？

**A: はい、正常な動作です**

Quality Improvementは**警告のみ**です：

- ✅ PRマージは可能
- 💡 技術的負債として記録
- 📅 段階的に改善（1-3ヶ月スパン）

失敗内容は技術的負債レジストリ（`docs/tech-debt/DEBT_REGISTRY.md`）に記録してください。

---

### Q: 既存の技術的負債を一気に解消する必要がある？

**A: いいえ、段階的に改善します**

**優先順位**:

1. 🔴 **Critical**（即座に対応）
   - セキュリティ脆弱性
   - データ破損リスク
   - SSOT矛盾

2. 🟡 **High**（1ヶ月以内）
   - ESLintエラー（warningではなくerror）
   - 重要機能のテスト失敗

3. 🟢 **Medium**（3ヶ月以内）
   - ESLint warning（console.log等）
   - 型アノテーション不足

4. ⚪ **Low**（6ヶ月以内）
   - パフォーマンス最適化
   - テストカバレッジ向上

---

## 📊 技術的負債管理

### 負債の可視化

```bash
# 現在の負債スコアを確認
npm run quality:score

# 負債レポートを生成
npm run quality:report
```

### 負債増加の防止

- ✅ 新規コードは品質基準を満たす
- ✅ 既存負債を増やさない
- ✅ PRごとに少しずつ改善

**ルール**: 負債を増やすPRは差し戻し（例外: 緊急修正）

---

## 🔄 定期的な見直し

### 毎週（日曜日）

- 📊 技術的負債レポート自動生成
- 📈 負債トレンドの確認
- 🎯 優先度の見直し

### 毎月

- 📋 負債返済計画の更新
- 🎯 Critical Gatesの拡充検討
- 📚 ベストプラクティスの共有

---

## 📚 関連ドキュメント

- [技術的負債レジストリ](../tech-debt/DEBT_REGISTRY.md)
- [SSOT準拠ガイド](../03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md)
- [セキュリティガイドライン](../security/OWASP-ASVS-L2-CHECKLIST.md)
- [データベース命名規則](../standards/DATABASE_NAMING_STANDARD.md)

---

## ✅ 設定完了確認

以下をテストして確認してください：

1. ダミーPRを作成
2. Critical Gatesの実行を確認
3. Quality Improvementの実行を確認（警告のみ）
4. PRマージ可否を確認

**期待結果**:
- Critical Gates合格 → PRマージ可能
- Critical Gates失敗 → PRマージ不可
- Quality Improvement失敗 → PRマージ可能（警告表示）
