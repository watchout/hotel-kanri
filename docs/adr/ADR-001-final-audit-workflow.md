# ADR-001: Final Audit ワークフロー導入

## Status
Accepted

## Context
既存のCI/CDパイプラインは以下のチェックを実施している：
- SSOT準拠チェック
- 型チェック（TypeScript）
- Lint（ESLint）
- テスト（Vitest）
- Critical Gates（品質ゲート）
- QOS Gatekeeper

しかし、以下の課題が存在する：
1. 省略コメント（`// ...`）による実装未完了箇所の検出がない
2. 破壊的変更（DB migration、API変更等）の明示的な宣言が強制されていない
3. CI通過後の最終品質チェックが不足している

## Decision
CI完了後に実行されるFinal Auditワークフローを導入する。

### Final Auditの構成
**Phase 1: 省略コメント検出**
- TypeScript/Vueファイル内の `// ...` を検出
- 実装未完了箇所を防止

**Phase 2: 破壊的変更チェック**
- DB migration変更を検出
- API変更（server/api/, docs/api/）を検出
- ENV変更（.env*）を検出
- Auth変更（auth関連ファイル）を検出
- PR本文に「Breaking Change」記載がない場合は警告

### トリガー
- `workflow_run`トリガーでCI完了後に自動実行
- mainブランチへのマージは除外（PRブランチのみ対象）

### 通知
- Final Audit合格時にTelegram通知
- `audit-passed`ラベル自動付与

## Consequences
### Positive
- 実装未完了箇所の混入を防止
- 破壊的変更の明示的な宣言を強制
- マージ前の最終品質チェックが確実に実行される
- 既存CIとの重複なし（補完関係）

### Negative
- CI実行時間が若干増加（Final Audit実行分）
- workflow_runトリガーの遅延（数分）が発生する可能性

### Neutral
- 既存CIワークフローへの変更は不要
- ロールバックはワークフローファイル削除で即座に可能

## Related
- PR #638（実装PR）
- 3段階アプローチ Phase 3: retrofitプロジェクトへFinal Audit適用
