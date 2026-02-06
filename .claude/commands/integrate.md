---
name: integrate
description: 3リポジトリ間の統合確認を実行します
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /integrate コマンド

hotel-kanri、hotel-common-rebuild、hotel-saas-rebuild間の統合を確認します。

## 使用方法

```bash
/integrate <機能名またはタスクID>
```

## 例

```bash
/integrate DEV-0181           # 特定タスクの統合確認
/integrate orders             # 特定機能の統合確認
/integrate --full             # 全体統合確認
```

## 確認項目

### 1. API契約チェック
- SSOT定義 ↔ hotel-common実装
- hotel-common実装 ↔ hotel-saasプロキシ
- エンドポイント、メソッド、リクエスト/レスポンス形式

### 2. 型定義チェック
- hotel-common の型 ↔ hotel-saas の型
- 命名、フィールド、オプショナル/必須

### 3. 統合テスト
```bash
# 両サーバー起動確認
curl http://localhost:3401/health
curl http://localhost:3101/health

# E2Eテスト
./scripts/test-standard-admin.sh
./scripts/test-standard-guest.sh
```

## 出力

```markdown
## 統合確認レポート

### API契約
| エンドポイント | SSOT | common | saas | 状態 |
|:--------------|:-----|:-------|:-----|:-----|

### 型定義
| 型名 | common | saas | 差異 |
|:-----|:-------|:-----|:-----|

### 統合テスト
| テスト | 結果 |
|:-------|:-----|

### 推奨アクション
1. ...
```

## 関連コマンド

- `/api` - API実装
- `/ui` - UI実装
- `/gate` - 品質ゲート
