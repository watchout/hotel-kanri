---
name: ssot
description: SSOT（仕様書）を作成します
---

# /ssot コマンド

SSOTドキュメントを作成するワークフローを開始します。

## 使い方

```
/ssot [機能名]
```

例:
```
/ssot ユーザー管理
/ssot 注文履歴
```

## 実行フロー

1. **事前調査**（15分）
   - 既存実装の確認
   - 関連SSOTの確認
   - Prismaスキーマの確認

2. **要件定義**
   - 要件IDの付与
   - Accept条件の定義

3. **API仕様作成**
   - エンドポイント定義
   - リクエスト/レスポンス仕様

4. **DB仕様作成**
   - テーブル設計
   - リレーション定義

5. **品質チェック**
   - SSOT品質チェックリスト適用
   - スコア90点以上を目標

## 参照ドキュメント

- skills/ssot-workflow.md
- agents/ssot-writer.md

## 出力

`/Users/kaneko/hotel-kanri/docs/03_ssot/` 配下に作成
