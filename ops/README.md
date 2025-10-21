# OPS v1 — 運用方針規格

**制定日**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active  

---

## 📋 概要

**OPS v1** は、hotel-kanriプロジェクトの運用方針を規格化し、ツール切替（Linear/Plane/ファイル）時もブレずに自動適用できるようにする運用規格です。

---

## 🎯 主要な特徴

### 1. 唯一の真実（Single Source of Truth）

**各ドメインに"唯一の真実"を定義し、それ以外での編集を禁止**

- **進捗管理**: `ops/policy.yml` の `progress.tool` で指定
- **設計・仕様**: SRS, arc42, C4, QAS, ADR
- **セキュリティ**: OWASP ASVS Level 2

### 2. 自動生成の原則

**テンプレート（.cursorrules等）は `ops/policy.yml` から自動生成**

- ✅ `npm run ops:apply` で自動生成
- ❌ 手編集は禁止（矛盾の原因）
- ✅ `OPS:BEGIN ... OPS:END` ブロックで管理

### 3. CI/CDでの強制

**矛盾を人間に頼らず、CIで自動検出・ブロック**

- ✅ OPS Policy Lint（GitHub Actions）
- ✅ PR時に自動チェック
- ❌ 矛盾があるとマージ不可

---

## 📂 ディレクトリ構成

```
hotel-kanri/
├─ ops/
│  ├─ OPS-000-Charter.md          ← 最上位運用方針
│  ├─ OPS-101-Progress.md         ← 進捗管理ポリシー
│  ├─ policy.yml                  ← 実環境設定（唯一の真実）
│  ├─ scripts/
│  │  ├─ opsctl                   ← 自動整備スクリプト
│  │  └─ validate-policy.js       ← ポリシー検証
│  └─ README.md                   ← 本書
├─ .github/
│  └─ workflows/
│     └─ ops-policy-lint.yml      ← CI（OPS Policy Lint）
└─ .cursorrules                   ← 自動生成（OPS:BEGIN/END ブロック）
```

---

## 🚀 クイックスタート

### 1. ポリシー確認

```bash
# ops/policy.yml の内容を確認
cat ops/policy.yml
```

### 2. テンプレート生成

```bash
# .cursorrules のOPSブロックを自動生成
npm run ops:apply
```

### 3. 矛盾チェック

```bash
# 矛盾を検出
npm run ops:lint
```

---

## 📊 現在の設定

### 進捗管理

- **ツール**: **Plane**（唯一の真実）
- **エクスポート**: 週次（月曜8時）
- **エクスポート先**: `docs/03_ssot/SSOT_PROGRESS_MASTER.md`（参照用）

### やること

- ✅ Planeでタスク管理
- ✅ ステータス更新（Backlog → In Progress → Done）
- ✅ 工数記録（見積もり + 実績）
- ✅ 依存関係管理

### やらないこと

- ❌ SSOT_PROGRESS_MASTER.md の手動更新
- ❌ Markdownファイルでの進捗管理
- ❌ 他ツールとの併用

---

## 🔧 ツール切替手順

### Plane → Linear

1. `ops/policy.yml` を編集
   ```yaml
   progress:
     tool: linear  # plane → linear
   ```

2. テンプレート再生成
   ```bash
   npm run ops:apply
   ```

3. CI確認
   ```bash
   npm run ops:lint
   ```

4. コミット
   ```bash
   git add .
   git commit -m "ops: switch progress tool to Linear"
   git push
   ```

### Linear → File

1. `ops/policy.yml` を編集
   ```yaml
   progress:
     tool: file  # linear → file
     weekly_export:
       enabled: false  # エクスポート無効化
   ```

2. テンプレート再生成
   ```bash
   npm run ops:apply
   ```

3. CI確認
   ```bash
   npm run ops:lint
   ```

4. コミット
   ```bash
   git add .
   git commit -m "ops: switch progress tool to File"
   git push
   ```

---

## 📚 ドキュメント一覧

| ドキュメント | 内容 | パス |
|:-----------|:-----|:-----|
| **OPS-000 Charter** | 最上位運用方針 | `ops/OPS-000-Charter.md` |
| **OPS-101 Progress** | 進捗管理ポリシー | `ops/OPS-101-Progress.md` |
| **policy.yml** | 実環境設定 | `ops/policy.yml` |
| **README** | 本書 | `ops/README.md` |

---

## 🛠️ スクリプト一覧

| スクリプト | 用途 | コマンド |
|:----------|:-----|:---------|
| **opsctl** | テンプレート自動生成 | `npm run ops:apply` |
| **validate-policy** | 矛盾検出 | `npm run ops:lint` |

---

## 🔍 トラブルシューティング

### Q: 矛盾が検出された

**A**: テンプレートを再生成

```bash
npm run ops:apply
git diff .cursorrules  # 変更確認
```

### Q: ツール切替時の手順は？

**A**: 上記「ツール切替手順」を参照

### Q: 手動で.cursorrulesを編集してしまった

**A**: テンプレートを再生成して上書き

```bash
npm run ops:apply
```

### Q: CIでFa ilした

**A**: ローカルでlintを実行して確認

```bash
npm run ops:lint
```

---

## 📅 変更履歴

| バージョン | 日付 | 変更内容 | 承認者 |
|:---------|:-----|:---------|:------|
| 1.0.0 | 2025-10-21 | 初版制定 | CTO/PM |

---

## 📞 お問い合わせ

- **管理者**: Eng Lead
- **レビューア**: CTO, PM, Security Lead
- **次回レビュー**: 2025-11-21

---

**管理ファイル**: `/Users/kaneko/hotel-kanri/ops/README.md`  
**最終更新**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active

