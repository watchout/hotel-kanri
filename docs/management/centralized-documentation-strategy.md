# 統合ドキュメント戦略

## 概要

本ドキュメントでは、hotel-saas、hotel-pms、hotel-member、hotel-commonの各システムのドキュメントを一元化し、各システムから同じ場所を参照する統合ドキュメント戦略について定義します。

## 現状の課題

### 分散したドキュメント構造
- 各システムが独自のdocsディレクトリを持っている
- 共通情報が重複して管理されている
- システム間の整合性確保が困難
- 更新時の同期漏れが発生しやすい

### 具体的な問題点
1. **重複管理**: 同じ情報が複数の場所に存在
2. **整合性の欠如**: 更新時の同期漏れ
3. **検索性の低下**: 情報の所在が不明確
4. **メンテナンス負荷**: 複数箇所の更新が必要

## 統合ドキュメント戦略

### 基本方針

1. **Single Source of Truth**: hotel-kanriを統合ドキュメントの唯一の情報源とする
2. **参照による共有**: 各システムは統合ドキュメントを参照する
3. **階層化された構造**: 共通→システム固有の順で情報を整理
4. **自動同期**: 可能な限り自動化による整合性確保

### 統合ドキュメント構造

```
hotel-kanri/docs/
├── 00_shared/                    # 全システム共通
│   ├── architecture/             # 全体アーキテクチャ
│   ├── standards/                # 開発標準・規約
│   ├── infrastructure/           # インフラ共通
│   ├── security/                 # セキュリティ共通
│   └── operations/               # 運用共通
├── 01_systems/                   # システム別ドキュメント
│   ├── common/                   # hotel-common
│   │   ├── architecture/         # システム固有アーキテクチャ
│   │   ├── api/                  # API仕様
│   │   ├── database/             # DB設計
│   │   └── deployment/           # デプロイ手順
│   ├── saas/                     # hotel-saas
│   │   ├── architecture/
│   │   ├── ui-ux/
│   │   ├── features/
│   │   └── deployment/
│   ├── pms/                      # hotel-pms
│   │   ├── architecture/
│   │   ├── workflows/
│   │   ├── integrations/
│   │   └── deployment/
│   └── member/                   # hotel-member
│       ├── architecture/
│       ├── privacy/
│       ├── crm/
│       └── deployment/
├── 02_integration/               # システム間連携
│   ├── apis/                     # API連携仕様
│   ├── events/                   # イベント連携
│   ├── data-flow/                # データフロー
│   └── workflows/                # 業務フロー
├── 03_development/               # 開発関連
│   ├── guidelines/               # 開発ガイドライン
│   ├── workflows/                # 開発ワークフロー
│   ├── tools/                    # 開発ツール
│   └── testing/                  # テスト戦略
├── 04_deployment/                # デプロイ・運用
│   ├── environments/             # 環境別設定
│   ├── ci-cd/                    # CI/CDパイプライン
│   ├── monitoring/               # 監視・ログ
│   └── maintenance/              # メンテナンス
└── 05_business/                  # ビジネス関連
    ├── requirements/             # 要件定義
    ├── specifications/           # 仕様書
    ├── user-stories/             # ユーザーストーリー
    └── roadmap/                  # ロードマップ
```

## 各システムでの参照方法

### 1. Gitサブモジュール方式

各システムリポジトリでhotel-kanriをサブモジュールとして追加：

```bash
# 各システムリポジトリで実行
git submodule add https://github.com/organization/hotel-kanri.git docs/shared
```

### 2. シンボリックリンク方式

ローカル開発環境でのシンボリックリンク：

```bash
# 各システムのdocsディレクトリで実行
ln -s ..//Users/kaneko/hotel-kanri/docs shared
```

### 3. 自動同期スクリプト方式

GitHub Actionsによる自動同期：

```yaml
# .github/workflows/sync-docs.yml
name: Sync Documentation
on:
  push:
    paths: ['docs/**']
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync to other repositories
        # 統合ドキュメントの変更を各システムに同期
```

## 移行計画

### Phase 1: 統合ドキュメント構造の構築
1. hotel-kanriに新しいドキュメント構造を作成
2. 既存ドキュメントの分類・整理
3. 重複ドキュメントの統合

### Phase 2: 各システムからの参照設定
1. 各システムリポジトリでの参照方法実装
2. 既存ドキュメントの移行・削除
3. 参照パスの更新

### Phase 3: 自動化・運用開始
1. 自動同期システムの構築
2. ドキュメント更新フローの確立
3. チームへの運用方法周知

## 運用ルール

### ドキュメント更新フロー

1. **共通ドキュメント**: hotel-kanriで更新
2. **システム固有**: hotel-kanriの該当システムディレクトリで更新
3. **承認プロセス**: Pull Requestによるレビュー必須
4. **通知**: 更新時は関連チームに自動通知

### 責任分担

| ドキュメント種別 | 更新責任者 | レビュー責任者 |
|-----------------|-----------|---------------|
| 共通アーキテクチャ | Iza（統合管理者） | 全AIエージェント |
| システム固有 | 各システム担当AI | Iza + 該当AI |
| 運用・デプロイ | DevOpsチーム | Iza |
| ビジネス要件 | プロダクトオーナー | 全AIエージェント |

### 品質管理

1. **一貫性チェック**: 自動化されたリンクチェック
2. **更新頻度**: 最低月1回の全体レビュー
3. **アクセス分析**: ドキュメント利用状況の定期分析
4. **フィードバック収集**: 開発チームからの改善提案

## 技術的実装

### 1. ドキュメント管理ツール

```bash
# ドキュメント構造チェックスクリプト
#!/bin/bash
# scripts/check-docs-structure.sh

echo "Checking documentation structure..."
find docs/ -name "*.md" -exec grep -l "TODO\|FIXME\|XXX" {} \;
echo "Checking for broken links..."
# リンクチェックロジック
```

### 2. 自動同期システム

```javascript
// scripts/sync-docs.js
const fs = require('fs');
const path = require('path');

class DocumentationSync {
  constructor() {
    this.sourceDir = 'docs';
    this.targetRepos = ['hotel-saas', 'hotel-pms', 'hotel-member', 'hotel-common'];
  }
  
  async syncToRepositories() {
    // 同期ロジック実装
  }
}
```

### 3. 参照管理システム

```markdown
<!-- 各システムのREADME.mdに追加 -->
## ドキュメント

このシステムのドキュメントは統合管理されています：

- [共通ドキュメント](/Users/kaneko/hotel-kanri/docs/00_shared/)
- [システム固有ドキュメント](/Users/kaneko/hotel-kanri/docs/01_systems/saas/)
- [統合仕様](/Users/kaneko/hotel-kanri/docs/02_integration/)
```

## 期待効果

### 短期効果（1-3ヶ月）
- ドキュメント検索時間の50%削減
- 更新漏れによる不整合の解消
- 新メンバーのオンボーディング時間短縮

### 中期効果（3-6ヶ月）
- ドキュメント品質の向上
- システム間連携の理解促進
- 開発効率の向上

### 長期効果（6ヶ月以上）
- 知識の体系化・蓄積
- 属人化の解消
- 継続的な改善文化の定着

## 成功指標

1. **利用率**: 月間ドキュメントアクセス数
2. **品質**: 不整合報告件数の減少
3. **効率**: ドキュメント更新にかかる時間
4. **満足度**: 開発チームからのフィードバックスコア

---

作成日: 2025年1月18日
最終更新: 2025年1月18日
責任者: Iza（統合管理者）
