---
name: review
description: コードレビューを実行します
---

# /review コマンド

コードレビューを実行します。

## 使い方

```
/review [ファイルパス or ディレクトリ]
```

例:
```
/review src/routes/tenants.routes.ts
/review server/api/v1/admin/
```

## レビュー観点

### 1. SSOT準拠
- 要件ID全実装
- Accept条件達成
- API仕様一致

### 2. セキュリティ
- tenant_idフィルタ
- 認証・認可
- 入力検証

### 3. コード品質
- TypeScript strict
- any型不使用
- エラーハンドリング

### 4. パフォーマンス
- N+1クエリ回避
- 適切なキャッシュ

### 5. 保守性
- 命名規則
- コメント
- テスト

## 出力形式

```markdown
## コードレビュー結果

### 総合評価: [A/B/C/D]

### 問題点
| 重要度 | ファイル | 行 | 問題 |
|:-------|:--------|:---|:-----|
| 🔴 | xxx.ts | 42 | ... |

### 改善提案
1. ...
2. ...

### 良い点
- ...
```

## 参照ドキュメント

- agents/code-reviewer.md
- agents/security-reviewer.md
