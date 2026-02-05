# Knowledge Base - ナレッジベース

> ai-dev-framework v3.0 Knowledge Data Structure

---

## 概要

このディレクトリは、SSOTとは別にプロジェクトのドメイン知識を蓄積する場所です。
Discovery や SSOT生成の品質を高めるためのインプットとして機能します。

```
知識データ ≠ SSOT:
  - SSOT = 実装の唯一の根拠（厳密に管理）
  - 知識データ = SSOTを作るための参考情報（柔軟に蓄積）
```

---

## ディレクトリ構造

```
docs/knowledge/
├── _INDEX.md                 ← このファイル
├── market/                   ← 市場知識
│   ├── competitors.md        ← 競合分析
│   ├── trends.md             ← 市場トレンド
│   └── regulations.md        ← 規制・法令
├── domain/                   ← ドメイン知識
│   ├── terminology.md        ← 業界用語
│   ├── best-practices.md     ← ベストプラクティス
│   └── common-features.md    ← 業界標準機能
└── users/                    ← ユーザー知識
    ├── personas.md           ← 詳細ペルソナ
    ├── pain-points.md        ← 課題詳細
    └── interviews.md         ← インタビュー記録
```

---

## 参照ルール

1. **Discovery開始前**: docs/knowledge/ の存在を確認
   - 存在する → 関連ファイルを読み込んでからヒアリング
   - 存在しない → 通常通りヒアリング

2. **提案時**: 知識データの根拠を示す
   - 「知識データ（competitors.md）によると…」

3. **不足時**: 追加を推奨する
   - 「この情報は知識データにありません。追加を推奨します」

4. **矛盾時**: 報告する
   - 「ユーザー回答と知識データに矛盾があります」
