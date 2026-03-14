# OPS-000 Charter — 運用方針規格（最上位）

**制定日**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active  
**所有者**: Eng Lead  
**承認者**: CTO/PM  

---

## 📋 目的

開発運用の**"唯一のやり方"**を文書＋CIで規格化し、ツール切替（Linear/Plane/ファイル）時もブレずに自動適用できるようにする。

---

## 🎯 OPS v1 の原則

### 1. 唯一の真実（Single Source of Truth）

**各ドメインに"唯一の真実"を定義し、それ以外での編集を禁止する**

- **進捗管理**: `ops/policy.yml` の `progress.tool` で指定
- **設計・仕様**: `ops/policy.yml` の `design` セクションで指定
- **セキュリティ**: `ops/policy.yml` の `security` セクションで指定

### 2. 自動生成の原則

**テンプレート（.cursorrules, PR/Issue テンプレ等）は `ops/policy.yml` から自動生成する**

- ✅ `ops/scripts/opsctl` で自動生成
- ❌ 手編集は禁止（矛盾の原因）
- ✅ `OPS:BEGIN ... OPS:END` ブロックで管理

### 3. CI/CDでの強制

**矛盾を人間に頼らず、CIで自動検出・ブロックする**

- ✅ OPS Policy Lint（GitHub Actions）
- ✅ PR時に自動チェック
- ❌ 矛盾があるとマージ不可

---

## 📐 ポリシーの階層と優先順位

矛盾が出た場合、**上位が優先**される。

| 優先度 | ドキュメント | 内容 | 編集方法 |
|:-----:|:------------|:-----|:---------|
| **1** | **OPS-000 Charter**（本書） | 最上位。優先順位と変更手順 | PR + レビュー必須 |
| **2** | **OPS-1xx 運用ポリシー** | ドメイン別の規格（進捗、設計等） | PR + レビュー必須 |
| **3** | **ops/policy.yml** | 実環境の設定値（Linear/Plane等の"選択"） | PR + レビュー必須 |
| **4** | **テンプレート** | .cursorrules, PR/Issue テンプレ等 | **自動生成（手編集禁止）** |
| **5** | **実装ガイド／手順書** | 参考情報 | 自由編集 |

---

## 📂 ディレクトリ構成

```
hotel-kanri/
├─ ops/
│  ├─ OPS-000-Charter.md          ← 本書（最上位）
│  ├─ OPS-101-Progress.md         ← 進捗管理ポリシー
│  ├─ OPS-102-Design.md           ← 設計ポリシー
│  ├─ OPS-103-Security.md         ← セキュリティポリシー
│  ├─ policy.yml                  ← 実環境設定（唯一の真実）
│  ├─ scripts/
│  │  ├─ opsctl                   ← 自動整備スクリプト
│  │  └─ validate-policy.py       ← ポリシー検証
│  └─ templates/
│     ├─ cursorrules.template     ← .cursorrules テンプレート
│     └─ pr-template.md           ← PR テンプレート
├─ .github/
│  └─ workflows/
│     └─ ops-policy-lint.yml      ← CI（OPS Policy Lint）
└─ .cursorrules                   ← 自動生成（OPS:BEGIN/END ブロック）
```

---

## 🔄 変更管理プロセス（OPS-901）

### 変更の種類

| 変更レベル | 例 | 必要な承認 | ADR必須 |
|:---------|:---|:---------|:--------|
| **Major** | ツール切替（Linear→Plane） | CTO/PM | ✅ 必須 |
| **Minor** | ポリシー追加（新規OPS-1xx） | Eng Lead | 推奨 |
| **Patch** | 設定値変更（weekly_export: true→false） | Eng Lead | 不要 |

### 変更手順

```
Step 1: ops/policy.yml を編集（または新規OPS-1xx作成）
  ↓
Step 2: ADR起票（Major変更の場合）
  ↓
Step 3: PR作成（タイトル: "[OPS] {変更内容}"）
  ↓
Step 4: CODEOWNERS レビュー（@ops-owners）
  ↓
Step 5: CI（OPS Policy Lint）で矛盾検出ゼロを確認
  ↓
Step 6: マージ → opsctl 自動実行 → テンプレート再生成
  ↓
Step 7: 全員に通知（Slack/Email）
```

---

## 🚨 緊急時の対応

### ツール障害時（例：Planeダウン）

1. **一時的にファイル運用に切替**
   ```bash
   # ops/policy.yml
   progress:
     tool: file  # plane → file
   ```

2. **opsctl 実行**
   ```bash
   npm run ops:apply
   ```

3. **CI確認 → マージ**

4. **復旧後、元に戻す**（同じ手順）

---

## 📊 RACI（役割と責任）

| 役割 | 担当者 | 責任 |
|:-----|:------|:-----|
| **Responsible** | Eng Lead | ops/policy.ymlのメンテナンス |
| **Accountable** | CTO/PM | OPS改定の最終承認 |
| **Consulted** | Security, SRE, QA | ポリシー設計の相談 |
| **Informed** | 全員 | PRマージ時の通知受信 |

---

## 🔍 監査とトレーサビリティ

### 記録対象

- ✅ ops/policy.yml の変更履歴（Git）
- ✅ OPS-1xx ポリシーの変更履歴（Git）
- ✅ CI実行ログ（GitHub Actions）
- ✅ ADR（Major変更時）

### トレース

```
Issue → PR → OPS変更 → CI検証 → マージ → リリース
```

---

## 📚 関連ドキュメント

- **OPS-101**: 進捗管理ポリシー → `ops/OPS-101-Progress.md`
- **OPS-102**: 設計ポリシー → `ops/OPS-102-Design.md`
- **OPS-103**: セキュリティポリシー → `ops/OPS-103-Security.md`
- **OPS-901**: 変更管理プロセス → `ops/OPS-901-Change-Control.md`
- **ADR**: アーキテクチャ決定記録 → `docs/adr/`

---

## ❓ よくある質問（FAQ）

### Q1: 途中でLinear⇄Planeを切替えたい

**A**: 以下の手順で切替可能

1. `ops/policy.yml` の `progress.tool` を変更
2. `npm run ops:apply` でテンプレート再生成
3. CIで検証
4. ADR追記（Major変更）
5. マージ

### Q2: SSOTファイル運用に戻したい

**A**: `progress.tool: file` に変更

- エクスポートは無効化
- .cursorrulesには"Markdownが唯一"の文言を自動挿入

### Q3: 逸脱した文言が手で書かれた

**A**: CIでFail

- `npm run ops:apply` で正しいブロックを再生成
- 再コミット

### Q4: 既存の.cursorrulesとの互換性は？

**A**: 段階的移行

1. `OPS:BEGIN ... OPS:END` ブロックを追加（既存と併存）
2. 徐々に既存記載をOPSブロックに移行
3. 最終的に全てOPS管理に統一

---

## 📅 発効日と履歴

| バージョン | 日付 | 変更内容 | 承認者 |
|:---------|:-----|:---------|:------|
| 1.0.0 | 2025-10-21 | 初版制定 | CTO/PM |

---

## ⚠️ 重要事項

### このChartの役割

✅ **OPS v1 規格の最上位ドキュメント**
- 全てのOPSポリシーの基準
- 優先順位の定義
- 変更管理プロセスの定義

❌ **他のドキュメントで上書きできない**
- 矛盾がある場合は本Chartが優先
- 本Chartの変更はCTO/PM承認必須

---

**管理ファイル**: `/Users/kaneko/hotel-kanri/ops/OPS-000-Charter.md`  
**最終更新**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active

